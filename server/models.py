from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime


def _normalizar_tipologia(tipologia: str) -> str:
    if not tipologia:
        return "medial"
    t = str(tipologia).lower().strip()
    t = t.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    t = t.replace("+", "_").replace(" ", "_").replace("(", "").replace(")", "")
    t = t.replace("_30m", "").replace("__", "_").strip("_")
    if t.startswith("esquina_"):
        return "esquina_larga" if "larga" in t else "esquina"
    if "esquina" in t and "larga" in t:
        return "esquina_larga"
    if "esquina" in t:
        return "esquina"
    return t


class Comparable(BaseModel):

    model_config = ConfigDict(extra='allow')

    direccion: str

    valor_total: float

    tipo_valor: str

    frente: float

    fondo: Optional[float] = None

    superficie: Optional[float] = None

    tipologia: Optional[str] = None

    ajuste_manual_porcentaje: float = 0


class TasacionLoteRequest(BaseModel):

    direccion: str

    tipologia: str

    calle_a: Optional[str] = None

    calle_b: Optional[str] = None

    zona: Optional[int] = None

    frente: float

    fondo: Optional[float] = None

    superficie: Optional[float] = None

    equipamientos: List[str] = []

    fot: Optional[float] = None
    fos: Optional[float] = None
    zonificacion: Optional[str] = None

    comparables: List[Comparable]

    metodo_homogeneizacion: str = "fitto_cervini"

    ajuste_final_porcentaje: float = 0

    valor_final_manual: Optional[float] = None

    @field_validator('zona', mode='before')
    @classmethod
    def normalizar_zona(cls, v):
        if v is None or v == '':
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    @field_validator('tipologia', mode='before')
    @classmethod
    def normalizar_tipologia_model(cls, v):
        return v if v is not None else "Medial"

    @model_validator(mode='after')
    def validar_zona_por_tipologia(self):
        t = _normalizar_tipologia(self.tipologia)
        if t in ("esquina", "esquina_larga") and self.zona is None:
            raise ValueError("La zona es requerida para lotes esquina / esquina larga")
        return self


class TasacionDepartamentoRequest(BaseModel):

    direccion: str

    tipo: str  # departamento o ph

    superficie_cubierta: float

    antiguedad: int  # años

    estado_conservacion: int  # 1-5, mapeado internamente a 1-9

    vida_util: Optional[int] = 80

    valor_m2_referencia: Optional[float] = None

    fot: Optional[float] = None
    fos: Optional[float] = None

    ajuste_final_porcentaje: float = 0

    valor_final_manual: Optional[float] = None

    comparables: List[Comparable] = []


class TasacionCasaRequest(BaseModel):

    direccion: str

    tipo: str = "casa"

    superficie_cubierta: float

    antiguedad: int = 0

    estado_conservacion: str

    vida_util: Optional[int] = 80

    caracteristica_constructiva: float

    fot: Optional[float] = None
    fos: Optional[float] = None
    zonificacion: Optional[str] = None

    valor_m2_referencia: Optional[float] = None

    ajuste_final_porcentaje: float = 0

    valor_final_manual: Optional[float] = None

    comparables: List[Comparable] = []


class TasacionRequest(BaseModel):
    """Request unificada para /tasar. Permite enviar el mismo payload
    para cualquier tipo de inmueble y el backend se encarga del dispatch."""

    tipo: str
    ubicacion: Dict[str, Any]
    inmueble: Dict[str, Any]
    comparables: List[Dict[str, Any]] = []
    ajuste_final_porcentaje: float = 0
    valor_final_manual: Optional[float] = None


# Modelos para CRUD de Tasaciones
class TasacionCreate(BaseModel):
    tipo: str  # 'lote', 'departamento', 'casa'
    estado: str = 'borrador'  # 'borrador', 'completada'
    datos: Dict[str, Any]  # Datos completos de la tasación (JSONB)
    comparables_ids: List[str] = []  # IDs de comparables asociados


class TasacionUpdate(BaseModel):
    estado: Optional[str] = None
    datos: Optional[Dict[str, Any]] = None
    comparables_ids: Optional[List[str]] = None


class TasacionResponse(BaseModel):
    id: str
    usuario_id: int
    tipo: str
    estado: str
    origen: str = 'propia'
    datos: Dict[str, Any]
    comparables_ids: List[str]
    fecha_creacion: datetime
    fecha_modificacion: datetime
    compartido_por: Optional[Dict[str, Any]] = None


# Modelos para CRUD de Comparables
class ComparableCreate(BaseModel):
    tipo_inmueble: str  # 'lote', 'departamento', 'casa'
    fuente: Literal['manual', 'de_tasacion', 'compartido']  # Coincide con el CHECK de la base de datos
    datos: Dict[str, Any]  # Datos completos del comparable (JSONB)


class ComparableUpdate(BaseModel):
    datos: Optional[Dict[str, Any]] = None


class ComparableBatchRequest(BaseModel):
    ids: List[str]


class ComparableResponse(BaseModel):
    id: str
    usuario_id: int
    tipo_inmueble: str
    fuente: str
    tasacion_origen_id: Optional[str] = None
    datos: Dict[str, Any]
    fecha_creacion: datetime
    fecha_modificacion: datetime


# Modelos para CRUD de Solicitudes
class SolicitudCreate(BaseModel):
    tasacion_id: str
    estado: str = 'pendiente'  # 'pendiente', 'aceptada', 'rechazada'
    datos: Dict[str, Any]  # Datos adicionales de la solicitud (JSONB)


class SolicitudUpdate(BaseModel):
    estado: Optional[str] = None
    datos: Optional[Dict[str, Any]] = None


class SolicitudResponse(BaseModel):
    id: str
    usuario_id: int
    tasacion_id: str
    link_publico: str
    estado: str
    datos: Dict[str, Any]
    fecha_creacion: datetime
    fecha_modificacion: datetime
    tipo_inmueble: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def set_tipo_inmueble(cls, values):
        datos = values.get('datos') or {}
        if values.get('tipo_inmueble') is None and isinstance(datos, dict):
            values['tipo_inmueble'] = datos.get('tipo') or datos.get('tipoInmueble')
        return values


class SolicitudContribuirRequest(BaseModel):
    comparables: List[Dict[str, Any]]
    colaborador: Optional[Dict[str, Any]] = None


# Modelos para compartir tasaciones
class TasacionCompartirResponse(BaseModel):
    token: str
    link: str
    estado: str
    usos_maximos: Optional[int] = None
    usos_realizados: int
    fecha_creacion: datetime
    fecha_expiracion: Optional[datetime] = None


class TasacionCompartirRequest(BaseModel):
    usos_maximos: Optional[int] = 1
    dias_expiracion: Optional[int] = 7


class VistaPreviaTasacionResponse(BaseModel):
    remitente_nombre: Optional[str] = None
    remitente_apellido: Optional[str] = None
    tipo_inmueble: str
    direccion: str
    localidad: str
    provincia: str
    valor_final: Optional[float] = None
    fecha_creacion: Optional[datetime] = None
    estado: str


class RevocarTasacionCompartidaResponse(BaseModel):
    mensaje: str


# Modelos para Autenticación
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    nombre: str
    apellido: str
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario_id: int
    email: str
    nombre: str
    apellido: str
    is_admin: bool


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# Modelos para Suscripciones
class SuscripcionCreate(BaseModel):
    usuario_id: int
    plan_id: int
    estado: Optional[str] = 'pending'
    fecha_inicio: Optional[datetime] = None
    fecha_fin_periodo: Optional[datetime] = None
    renovacion_automatica: bool = True
    mp_preapproval_id: Optional[str] = None
    mp_external_reference: Optional[str] = None
    monto: float = 10
    moneda: str = 'USD'
    frecuencia: int = 1
    frecuencia_tipo: str = 'months'


class SuscripcionUpdate(BaseModel):
    plan_id: Optional[int] = None
    estado: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin_periodo: Optional[datetime] = None
    renovacion_automatica: Optional[bool] = None
    fecha_cancelacion: Optional[datetime] = None
    mp_preapproval_id: Optional[str] = None
    mp_external_reference: Optional[str] = None
    monto: Optional[float] = None
    moneda: Optional[str] = None
    frecuencia: Optional[int] = None
    frecuencia_tipo: Optional[str] = None
    ultimo_pago_id: Optional[str] = None
    ultimo_pago_estado: Optional[str] = None
    ultimo_pago_fecha: Optional[datetime] = None
    proximo_intento_cobro: Optional[datetime] = None


class SuscripcionResponse(BaseModel):
    id: int
    usuario_id: int
    plan_id: int
    estado: str
    fecha_inicio: Optional[datetime]
    fecha_fin_periodo: Optional[datetime]
    renovacion_automatica: bool
    fecha_cancelacion: Optional[datetime]
    mp_preapproval_id: Optional[str]
    mp_external_reference: Optional[str]
    monto: float
    moneda: str
    frecuencia: int
    frecuencia_tipo: str
    ultimo_pago_id: Optional[str]
    ultimo_pago_estado: Optional[str]
    ultimo_pago_fecha: Optional[datetime]
    proximo_intento_cobro: Optional[datetime]
    creada_en: datetime


# Modelos para Pagos
class PagoCreate(BaseModel):
    suscripcion_id: int
    mp_authorized_payment_id: Optional[str] = None
    mp_payment_id: Optional[str] = None
    estado: Optional[str] = 'pending'
    monto: Optional[float] = None
    moneda: Optional[str] = None
    fecha_cobro: Optional[datetime] = None
    fecha_aprobacion: Optional[datetime] = None
    motivo_rechazo: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PagoUpdate(BaseModel):
    mp_authorized_payment_id: Optional[str] = None
    mp_payment_id: Optional[str] = None
    estado: Optional[str] = None
    monto: Optional[float] = None
    moneda: Optional[str] = None
    fecha_cobro: Optional[datetime] = None
    fecha_aprobacion: Optional[datetime] = None
    motivo_rechazo: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class PagoResponse(BaseModel):
    id: int
    suscripcion_id: int
    mp_authorized_payment_id: Optional[str]
    mp_payment_id: Optional[str]
    estado: str
    monto: Optional[float]
    moneda: Optional[str]
    fecha_cobro: Optional[datetime]
    fecha_aprobacion: Optional[datetime]
    motivo_rechazo: Optional[str]
    raw_response: Optional[Dict[str, Any]]
    creada_en: datetime


# Modelo de respuesta para el estado actual de suscripción del usuario
class EstadoSuscripcionResponse(BaseModel):
    tiene_acceso_pro: bool
    plan: str
    estado: str
    fecha_inicio: Optional[datetime]
    fecha_fin_periodo: Optional[datetime]
    renovacion_automatica: Optional[bool]


class CrearSuscripcionRequest(BaseModel):
    card_token_id: str
    back_url: str


# Modelos para Webhooks de Mercado Pago
class MercadoPagoWebhookData(BaseModel):
    id: str
    type: Optional[str] = None  # 'subscription_preapproval', 'subscription_authorized_payment', etc.


class MercadoPagoWebhookRequest(BaseModel):
    data: MercadoPagoWebhookData
