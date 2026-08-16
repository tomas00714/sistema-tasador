import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException

from repositories.suscripcion_repository import SuscripcionRepository
from repositories.pago_repository import PagoRepository
from repositories.usuario_repository import UsuarioRepository

logger = logging.getLogger(__name__)


# Estados que, según la regla de negocio, representan una suscripción vigente
# (puede o no otorgar acceso dependiendo de la fecha_fin_periodo).
ESTADOS_VIGENTES = {'pending', 'activa', 'en_gracia', 'cancelada'}

# Estados que, estando dentro del período, otorgan acceso Pro.
ESTADOS_CON_ACCESO = {'activa', 'en_gracia', 'cancelada'}


class SuscripcionService:
    """Servicio central para la lógica de suscripciones y acceso Pro."""

    def __init__(self):
        self.suscripcion_repo = SuscripcionRepository()
        self.pago_repo = PagoRepository()
        self.usuario_repo = UsuarioRepository()

    @staticmethod
    def _now() -> datetime:
        """Devuelve el momento actual siguiendo la convención del proyecto (naive UTC)."""
        return datetime.utcnow()

    @staticmethod
    def normalizar_estado(suscripcion: Optional[Dict[str, Any]]) -> str:
        """Determina el estado conceptual de una suscripción según sus datos actuales.

        No modifica la base de datos. Es una función pura de evaluación.
        """
        if not suscripcion:
            return 'free'

        estado = suscripcion.get('estado')
        if estado == 'vencida':
            return 'vencida'

        if estado not in ESTADOS_VIGENTES:
            return estado or 'vencida'

        fecha_fin = suscripcion.get('fecha_fin_periodo')
        if fecha_fin is not None and SuscripcionService._now() > fecha_fin:
            return 'vencida'

        return estado

    def obtener_estado(self, usuario_id: int) -> Dict[str, Any]:
        """Devuelve el estado completo de suscripción de un usuario.

        Incluye si tiene acceso Pro, el plan, el estado normalizado y fechas.
        """
        suscripciones = self.suscripcion_repo.find_by_usuario(usuario_id)

        # Ordenar por fecha de fin descendente para priorizar la vigente más larga
        suscripciones_ordenadas = sorted(
            suscripciones,
            key=lambda s: (s.get('fecha_fin_periodo') or datetime.min, s.get('creada_en') or datetime.min),
            reverse=True
        )

        suscripcion_relevante = None
        for sus in suscripciones_ordenadas:
            estado_normalizado = self.normalizar_estado(sus)
            if estado_normalizado in ESTADOS_CON_ACCESO:
                suscripcion_relevante = sus
                break
            if estado_normalizado in ESTADOS_VIGENTES and suscripcion_relevante is None:
                # Guardamos la pending como relevante aunque no otorgue acceso
                suscripcion_relevante = sus

        if not suscripcion_relevante and suscripciones_ordenadas:
            # Si no hay ninguna con acceso, mostramos la más reciente (probablemente vencida)
            suscripcion_relevante = suscripciones_ordenadas[0]

        estado = self.normalizar_estado(suscripcion_relevante)

        if not suscripcion_relevante or estado == 'free':
            return {
                'tiene_acceso_pro': False,
                'plan': 'Free',
                'estado': 'free',
                'fecha_inicio': None,
                'fecha_fin_periodo': None,
                'renovacion_automatica': None,
            }

        tiene_acceso = estado in ESTADOS_CON_ACCESO

        return {
            'tiene_acceso_pro': tiene_acceso,
            'plan': 'Pro' if tiene_acceso else 'Free',
            'estado': estado,
            'fecha_inicio': suscripcion_relevante.get('fecha_inicio'),
            'fecha_fin_periodo': suscripcion_relevante.get('fecha_fin_periodo'),
            'renovacion_automatica': suscripcion_relevante.get('renovacion_automatica'),
        }

    def tiene_acceso_pro(self, usuario_id: int) -> bool:
        """Indica si un usuario tiene acceso Pro en este momento."""
        return self.obtener_estado(usuario_id)['tiene_acceso_pro']

    def crear_suscripcion_pendiente(
        self,
        usuario_id: int,
        plan_id: int,
        monto: float = 10.0,
        moneda: str = 'USD',
        frecuencia: int = 1,
        frecuencia_tipo: str = 'months'
    ) -> Dict[str, Any]:
        """Crea internamente una suscripción en estado pending.

        No integra Mercado Pago. El mp_external_reference se genera con un UUID
        estable para poder vincularlo posteriormente con eventos de Mercado Pago.
        """
        usuario = self.usuario_repo.find_by_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Verificación de compatibilidad antes de intentar insertar
        vigentes = self.suscripcion_repo.find_vigentes_por_usuario(usuario_id)
        if vigentes:
            raise HTTPException(
                status_code=409,
                detail="El usuario ya posee una suscripción vigente"
            )

        mp_external_reference = f"SUB-{usuario_id}-{uuid.uuid4().hex[:12]}"

        nueva = self.suscripcion_repo.create({
            'usuario_id': usuario_id,
            'plan_id': plan_id,
            'estado': 'pending',
            'renovacion_automatica': True,
            'mp_preapproval_id': None,
            'mp_external_reference': mp_external_reference,
            'monto': monto,
            'moneda': moneda,
            'frecuencia': frecuencia,
            'frecuencia_tipo': frecuencia_tipo,
        })

        return nueva

    def activar_suscripcion(
        self,
        suscripcion_id: int,
        fecha_inicio: datetime,
        fecha_fin_periodo: datetime,
        mp_pago_id: str,
        mp_pago_estado: str,
        mp_pago_fecha: datetime
    ) -> Dict[str, Any]:
        """Activa una suscripción tras recibir el primer pago aprobado.

        Args:
            suscripcion_id: ID de la suscripción
            fecha_inicio: Fecha de inicio del período pagado
            fecha_fin_periodo: Fecha de fin del período pagado
            mp_pago_id: ID del pago en Mercado Pago
            mp_pago_estado: Estado del pago en Mercado Pago
            mp_pago_fecha: Fecha del pago en Mercado Pago

        Returns:
            Suscripción actualizada
        """
        suscripcion = self.suscripcion_repo.find_by_id(suscripcion_id)
        if not suscripcion:
            raise HTTPException(status_code=404, detail="Suscripción no encontrada")

        if suscripcion['estado'] != 'pending':
            logger.warning(f"Intentando activar suscripción que no está pending: {suscripcion['estado']}")

        actualizada = self.suscripcion_repo.update(suscripcion_id, {
            'estado': 'activa',
            'fecha_inicio': fecha_inicio,
            'fecha_fin_periodo': fecha_fin_periodo,
            'ultimo_pago_id': mp_pago_id,
            'ultimo_pago_estado': mp_pago_estado,
            'ultimo_pago_fecha': mp_pago_fecha,
        })

        logger.info(f"Suscripción activada: id={suscripcion_id}, periodo={fecha_inicio} a {fecha_fin_periodo}")

        return actualizada

    def extender_periodo(
        self,
        suscripcion_id: int,
        fecha_fin_nueva: datetime,
        mp_pago_id: str,
        mp_pago_estado: str,
        mp_pago_fecha: datetime
    ) -> Dict[str, Any]:
        """Extiende el período de una suscripción activa tras un pago de renovación.

        Args:
            suscripcion_id: ID de la suscripción
            fecha_fin_nueva: Nueva fecha de fin del período
            mp_pago_id: ID del pago en Mercado Pago
            mp_pago_estado: Estado del pago en Mercado Pago
            mp_pago_fecha: Fecha del pago en Mercado Pago

        Returns:
            Suscripción actualizada
        """
        suscripcion = self.suscripcion_repo.find_by_id(suscripcion_id)
        if not suscripcion:
            raise HTTPException(status_code=404, detail="Suscripción no encontrada")

        actualizada = self.suscripcion_repo.update(suscripcion_id, {
            'fecha_fin_periodo': fecha_fin_nueva,
            'ultimo_pago_id': mp_pago_id,
            'ultimo_pago_estado': mp_pago_estado,
            'ultimo_pago_fecha': mp_pago_fecha,
        })

        logger.info(f"Período extendido: id={suscripcion_id}, nueva_fecha_fin={fecha_fin_nueva}")

        return actualizada

    def registrar_pago_aprobado(
        self,
        suscripcion_id: int,
        mp_authorized_payment_id: str,
        mp_payment_id: Optional[str],
        monto: float,
        moneda: str,
        fecha_aprobacion: datetime,
        raw_response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Registra un pago aprobado en la tabla pagos.

        Args:
            suscripcion_id: ID de la suscripción
            mp_authorized_payment_id: ID del authorized_payment en MP
            mp_payment_id: ID del payment en MP (si existe)
            monto: Monto del pago
            moneda: Moneda del pago
            fecha_aprobacion: Fecha de aprobación
            raw_response: Respuesta completa de MP

        Returns:
            Pago registrado
        """
        pago = self.pago_repo.create({
            'suscripcion_id': suscripcion_id,
            'mp_authorized_payment_id': mp_authorized_payment_id,
            'mp_payment_id': mp_payment_id,
            'estado': 'approved',
            'monto': monto,
            'moneda': moneda,
            'fecha_aprobacion': fecha_aprobacion,
            'raw_response': raw_response,
        })

        logger.info(f"Pago aprobado registrado: suscripcion_id={suscripcion_id}, mp_authorized_payment_id={mp_authorized_payment_id}")

        return pago

    def registrar_rechazo(
        self,
        suscripcion_id: int,
        mp_authorized_payment_id: str,
        mp_payment_id: Optional[str],
        monto: float,
        moneda: str,
        motivo_rechazo: str,
        raw_response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Registra un pago rechazado en la tabla pagos.

        NO extiende el período. Solo registra el rechazo para historial.

        Args:
            suscripcion_id: ID de la suscripción
            mp_authorized_payment_id: ID del authorized_payment en MP
            mp_payment_id: ID del payment en MP (si existe)
            monto: Monto del pago
            moneda: Moneda del pago
            motivo_rechazo: Motivo del rechazo
            raw_response: Respuesta completa de MP

        Returns:
            Pago registrado
        """
        pago = self.pago_repo.create({
            'suscripcion_id': suscripcion_id,
            'mp_authorized_payment_id': mp_authorized_payment_id,
            'mp_payment_id': mp_payment_id,
            'estado': 'rejected',
            'monto': monto,
            'moneda': moneda,
            'motivo_rechazo': motivo_rechazo,
            'raw_response': raw_response,
        })

        # Actualizar último pago en suscripción
        self.suscripcion_repo.update(suscripcion_id, {
            'ultimo_pago_id': mp_authorized_payment_id,
            'ultimo_pago_estado': 'rejected',
            'ultimo_pago_fecha': self._now(),
        })

        logger.info(f"Pago rechazado registrado: suscripcion_id={suscripcion_id}, motivo={motivo_rechazo}")

        return pago

    def cancelar_por_mp(
        self,
        preapproval_id: str
    ) -> Optional[Dict[str, Any]]:
        """Cancela una suscripción interna al recibir notificación de MP.

        NO revoca el acceso inmediatamente si el período está vigente.

        Args:
            preapproval_id: ID de la suscripción en Mercado Pago

        Returns:
            Suscripción actualizada o None si no se encuentra
        """
        suscripcion = self.suscripcion_repo.find_by_mp_preapproval_id(preapproval_id)
        if not suscripcion:
            logger.warning(f"No se encontró suscripción para preapproval_id: {preapproval_id}")
            return None

        actualizada = self.suscripcion_repo.update(suscripcion['id'], {
            'estado': 'cancelada',
            'renovacion_automatica': False,
            'fecha_cancelacion': self._now(),
        })

        logger.info(f"Suscripción cancelada por MP: id={suscripcion['id']}, preapproval_id={preapproval_id}")

        return actualizada
