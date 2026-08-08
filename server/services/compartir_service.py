import secrets
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status

from repositories.tasacion_compartir_repository import TasacionCompartirRepository
from repositories.tasacion_repository import TasacionRepository
from repositories.comparable_repository import ComparableRepository
from repositories.usuario_repository import UsuarioRepository
from utils.hybrid_mapper import mapear_tasacion_a_columnas, mapear_comparable_a_columnas
from utils.id_encoder import generar_codigo_publico, obtener_id_desde_codigo, TIPO_TASACION

SHARE_DIAS_DEFAULT = 7
SHARE_USOS_DEFAULT = 1


class CompartirService:
    """Servicio para crear, validar y canjear enlaces de compartir tasaciones."""

    def _obtener_record(self, token: str) -> Optional[Dict[str, Any]]:
        repo = TasacionCompartirRepository()
        return repo.find_by_token(token)

    def _enlace_valido(self, record: Dict[str, Any]) -> None:
        if not record:
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

        if record['estado'] != 'activo':
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

        if record['fecha_expiracion'] and record['fecha_expiracion'] < datetime.utcnow():
            TasacionCompartirRepository().update(record['id'], {'estado': 'expirado'})
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

        if record['usos_maximos'] is not None and record['usos_realizados'] >= record['usos_maximos']:
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

    def crear_compartir(self, tasacion_id: int, usuario_id: int, usos_maximos: Optional[int] = None, dias_expiracion: Optional[int] = None) -> Dict[str, Any]:
        repo_tasacion = TasacionRepository()
        tasacion = repo_tasacion.find_by_id(tasacion_id)

        if not tasacion:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")

        if tasacion['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para compartir esta tasación")

        if tasacion['estado'] != 'completada':
            raise HTTPException(status_code=400, detail="Solo se pueden compartir tasaciones completadas")

        if usos_maximos is None or usos_maximos < 1:
            usos_maximos = SHARE_USOS_DEFAULT

        if dias_expiracion is None:
            dias_expiracion = SHARE_DIAS_DEFAULT

        token = secrets.token_urlsafe(32)

        fecha_expiracion = None
        if dias_expiracion > 0:
            fecha_expiracion = datetime.utcnow() + timedelta(days=dias_expiracion)

        data = {
            'token': token,
            'tasacion_id': tasacion_id,
            'usuario_id': usuario_id,
            'estado': 'activo',
            'usos_maximos': usos_maximos,
            'usos_realizados': 0,
            'fecha_expiracion': fecha_expiracion
        }

        repo = TasacionCompartirRepository()
        return repo.create_compartir(data)

    def obtener_vista_previa(self, token: str) -> Dict[str, Any]:
        record = self._obtener_record(token)
        self._enlace_valido(record)

        tasacion = TasacionRepository().find_by_id(record['tasacion_id'])
        if not tasacion:
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

        usuario = UsuarioRepository().find_by_id(record['usuario_id'])
        if not usuario:
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

        datos = tasacion.get('datos') or {}
        ubicacion = datos.get('ubicacion', {})
        resultado = datos.get('resultado', {})

        return {
            'remitente_nombre': usuario.get('nombre'),
            'remitente_apellido': usuario.get('apellido'),
            'tipo_inmueble': tasacion.get('tipo_inmueble'),
            'direccion': tasacion.get('direccion') or ubicacion.get('direccion'),
            'localidad': tasacion.get('localidad') or ubicacion.get('localidad'),
            'provincia': tasacion.get('provincia') or ubicacion.get('provincia'),
            'valor_final': tasacion.get('valor_final') or resultado.get('valor_final') or resultado.get('valorFinal'),
            'fecha_creacion': tasacion.get('fecha_creacion'),
            'estado': record['estado']
        }

    def copiar_tasacion(self, tasacion_id: int, destinatario_id: int, enviador_id: int) -> Dict[str, Any]:
        repo_tasacion = TasacionRepository()
        original = repo_tasacion.find_by_id(tasacion_id)

        if not original:
            raise HTTPException(status_code=404, detail="Tasación no encontrada")

        destinatario = UsuarioRepository().find_by_id(destinatario_id)
        if not destinatario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        nuevos_datos = deepcopy(original.get('datos') or {})
        nuevos_datos['origen'] = 'compartida'
        nuevos_datos['origenId'] = generar_codigo_publico(TIPO_TASACION, original['id'])

        columnas = mapear_tasacion_a_columnas(nuevos_datos)

        datos_tasacion = {
            'usuario_id': destinatario_id,
            'estado': original.get('estado') or 'completada',
            'origen': 'compartida',
            'origen_id': generar_codigo_publico(TIPO_TASACION, original['id']),
            'datos': nuevos_datos,
        }
        datos_tasacion.update(columnas)

        nueva_tasacion = repo_tasacion.create(datos_tasacion)

        comparables = repo_tasacion.obtener_comparables(original['id'])
        for orden, comp in enumerate(comparables):
            comp_datos = deepcopy(comp.get('datos') or {})

            if 'id' in comp_datos:
                del comp_datos['id']

            comp_datos['fuente'] = 'compartido'
            comp_datos['idEnviador'] = enviador_id
            comp_datos['idCreador'] = destinatario_id
            comp_datos['nombreCreador'] = f"{destinatario.get('nombre') or ''} {destinatario.get('apellido') or ''}".strip()
            comp_datos['fechaCreacion'] = datetime.utcnow().isoformat()

            if 'ubicacion' not in comp_datos or not isinstance(comp_datos['ubicacion'], dict):
                comp_datos['ubicacion'] = {}

            if comp.get('direccion') and not comp_datos['ubicacion'].get('direccion'):
                comp_datos['ubicacion']['direccion'] = comp['direccion']
            if comp.get('provincia') and not comp_datos['ubicacion'].get('provincia'):
                comp_datos['ubicacion']['provincia'] = comp['provincia']
            if comp.get('localidad') and not comp_datos['ubicacion'].get('localidad'):
                comp_datos['ubicacion']['localidad'] = comp['localidad']
            if comp.get('lat') is not None and comp_datos['ubicacion'].get('lat') is None:
                comp_datos['ubicacion']['lat'] = comp['lat']
            if comp.get('lon') is not None and comp_datos['ubicacion'].get('lon') is None:
                comp_datos['ubicacion']['lon'] = comp['lon']

            if comp.get('valor') is not None and comp_datos.get('valor') is None:
                comp_datos['valor'] = comp['valor']
            if comp_datos.get('valor') is None:
                comp_datos['valor'] = 0

            columnas_comp = mapear_comparable_a_columnas(comp_datos)

            datos_comparable = {
                'usuario_id': destinatario_id,
                'tipo_inmueble': comp.get('tipo_inmueble') or columnas_comp.get('tipo_inmueble') or 'lote',
                'fuente': 'compartido',
                'tasacion_origen_id': nueva_tasacion['id'],
                'id_enviador': enviador_id,
                'id_creador': destinatario_id,
                'nombre_creador': comp_datos['nombreCreador'],
                'datos': comp_datos,
            }
            datos_comparable.update(columnas_comp)

            if datos_comparable.get('valor') is None:
                datos_comparable['valor'] = 0

            nuevo_comparable = ComparableRepository().create(datos_comparable)
            repo_tasacion.agregar_comparable(nueva_tasacion['id'], nuevo_comparable['id'], orden)

        return nueva_tasacion

    def guardar_tasacion_compartida(self, token: str, destinatario_id: int) -> Dict[str, Any]:
        record = self._obtener_record(token)
        self._enlace_valido(record)

        nueva_tasacion = self.copiar_tasacion(record['tasacion_id'], destinatario_id, record['usuario_id'])

        repo = TasacionCompartirRepository()
        nuevos_usos = record['usos_realizados'] + 1
        nuevo_estado = record['estado']
        if record['usos_maximos'] is not None and nuevos_usos >= record['usos_maximos']:
            nuevo_estado = 'usado'

        repo.registrar_uso(record['id'], nuevos_usos, nuevo_estado)

        return nueva_tasacion

    def revocar_compartir(self, token: str, usuario_id: int) -> bool:
        record = self._obtener_record(token)
        if not record:
            raise HTTPException(status_code=404, detail="Enlace no encontrado")

        if record['usuario_id'] != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para revocar este enlace")

        if record['estado'] != 'activo':
            raise HTTPException(status_code=400, detail="El enlace ya no está activo")

        TasacionCompartirRepository().update(record['id'], {'estado': 'revocado'})
        return True

    def obtener_remitente(self, origen_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene los datos del usuario que originó una tasación compartida a partir de origen_id."""
        if not origen_id:
            return None

        try:
            original_id = obtener_id_desde_codigo(origen_id)
        except Exception:
            return None

        original = TasacionRepository().find_by_id(original_id)
        if not original:
            return None

        usuario = UsuarioRepository().find_by_id(original['usuario_id'])
        if not usuario:
            return None

        return {
            'nombre': usuario.get('nombre', ''),
            'apellido': usuario.get('apellido', ''),
            'inmobiliaria': '-'
        }
