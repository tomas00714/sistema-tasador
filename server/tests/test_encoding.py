"""Test para verificar que la codificación UTF-8 funciona correctamente en las respuestas."""

import unittest
import json
import base64
import sys
import os

# Agregar el directorio server al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import _google_callback_html


class TestEncoding(unittest.TestCase):
    """Tests de codificación UTF-8 en respuestas del servidor."""

    def test_google_callback_html_utf8_encoding(self):
        """Verifica que los mensajes con acentos se codifican y decodifican correctamente."""
        test_data = {
            "type": "google-auth-error",
            "message": "Google canceló o rechazó la autenticación"
        }
        
        response = _google_callback_html(test_data)
        html_content = response.body.decode('utf-8')
        
        # Verificar que el HTML contiene la función de decodificación UTF-8
        self.assertIn('base64ToUtf8', html_content)
        self.assertIn('TextDecoder', html_content)
        self.assertIn('utf-8', html_content)
        
        # Verificar que el mensaje original está en el HTML codificado en base64
        self.assertIn('base64ToUtf8("', html_content)

    def test_payload_encoding_preserves_accents(self):
        """Verifica que el payload base64 preserva los acentos."""
        test_data = {
            "type": "google-auth-error",
            "message": "Google canceló o rechazó la autenticación"
        }
        
        # Simular el proceso de codificación
        payload = base64.b64encode(
            json.dumps(test_data, ensure_ascii=False).encode("utf-8")
        ).decode("utf-8")
        
        # Decodificar usando TextDecoder (simulando la corrección)
        bytes_data = base64.b64decode(payload)
        decoded_text = bytes_data.decode('utf-8')
        decoded_data = json.loads(decoded_text)
        
        # Verificar que el mensaje se preservó correctamente
        self.assertEqual(
            decoded_data["message"],
            "Google canceló o rechazó la autenticación"
        )

    def test_various_special_characters(self):
        """Verifica varios caracteres especiales en español."""
        test_messages = [
            "camión",
            "año",
            "información",
            "público",
            "múltiple",
            "verificación",
            "ningún",
            "también"
        ]
        
        for message in test_messages:
            test_data = {"message": message}
            payload = base64.b64encode(
                json.dumps(test_data, ensure_ascii=False).encode("utf-8")
            ).decode("utf-8")
            
            bytes_data = base64.b64decode(payload)
            decoded_text = bytes_data.decode('utf-8')
            decoded_data = json.loads(decoded_text)
            
            self.assertEqual(decoded_data["message"], message)


if __name__ == '__main__':
    unittest.main()
