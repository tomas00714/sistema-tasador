"""
Test para verificar que el estado de conservación se envía correctamente
desde el frontend al backend para departamentos y casas.
"""

import pytest
from models import TasacionDepartamentoRequest, TasacionCasaRequest
from tasador_departamentos import tasar_departamento
from tasador_casas import tasar_casa


class TestEstadoConservacionFrontend:
    """Tests para verificar el flujo del estado de conservación desde el frontend."""

    def test_departamento_estado_1(self):
        """Test departamento con estado 1 (Nuevo / como nuevo)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=1,  # Enviado como int
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '1'
        assert resultado['rossHeidecke'] == pytest.approx(0.9664, rel=1e-4)

    def test_departamento_estado_1_str(self):
        """Test departamento con estado 1 enviado como string."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion='1',  # Enviado como string
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '1'
        assert resultado['rossHeidecke'] == pytest.approx(0.9664, rel=1e-4)

    def test_departamento_estado_1_5(self):
        """Test departamento con estado 1.5 (Muy bueno)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=1.5,  # Enviado como float
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '1.5'
        assert resultado['rossHeidecke'] == pytest.approx(0.9663, rel=1e-4)

    def test_departamento_estado_1_5_str(self):
        """Test departamento con estado 1.5 enviado como string."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion='1.5',  # Enviado como string
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '1.5'
        assert resultado['rossHeidecke'] == pytest.approx(0.9663, rel=1e-4)

    def test_departamento_estado_2(self):
        """Test departamento con estado 2 (Bueno)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=2,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '2'
        assert resultado['rossHeidecke'] == pytest.approx(0.9546, rel=1e-4)

    def test_departamento_estado_2_5(self):
        """Test departamento con estado 2.5 (Conservación normal)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=2.5,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '2.5'
        assert resultado['rossHeidecke'] == pytest.approx(0.9286, rel=1e-4)

    def test_departamento_estado_3(self):
        """Test departamento con estado 3 (Necesitado de reparaciones sencillas)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=3,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '3'
        assert resultado['rossHeidecke'] == pytest.approx(0.8820, rel=1e-4)

    def test_departamento_estado_3_5(self):
        """Test departamento con estado 3.5 (Necesitado de reparaciones moderadas)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=3.5,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '3.5'
        assert resultado['rossHeidecke'] == pytest.approx(0.8116, rel=1e-4)

    def test_departamento_estado_4(self):
        """Test departamento con estado 4 (Necesitado de reparaciones importantes)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=4,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '4'
        assert resultado['rossHeidecke'] == pytest.approx(0.7211, rel=1e-4)

    def test_departamento_estado_4_5(self):
        """Test departamento con estado 4.5 (Muy deteriorado)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=4.5,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '4.5'
        assert resultado['rossHeidecke'] == pytest.approx(0.6157, rel=1e-4)

    def test_departamento_estado_5(self):
        """Test departamento con estado 5 (Estado de demolición)."""
        datos = TasacionDepartamentoRequest(
            direccion='Test 123',
            tipo='departamento',
            superficie_cubierta=100,
            antiguedad=10,
            estado_conservacion=5,
            valor_m2_referencia=1000,
            comparables=[]
        )
        resultado = tasar_departamento(datos)
        assert resultado['estado_conservacion'] == '5'
        assert resultado['rossHeidecke'] == pytest.approx(0.5000, rel=1e-4)
