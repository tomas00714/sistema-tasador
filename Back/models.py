from pydantic import BaseModel
from typing import List, Optional


class Comparable(BaseModel):

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
