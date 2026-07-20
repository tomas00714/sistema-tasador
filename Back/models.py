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


class ContadorRequest(BaseModel):
    tipo: str  # 'T', 'C', 'U', 'S'
    valor: int


class ContadorResponse(BaseModel):
    id: str  # Formato 'T-100'
    tipo: str
    valor: int


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

    estado_conservacion: int  # 1-9

    valor_m2_referencia: Optional[float] = None

    ajuste_final_porcentaje: float = 0

    valor_final_manual: Optional[float] = None

    comparables: List[Comparable] = []


class TasacionCasaRequest(BaseModel):

    direccion: str

    tipo: str = "casa"

    superficie_cubierta: float

    antiguedad: int = 0

    estado_conservacion: str

    calidad_construccion: float

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
    usuario_id: int = 1  # Usuario fijo por ahora
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
    datos: Dict[str, Any]
    comparables_ids: List[str]
    fecha_creacion: datetime
    fecha_modificacion: datetime


# Modelos para CRUD de Comparables
class ComparableCreate(BaseModel):
    usuario_id: int = 1  # Usuario fijo por ahora
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
    datos: Dict[str, Any]
    fecha_creacion: datetime
    fecha_modificacion: datetime


# Modelos para CRUD de Solicitudes
class SolicitudCreate(BaseModel):
    usuario_id: int = 1  # Usuario fijo por ahora
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
