"""
Pruebas para la ampliación de Ross-Heidecke de 5 a 9 estados de conservación.

Este test:
1. Verifica el parseo de los 9 estados (incluyendo decimales)
2. Verifica el cálculo de coeficiente con los 9 estados
3. Verifica regresión de los 5 estados originales (con nuevos valores de referencia)
"""

import pytest
from tablas.ross_heidecke import (
    coeficiente_depreciacion_ross_heidecke,
    _parse_estado_ross_heidecke,
    MAPEO_ESTADO_A_COLUMNA,
    TABLA_ROSS_HEIDECKE
)


class TestParseoEstado:
    """Pruebas del parseo de estado de conservación."""

    def test_parseo_enteros_validos(self):
        """Verifica que los enteros válidos se parseen correctamente."""
        assert _parse_estado_ross_heidecke(1) == 1.0
        assert _parse_estado_ross_heidecke(2) == 2.0
        assert _parse_estado_ross_heidecke(3) == 3.0
        assert _parse_estado_ross_heidecke(4) == 4.0
        assert _parse_estado_ross_heidecke(5) == 5.0

    def test_parseo_strings_enteros(self):
        """Verifica que los strings de enteros se parseen correctamente."""
        assert _parse_estado_ross_heidecke("1") == 1.0
        assert _parse_estado_ross_heidecke("2") == 2.0
        assert _parse_estado_ross_heidecke("3") == 3.0
        assert _parse_estado_ross_heidecke("4") == 4.0
        assert _parse_estado_ross_heidecke("5") == 5.0

    def test_parseo_decimales_validos(self):
        """Verifica que los decimales válidos se parseen correctamente."""
        assert _parse_estado_ross_heidecke(1.5) == 1.5
        assert _parse_estado_ross_heidecke(2.5) == 2.5
        assert _parse_estado_ross_heidecke(3.5) == 3.5
        assert _parse_estado_ross_heidecke(4.5) == 4.5

    def test_parseo_strings_decimales(self):
        """Verifica que los strings de decimales se parseen correctamente."""
        assert _parse_estado_ross_heidecke("1.5") == 1.5
        assert _parse_estado_ross_heidecke("2.5") == 2.5
        assert _parse_estado_ross_heidecke("3.5") == 3.5
        assert _parse_estado_ross_heidecke("4.5") == 4.5

    def test_parseo_null_vacio(self):
        """Verifica comportamiento con null y vacío."""
        assert _parse_estado_ross_heidecke(None) == 0
        assert _parse_estado_ross_heidecke("") == 0

    def test_parseo_invalido(self):
        """Verifica comportamiento con valores inválidos."""
        assert _parse_estado_ross_heidecke("abc") == 0
        assert _parse_estado_ross_heidecke("texto") == 0

    def test_parseo_fuera_rango_entero(self):
        """Verifica comportamiento con enteros fuera de rango."""
        assert _parse_estado_ross_heidecke(0) == 0
        assert _parse_estado_ross_heidecke(6) == 0
        assert _parse_estado_ross_heidecke(10) == 0

    def test_parseo_fuera_rango_decimal(self):
        """Verifica comportamiento con decimales fuera de rango."""
        assert _parse_estado_ross_heidecke("0.5") == 0
        assert _parse_estado_ross_heidecke("5.5") == 0


class TestCoeficienteNueveEstados:
    """Pruebas del cálculo de coeficiente con 9 estados."""

    def test_todos_los_estados_valores_validos(self):
        """Verifica que los 9 estados produzcan valores válidos."""
        antiguedad = 20
        vida_util = 80

        for estado in [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]:
            c = coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util)
            assert 0.0 <= c <= 1.0, f"Estado {estado}: C={c} fuera de rango"

    def test_estados_orden_creciente(self):
        """Verifica que los estados en orden numérico produzcan coeficientes decrecientes."""
        antiguedad = 20
        vida_util = 80

        valores = []
        for estado in [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]:
            c = coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util)
            valores.append(c)

        # Verificar que los valores sean decrecientes (mayor estado = menor coeficiente)
        for i in range(len(valores) - 1):
            assert valores[i] >= valores[i+1], f"Estado {i+1} ({valores[i]}) debe ser >= estado {i+2} ({valores[i+1]})"

    def test_columnas_correctas_matriz(self):
        """Verifica que cada estado use la columna correcta de la matriz."""
        antiguedad = 0  # Porcentaje 0%
        vida_util = 80

        for estado, columna_esperada in MAPEO_ESTADO_A_COLUMNA.items():
            c = coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util)
            k_esperado = TABLA_ROSS_HEIDECKE[0][columna_esperada] / 100
            c_esperado = 1 - (k_esperado / 2)
            assert abs(c - c_esperado) < 0.0001, f"Estado {estado}: C={c} != C_esperado={c_esperado}"


class TestRegresionEstadosOriginales:
    """Pruebas de regresión para los 5 estados originales."""

    # Valores de referencia obtenidos con el mapeo actual
    # NOTA: Los estados 4 y 5 cambian sus resultados respecto al mapeo histórico
    # para mantener el orden semántico correcto.
    VALORES_REFERENCIA = {
        (0, 1): 1.0000,
        (0, 2): 0.9874,
        (0, 3): 0.9095,
        (0, 4): 0.7370,  # Cambiado de 0.8340 (histórico) a 0.7370 (nuevo)
        (0, 5): 0.5000,  # Cambiado de 0.7370 (histórico) a 0.5000 (nuevo)

        (10, 1): 0.9664,
        (10, 2): 0.9546,
        (10, 3): 0.8820,
        (10, 4): 0.7211,  # Cambiado de 0.8116
        (10, 5): 0.5000,  # Cambiado de 0.7211

        (20, 1): 0.9219,
        (20, 2): 0.9113,
        (20, 3): 0.8456,
        (20, 4): 0.7000,  # Cambiado de 0.7818
        (20, 5): 0.5000,  # Cambiado de 0.7000

        (40, 1): 0.8125,
        (40, 2): 0.8046,
        (40, 3): 0.7560,
        (40, 4): 0.6482,  # Cambiado de 0.7087
        (40, 5): 0.5000,  # Cambiado de 0.6482

        (60, 1): 0.6719,
        (60, 2): 0.6676,
        (60, 3): 0.6408,
        (60, 4): 0.5815,  # Cambiado de 0.6148
        (60, 5): 0.5000,  # Cambiado de 0.5815

        (80, 1): 0.5075,
        (80, 2): 0.5073,
        (80, 3): 0.5061,
        (80, 4): 0.5035,  # Cambiado de 0.5050
        (80, 5): 0.5000,  # Cambiado de 0.5035
    }

    def test_regresion_estados_originales(self):
        """Verifica que los 5 estados originales produzcan los valores esperados."""
        vida_util = 80

        for (antiguedad, estado), esperado in self.VALORES_REFERENCIA.items():
            c = coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util)
            assert abs(c - esperado) < 0.0001, \
                f"Ant={antiguedad}, Est={estado}: C={c:.4f} != esperado={esperado:.4f}"


class TestEstadosNuevos:
    """Pruebas específicas para los 4 estados nuevos."""

    def test_estados_nuevos_valores_validos(self):
        """Verifica que los 4 estados nuevos produzcan valores válidos."""
        antiguedad = 20
        vida_util = 80

        for estado in [1.5, 2.5, 3.5, 4.5]:
            c = coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util)
            assert 0.0 <= c <= 1.0, f"Estado {estado}: C={c} fuera de rango"

    def test_estados_nuevos_orden_semantico(self):
        """Verifica que los estados nuevos estén en el orden semántico correcto."""
        antiguedad = 20
        vida_util = 80

        # Obtener valores para estados consecutivos
        c_1 = coeficiente_depreciacion_ross_heidecke(antiguedad, 1, vida_util)
        c_1_5 = coeficiente_depreciacion_ross_heidecke(antiguedad, 1.5, vida_util)
        c_2 = coeficiente_depreciacion_ross_heidecke(antiguedad, 2, vida_util)

        c_2_5 = coeficiente_depreciacion_ross_heidecke(antiguedad, 2.5, vida_util)
        c_3 = coeficiente_depreciacion_ross_heidecke(antiguedad, 3, vida_util)

        c_3_5 = coeficiente_depreciacion_ross_heidecke(antiguedad, 3.5, vida_util)
        c_4 = coeficiente_depreciacion_ross_heidecke(antiguedad, 4, vida_util)

        c_4_5 = coeficiente_depreciacion_ross_heidecke(antiguedad, 4.5, vida_util)
        c_5 = coeficiente_depreciacion_ross_heidecke(antiguedad, 5, vida_util)

        # Verificar orden decreciente
        assert c_1 >= c_1_5 >= c_2, "1 >= 1.5 >= 2"
        assert c_2 >= c_2_5 >= c_3, "2 >= 2.5 >= 3"
        assert c_3 >= c_3_5 >= c_4, "3 >= 3.5 >= 4"
        assert c_4 >= c_4_5 >= c_5, "4 >= 4.5 >= 5"
