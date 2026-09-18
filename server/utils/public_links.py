"""Construcción y parseo de links públicos.

Única fuente de verdad para las URLs que el backend devuelve al frontend
para compartir solicitudes y tasaciones. La base configurable es
PUBLIC_APP_URL (URL pública del frontend), con default de desarrollo local.

Formatos soportados al parsear (compatibilidad con links históricos):
- Código público puro:            "S3ZjaGjVDYK"
- Path corto:                     ".../s/S3ZjaGjVDYK"
- Página pública con query param: ".../solicitud.html?link=S3ZjaGjVDYK"
"""

import os
from urllib.parse import urlparse, parse_qs

# URL base pública del frontend (sin barra final).
# Default: producción. En desarrollo local definir PUBLIC_APP_URL en .env,
# p.ej. http://127.0.0.1:5500/client (Live Server sirviendo la raíz del repo).
PUBLIC_APP_URL = os.getenv(
    "PUBLIC_APP_URL", "https://sistema-tasador.vercel.app"
).rstrip("/")


def link_solicitud_publico(codigo_publico: str) -> str:
    """Link que se comparte a terceros para responder una solicitud."""
    return f"{PUBLIC_APP_URL}/solicitud.html?link={codigo_publico}"


def link_compartir_publico(token: str) -> str:
    """Link para vista previa de tasación compartida.

    Mantiene compatibilidad con SHARE_BASE_URL (formato histórico: prefijo
    completo al que se concatena el token). Si no está definida, se deriva
    de PUBLIC_APP_URL.
    """
    base = os.getenv("SHARE_BASE_URL") or f"{PUBLIC_APP_URL}/compartir.html?token="
    return f"{base}{token}"


def extraer_codigo_de_link(link_o_codigo: str) -> str:
    """Extrae el código público de cualquiera de los formatos soportados.

    Devuelve el código (p.ej. 'S3ZjaGjVDYK') o string vacío si no se puede.
    """
    if not link_o_codigo:
        return ""

    valor = str(link_o_codigo).strip()

    # Formato página pública: ...?link=CODIGO (o ?l=CODIGO)
    query = parse_qs(urlparse(valor).query)
    for key in ("link", "l"):
        if query.get(key):
            valor = query[key][0].strip()
            break

    # Path corto .../s/CODIGO o código puro: último segmento
    return valor.rstrip("/").split("/")[-1].strip()
