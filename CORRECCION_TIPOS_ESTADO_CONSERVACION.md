# CORRECCIÓN DE INCOMPATIBILIDAD DE TIPOS: ESTADO DE CONSERVACIÓN

## Problema Identificado

**Error 400 Bad Request:**
```
TasacionDepartamentoRequest.estado_conservacion: Input should be a valid string; input_value=1.0, input_type=float
```

**Causa:**
- El modelo `TasacionDepartamentoRequest` tenía `estado_conservacion: str`
- El frontend envía el valor como número (`1.0`, `2.0`, etc.) en algunos casos
- Pydantic rechaza floats cuando espera strings

## Solución Implementada

### Archivo: `server/models.py`

**Cambios en `TasacionDepartamentoRequest`:**
1. Cambiado tipo de `estado_conservacion: str` a `estado_conservacion: str | float`
2. Agregado validator `@field_validator('estado_conservacion', mode='before')`
3. Normalización:
   - Si es float entero (2.0), convierte a int y luego a string → "2"
   - Si es float decimal (1.5), convierte a string → "1.5"
   - Si es string, usa tal cual (stripped)
4. Validación:
   - Solo acepta los 9 valores permitidos: {'1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'}
   - Rechaza valores inválidos como "6", "2.3", etc.

**Cambios en `TasacionCasaRequest`:**
- Idénticos a `TasacionDepartamentoRequest` para consistencia

## Pruebas Ejecutadas

### 1. Validación de Modelos

```python
# String "2" → "2" (str) ✅
# Float 2.0 → "2" (str) ✅
# String "1.5" → "1.5" (str) ✅
# Float 1.5 → "1.5" (str) ✅
# Valor "6" → ValueError ✅
# Valor "2.3" → ValueError ✅
```

### 2. Tasación de Departamentos

```python
# Float 2.0: C=0.9546, Valor=95465.00 ✅
# String "2": C=0.9546, Valor=95465.00 ✅
# Float 1.5: C=0.9663, Valor=96625.00 ✅
```

### 3. Tasación de Casas

```python
# Float 2.0: C=0.9546, Valor=95465.00 ✅
# String "2": C=0.9546, Valor=95465.00 ✅
```

### 4. Todos los 9 Estados (Departamentos y Casas)

```
Estado 1:    C=0.9664 ✅
Estado 1.5:  C=0.9663 ✅
Estado 2:    C=0.9546 ✅
Estado 2.5:  C=0.9286 ✅
Estado 3:    C=0.8820 ✅
Estado 3.5:  C=0.8116 ✅
Estado 4:    C=0.7211 ✅
Estado 4.5:  C=0.6157 ✅
Estado 5:    C=0.5000 ✅
```

### 5. Tests Automatizados

```bash
python -m pytest tests/test_ross_heidecke_nueve_estados.py -v
# Resultado: 14/14 pasados ✅
```

## Compatibilidad con Datos Históricos

✅ **Mantenida:**
- Las tasaciones antiguas que guardan estados como strings ("1", "2", etc.) siguen funcionando
- El validator acepta strings y los normaliza si es necesario
- No se requieren migraciones de datos

## Validación de Valores Permitidos

✅ **Implementada:**
- Solo se aceptan los 9 valores: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
- Valores inválidos son rechazados con error 400
- No se redondea ni trunca valores inválidos
- Valores intermedios como "2.3" son rechazados

## Archivos Modificados

1. **server/models.py**
   - `TasacionDepartamentoRequest.estado_conservacion`: `str` → `str | float`
   - `TasacionCasaRequest.estado_conservacion`: `str` → `str | float`
   - Agregado validator `normalizar_estado_conservacion` en ambos modelos

## Estado Final

✅ **Matriz Ross-Heidecke:** No modificada
✅ **Fórmula:** No modificada
✅ **Mapeo:** No modificado
✅ **Compatibilidad histórica:** Mantenida
✅ **Validación de tipos:** Acepta ambos string y float
✅ **Validación de valores:** Solo 9 valores permitidos
✅ **Tests:** 14/14 pasados
✅ **Tasación departamentos:** Funciona con ambos tipos
✅ **Tasación casas:** Funciona con ambos tipos

## Flujo Frontend-Backend

**Frontend:**
- `global.js`: Define 9 opciones con valores strings: `"1"`, `"1.5"`, `"2"`, etc.
- `tasacion-casa.js`: Guarda `estadoConservacionInput.value` (string)
- `tasacion-resultado.js`: Envía payload con `inmueble.estado_conservacion` (string)

**Backend:**
- `models.py`: Acepta string o float, normaliza a string, valida los 9 valores
- `tasador_departamentos.py`: Usa el valor normalizado
- `tasador_casas.py`: Usa el valor normalizado

**Resultado:**
- El frontend puede enviar strings o floats
- El backend normaliza y valida consistentemente
- No hay error 400 por incompatibilidad de tipos
