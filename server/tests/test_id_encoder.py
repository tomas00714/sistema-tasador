"""
Tests unitarios para el módulo id_encoder.

Este módulo prueba la funcionalidad de codificación y decodificación
del algoritmo Optimus implementado en utils/id_encoder.py.
"""

import unittest
import sys
import os

# Agregar el directorio padre al path para importar utils
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.id_encoder import (
    generar_codigo_publico,
    obtener_id_desde_codigo,
    validar_codigo,
    obtener_tipo_codigo,
    TIPO_TASACION,
    TIPO_COMPARABLE,
    TIPO_SOLICITUD,
    PRIME,
    MOD,
    XOR,
    _encode,
    _decode
)


class TestIDEncoder(unittest.TestCase):
    """Tests para las funciones de codificación/decodificación."""

    def test_encode_basic(self):
        """Test básico de codificación."""
        # Codificar ID 1
        codigo = _encode(1)
        self.assertIsInstance(codigo, str)
        self.assertTrue(len(codigo) > 0)
        self.assertTrue(codigo.isalnum())

    def test_encode_multiple(self):
        """Test de codificación de múltiples IDs."""
        # Codificar IDs consecutivos
        codigos = [_encode(i) for i in range(1, 11)]
        
        # Verificar que todos sean strings válidos
        for codigo in codigos:
            self.assertIsInstance(codigo, str)
            self.assertTrue(codigo.isalnum())
        
        # Verificar que no sean secuenciales (no deben ser correlacionados)
        # IDs consecutivos no deben producir códigos correlacionados
        self.assertNotEqual(codigos[0], codigos[1])
        self.assertNotEqual(codigos[1], codigos[2])

    def test_decode_basic(self):
        """Test básico de decodificación."""
        # Codificar y luego decodificar
        id_original = 1
        codigo = _encode(id_original)
        id_decodificado = _decode(codigo)
        
        self.assertEqual(id_decodificado, id_original)

    def test_decode_multiple(self):
        """Test de decodificación de múltiples códigos."""
        # Codificar varios IDs y decodificarlos
        ids_originales = [1, 10, 100, 1000, 10000]
        
        for id_original in ids_originales:
            codigo = _encode(id_original)
            id_decodificado = _decode(codigo)
            self.assertEqual(id_decodificado, id_original)

    def test_encode_decode_roundtrip(self):
        """Test de roundtrip: encode(decode(x)) == x."""
        # Para un código dado, encode(decode(codigo)) debe devolver el código original
        id_original = 42
        codigo = _encode(id_original)
        id_decodificado = _decode(codigo)
        codigo_recuperado = _encode(id_decodificado)
        
        self.assertEqual(codigo, codigo_recuperado)

    def test_decode_encode_roundtrip(self):
        """Test de roundtrip: decode(encode(id)) == id."""
        # Para un ID dado, decode(encode(id)) debe devolver el ID original
        ids_originales = [1, 5, 10, 100, 1000, 10000, 100000]
        
        for id_original in ids_originales:
            codigo = _encode(id_original)
            id_decodificado = _decode(codigo)
            self.assertEqual(id_decodificado, id_original)

    def test_generar_codigo_publico_basic(self):
        """Test básico de generación de código público."""
        codigo = generar_codigo_publico(TIPO_TASACION, 1)
        
        self.assertIsInstance(codigo, str)
        self.assertTrue(codigo.startswith(TIPO_TASACION))
        self.assertEqual(len(codigo), len(TIPO_TASACION) + len(_encode(1)))

    def test_generar_codigo_publico_tipos(self):
        """Test de generación de códigos para diferentes tipos."""
        id_interno = 1
        
        codigo_t = generar_codigo_publico(TIPO_TASACION, id_interno)
        codigo_c = generar_codigo_publico(TIPO_COMPARABLE, id_interno)
        codigo_s = generar_codigo_publico(TIPO_SOLICITUD, id_interno)
        
        self.assertTrue(codigo_t.startswith(TIPO_TASACION))
        self.assertTrue(codigo_c.startswith(TIPO_COMPARABLE))
        self.assertTrue(codigo_s.startswith(TIPO_SOLICITUD))
        
        # Los códigos base deben ser iguales (mismo ID)
        self.assertEqual(codigo_t[1:], codigo_c[1:])
        self.assertEqual(codigo_c[1:], codigo_s[1:])

    def test_generar_codigo_publico_invalid_tipo(self):
        """Test de generación con tipo inválido."""
        with self.assertRaises(ValueError):
            generar_codigo_publico('X', 1)

    def test_generar_codigo_publico_invalid_id(self):
        """Test de generación con ID inválido."""
        with self.assertRaises(ValueError):
            generar_codigo_publico(TIPO_TASACION, 0)
        
        with self.assertRaises(ValueError):
            generar_codigo_publico(TIPO_TASACION, -1)

    def test_obtener_id_desde_codigo_basic(self):
        """Test básico de obtención de ID desde código."""
        id_original = 1
        codigo = generar_codigo_publico(TIPO_TASACION, id_original)
        id_obtenido = obtener_id_desde_codigo(codigo)
        
        self.assertEqual(id_obtenido, id_original)

    def test_obtener_id_desde_codigo_multiple(self):
        """Test de obtención de ID desde múltiples códigos."""
        ids_originales = [1, 10, 100, 1000]
        
        for id_original in ids_originales:
            codigo = generar_codigo_publico(TIPO_TASACION, id_original)
            id_obtenido = obtener_id_desde_codigo(codigo)
            self.assertEqual(id_obtenido, id_original)

    def test_obtener_id_desde_codigo_invalid(self):
        """Test de obtención de ID desde código inválido."""
        # Código vacío
        self.assertIsNone(obtener_id_desde_codigo(''))
        
        # Código muy corto
        self.assertIsNone(obtener_id_desde_codigo('T'))
        
        # Prefijo inválido
        self.assertIsNone(obtener_id_desde_codigo('X123'))
        
        # Código inválido en base62
        self.assertIsNone(obtener_id_desde_codigo('T@#$'))

    def test_validar_codigo(self):
        """Test de validación de códigos."""
        codigo_valido = generar_codigo_publico(TIPO_TASACION, 1)
        
        # Validar código correcto
        self.assertTrue(validar_codigo(codigo_valido, TIPO_TASACION))
        
        # Validar con tipo incorrecto
        self.assertFalse(validar_codigo(codigo_valido, TIPO_COMPARABLE))
        
        # Validar código inválido
        self.assertFalse(validar_codigo('X123', TIPO_TASACION))

    def test_obtener_tipo_codigo(self):
        """Test de obtención de tipo desde código."""
        codigo_t = generar_codigo_publico(TIPO_TASACION, 1)
        codigo_c = generar_codigo_publico(TIPO_COMPARABLE, 1)
        codigo_s = generar_codigo_publico(TIPO_SOLICITUD, 1)
        
        self.assertEqual(obtener_tipo_codigo(codigo_t), TIPO_TASACION)
        self.assertEqual(obtener_tipo_codigo(codigo_c), TIPO_COMPARABLE)
        self.assertEqual(obtener_tipo_codigo(codigo_s), TIPO_SOLICITUD)
        
        # Código inválido
        self.assertIsNone(obtener_tipo_codigo('X123'))
        self.assertIsNone(obtener_tipo_codigo(''))

    # =========================
    # CASOS BORDE
    # =========================

    def test_caso_borde_id_1(self):
        """Test con el ID más pequeño válido."""
        id_original = 1
        codigo = generar_codigo_publico(TIPO_TASACION, id_original)
        id_obtenido = obtener_id_desde_codigo(codigo)
        
        self.assertEqual(id_obtenido, id_original)

    def test_caso_borde_id_grande(self):
        """Test con un ID grande."""
        id_original = 1000000
        codigo = generar_codigo_publico(TIPO_TASACION, id_original)
        id_obtenido = obtener_id_desde_codigo(codigo)
        
        self.assertEqual(id_obtenido, id_original)

    def test_caso_borde_id_cero(self):
        """Test con ID cero (inválido)."""
        with self.assertRaises(ValueError):
            generar_codigo_publico(TIPO_TASACION, 0)

    def test_caso_borde_id_negativo(self):
        """Test con ID negativo (inválido)."""
        with self.assertRaises(ValueError):
            generar_codigo_publico(TIPO_TASACION, -1)

    def test_caso_borde_codigo_vacio(self):
        """Test con código vacío."""
        self.assertIsNone(obtener_id_desde_codigo(''))

    def test_caso_borde_codigo_solo_prefijo(self):
        """Test con código que solo tiene prefijo."""
        self.assertIsNone(obtener_id_desde_codigo('T'))

    def test_caso_borde_codigo_caracteres_invalidos(self):
        """Test con código con caracteres inválidos."""
        self.assertIsNone(obtener_id_desde_codigo('T@#$%'))

    def test_caso_borde_prefijo_invalido(self):
        """Test con prefijo inválido."""
        self.assertIsNone(obtener_id_desde_codigo('X123'))
        self.assertIsNone(obtener_tipo_codigo('X123'))

    def test_caso_borde_case_sensitive(self):
        """Test de case-sensitivity."""
        codigo_original = generar_codigo_publico(TIPO_TASACION, 1)
        codigo_mayuscula = codigo_original.upper()
        
        # Debe fallar porque base62 es case-sensitive
        id_obtenido = obtener_id_desde_codigo(codigo_mayuscula)
        self.assertNotEqual(id_obtenido, 1)

    def test_caso_borde_ids_consecutivos_no_secuenciales(self):
        """Test de que IDs consecutivos no produzcan códigos secuenciales."""
        ids = [1, 2, 3, 4, 5]
        codigos = [_encode(id) for id in ids]
        
        # Verificar que los códigos no sean secuenciales
        # (no deben ser simplemente incrementos)
        for i in range(len(codigos) - 1):
            self.assertNotEqual(codigos[i], codigos[i + 1])

    def test_caso_borde_mismo_id_mismo_codigo(self):
        """Test de determinismo: mismo ID siempre produce mismo código."""
        id_original = 42
        
        codigo1 = _encode(id_original)
        codigo2 = _encode(id_original)
        codigo3 = _encode(id_original)
        
        self.assertEqual(codigo1, codigo2)
        self.assertEqual(codigo2, codigo3)

    def test_caso_borde_inyectividad(self):
        """Test de inyectividad: IDs diferentes producen códigos diferentes."""
        ids = [1, 2, 3, 10, 100, 1000]
        codigos = [_encode(id) for id in ids]
        
        # Verificar que no haya duplicados
        self.assertEqual(len(codigos), len(set(codigos)))

    def test_caso_borde_codigo_largo(self):
        """Test con código muy largo."""
        # Usar un ID grande que produzca un código largo
        id_original = 1000000000
        codigo = generar_codigo_publico(TIPO_TASACION, id_original)
        id_obtenido = obtener_id_desde_codigo(codigo)
        
        self.assertEqual(id_obtenido, id_original)


class TestIDEncoderConstants(unittest.TestCase):
    """Tests para las constantes del algoritmo."""

    def test_prime_es_primo(self):
        """Test de que PRIME sea efectivamente un número primo."""
        # Verificación simple: no es divisible por números pequeños
        for i in range(2, 100):
            if PRIME % i == 0:
                self.fail(f"PRIME ({PRIME}) es divisible por {i}")

    def test_mod_es_primo_mersenne(self):
        """Test de que MOD sea 2^63 - 1."""
        self.assertEqual(MOD, 2**63 - 1)

    def test_xor_es_positivo(self):
        """Test de que XOR sea positivo."""
        self.assertGreater(XOR, 0)

    def test_valores_constantes(self):
        """Test de que los valores sean los esperados."""
        self.assertEqual(PRIME, 1125899906842597)
        self.assertEqual(MOD, 9223372036854775807)
        self.assertEqual(XOR, 136291429)


if __name__ == '__main__':
    unittest.main()
