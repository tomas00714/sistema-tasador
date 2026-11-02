# DIAGNÓSTICO Y CORRECCIÓN: ERROR 500 AL TASAR DEPARTAMENTOS

## Paso 1: Causa Confirmada del Error 500

### Traceback Original (Reconstruido)

El error 500 se producía en `server/tasador_departamentos.py` en las líneas 121-122 del response:

```python
return {
    ...
    "coeficiente_k": round(coeficiente_k, 4),  # ❌ Variable no existe
    "coeficiente_depreciacion": round(coeficiente_depreciacion, 4),
    ...
}
```

**Excepción:** `NameError: name 'coeficiente_k' is not defined`

**Línea:** 121 de `tasador_departamentos.py`

**Causa:** Al simplificar el código de `tasador_departamentos.py` para usar `coeficiente_depreciacion_ross_heidecke()` directamente, se eliminó el cálculo manual de `coeficiente_k`, pero el response todavía intentaba devolver esta variable.

### Valores y Tipos de Datos Recibidos

El frontend envía:
- `estado_conservacion`: string (ej. `"1"`, `"1.5"`, `"2"`, etc.)
- `antiguedad`: int
- `superficie_cubierta`: float
- `valor_m2_referencia`: float

El modelo `TasacionDepartamentoRequest` tenía:
- `estado_conservacion: int` ❌ (causaba error de validación con valores decimales)

### Ubicación del Error

El error ocurría **durante** la construcción del response, **después** del cálculo exitoso de Ross-Heidecke. El cálculo funcionaba correctamente, pero al intentar devolver el resultado fallaba por la variable inexistente.

---

## Paso 2: Cambios Recientes Revisados

### A. `server/tablas/ross_heidecke.py`

**Cambios:**
1. Agregado `MAPEO_ESTADO_A_COLUMNA`: Mapeo directo de estado numérico a columna de tabla
2. Modificado `_parse_estado_ross_heidecke()`: Ahora acepta decimales y strings
3. Modificado `coeficiente_depreciacion_ross_heidecke()`: Usa `MAPEO_ESTADO_A_COLUMNA`
4. Mantenido `MAPEO_ESTADOS_CINCO_A_NUEVE` como referencia histórica (no usado activamente)

**NO MODIFICADO:**
- `TABLA_ROSS_HEIDECKE`: La matriz de datos permanece intacta ✅
- Fórmula matemática: `C = 1 - K/2` sin cambios ✅

### B. `server/tasador_departamentos.py`

**Cambios:**
1. Eliminadas importaciones de funciones auxiliares internas
2. Reemplazado cálculo manual por llamada a `coeficiente_depreciacion_ross_heidecke()`
3. **ERROR:** Response intentaba devolver `coeficiente_k` que ya no se calculaba

**Corrección aplicada:**
- Eliminado `"coeficiente_k": round(coeficiente_k, 4)` del response
- El response ahora solo devuelve `coeficiente_depreciacion` (que es C)

### C. `server/tasador_casas.py`

**Cambios:**
- Ninguno necesario (ya usaba `coeficiente_depreciacion_ross_heidecke()` directamente)

### D. `server/main.py`

**Cambios:**
- Modificado `_parse_estado_conservacion()`: Ahora devuelve float en lugar de int

### E. `server/models.py`

**Cambios:**
- Modificado `TasacionDepartamentoRequest.estado_conservacion`: `int` → `str`
- Esto permite aceptar valores decimales como strings

### F. `client/js/global.js`

**Cambios:**
- Ampliado `OPCIONES_ESTADO_CONSERVACION` de 5 a 9 opciones
- Valores: `"1"`, `"1.5"`, `"2"`, `"2.5"`, `"3"`, `"3.5"`, `"4"`, `"4.5"`, `"5"`

---

## Paso 3: Respuesta Precisa de Qué Cambió

### A. Matriz Ross-Heidecke

**¿Se modificaron los datos numéricos originales?**
- **NO** ✅
- La matriz `TABLA_ROSS_HEIDECKE` permanece intacta
- Verificación: Primera fila `[0.0, 0.032, 2.52, 8.09, 18.1, 33.2, 52.6, 75.2, 100.0]`
- Verificación: Última fila `[98.505, 98.505, 98.54, 98.63, 98.78, 99.0, 99.29, 99.63, 100.0]`

### B. Mapeo

**Antes del cambio:**
```
MAPEO_ESTADOS_CINCO_A_NUEVE:
  1 → 1   (columna 1.00)
  2 → 3   (columna 2.00)
  3 → 5   (columna 3.00)
  4 → 6   (columna 3.50)
  5 → 7   (columna 4.00)
```

**Después del cambio:**
```
MAPEO_ESTADO_A_COLUMNA:
  1.0 → 1.00
  1.5 → 1.50
  2.0 → 2.00
  2.5 → 2.50
  3.0 → 3.00
  3.5 → 3.50
  4.0 → 4.00
  4.5 → 4.50
  5.0 → 5.00
```

**Cambios en mapeo:**
- Estados 1, 2, 3: Sin cambios ✅
- Estado 4: `3.50` → `4.00` (columna diferente) ⚠️
- Estado 5: `4.00` → `5.00` (columna diferente) ⚠️
- Estados nuevos (1.5, 2.5, 3.5, 4.5): Agregados ✅

### C. Fórmula

**¿Cambió la fórmula matemática?**
- **NO** ✅
- Fórmula: `C = 1 - K/2` sin cambios
- Cambio únicamente en la selección de columna de la matriz

### D. Compatibilidad y Resultados de Estados Históricos

**Resultados actuales (antigüedad = 0):**

| Estado | C Histórico | C Nuevo | Cambio |
|--------|-------------|---------|--------|
| 1      | 1.0000      | 1.0000  | ✅ Igual |
| 2      | 0.9874      | 0.9874  | ✅ Igual |
| 3      | 0.9095      | 0.9095  | ✅ Igual |
| 4      | 0.8340      | 0.7370  | ⚠️ Cambia |
| 5      | 0.7370      | 0.5000  | ⚠️ Cambia |

**Por qué cambiaron los estados 4 y 5:**
- Decisión del usuario para mantener orden semántico correcto de los 9 estados
- Mapeo directo a columnas consecutivas evita conflicto con estados intermedios
- Mapeo histórico saltaba índices, lo que impedía incluir estados intermedios sin romper orden

### E. Error 500

**Causa exacta:**
- Variable `coeficiente_k` referenciada en response pero no definida
- Línea 121 de `tasador_departamentos.py`
- `NameError: name 'coeficiente_k' is not defined`

**Traceback (reconstruido):**
```
File "server/tasador_departamentos.py", line 121, in tasar_departamento
    "coeficiente_k": round(coeficiente_k, 4),
NameError: name 'coeficiente_k' is not defined
```

**Corrección aplicada:**
- Eliminado `"coeficiente_k": round(coeficiente_k, 4)` del response
- El response ahora solo devuelve `coeficiente_depreciacion` (que es C)

---

## Paso 4: Corrección y Verificación

### Cambio Mínimo Necesario

**Archivo:** `server/tasador_departamentos.py`
**Línea:** 121 (eliminada)
**Cambio:** Eliminar `"coeficiente_k": round(coeficiente_k, 4)` del response

**Archivo adicional:** `server/models.py`
**Línea:** 109
**Cambio:** `estado_conservacion: int` → `estado_conservacion: str`

### Pruebas Ejecutadas

#### 1. Tasación de Departamento (función directa)

```python
from models import TasacionDepartamentoRequest
from tasador_departamentos import tasar_departamento

datos = TasacionDepartamentoRequest(
    direccion='Test 123',
    tipo='departamento',
    superficie_cubierta=100,
    antiguedad=10,
    estado_conservacion='2',
    valor_m2_referencia=1000,
    comparables=[]
)

resultado = tasar_departamento(datos)
# ✅ Éxito: C=0.9546, Valor=95465.0
```

#### 2. Tasación de Casa (función directa)

```python
from models import TasacionCasaRequest
from tasador_casas import tasar_casa

datos = TasacionCasaRequest(
    direccion='Test 456',
    tipo='casa',
    superficie_cubierta=100,
    antiguedad=10,
    estado_conservacion='2',
    caracteristica_constructiva=1,
    valor_m2_referencia=1000,
    comparables=[...]
)

resultado = tasar_casa(datos)
# ✅ Éxito: C=0.9546, Valor=95465.0
```

#### 3. Todos los 9 Estados de Conservación

```
Estado 1:    C=0.9664, Valor=96640.00
Estado 1.5:  C=0.9663, Valor=96625.00
Estado 2:    C=0.9546, Valor=95465.00
Estado 2.5:  C=0.9286, Valor=92865.00
Estado 3:    C=0.8820, Valor=88195.00
Estado 3.5:  C=0.8116, Valor=81160.00
Estado 4:    C=0.7211, Valor=72110.00
Estado 4.5:  C=0.6157, Valor=61570.00
Estado 5:    C=0.5000, Valor=50000.00
```

**Resultado:** ✅ Todos los 9 estados funcionan correctamente

#### 4. Tests de Ross-Heidecke

```bash
python -m pytest tests/test_ross_heidecke_nueve_estados.py -v
```

**Resultado:** ✅ 14/14 tests pasados

---

## Resumen Final

### Archivos Modificados para Corregir el Error 500

1. **server/tasador_departamentos.py**
   - Eliminado `"coeficiente_k": round(coeficiente_k, 4)` del response (línea 121)
   - Causa: Variable no existía después de simplificación

2. **server/models.py**
   - Cambiado `estado_conservacion: int` → `estado_conservacion: str` (línea 109)
   - Causa: Pydantic rechazaba valores decimales como strings

### Estado de la Implementación

✅ **Matriz:** No modificada
✅ **Fórmula:** No modificada
✅ **Mapeo:** Actualizado a mapeo directo semántico
✅ **Parseo:** Actualizado para aceptar decimales
✅ **Tests:** 14/14 pasados
✅ **Tasación departamentos:** Funciona
✅ **Tasación casas:** Funciona
✅ **9 estados:** Todos funcionan

### Limitaciones

- No se probó el endpoint HTTP completo (requiere autenticación)
- No se probaron flujos de UI frontend-backend
- Los estados 4 y 5 cambian sus resultados (decisión del usuario)

### Próximos Pasos Recomendados

1. Probar el flujo completo en el frontend
2. Verificar que el frontend envíe correctamente los estados decimales
3. Monitorear logs en producción después del despliegue
4. Comunicar a usuarios el cambio en resultados de estados 4 y 5
