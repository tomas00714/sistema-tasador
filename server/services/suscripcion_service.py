import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException

from repositories.suscripcion_repository import SuscripcionRepository
from repositories.pago_repository import PagoRepository
from repositories.usuario_repository import UsuarioRepository
from services.mercado_pago_service import MercadoPagoService
import auth

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
        monto: float = 15000,
        moneda: str = 'ARS',
        frecuencia: int = 1,
        frecuencia_tipo: str = 'months',
        init_point: Optional[str] = None
    ) -> Dict[str, Any]:
        """Crea internamente una suscripción en estado pending.

        No integra Mercado Pago. El mp_external_reference se genera con un UUID
        estable para poder vincularlo posteriormente con eventos de Mercado Pago.

        Args:
            usuario_id: ID del usuario
            monto: Monto mensual
            moneda: Moneda
            frecuencia: Frecuencia numérica
            frecuencia_tipo: Tipo de frecuencia
            init_point: URL de checkout de Mercado Pago (opcional, si ya se creó en MP)

        Returns:
            Suscripción creada
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
            'estado': 'pending',
            'renovacion_automatica': True,
            'mp_preapproval_id': None,
            'mp_external_reference': mp_external_reference,
            'init_point': init_point,
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
        raw_response: Dict[str, Any],
        monto_neto: Optional[float] = None,
        comision_mp: Optional[float] = None
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
            monto_neto: Importe neto recibido (opcional)
            comision_mp: Comisión de MP (opcional)

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
            'monto_neto': monto_neto,
            'comision_mp': comision_mp,
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

    def vincular_suscripcion_mp_existente(
        self,
        usuario_id: int,
        mp_preapproval_id: str,
        external_reference: str
    ) -> Optional[Dict[str, Any]]:
        """Vincula una suscripción creada en MP directamente por el usuario.

        Este método se usa como fallback cuando recibimos un webhook de una suscripción
        que no está vinculada en nuestra DB (por ejemplo, si el usuario completó el checkout
        antes de que guardáramos el preapproval_id).

        Args:
            usuario_id: ID del usuario
            mp_preapproval_id: ID de la suscripción en Mercado Pago
            external_reference: Referencia externa de MP

        Returns:
            Suscripción actualizada o None si no se encuentra
        """
        # Buscar suscripción por external_reference (más directo que buscar todas del usuario)
        suscripcion = self.suscripcion_repo.find_by_external_reference(external_reference)
        
        if not suscripcion:
            logger.warning(f"No se encontró suscripción para external_reference={external_reference}")
            return None

        # Validar que la suscripción pertenezca al usuario correcto
        if suscripcion.get('usuario_id') != usuario_id:
            logger.warning(f"Suscripción external_reference={external_reference} pertenece a usuario_id={suscripcion['usuario_id']}, no {usuario_id}")
            return None

        # Validar que la suscripción no tenga ya un mp_preapproval_id diferente
        if suscripcion.get('mp_preapproval_id') and suscripcion['mp_preapproval_id'] != mp_preapproval_id:
            logger.warning(f"Suscripción ya tiene mp_preapproval_id diferente: {suscripcion['mp_preapproval_id']} vs {mp_preapproval_id}")
            return None

        # Actualizar con el preapproval_id de MP
        actualizada = self.suscripcion_repo.update(suscripcion['id'], {
            'mp_preapproval_id': mp_preapproval_id
        })

        logger.info(f"Suscripción MP vinculada: id={suscripcion['id']}, preapproval_id={mp_preapproval_id}")

        return actualizada

    def _obtener_info_trial(self, usuario_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene información del trial de un usuario.

        Returns:
            Dict con trial_inicio, trial_fin, trial_usado o None si no tiene trial.
        """
        usuario = self.usuario_repo.find_by_id(usuario_id)
        if not usuario:
            return None

        if not usuario.get('trial_usado'):
            return None

        return {
            'trial_inicio': usuario.get('trial_inicio'),
            'trial_fin': usuario.get('trial_fin'),
            'trial_usado': usuario.get('trial_usado', False)
        }

    def trial_esta_vigente(self, usuario_id: int) -> bool:
        """Verifica si el trial de un usuario está vigente."""
        trial_info = self._obtener_info_trial(usuario_id)
        if not trial_info:
            return False

        trial_fin = trial_info.get('trial_fin')
        if not trial_fin:
            return False

        return self._now() < trial_fin

    def activar_trial(self, usuario_id: int) -> Dict[str, Any]:
        """Activa el trial de 15 días para un usuario.

        La activación es atómica: usa UPDATE condicional para garantizar que
        dos solicitudes simultáneas no puedan activar el trial dos veces.
        Se activa solo cuando el usuario confirma explícitamente, no al registrarse.

        Args:
            usuario_id: ID del usuario

        Returns:
            Dict con trial_inicio y trial_fin

        Raises:
            HTTPException: Si el usuario ya usó su trial o no existe
        """
        # Verificar que el usuario existe
        usuario = self.usuario_repo.find_by_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Si ya tiene trial usado, rechazar inmediatamente (optimización)
        if usuario.get('trial_usado'):
            raise HTTPException(
                status_code=409,
                detail="El usuario ya utilizó su prueba gratuita"
            )

        ahora = self._now()
        fin = ahora + timedelta(days=15)

        # Actualizar de forma atómica usando UPDATE condicional
        activado = self.usuario_repo.activar_trial_atomico(usuario_id, ahora, fin)

        if not activado:
            # El UPDATE condicional falló porque trial_usado ya era true
            # (race condition: otra solicitud activó el trial antes que esta)
            raise HTTPException(
                status_code=409,
                detail="El usuario ya utilizó su prueba gratuita"
            )

        logger.info(f"Trial activado para usuario_id={usuario_id}, período={ahora} a {fin}")

        return {
            'trial_inicio': ahora,
            'trial_fin': fin
        }

    def tiene_acceso_pro_extendido(self, usuario_id: int) -> bool:
        """Verifica si un usuario tiene acceso Pro considerando múltiples fuentes.

        Fuentes de acceso (en orden de prioridad):
        1. Administrador (por email en variables de entorno)
        2. Suscripción Pro vigente (activa, en_gracia o cancelada con período vigente)
        3. Trial vigente

        Args:
            usuario_id: ID del usuario

        Returns:
            True si tiene acceso Pro, False en caso contrario
        """
        # 1. Verificar si es administrador
        usuario = self.usuario_repo.find_by_id(usuario_id)
        if not usuario:
            return False

        if auth.is_admin(usuario['email']):
            return True

        # 2. Verificar suscripción Pro vigente
        if self.tiene_acceso_pro(usuario_id):
            return True

        # 3. Verificar trial vigente
        if self.trial_esta_vigente(usuario_id):
            return True

        return False

    def obtener_estado_extendido(self, usuario_id: int) -> Dict[str, Any]:
        """Devuelve el estado completo de acceso de un usuario.

        Incluye información sobre suscripción, trial y si es admin.

        Args:
            usuario_id: ID del usuario

        Returns:
            Dict con tiene_acceso_pro, plan, estado, trial_info, is_admin
        """
        usuario = self.usuario_repo.find_by_id(usuario_id)
        if not usuario:
            return {
                'tiene_acceso_pro': False,
                'plan': 'Free',
                'estado': 'free',
                'trial_info': None,
                'is_admin': False
            }

        is_admin = auth.is_admin(usuario['email'])
        tiene_acceso_pro = self.tiene_acceso_pro_extendido(usuario_id)

        # Obtener estado de suscripción
        estado_suscripcion = self.obtener_estado(usuario_id)

        # Obtener info de trial
        trial_info = self._obtener_info_trial(usuario_id)
        if trial_info:
            trial_info['esta_vigente'] = self.trial_esta_vigente(usuario_id)

        # Determinar plan actual
        if is_admin:
            plan = 'Admin'
        elif tiene_acceso_pro:
            plan = 'Pro'
        else:
            plan = 'Free'

        return {
            'tiene_acceso_pro': tiene_acceso_pro,
            'plan': plan,
            'estado_suscripcion': estado_suscripcion.get('estado', 'free'),
            'trial_info': trial_info,
            'is_admin': is_admin
        }
