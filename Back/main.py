import logging
import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from contextlib import asynccontextmanager

from models import (
    TasacionLoteRequest, TasacionDepartamentoRequest, TasacionCasaRequest, TasacionRequest,
    ContadorRequest, ContadorResponse,
    TasacionCreate, TasacionUpdate, TasacionResponse,
    Comparable, ComparableCreate, ComparableUpdate, ComparableBatchRequest, ComparableResponse,
    SolicitudCreate, SolicitudUpdate, SolicitudResponse, SolicitudContribuirRequest
)
from tasador_lotes import tasar_lote
from tasador_departamentos import tasar_departamento
from tasador_casas import tasar_casa
from database import init_db_pool, test_connection, close_db_pool
from migrations.migration_runner import MigrationRunner
from repositories.tasacion_repository import TasacionRepository
from repositories.comparable_repository import ComparableRepository
from repositories.solicitud_repository import SolicitudRepository
from repositories.contador_repository import ContadorRepository
from utils.hybrid_mapper import mapear_tasacion_a_columnas, mapear_comparable_a_columnas

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def _tasacion_public_id(tasacion_id_interno: int) -> str:
    """Obtiene el ID público de una tasación dado su ID interno."""
    if tasacion_id_interno is None:
        return None
    try:
        repo = TasacionRepository()
        tasacion = repo.find_by_id(tasacion_id_interno)
        return tasacion['id_publico'] if tasacion else None
    except Exception:
        return None


def _crear_comparable(usuario_id: int, tipo_inmueble: str, fuente: str,
                      datos: Dict[str, Any], solicitud_origen_id: int = None) -> Dict[str, Any]:
    """Crea un comparable nuevo. Retorna el registro recién creado."""
    repo = ComparableRepository()
    id_publico = ContadorRepository().generar_id('C')

    datos_comparable = {
        'id_publico': id_publico,
        'usuario_id': usuario_id,
        'tipo_inmueble': tipo_inmueble,
        'fuente': fuente,
        'datos': datos
    }
    if solicitud_origen_id is not None:
        datos_comparable['solicitud_origen_id'] = solicitud_origen_id
    datos_comparable.update(mapear_comparable_a_columnas(datos))

    return repo.create(datos_comparable)


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
            # Sincronizar contadores con IDs existentes para evitar duplicados
            # (especialmente util tras la migracion desde el antiguo sistema de archivos)
            try:
                ContadorRepository().sincronizar()
                logger.info("Contadores sincronizados con IDs existentes")
            except Exception as e:
                logger.warning(f"No se pudieron sincronizar contadores: {e}")
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


@app.post("/api/ids/generar", response_model=ContadorResponse)
def endpoint_generar_id(request: ContadorRequest):
    """Genera un nuevo ID incrementando el contador."""
    logger.info(f"Generando ID para tipo: {request.tipo}")
    
    try:
        repo = ContadorRepository()
        # Usar el valor enviado como valor inicial si el contador no existe
        valor_inicial = request.valor if request.valor is not None else 100
        id_generado = repo.generar_id(request.tipo, valor_inicial)
        
        return ContadorResponse(
            id=id_generado,
            tipo=request.tipo,
            valor=int(id_generado.split('-')[1])
        )
    except Exception as e:
        logger.error(f"Error al generar ID: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ids/inicializar", response_model=ContadorResponse)
def endpoint_inicializar_contador(request: ContadorRequest):
    """Inicializa un contador con un valor específico."""
    logger.info(f"Inicializando contador {request.tipo} con valor: {request.valor}")
    
    try:
        repo = ContadorRepository()
        contador = repo.set_valor(request.tipo, request.valor)
        
        return ContadorResponse(
            id=f"{request.tipo}-{contador['valor']}",
            tipo=request.tipo,
            valor=contador['valor']
        )
    except Exception as e:
        logger.error(f"Error al inicializar contador: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ids")
def endpoint_obtener_contadores():
    """Obtiene todos los contadores actuales."""
    logger.info("Obteniendo todos los contadores")
    
    try:
        repo = ContadorRepository()
        contadores = repo.get_all()
        
        # Formatear respuesta para compatibilidad con frontend
        return {c['tipo']: c['valor'] for c in contadores}
    except Exception as e:
        logger.error(f"Error al obtener contadores: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/migrations/run")
def endpoint_run_migrations():
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
def endpoint_migration_status():
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
def endpoint_tasar_lote(datos: TasacionLoteRequest):

    logger.info("Iniciando endpoint_tasar_lote")

    try:
        resultado = tasar_lote(datos)

        # 🔥 GUARDAR EN BASE
        repo = TasacionRepository()
        id_publico = ContadorRepository().generar_id('T')

        datos_tasacion = {
            "id_publico": id_publico,
            "usuario_id": 1,  # después lo hacemos dinámico
            "tipo": "lote",
            "estado": "completada",
            "datos": resultado
        }

        datos_tasacion.update(mapear_tasacion_a_columnas(resultado))

        repo.create(datos_tasacion)

        logger.info("Tasación guardada en DB")

        return resultado

    except ValueError as e:
        logger.error(f"ValueError en endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/tasar/departamento")
def endpoint_tasar_departamento(datos: TasacionDepartamentoRequest):

    logger.info("Iniciando endpoint_tasar_departamento")

    try:

        resultado = tasar_departamento(datos)

        logger.info("Finalizando endpoint_tasar_departamento")

        return resultado

    except ValueError as e:

        logger.error(f"ValueError en endpoint: {e}")

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


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
        calidad_construccion=float(inmueble.get("calidadConstruccionCoef", 1) or 1),
        valor_m2_referencia=None,
        ajuste_final_porcentaje=ajuste,
        valor_final_manual=manual,
        comparables=comparables,
    )


@app.post("/tasar")
def endpoint_tasar(request: TasacionRequest):
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
def crear_tasacion(tasacion: TasacionCreate):
    """Crea una nueva tasación."""
    logger.info(f"Creando tasación de tipo: {tasacion.tipo}")
    
    try:
        repo = TasacionRepository()
        # Generar ID público usando el contador de PostgreSQL
        id_publico = ContadorRepository().generar_id('T')
        
        # Construir datos de tasación con columnas específicas extraídas del JSON
        datos_tasacion = {
            'id_publico': id_publico,
            'usuario_id': tasacion.usuario_id,
            'tipo': tasacion.tipo,
            'estado': tasacion.estado,
            'datos': tasacion.datos
        }
        datos_tasacion.update(mapear_tasacion_a_columnas(tasacion.datos))
        
        tasacion_creada = repo.create(datos_tasacion)
        
        # Agregar comparables usando la tabla relacional
        if tasacion.comparables_ids:
            for orden, comp_id in enumerate(tasacion.comparables_ids):
                # Convertir ID público a ID interno
                comp_repo = ComparableRepository()
                comparable = comp_repo.find_where({"id_publico": comp_id}, limit=1)
                if comparable:
                    repo.agregar_comparable(tasacion_creada['id'], comparable[0]['id'], orden)
        
        # Obtener comparables para la respuesta
        comparables = repo.obtener_comparables(tasacion_creada['id'])
        comparables_ids = [c['id_publico'] for c in comparables]
        
        return TasacionResponse(
            id=tasacion_creada['id_publico'],
            usuario_id=tasacion_creada['usuario_id'],
            tipo=tasacion_creada['tipo'],
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
def obtener_tasacion(tasacion_id: str):
    """Obtiene una tasación por ID público."""
    logger.info(f"Obteniendo tasación: {tasacion_id}")
    
    try:
        repo = TasacionRepository()
        tasacion = repo.find_where({"id_publico": tasacion_id}, limit=1)
        
        if not tasacion:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Obtener comparables desde la tabla relacional
        comparables = repo.obtener_comparables(tasacion[0]['id'])
        comparables_ids = [c['id_publico'] for c in comparables]
        
        return TasacionResponse(
            id=tasacion[0]['id_publico'],
            usuario_id=tasacion[0]['usuario_id'],
            tipo=tasacion[0]['tipo'],
            estado=tasacion[0]['estado'],
            datos=tasacion[0]['datos'],
            comparables_ids=comparables_ids,
            fecha_creacion=tasacion[0]['fecha_creacion'],
            fecha_modificacion=tasacion[0]['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener tasación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasaciones", response_model=list[TasacionResponse])
def listar_tasaciones(usuario_id: int = 1, estado: str = None):
    """Lista todas las tasaciones de un usuario (opcionalmente filtrado por estado)."""
    logger.info(f"Listando tasaciones para usuario: {usuario_id}, estado: {estado}")
    
    try:
        repo = TasacionRepository()
        
        if estado:
            tasaciones = repo.get_by_usuario_and_estado(usuario_id, estado)
        else:
            tasaciones = repo.get_by_usuario(usuario_id)
        
        return [
            TasacionResponse(
                id=t['id_publico'],
                usuario_id=t['usuario_id'],
                tipo=t['tipo'],
                estado=t['estado'],
                datos=t['datos'],
                comparables_ids=[c['id_publico'] for c in repo.obtener_comparables(t['id'])],
                fecha_creacion=t['fecha_creacion'],
                fecha_modificacion=t['fecha_modificacion']
            )
            for t in tasaciones
        ]
    except Exception as e:
        logger.error(f"Error al listar tasaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/tasaciones/{tasacion_id}", response_model=TasacionResponse)
def actualizar_tasacion(tasacion_id: str, tasacion: TasacionUpdate):
    """Actualiza una tasación por ID público."""
    logger.info(f"Actualizando tasación: {tasacion_id}")
    
    try:
        repo = TasacionRepository()
        
        # Buscar tasación por ID público para obtener el ID interno
        tasacion_existente = repo.find_where({"id_publico": tasacion_id}, limit=1)
        if not tasacion_existente:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        id_interno = tasacion_existente[0]['id']
        
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
        
        tasacion_actualizada = repo.update(id_interno, datos_actualizacion) if datos_actualizacion else None
        
        if tasacion_actualizada is None and not datos_actualizacion:
            tasacion_actualizada = tasacion_existente[0]
        elif not tasacion_actualizada:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        # Actualizar comparables usando la tabla relacional
        if tasacion.comparables_ids is not None:
            # Eliminar relaciones existentes
            repo.limpiar_comparables(id_interno)
            
            # Agregar nuevas relaciones
            for orden, comp_id in enumerate(tasacion.comparables_ids):
                comp_repo = ComparableRepository()
                comparable = comp_repo.find_where({"id_publico": comp_id}, limit=1)
                if comparable:
                    repo.agregar_comparable(id_interno, comparable[0]['id'], orden)
        
        # Obtener comparables para la respuesta
        comparables = repo.obtener_comparables(id_interno)
        comparables_ids = [c['id_publico'] for c in comparables]
        
        return TasacionResponse(
            id=tasacion_actualizada['id_publico'],
            usuario_id=tasacion_actualizada['usuario_id'],
            tipo=tasacion_actualizada['tipo'],
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
def eliminar_tasacion(tasacion_id: str):
    """Elimina una tasación por ID público."""
    logger.info(f"Eliminando tasación: {tasacion_id}")
    
    try:
        repo = TasacionRepository()
        
        # Buscar tasación por ID público para obtener el ID interno
        tasacion_existente = repo.find_where({"id_publico": tasacion_id}, limit=1)
        if not tasacion_existente:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        id_interno = tasacion_existente[0]['id']
        
        eliminado = repo.delete(id_interno)
        
        if not eliminado:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        return {"mensaje": "Tasación eliminada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar tasación: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# ENDPOINTS CRUD PARA COMPARABLES
# =========================

@app.post("/api/comparables", response_model=ComparableResponse)
def crear_comparable(comparable: ComparableCreate):
    """Crea un nuevo comparable."""
    logger.info(f"Creando comparable de tipo: {comparable.tipo_inmueble}")

    try:
        comparable_creado = _crear_comparable(
            comparable.usuario_id,
            comparable.tipo_inmueble,
            comparable.fuente,
            comparable.datos
        )

        return ComparableResponse(
            id=comparable_creado['id_publico'],
            usuario_id=comparable_creado['usuario_id'],
            tipo_inmueble=comparable_creado['tipo_inmueble'],
            fuente=comparable_creado['fuente'],
            datos=comparable_creado['datos'],
            fecha_creacion=comparable_creado['fecha_creacion'],
            fecha_modificacion=comparable_creado['fecha_modificacion']
        )
    except Exception as e:
        logger.error(f"Error al crear comparable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/comparables/{comparable_id}", response_model=ComparableResponse)
def obtener_comparable(comparable_id: str):
    """Obtiene un comparable por ID público."""
    logger.info(f"Obteniendo comparable: {comparable_id}")
    
    try:
        repo = ComparableRepository()
        comparable = repo.find_where({"id_publico": comparable_id}, limit=1)
        
        if not comparable:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        return ComparableResponse(
            id=comparable[0]['id_publico'],
            usuario_id=comparable[0]['usuario_id'],
            tipo_inmueble=comparable[0]['tipo_inmueble'],
            fuente=comparable[0]['fuente'],
            datos=comparable[0]['datos'],
            fecha_creacion=comparable[0]['fecha_creacion'],
            fecha_modificacion=comparable[0]['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener comparable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/comparables/batch", response_model=list[ComparableResponse])
def obtener_comparables_batch(request: ComparableBatchRequest):
    """Obtiene múltiples comparables por sus IDs públicos."""
    logger.info(f"Obteniendo comparables batch: {request.ids}")
    
    try:
        repo = ComparableRepository()
        comparables = repo.find_by_public_ids(request.ids)
        
        return [
            ComparableResponse(
                id=c['id_publico'],
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
        logger.error(f"Error al obtener comparables batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/comparables", response_model=list[ComparableResponse])
def listar_comparables(usuario_id: int = 1, tipo_inmueble: str = None, fuente: str = None):
    """Lista todos los comparables de un usuario (opcionalmente filtrado)."""
    logger.info(f"Listando comparables para usuario: {usuario_id}, tipo: {tipo_inmueble}, fuente: {fuente}")
    
    try:
        repo = ComparableRepository()
        
        if tipo_inmueble and fuente:
            comparables = repo.get_by_usuario_tipo_origen(usuario_id, tipo_inmueble, fuente)
        elif tipo_inmueble:
            comparables = repo.get_by_usuario_tipo(usuario_id, tipo_inmueble)
        else:
            comparables = repo.get_by_usuario(usuario_id)
        
        return [
            ComparableResponse(
                id=c['id_publico'],
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
def actualizar_comparable(comparable_id: str, comparable: ComparableUpdate):
    """Actualiza un comparable por ID público."""
    logger.info(f"Actualizando comparable: {comparable_id}")
    
    try:
        repo = ComparableRepository()
        
        # Buscar comparable por ID público para obtener el ID interno
        comparable_existente = repo.find_where({"id_publico": comparable_id}, limit=1)
        if not comparable_existente:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        id_interno = comparable_existente[0]['id']
        
        if comparable.datos is None:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")
        
        # Actualizar datos y columnas específicas extraídas del JSON
        datos_actualizacion = {'datos': comparable.datos}
        datos_actualizacion.update(mapear_comparable_a_columnas(comparable.datos))
        
        comparable_actualizado = repo.update(id_interno, datos_actualizacion)
        
        if not comparable_actualizado:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        return ComparableResponse(
            id=comparable_actualizado['id_publico'],
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
def eliminar_comparable(comparable_id: str):
    """Elimina un comparable por ID público."""
    logger.info(f"Eliminando comparable: {comparable_id}")
    
    try:
        repo = ComparableRepository()
        
        # Buscar comparable por ID público para obtener el ID interno
        comparable_existente = repo.find_where({"id_publico": comparable_id}, limit=1)
        if not comparable_existente:
            raise HTTPException(status_code=404, detail="Comparable no encontrado")
        
        id_interno = comparable_existente[0]['id']
        
        eliminado = repo.delete(id_interno)
        
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
def crear_solicitud(solicitud: SolicitudCreate):
    """Crea una nueva solicitud."""
    logger.info(f"Creando solicitud para tasación: {solicitud.tasacion_id}")
    
    try:
        repo = SolicitudRepository()
        # Generar ID público usando el contador de PostgreSQL
        id_publico = ContadorRepository().generar_id('S')
        # Generar link público único
        link_publico = f"https://tasador.app/s/{id_publico}"
        
        # Convertir tasacion_id público a interno
        tasacion_repo = TasacionRepository()
        tasacion = tasacion_repo.find_where({"id_publico": solicitud.tasacion_id}, limit=1)
        if not tasacion:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")
        
        tasacion_id_interno = tasacion[0]['id']
        
        solicitud_creada = repo.create({
            'id_publico': id_publico,
            'usuario_id': solicitud.usuario_id,
            'tasacion_id': tasacion_id_interno,
            'link_publico': link_publico,
            'estado': solicitud.estado,
            'datos': solicitud.datos
        })
        
        return SolicitudResponse(
            id=solicitud_creada['id_publico'],
            usuario_id=solicitud_creada['usuario_id'],
            tasacion_id=solicitud.tasacion_id,
            link_publico=solicitud_creada['link_publico'],
            estado=solicitud_creada['estado'],
            datos=solicitud_creada['datos'],
            fecha_creacion=solicitud_creada['fecha_creacion'],
            fecha_modificacion=solicitud_creada['fecha_modificacion']
        )
    except Exception as e:
        logger.error(f"Error al crear solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/solicitudes/{solicitud_id}", response_model=SolicitudResponse)
def obtener_solicitud(solicitud_id: str):
    """Obtiene una solicitud por ID público."""
    logger.info(f"Obteniendo solicitud: {solicitud_id}")
    
    try:
        repo = SolicitudRepository()
        solicitud = repo.find_where({"id_publico": solicitud_id}, limit=1)
        
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        return SolicitudResponse(
            id=solicitud[0]['id_publico'],
            usuario_id=solicitud[0]['usuario_id'],
            tasacion_id=_tasacion_public_id(solicitud[0]['tasacion_id']),
            link_publico=solicitud[0]['link_publico'],
            estado=solicitud[0]['estado'],
            datos=solicitud[0]['datos'],
            fecha_creacion=solicitud[0]['fecha_creacion'],
            fecha_modificacion=solicitud[0]['fecha_modificacion']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener solicitud: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/solicitudes", response_model=list[SolicitudResponse])
def listar_solicitudes(usuario_id: int = 1, estado: str = None):
    """Lista todas las solicitudes de un usuario (opcionalmente filtrado por estado)."""
    logger.info(f"Listando solicitudes para usuario: {usuario_id}, estado: {estado}")
    
    try:
        repo = SolicitudRepository()
        
        if estado:
            solicitudes = repo.get_by_usuario_and_estado(usuario_id, estado)
        else:
            solicitudes = repo.get_by_usuario(usuario_id)
        
        # Resolver IDs públicos de tasaciones en batch
        tasacion_ids = list({s['tasacion_id'] for s in solicitudes if s['tasacion_id']})
        tasacion_public_ids = {}
        if tasacion_ids:
            tasaciones = TasacionRepository().find_by_ids(tasacion_ids)
            tasacion_public_ids = {t['id']: t['id_publico'] for t in tasaciones}
        
        return [
            SolicitudResponse(
                id=s['id_publico'],
                usuario_id=s['usuario_id'],
                tasacion_id=tasacion_public_ids.get(s['tasacion_id']),
                link_publico=s['link_publico'],
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
                id=c['id_publico'],
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
        
        return SolicitudResponse(
            id=solicitud['id_publico'],
            usuario_id=solicitud['usuario_id'],
            tasacion_id=_tasacion_public_id(solicitud['tasacion_id']),
            link_publico=solicitud['link_publico'],
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
def actualizar_solicitud(solicitud_id: str, solicitud: SolicitudUpdate):
    """Actualiza una solicitud por ID público."""
    logger.info(f"Actualizando solicitud: {solicitud_id}")
    
    try:
        repo = SolicitudRepository()
        
        # Buscar solicitud por ID público para obtener el ID interno
        solicitud_existente = repo.find_where({"id_publico": solicitud_id}, limit=1)
        if not solicitud_existente:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        id_interno = solicitud_existente[0]['id']
        
        datos_actualizacion = {}
        if solicitud.estado is not None:
            datos_actualizacion['estado'] = solicitud.estado
        if solicitud.datos is not None:
            datos_actualizacion['datos'] = solicitud.datos
        
        if not datos_actualizacion:
            raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")
        
        solicitud_actualizada = repo.update(id_interno, datos_actualizacion)
        
        if not solicitud_actualizada:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        return SolicitudResponse(
            id=solicitud_actualizada['id_publico'],
            usuario_id=solicitud_actualizada['usuario_id'],
            tasacion_id=_tasacion_public_id(solicitud_actualizada['tasacion_id']),
            link_publico=solicitud_actualizada['link_publico'],
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
def eliminar_solicitud(solicitud_id: str):
    """Elimina una solicitud por ID público."""
    logger.info(f"Eliminando solicitud: {solicitud_id}")
    
    try:
        repo = SolicitudRepository()
        
        # Buscar solicitud por ID público para obtener el ID interno
        solicitud_existente = repo.find_where({"id_publico": solicitud_id}, limit=1)
        if not solicitud_existente:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        id_interno = solicitud_existente[0]['id']
        
        eliminado = repo.delete(id_interno)
        
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

        return SolicitudResponse(
            id=solicitud_actualizada['id_publico'],
            usuario_id=solicitud_actualizada['usuario_id'],
            tasacion_id=_tasacion_public_id(solicitud_actualizada['tasacion_id']),
            link_publico=solicitud_actualizada['link_publico'],
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

