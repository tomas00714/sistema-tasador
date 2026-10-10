"""
Servicio de email usando Resend API.

Este servicio encapsula la integración con Resend para enviar correos
transaccionales de forma segura y testable.
"""

import os
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)


@dataclass
class EmailConfig:
    """Configuración del servicio de email."""
    api_key: str
    from_email: str
    frontend_url: str


class EmailService:
    """Servicio para enviar correos mediante Resend."""

    def __init__(self, config: Optional[EmailConfig] = None):
        """
        Inicializa el servicio de email.

        Args:
            config: Configuración del servicio. Si es None, se carga desde variables de entorno.
        """
        if config is None:
            config = self._load_config_from_env()

        self.config = config
        self.api_base_url = "https://api.resend.com/emails"

    def _load_config_from_env(self) -> EmailConfig:
        """Carga la configuración desde variables de entorno."""
        api_key = os.getenv("RESEND_API_KEY", "")
        from_email = os.getenv("EMAIL_FROM", "no-reply@acmstudio.com.ar")
        frontend_url = os.getenv("PUBLIC_APP_URL", "http://127.0.0.1:5500/client")

        if not api_key:
            logger.warning(
                "RESEND_API_KEY no está configurada. "
                "El servicio de email no funcionará correctamente."
            )

        return EmailConfig(
            api_key=api_key,
            from_email=from_email,
            frontend_url=frontend_url
        )

    def is_configured(self) -> bool:
        """Verifica si el servicio está correctamente configurado."""
        return bool(self.config.api_key)

    async def send_password_reset_email(
        self,
        to_email: str,
        token: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Envía un email de recuperación de contraseña.

        Args:
            to_email: Email del destinatario.
            token: Token de recuperación (NO el hash).
            user_name: Nombre del usuario (opcional, para personalización).

        Returns:
            True si el email se envió correctamente, False en caso contrario.

        Raises:
            RuntimeError: Si el servicio no está configurado.
        """
        if not self.is_configured():
            raise RuntimeError(
                "EmailService no está configurado. "
                "Define RESEND_API_KEY en las variables de entorno."
            )

        # Construir URL de restablecimiento
        reset_url = f"{self.config.frontend_url}/restablecer-contrasena.html?token={token}"

        # Personalizar saludo
        saludo = user_name if user_name else to_email

        # HTML del email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperar Contraseña - ACM studio</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a; margin: 0;">ACM studio</h1>
                </div>

                <div style="background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #1a1a1a; margin-top: 0;">Recuperar Contraseña</h2>

                    <p style="margin-bottom: 20px;">
                        Hola {saludo},
                    </p>

                    <p style="margin-bottom: 20px;">
                        Recibimos una solicitud para restablecer tu contraseña. Si no realizaste esta solicitud,
                        puedes ignorar este email de forma segura.
                    </p>

                    <p style="margin-bottom: 20px;">
                        Para restablecer tu contraseña, haz clic en el siguiente enlace:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}"
                           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                                  text-decoration: none; border-radius: 6px; font-weight: 500;">
                            Restablecer Contraseña
                        </a>
                    </div>

                    <p style="margin-bottom: 20px;">
                        Este enlace expirará en 30 minutos por seguridad.
                    </p>

                    <p style="margin-bottom: 0; color: #666; font-size: 14px;">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                    </p>
                    <p style="margin: 5px 0; color: #666; font-size: 12px; word-break: break-all;">
                        {reset_url}
                    </p>
                </div>

                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                    <p style="margin: 0;">
                        Este es un email automático, por favor no respondas.
                    </p>
                    <p style="margin: 5px 0;">
                        © 2026 ACM studio. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        # Texto plano del email (para clientes que no soportan HTML)
        text_content = f"""
        Hola {saludo},

        Recibimos una solicitud para restablecer tu contraseña. Si no realizaste esta solicitud,
        puedes ignorar este email de forma segura.

        Para restablecer tu contraseña, visita el siguiente enlace:
        {reset_url}

        Este enlace expirará en 30 minutos por seguridad.

        Este es un email automático, por favor no respondas.
        © 2026 ACM studio. Todos los derechos reservados.
        """

        # Payload para Resend API
        payload = {
            "from": self.config.from_email,
            "to": [to_email],
            "subject": "Recuperar Contraseña - ACM studio",
            "html": html_content,
            "text": text_content
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_base_url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.config.api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )

                if response.status_code == 200:
                    logger.info(f"Email de recuperación enviado a {to_email}")
                    return True
                else:
                    logger.error(
                        f"Error al enviar email a {to_email}: "
                        f"Status {response.status_code}, Response: {response.text}"
                    )
                    return False

        except httpx.TimeoutException:
            logger.error(f"Timeout al enviar email a {to_email}")
            return False
        except httpx.HTTPError as e:
            logger.error(f"Error HTTP al enviar email a {to_email}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error inesperado al enviar email a {to_email}: {e}")
            return False


# Singleton global del servicio (se inicializa una vez)
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """
    Obtiene la instancia singleton del servicio de email.

    Returns:
        Instancia de EmailService.
    """
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
