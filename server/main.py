import logging
import os
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from contextlib import asynccontextmanager

from models import (
    TasacionLoteRequest, TasacionDepartamentoRequest, TasacionCasaRequest, TasacionRequest,
    TasacionCreate, TasacionUpdate, TasacionResponse,
    Comparable, ComparableCreate, ComparableUpdate, ComparableBatchRequest, ComparableResponse,
    SolicitudCreate, SolicitudUpdate, SolicitudResponse, SolicitudContribuirRequest,
    TasacionCompartirRequest, TasacionCompartirResponse, VistaPreviaTasacionResponse,
    RevocarTasacionCompartidaResponse,
    LoginRequest, RegisterRequest, TokenResponse, ForgotPasswordRequest
)
from services.compartir_service import CompartirService
from tasador_lotes import tasar_lote
from tasador_departamentos import tasar_departamento
from tasador_casas import tasar_casa
from database import init_db_pool, test_connection, close_db_pool, get_connection, release_connection
from migrations.migration_runner import MigrationRunner
from repositories.tasacion_repository import TasacionRepository
from repositories.comparable_repository import ComparableRepository
from repositories.solicitud_repository import SolicitudRepository
from repositories.usuario_repository import UsuarioRepository
from utils.hybrid_mapper import mapear_tasacion_a_columnas, mapear_comparable_a_columnas
from utils.id_encoder import generar_codigo_publico, obtener_id_desde_codigo, TIPO_TASACION, TIPO_COMPARABLE, TIPO_SOLICITUD
import auth
import middleware

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SHARE_BASE_URL = os.getenv("SHARE_BASE_URL", "https://tasador.app/compartir/")


def _crear_comparable(usuario_id: int, tipo_inmueble: str, fuente: str,
                      datos: Dict[str, Any], solicitud_origen_id: int = None) -> Dict[str, Any]:
    """Crea un comparable nuevo. Retorna el registro recién creado."""
    repo = ComparableRepository()

    columnas = mapear_comparable_a_columnas(datos)

    # Validar campos obligatorios de la tabla comparables
    obligatorios = ['direccion', 'provincia', 'localidad', 'lat', 'lon', 'valor']
    faltantes = [c for c in obligatorios if columnas.get(c) is None]
    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan campos obligatorios para crear el comparable: {', '.join(faltantes)}"
        )

    datos_comparable = {
        'usuario_id': usuario_id,
        'tipo_inmueble': tipo_inmueble,
        'fuente': fuente,
        'datos': datos
    }
    if solicitud_origen_id is not None:
        datos_comparable['solicitud_origen_id'] = solicitud_origen_id
    datos_comparable.update(columnas)

    try:
        return repo.create(datos_comparable)
    except Exception as e:
        logger.error(f"Error de base de datos al crear comparable: columnas={list(datos_comparable.keys())} error={e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestiona el ciclo de vida de la aplicación."""
    # Inicializar pool de conexiones al iniciar
    logger.info("Iniciando pool de conexiones a PostgreSQL...")
    if init_db_pool():
        logger.info("Pool de conexiones inicializado correctamente")
        # Probar conexión
        if test_connection():
            logger.info("Conexión a PostgreSQL verificada")
        else:
            logger.warning("No se pudo verificar la conexión a PostgreSQL")
    else:
        logger.error("No se pudo inicializar el pool de conexiones")
    
    yield
    
    # Cerrar pool de conexiones al cerrar
    logger.info("Cerrando pool de conexiones...")
    close_db_pool()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"mensaje": "Servidor funcionando"}


@app.post("/api/migrations/run")
def endpoint_run_migrations(usuario_id: int = Depends(middleware.require_admin)):
    """Ejecuta las migraciones pendientes de la base de datos."""
    logger.info("Iniciando ejecución de migraciones")
    
    try:
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        runner = MigrationRunner(migrations_dir)
        success = runner.run_migrations()
        
        if success:
            return {"mensaje": "Migraciones ejecutadas exitosamente", "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Error al ejecutar migraciones")
    except Exception as e:
        logger.error(f"Error en endpoint de migraciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/migrations/status")
def endpoint_migration_status(usuario_id: int = Depends(middleware.require_admin)):
    """Obtiene el estado de las migraciones."""
    logger.info("Obteniendo estado de migraciones")
    
    try:
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        runner = MigrationRunner(migrations_dir)
        runner.ensure_migrations_table()
        
        executed = runner.get_executed_migrations()
        pending = runner.get_pending_migrations()
        
        return {
            "ejecutadas": executed,
            "pendientes": [v for v, _, _ in pending],
            "total_ejecutadas": len(executed),
            "total_pendientes": len(pending)
        }
    except Exception as e:
        logger.error(f"Error al obtener estado de migraciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tasar/lote")
def endpoint_tasar_lote(datos: TasacionLoteRequest, usuario_id: int = Depends(middleware.get_current_user_id)):

    logger.info("Iniciando endpoint_tasar_lote")

    try:
        resultado = tasar_lote(datos)
        return resultado

    except ValueError as e:
        logger.error(f"ValueError en endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))


def _normalizar_comparables(comparables_raw):
    """Convierte los comparables del frontend al esquema Comparable del backend."""
    comparables = []
    for c in comparables_raw or []:
        if not c:
            continue
        ubicacion = c.get("ubicacion") or {}
        kwargs = dict(c)
        kwargs["direccion"] = c.get("direccion") or ubicacion.get("direccion", "")
        kwargs["valor_total"] = c.get("valor_total", c.get("valor", 0))
        kwargs["tipo_valor"] = c.get("tipo_valor", c.get("tipoValor", "venta"))
        kwargs["frente"] = c.get("frente") or 0
        kwargs["fondo"] = c.get("fondo")
        kwargs["superficie"] = c.get("superficie")
        kwargs["tipologia"] = c.get("tipologia", c.get("tipoLote", c.get("tipoInmueble")))
        comparables.append(Comparable(**kwargs))
    return comparables


def _parse_superficie_cubierta(inmueble):
    """Extrae una superficie numérica del inmueble, parseando el string de rango si es necesario."""
    # Si ya hay una superficie homogeneizada numérica, usarla
    for ruta in [
        ["superficieHomogeneizada"],
        ["homogeneizacion", "totalHomogeneizada"],
        ["homogeneizacion", "totalSuperficie"],
        ["superficie"],
    ]:
        val = inmueble
        for key in ruta:
            val = val.get(key) if isinstance(val, dict) else None
        if val is not None:
            try:
                num = float(val)
                if num > 0:
                    return num
            except (ValueError, TypeError):
                continue

    # Si no hay numérico, parsear el string de rango
    texto = inmueble.get("superficieCubierta", "")
    if texto:
        import re
        numeros = re.findall(r"\d+", str(texto))
        if numeros:
            promedio = sum(int(n) for n in numeros) / len(numeros)
            coef = float(inmueble.get("superficieCubiertaCoef", 1) or 1)
            return promedio * coef

    return 0


def _parse_antiguedad(inmueble):
    try:
        return int(inmueble.get("antiguedad", 0) or 0)
    except (ValueError, TypeError):
        return 0


def _parse_estado_conservacion(texto):
    """Convierte el texto de estado de conservación a entero 1-5."""
    if not texto:
        return 1
    import re
    match = re.match(r"\s*(\d+)", str(texto))
    if match:
        return int(match.group(1))
    return 1


def _build_tasacion_lote_request(ubicacion, inmueble, comparables, ajuste, manual):
    caracteristicas = inmueble.get("caracteristicas", {}) or {}
    return TasacionLoteRequest(
        direccion=ubicacion.get("direccion", ""),
        tipologia=inmueble.get("tipoLote", "Medial"),
        calle_a=ubicacion.get("calle_a"),
        calle_b=ubicacion.get("calle_b"),
        zona=caracteristicas.get("zona"),
        frente=caracteristicas.get("frente", 0),
        fondo=caracteristicas.get("fondo"),
        superficie=caracteristicas.get("superficie"),
        equipamientos=inmueble.get("servicios") or [],
        fot=caracteristicas.get("fot"),
        fos=caracteristicas.get("fos"),
        zonificacion=caracteristicas.get("zonificacion"),
        comparables=comparables,
        ajuste_final_porcentaje=ajuste,
        valor_final_manual=manual,
    )


def _build_tasacion_departamento_request(ubicacion, inmueble, comparables, ajuste, manual):
    superficie = _parse_superficie_cubierta(inmueble)
    return TasacionDepartamentoRequest(
        direccion=ubicacion.get("direccion", ""),
        tipo="departamento",
        superficie_cubierta=superficie,
        antiguedad=_parse_antiguedad(inmueble),
        estado_conservacion=_parse_estado_conservacion(inmueble.get("estadoConservacion", "")),
        vida_util=int(inmueble.get("vidaUtil", 80) or 80),
        fot=inmueble.get("fot"),
        fos=inmueble.get("fos"),
        valor_m2_referencia=None,
        ajuste_final_porcentaje=ajuste,
        valor_final_manual=manual,
        comparables=comparables,
    )


def _build_tasacion_casa_request(ubicacion, inmueble, comparables, ajuste, manual):
    superficie = _parse_superficie_cubierta(inmueble)
    return TasacionCasaRequest(
        direccion=ubicacion.get("direccion", ""),
        tipo="casa",
        superficie_cubierta=superficie,
        antiguedad=_parse_antiguedad(inmueble),
        estado_conservacion=inmueble.get("estadoConservacion", ""),
        vida_util=int(inmueble.get("vidaUtil", 80) or 80),
        caracteristica_constructiva=float(inmueble.get("caracteristicaConstructivaCoef", 1) or 1),
        fot=inmueble.get("fot"),
        fos=inmueble.get("fos"),
        zonificacion=inmueble.get("zonificacion"),
        valor_m2_referencia=None,
        ajuste_final_porcentaje=ajuste,
        valor_final_manual=manual,
        comparables=comparables,
    )


@app.post("/tasar")
def endpoint_tasar(request: TasacionRequest, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Endpoint unificado: recibe el mismo payload para cualquier tipo de inmueble."""

    logger.info(f"Iniciando endpoint_tasar - tipo: {request.tipo}")

    try:
        comparables = _normalizar_comparables(request.comparables)
        tipo = (request.tipo or "").lower()

        if tipo == "lote":
            datos = _build_tasacion_lote_request(
                request.ubicacion, request.inmueble, comparables,
                request.ajuste_final_porcentaje, request.valor_final_manual
            )
            return tasar_lote(datos)
        elif tipo == "departamento":
            datos = _build_tasacion_departamento_request(
                request.ubicacion, request.inmueble, comparables,
                request.ajuste_final_porcentaje, request.valor_final_manual
            )
            return tasar_departamento(datos)
        elif tipo == "casa":
            datos = _build_tasacion_casa_request(
                request.ubicacion, request.inmueble, comparables,
                request.ajuste_final_porcentaje, request.valor_final_manual
            )
            return tasar_casa(datos)
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de inmueble no soportado: {request.tipo}")

    except ValueError as e:
        logger.error(f"ValueError en endpoint_tasar: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ValidationError as e:
        logger.error(f"ValidationError en endpoint_tasar: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en endpoint_tasar: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# ENDPOINTS CRUD PARA TASACIONES
# =========================

@app.post("/api/tasaciones", response_model=TasacionResponse)
def crear_tasacion(tasacion: TasacionCreate, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Crea una nueva tasación."""
    logger.info(f"Creando tasación de tipo: {tasacion.tipo}")
    
    try:
        repo = TasacionRepository()
        
        # Construir datos de tasación con columnas específicas extraídas del JSON
        datos_tasacion = {
            'usuario_id': usuario_id,
            'estado': tasacion.estado,
            'datos': tasacion.datos
        }
        datos_tasacion.update(mapear_tasacion_a_columnas(tasacion.datos))
        
        tasacion_creada = repo.create(datos_tasacion)
        
        # Agregar comparables usando la tabla relacional
        if tasacion.comparables_ids:
            for orden, comp_id in enumerate(tasacion.comparables_ids):
                # Decodificar ID público a ID interno
                comp_id_interno = obtener_id_desde_codigo(comp_id)
                if comp_id_interno:
                    repo.agregar_comparable(tasacion_creada['id'], comp_id_interno, orden)
        
        # Obtener comparables para la respuesta
        comparables = repo.obtener_comparables(tasacion_creada['id'])
        comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables]
        
        # Generar código público para la tasación
        codigo_publico = generar_codigo_publico(TIPO_TASACION, tasacion_creada['id'])
        
        return TasacionResponse(
            id=codigo_publico,
            usuario_id=tasacion_creada['usuario_id'],
            tipo=tasacion_creada['tipo_inmueble'],
            estado=tasacion_creada['estado'],
            datos=tasacion_creada['datos'],
            comparables_ids=comparables_ids,
            fecha_creacion=tasacion_creada['fecha_creacion'],
            fecha_modificacion=tasacion_creada['fecha_modificacion']
        )
    except Exception as e:
        logger.error(f"Error al crear tasación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasaciones/{tasacion_id}", response_model=TasacionResponse)
def obtener_tasacion(tasacion_id: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Obtiene una tasación por código público."""
    logger.info(f"Obteniendo tasación: {tasacion_id}")
    
    try:
        # Decodificar código público a ID interno
        tasacion_id_interno = obtener_id_desde_codigo(tasacion_id)
        if not tasacion_id_interno:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        repo = TasacionRepository()
        tasacion = repo.find_by_id(tasacion_id_interno)
        
        if not tasacion:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Verificar que la tasación pertenezca al usuario autenticado
        if tasacion['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para acceder a esta tasación")
        
        # Obtener comparables desde la tabla relacional
        comparables = repo.obtener_comparables(tasacion['id'])
        comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables]

        # Obtener datos del remitente si la tasación fue recibida por compartir
        compartido_por = None
        if tasacion.get('origen') == 'compartida' and tasacion.get('origen_id'):
            compartido_por = CompartirService().obtener_remitente(tasacion['origen_id'])

        return TasacionResponse(
            id=tasacion_id,
            usuario_id=tasacion['usuario_id'],
            tipo=tasacion['tipo_inmueble'],
            estado=tasacion['estado'],
            datos=tasacion['datos'],
            comparables_ids=comparables_ids,
            fecha_creacion=tasacion['fecha_creacion'],
            fecha_modificacion=tasacion['fecha_modificacion'],
            compartido_por=compartido_por
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener tasación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasaciones", response_model=list[TasacionResponse])
def listar_tasaciones(
    usuario_id: int = Depends(middleware.get_current_user_id),
    estado: str = None,
    limit: Optional[int] = Query(None, ge=1, le=1000),
    offset: Optional[int] = Query(None, ge=0)
):
    """Lista tasaciones de un usuario con paginación."""
    logger.info(f"Listando tasaciones para usuario: {usuario_id}, estado: {estado}")
    
    try:
        repo = TasacionRepository()
        
        if estado:
            tasaciones = repo.get_by_usuario_and_estado(usuario_id, estado, limit=limit, offset=offset)
        else:
            tasaciones = repo.get_by_usuario(usuario_id, limit=limit, offset=offset)
        
        return [
            TasacionResponse(
                id=generar_codigo_publico(TIPO_TASACION, t['id']),
                usuario_id=t['usuario_id'],
                tipo=t['tipo_inmueble'],
                estado=t['estado'],
                datos=t['datos'],
                comparables_ids=[generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in repo.obtener_comparables(t['id'])],
                fecha_creacion=t['fecha_creacion'],
                fecha_modificacion=t['fecha_modificacion']
            )
            for t in tasaciones
        ]
    except Exception as e:
        logger.error(f"Error al listar tasaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/tasaciones/{tasacion_id}", response_model=TasacionResponse)
def actualizar_tasacion(tasacion_id: str, tasacion: TasacionUpdate, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Actualiza una tasación por código público."""
    logger.info(f"Actualizando tasación: {tasacion_id}")
    
    try:
        # Decodificar código público a ID interno
        tasacion_id_interno = obtener_id_desde_codigo(tasacion_id)
        if not tasacion_id_interno:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        repo = TasacionRepository()
        tasacion_existente = repo.find_by_id(tasacion_id_interno)
        
        if not tasacion_existente:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Verificar que la tasación pertenezca al usuario autenticado
        if tasacion_existente['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta tasación")
        
        # Construir diccionario de actualización solo con campos proporcionados
        datos_actualizacion = {}
        if tasacion.estado is not None:
            datos_actualizacion['estado'] = tasacion.estado
        if tasacion.datos is not None:
            datos_actualizacion['datos'] = tasacion.datos
            # Extraer y actualizar columnas específicas desde JSON
            datos_actualizacion.update(mapear_tasacion_a_columnas(tasacion.datos))
        
        if not datos_actualizacion and tasacion.comparables_ids is None:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")
        
        tasacion_actualizada = repo.update(tasacion_id_interno, datos_actualizacion) if datos_actualizacion else None
        
        if tasacion_actualizada is None and not datos_actualizacion:
            tasacion_actualizada = tasacion_existente
        elif not tasacion_actualizada:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Actualizar comparables usando la tabla relacional
        if tasacion.comparables_ids is not None:
            # Eliminar relaciones existentes
            repo.limpiar_comparables(tasacion_id_interno)
            
            # Agregar nuevas relaciones
            for orden, comp_id in enumerate(tasacion.comparables_ids):
                comp_id_interno = obtener_id_desde_codigo(comp_id)
                if comp_id_interno:
                    repo.agregar_comparable(tasacion_id_interno, comp_id_interno, orden)
        
        # Obtener comparables para la respuesta
        comparables = repo.obtener_comparables(tasacion_id_interno)
        comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables]
        
        return TasacionResponse(
            id=tasacion_id,
            usuario_id=tasacion_actualizada['usuario_id'],
            tipo=tasacion_actualizada['tipo_inmueble'],
            estado=tasacion_actualizada['estado'],
            datos=tasacion_actualizada['datos'],
            comparables_ids=comparables_ids,
            fecha_creacion=tasacion_actualizada['fecha_creacion'],
            fecha_modificacion=tasacion_actualizada['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar tasación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/tasaciones/{tasacion_id}")
def eliminar_tasacion(tasacion_id: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Elimina una tasación por código público."""
    logger.info(f"Eliminando tasación: {tasacion_id}")
    
    try:
        # Decodificar código público a ID interno
        tasacion_id_interno = obtener_id_desde_codigo(tasacion_id)
        if not tasacion_id_interno:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        repo = TasacionRepository()
        tasacion_existente = repo.find_by_id(tasacion_id_interno)
        
        if not tasacion_existente:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Verificar que la tasación pertenezca al usuario autenticado
        if tasacion_existente['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta tasación")
        
        eliminado = repo.delete(tasacion_id_interno)
        
        if not eliminado:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        return {"mensaje": "Tasación eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar tasación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# ENDPOINTS PARA COMPARTIR TASACIONES
# =========================

@app.post("/api/tasaciones/{tasacion_id}/compartir", response_model=TasacionCompartirResponse)
def crear_compartir_tasacion(
    tasacion_id: str,
    request: TasacionCompartirRequest,
    usuario_id: int = Depends(middleware.get_current_user_id)
):
    """Crea un enlace público para compartir una tasación."""
    logger.info(f"Creando enlace para compartir tasación: {tasacion_id}")

    try:
        tasacion_id_interno = obtener_id_desde_codigo(tasacion_id)
        if not tasacion_id_interno:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")

        service = CompartirService()
        service.verificar_limite_compartidos(usuario_id)

        record = service.crear_compartir(
            tasacion_id_interno,
            usuario_id,
            usos_maximos=request.usos_maximos,
            dias_expiracion=request.dias_expiracion
        )

        link = f"{SHARE_BASE_URL}{record['token']}"

        return TasacionCompartirResponse(
            token=record['token'],
            link=link,
            estado=record['estado'],
            usos_maximos=record['usos_maximos'],
            usos_realizados=record['usos_realizados'],
            fecha_creacion=record['fecha_creacion'],
            fecha_expiracion=record['fecha_expiracion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear enlace de compartir: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasaciones/compartir/{token}", response_model=VistaPreviaTasacionResponse)
def obtener_vista_previa_compartir(token: str):
    """Obtiene la vista previa pública de una tasación compartida."""
    logger.info(f"Obteniendo vista previa de enlace: {token}")

    try:
        service = CompartirService()
        preview = service.obtener_vista_previa(token)
        return VistaPreviaTasacionResponse(**preview)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener vista previa: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tasaciones/compartir/{token}/guardar", response_model=TasacionResponse)
def guardar_tasacion_compartida(token: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Guarda una copia de la tasación compartida en la cuenta del usuario autenticado."""
    logger.info(f"Guardando tasación compartida: {token}")

    try:
        service = CompartirService()
        nueva_tasacion = service.guardar_tasacion_compartida(token, usuario_id)

        repo = TasacionRepository()
        comparables = repo.obtener_comparables(nueva_tasacion['id'])
        comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables]

        return TasacionResponse(
            id=generar_codigo_publico(TIPO_TASACION, nueva_tasacion['id']),
            usuario_id=nueva_tasacion['usuario_id'],
            tipo=nueva_tasacion['tipo_inmueble'],
            estado=nueva_tasacion['estado'],
            datos=nueva_tasacion['datos'],
            comparables_ids=comparables_ids,
            fecha_creacion=nueva_tasacion['fecha_creacion'],
            fecha_modificacion=nueva_tasacion['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al guardar tasación compartida: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/tasaciones/compartir/{token}", response_model=RevocarTasacionCompartidaResponse)
def revocar_compartir_tasacion(token: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Revoca un enlace de compartir activo."""
    logger.info(f"Revocando enlace: {token}")

    try:
        service = CompartirService()
        service.revocar_compartir(token, usuario_id)
        return RevocarTasacionCompartidaResponse(mensaje="Enlace revocado correctamente")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al revocar enlace: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# ENDPOINTS CRUD PARA COMPARABLES
# =========================

@app.post("/api/comparables", response_model=ComparableResponse)
def crear_comparable(comparable: ComparableCreate, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Crea un nuevo comparable."""
    logger.info(f"Creando comparable de tipo: {comparable.tipo_inmueble}")

    try:
        comparable_creado = _crear_comparable(
            usuario_id,
            comparable.tipo_inmueble,
            comparable.fuente,
            comparable.datos
        )

        # Generar código público para el comparable
        codigo_publico = generar_codigo_publico(TIPO_COMPARABLE, comparable_creado['id'])

        return ComparableResponse(
            id=codigo_publico,
            usuario_id=comparable_creado['usuario_id'],
            tipo_inmueble=comparable_creado['tipo_inmueble'],
            fuente=comparable_creado['fuente'],
            datos=comparable_creado['datos'],
            fecha_creacion=comparable_creado['fecha_creacion'],
            fecha_modificacion=comparable_creado['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear comparable: {e}")
        logger.error(f"Payload recibido: {comparable.datos}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/comparables/{comparable_id}", response_model=ComparableResponse)
def obtener_comparable(comparable_id: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Obtiene un comparable por código público."""
    logger.info(f"Obteniendo comparable: {comparable_id}")
    
    try:
        # Decodificar código público a ID interno
        comparable_id_interno = obtener_id_desde_codigo(comparable_id)
        if not comparable_id_interno:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        repo = ComparableRepository()
        comparable = repo.find_by_id(comparable_id_interno)
        
        if not comparable:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        # Verificar que el comparable pertenezca al usuario autenticado
        if comparable['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para acceder a este comparable")
        
        return ComparableResponse(
            id=comparable_id,
            usuario_id=comparable['usuario_id'],
            tipo_inmueble=comparable['tipo_inmueble'],
            fuente=comparable['fuente'],
            datos=comparable['datos'],
            fecha_creacion=comparable['fecha_creacion'],
            fecha_modificacion=comparable['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener comparable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/comparables/batch", response_model=list[ComparableResponse])
def obtener_comparables_batch(request: ComparableBatchRequest, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Obtiene múltiples comparables por sus códigos públicos."""
    logger.info(f"Obteniendo comparables batch: {request.ids}")
    
    try:
        # Decodificar todos los IDs públicos a IDs internos
        ids_internos = []
        for codigo in request.ids:
            id_interno = obtener_id_desde_codigo(codigo)
            if id_interno:
                ids_internos.append(id_interno)
        
        repo = ComparableRepository()
        comparables = repo.find_by_ids(ids_internos)
        
        # Filtrar solo los comparables que pertenecen al usuario autenticado
        comparables_filtrados = [c for c in comparables if c['usuario_id'] == usuario_id]
        
        return [
            ComparableResponse(
                id=generar_codigo_publico(TIPO_COMPARABLE, c['id']),
                usuario_id=c['usuario_id'],
                tipo_inmueble=c['tipo_inmueble'],
                fuente=c['fuente'],
                datos=c['datos'],
                fecha_creacion=c['fecha_creacion'],
                fecha_modificacion=c['fecha_modificacion']
            )
            for c in comparables_filtrados
        ]
    except Exception as e:
        logger.error(f"Error al obtener comparables batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/comparables", response_model=list[ComparableResponse])
def listar_comparables(
    usuario_id: int = Depends(middleware.get_current_user_id),
    tipo_inmueble: str = None,
    fuente: str = None,
    limit: Optional[int] = Query(None, ge=1, le=1000),
    offset: Optional[int] = Query(None, ge=0)
):
    """Lista comparables de un usuario con paginación."""
    logger.info(f"Listando comparables para usuario: {usuario_id}, tipo: {tipo_inmueble}, fuente: {fuente}")
    
    try:
        repo = ComparableRepository()
        
        if tipo_inmueble and fuente:
            comparables = repo.get_by_usuario_tipo_origen(usuario_id, tipo_inmueble, fuente, limit=limit, offset=offset)
        elif tipo_inmueble:
            comparables = repo.get_by_usuario_tipo(usuario_id, tipo_inmueble, limit=limit, offset=offset)
        else:
            comparables = repo.get_by_usuario(usuario_id, limit=limit, offset=offset)
        
        return [
            ComparableResponse(
                id=generar_codigo_publico(TIPO_COMPARABLE, c['id']),
                usuario_id=c['usuario_id'],
                tipo_inmueble=c['tipo_inmueble'],
                fuente=c['fuente'],
                datos=c['datos'],
                fecha_creacion=c['fecha_creacion'],
                fecha_modificacion=c['fecha_modificacion']
            )
            for c in comparables
        ]
    except Exception as e:
        logger.error(f"Error al listar comparables: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/comparables/{comparable_id}", response_model=ComparableResponse)
def actualizar_comparable(comparable_id: str, comparable: ComparableUpdate, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Actualiza un comparable por código público."""
    logger.info(f"Actualizando comparable: {comparable_id}")
    
    try:
        # Decodificar código público a ID interno
        comparable_id_interno = obtener_id_desde_codigo(comparable_id)
        if not comparable_id_interno:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        repo = ComparableRepository()
        comparable_existente = repo.find_by_id(comparable_id_interno)
        
        if not comparable_existente:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        # Verificar que el comparable pertenezca al usuario autenticado
        if comparable_existente['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar este comparable")
        
        if comparable.datos is None:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")
        
        # Actualizar datos y columnas específicas extraídas del JSON
        datos_actualizacion = {'datos': comparable.datos}
        datos_actualizacion.update(mapear_comparable_a_columnas(comparable.datos))
        
        comparable_actualizado = repo.update(comparable_id_interno, datos_actualizacion)
        
        if not comparable_actualizado:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        return ComparableResponse(
            id=comparable_id,
            usuario_id=comparable_actualizado['usuario_id'],
            tipo_inmueble=comparable_actualizado['tipo_inmueble'],
            fuente=comparable_actualizado['fuente'],
            datos=comparable_actualizado['datos'],
            fecha_creacion=comparable_actualizado['fecha_creacion'],
            fecha_modificacion=comparable_actualizado['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar comparable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/comparables/{comparable_id}")
def eliminar_comparable(comparable_id: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Elimina un comparable por código público."""
    logger.info(f"Eliminando comparable: {comparable_id}")
    
    try:
        # Decodificar código público a ID interno
        comparable_id_interno = obtener_id_desde_codigo(comparable_id)
        if not comparable_id_interno:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        repo = ComparableRepository()
        comparable_existente = repo.find_by_id(comparable_id_interno)
        
        if not comparable_existente:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        # Verificar que el comparable pertenezca al usuario autenticado
        if comparable_existente['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este comparable")
        
        eliminado = repo.delete(comparable_id_interno)
        
        if not eliminado:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        return {"mensaje": "Comparable eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar comparable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# ENDPOINTS CRUD PARA SOLICITUDES
# =========================

@app.post("/api/solicitudes", response_model=SolicitudResponse)
def crear_solicitud(solicitud: SolicitudCreate, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Crea una nueva solicitud."""
    logger.info(f"Creando solicitud para tasación: {solicitud.tasacion_id}")
    
    try:
        repo = SolicitudRepository()
        
        # Decodificar tasacion_id público a interno
        tasacion_id_interno = obtener_id_desde_codigo(solicitud.tasacion_id)
        if not tasacion_id_interno:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Verificar que la tasación existe
        tasacion_repo = TasacionRepository()
        tasacion = tasacion_repo.find_by_id(tasacion_id_interno)
        if not tasacion:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        solicitud_creada = repo.create({
            'usuario_id': usuario_id,
            'tasacion_id': tasacion_id_interno,
            'estado': solicitud.estado,
            'datos': solicitud.datos
        })
        
        # Generar código público para la solicitud
        codigo_publico = generar_codigo_publico(TIPO_SOLICITUD, solicitud_creada['id'])
        
        # Generar link público dinámicamente
        link_publico = f"https://tasador.app/s/{codigo_publico}"
        
        return SolicitudResponse(
            id=codigo_publico,
            usuario_id=solicitud_creada['usuario_id'],
            tasacion_id=solicitud.tasacion_id,
            link_publico=link_publico,
            estado=solicitud_creada['estado'],
            datos=solicitud_creada['datos'],
            fecha_creacion=solicitud_creada['fecha_creacion'],
            fecha_modificacion=solicitud_creada['fecha_modificacion']
        )
    except Exception as e:
        logger.error(f"Error al crear solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/solicitudes/{solicitud_id}", response_model=SolicitudResponse)
def obtener_solicitud(solicitud_id: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Obtiene una solicitud por código público."""
    logger.info(f"Obteniendo solicitud: {solicitud_id}")
    
    try:
        # Decodificar código público a ID interno
        solicitud_id_interno = obtener_id_desde_codigo(solicitud_id)
        if not solicitud_id_interno:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        repo = SolicitudRepository()
        solicitud = repo.find_by_id(solicitud_id_interno)
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Verificar que la solicitud pertenezca al usuario autenticado
        if solicitud['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para acceder a esta solicitud")
        
        # Generar código público para la tasación asociada
        tasacion_publico = generar_codigo_publico(TIPO_TASACION, solicitud['tasacion_id']) if solicitud['tasacion_id'] else None
        
        # Generar link público dinámicamente
        link_publico = f"https://tasador.app/s/{solicitud_id}"
        
        return SolicitudResponse(
            id=solicitud_id,
            usuario_id=solicitud['usuario_id'],
            tasacion_id=tasacion_publico,
            link_publico=link_publico,
            estado=solicitud['estado'],
            datos=solicitud['datos'],
            fecha_creacion=solicitud['fecha_creacion'],
            fecha_modificacion=solicitud['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/solicitudes", response_model=list[SolicitudResponse])
def listar_solicitudes(
    usuario_id: int = Depends(middleware.get_current_user_id),
    estado: str = None,
    limit: Optional[int] = Query(None, ge=1, le=1000),
    offset: Optional[int] = Query(None, ge=0)
):
    """Lista solicitudes de un usuario con paginación."""
    logger.info(f"Listando solicitudes para usuario: {usuario_id}, estado: {estado}")
    
    try:
        repo = SolicitudRepository()
        
        if estado:
            solicitudes = repo.get_by_usuario_and_estado(usuario_id, estado, limit=limit, offset=offset)
        else:
            solicitudes = repo.get_by_usuario(usuario_id, limit=limit, offset=offset)
        
        # Resolver IDs públicos de tasaciones en batch
        tasacion_ids = list({s['tasacion_id'] for s in solicitudes if s['tasacion_id']})
        tasacion_public_ids = {}
        if tasacion_ids:
            tasaciones = TasacionRepository().find_by_ids(tasacion_ids)
            tasacion_public_ids = {t['id']: generar_codigo_publico(TIPO_TASACION, t['id']) for t in tasaciones}
        
        return [
            SolicitudResponse(
                id=generar_codigo_publico(TIPO_SOLICITUD, s['id']),
                usuario_id=s['usuario_id'],
                tasacion_id=tasacion_public_ids.get(s['tasacion_id']),
                link_publico=f"https://tasador.app/s/{generar_codigo_publico(TIPO_SOLICITUD, s['id'])}",
                estado=s['estado'],
                datos=s['datos'],
                fecha_creacion=s['fecha_creacion'],
                fecha_modificacion=s['fecha_modificacion']
            )
            for s in solicitudes
        ]
    except Exception as e:
        logger.error(f"Error al listar solicitudes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/solicitudes/link/{link_publico:path}/comparables", response_model=list[ComparableResponse])
def obtener_comparables_de_solicitud(link_publico: str):
    """Obtiene los comparables creados como respuesta a una solicitud pública."""
    logger.info(f"Obteniendo comparables de solicitud por link: {link_publico}")

    try:
        repo = ComparableRepository()
        comparables = repo.find_by_link_publico(link_publico)

        return [
            ComparableResponse(
                id=generar_codigo_publico(TIPO_COMPARABLE, c['id']),
                usuario_id=c['usuario_id'],
                tipo_inmueble=c['tipo_inmueble'],
                fuente=c['fuente'],
                datos=c['datos'],
                fecha_creacion=c['fecha_creacion'],
                fecha_modificacion=c['fecha_modificacion']
            )
            for c in comparables
        ]
    except Exception as e:
        logger.error(f"Error al obtener comparables de solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/solicitudes/link/{link_publico:path}", response_model=SolicitudResponse)
def obtener_solicitud_por_link(link_publico: str):
    """Obtiene una solicitud por su link público."""
    logger.info(f"Obteniendo solicitud por link: {link_publico}")
    
    try:
        repo = SolicitudRepository()
        solicitud = repo.find_by_link_publico(link_publico)
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Generar código público para la solicitud y tasación
        codigo_publico = generar_codigo_publico(TIPO_SOLICITUD, solicitud['id'])
        tasacion_publico = generar_codigo_publico(TIPO_TASACION, solicitud['tasacion_id']) if solicitud['tasacion_id'] else None
        
        # Generar link público dinámicamente
        link_publico = f"https://tasador.app/s/{codigo_publico}"
        
        return SolicitudResponse(
            id=codigo_publico,
            usuario_id=solicitud['usuario_id'],
            tasacion_id=tasacion_publico,
            link_publico=link_publico,
            estado=solicitud['estado'],
            datos=solicitud['datos'],
            fecha_creacion=solicitud['fecha_creacion'],
            fecha_modificacion=solicitud['fecha_modificacion'],
            tipo_inmueble=solicitud.get('tipo_inmueble') or (solicitud['datos'] or {}).get('tipo')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener solicitud por link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/solicitudes/{solicitud_id}", response_model=SolicitudResponse)
def actualizar_solicitud(solicitud_id: str, solicitud: SolicitudUpdate, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Actualiza una solicitud por código público."""
    logger.info(f"Actualizando solicitud: {solicitud_id}")
    
    try:
        # Decodificar código público a ID interno
        solicitud_id_interno = obtener_id_desde_codigo(solicitud_id)
        if not solicitud_id_interno:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        repo = SolicitudRepository()
        solicitud_existente = repo.find_by_id(solicitud_id_interno)
        
        if not solicitud_existente:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Verificar que la solicitud pertenezca al usuario autenticado
        if solicitud_existente['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar esta solicitud")
        
        datos_actualizacion = {}
        if solicitud.estado is not None:
            datos_actualizacion['estado'] = solicitud.estado
        if solicitud.datos is not None:
            datos_actualizacion['datos'] = solicitud.datos
        
        if not datos_actualizacion:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")
        
        solicitud_actualizada = repo.update(solicitud_id_interno, datos_actualizacion)
        
        if not solicitud_actualizada:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Generar código público para la tasación
        tasacion_publico = generar_codigo_publico(TIPO_TASACION, solicitud_actualizada['tasacion_id']) if solicitud_actualizada['tasacion_id'] else None
        
        # Generar link público dinámicamente
        link_publico = f"https://tasador.app/s/{solicitud_id}"
        
        return SolicitudResponse(
            id=solicitud_id,
            usuario_id=solicitud_actualizada['usuario_id'],
            tasacion_id=tasacion_publico,
            link_publico=link_publico,
            estado=solicitud_actualizada['estado'],
            datos=solicitud_actualizada['datos'],
            fecha_creacion=solicitud_actualizada['fecha_creacion'],
            fecha_modificacion=solicitud_actualizada['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/solicitudes/{solicitud_id}")
def eliminar_solicitud(solicitud_id: str, usuario_id: int = Depends(middleware.get_current_user_id)):
    """Elimina una solicitud por código público."""
    logger.info(f"Eliminando solicitud: {solicitud_id}")
    
    try:
        # Decodificar código público a ID interno
        solicitud_id_interno = obtener_id_desde_codigo(solicitud_id)
        if not solicitud_id_interno:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        repo = SolicitudRepository()
        solicitud_existente = repo.find_by_id(solicitud_id_interno)
        
        if not solicitud_existente:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Verificar que la solicitud pertenezca al usuario autenticado
        if solicitud_existente['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta solicitud")
        
        eliminado = repo.delete(solicitud_id_interno)
        
        if not eliminado:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        return {"mensaje": "Solicitud eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/solicitudes/link/{link_publico:path}/contribuir", response_model=SolicitudResponse)
def contribuir_solicitud(link_publico: str, payload: SolicitudContribuirRequest):
    """Recibe comparables como respuesta a una solicitud pública y los persiste."""
    logger.info(f"Contribuyendo a solicitud: {link_publico}")

    try:
        repo = SolicitudRepository()
        solicitud = repo.find_by_link_publico(link_publico)

        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        if solicitud['estado'] != 'pendiente':
            raise HTTPException(status_code=400, detail="La solicitud ya fue respondida o expiró")

        if not payload.comparables:
            raise HTTPException(status_code=400, detail="No se proporcionaron comparables")

        id_interno = solicitud['id']
        usuario_id = solicitud['usuario_id']
        colaborador = payload.colaborador or {}
        id_creador = colaborador.get('usuario_id')
        nombre_creador = colaborador.get('nombre')

        for item in payload.comparables:
            datos = item.get('datos') or item
            if not isinstance(datos, dict):
                raise HTTPException(status_code=400, detail="Cada comparable debe tener datos válidos")

            tipo_inmueble = (datos.get('tipoInmueble') or datos.get('tipo') or solicitud.get('tipo_inmueble') or 'lote').lower()
            origen_solicitud = datos.get('origen_solicitud') or item.get('origen') or 'manual'

            if origen_solicitud == 'tasacion':
                fuente = 'de_tasacion'
            else:
                fuente = 'manual'

            datos['origen_solicitud'] = origen_solicitud
            if 'origen_id' not in datos and item.get('originalId'):
                datos['origen_id'] = item.get('originalId')

            comparable_creado = _crear_comparable(
                usuario_id=usuario_id,
                tipo_inmueble=tipo_inmueble,
                fuente=fuente,
                datos=datos,
                solicitud_origen_id=id_interno
            )

            # Guardar metadatos del colaborador en el comparable
            ComparableRepository().update(
                comparable_creado['id'],
                {
                    'id_creador': id_creador,
                    'nombre_creador': nombre_creador
                }
            )

        # Completar la solicitud
        solicitud_actualizada = repo.update(id_interno, {
            'estado': 'completada',
            'fecha_completacion': 'now()'
        })

        # Generar código público para la solicitud y tasación
        codigo_publico = generar_codigo_publico(TIPO_SOLICITUD, solicitud_actualizada['id'])
        tasacion_publico = generar_codigo_publico(TIPO_TASACION, solicitud_actualizada['tasacion_id']) if solicitud_actualizada['tasacion_id'] else None

        # Generar link público dinámicamente
        link_publico = f"https://tasador.app/s/{codigo_publico}"

        return SolicitudResponse(
            id=codigo_publico,
            usuario_id=solicitud_actualizada['usuario_id'],
            tasacion_id=tasacion_publico,
            link_publico=link_publico,
            estado=solicitud_actualizada['estado'],
            datos=solicitud_actualizada['datos'],
            fecha_creacion=solicitud_actualizada['fecha_creacion'],
            fecha_modificacion=solicitud_actualizada['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al contribuir a la solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
#   ENDPOINTS DE AUTENTICACIÓN
# =========================

@app.post("/api/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest):
    """Registra un nuevo usuario y retorna un token JWT."""
    logger.info(f"Intentando registrar usuario: {request.email}")
    
    try:
        repo = UsuarioRepository()
        
        # Verificar si el email ya existe
        usuario_existente = repo.find_by_email(request.email)
        if usuario_existente:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        
        # Hashear la contraseña
        password_hash = auth.hash_password(request.password)
        
        # Crear usuario
        nuevo_usuario = repo.create_usuario({
            'email': request.email,
            'password_hash': password_hash,
            'nombre': request.nombre,
            'apellido': request.apellido,
            'estado': 'activo'
        })
        
        # Actualizar último acceso
        repo.update_ultimo_acceso(nuevo_usuario['id'])
        
        # Crear token JWT
        access_token = auth.create_access_token(data={"sub": str(nuevo_usuario['id'])})
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            usuario_id=nuevo_usuario['id'],
            email=nuevo_usuario['email'],
            nombre=nuevo_usuario['nombre'],
            apellido=nuevo_usuario['apellido']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al registrar usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """Autentica un usuario y retorna un token JWT."""
    logger.info(f"Intentando login: {request.email}")
    
    try:
        repo = UsuarioRepository()
        
        # Buscar usuario por email
        usuario = repo.find_by_email(request.email)
        if not usuario:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        
        # Verificar contraseña
        if not auth.verify_password(request.password, usuario['password_hash']):
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        
        # Verificar estado del usuario
        if usuario['estado'] != 'activo':
            raise HTTPException(status_code=403, detail="Usuario no está activo")
        
        # Actualizar último acceso
        repo.update_ultimo_acceso(usuario['id'])
        
        # Crear token JWT
        access_token = auth.create_access_token(data={"sub": str(usuario['id'])})
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            usuario_id=usuario['id'],
            email=usuario['email'],
            nombre=usuario['nombre'],
            apellido=usuario['apellido']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/logout")
def logout():
    """Endpoint de logout (el token se elimina en el cliente)."""
    return {"mensaje": "Logout exitoso"}


@app.post("/api/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    """Envía un email para recuperación de contraseña (preparado)."""
    logger.info(f"Solicitud de recuperación de contraseña: {request.email}")
    
    try:
        repo = UsuarioRepository()
        
        # Buscar usuario por email
        usuario = repo.find_by_email(request.email)
        if not usuario:
            # Por seguridad, no revelamos si el email existe o no
            return {"mensaje": "Si el email existe, se enviará un enlace de recuperación"}
        
        # Preparado para implementación futura
        # Generar token y enviar email
        
        return {"mensaje": "Funcionalidad de recuperación de contraseña preparada para implementación futura"}
    except Exception as e:
        logger.error(f"Error en forgot-password: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tablas/valvano")
def get_valvano_data():
    """Sirve el archivo JSON de coeficientes Valvano."""
    try:
        import json
        tablas_dir = os.path.join(os.path.dirname(__file__), 'tablas')
        valvano_file = os.path.join(tablas_dir, 'valvano_data.json')
        
        with open(valvano_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
    except FileNotFoundError:
        logger.error("Archivo valvano_data.json no encontrado")
        raise HTTPException(status_code=404, detail="Archivo de coeficientes Valvano no encontrado")
    except Exception as e:
        logger.error(f"Error al leer valvano_data.json: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/clean-db")
def endpoint_clean_db(usuario_id: int = Depends(middleware.require_admin)):
    """Endpoint temporal para limpiar la base de datos. Solo administradores."""
    tablas = ['tasacion_comparable', 'solicitudes', 'comparables', 'tasaciones']
    
    conn = get_connection()
    conn.autocommit = False
    cursor = conn.cursor()
    
    try:
        for tabla in tablas:
            cursor.execute(f'TRUNCATE TABLE {tabla} RESTART IDENTITY CASCADE')
        
        cursor.execute("UPDATE contadores SET valor = 100")
        
        conn.commit()
        return {
            "mensaje": "Base de datos limpiada exitosamente",
            "status": "success",
            "tablas_afectadas": tablas
        }
    except Exception as e:
        conn.rollback()
        logger.error(f"Error al limpiar base de datos: {e}")
        raise HTTPException(status_code=500, detail=f"Error al limpiar base de datos: {str(e)}")
    finally:
        cursor.close()
        release_connection(conn)

