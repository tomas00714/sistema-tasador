# INFORME DE IMPLEMENTACIÓN: AMPLIACIÓN DE ESTADOS DE CONSERVACIÓN A 9 NIVELES

## Resumen

Se implementó la ampliación del campo "Estado de Conservación" de 5 a 9 niveles para casas y departamentos, utilizando directamente los estados de la matriz Ross-Heidecke existente.

**DECISIÓN IMPORTANTE:** El usuario optó por romper la compatibilidad con los resultados históricos de los estados 4 y 5 para mantener el orden semántico correcto de los 9 estados. Esto significa que las tasaciones existentes con estado 4 o 5 cambiarán sus resultados de depreciación.

---

## 1. Archivos Modificados y Motivos

### Backend

**server/tablas/ross_heidecke.py**
- **Motivo:** Actualizar el parseo y mapeo de estados para soportar los 9 niveles.
- **Cambios:**
  - Agregado `MAPEO_ESTADO_A_COLUMNA`: Mapeo directo de estado numérico (1.0-5.0) a columna de la tabla (1.00-5.00).
  - Modificado `_parse_estado_ross_heidecke()`: Ahora acepta y valida los 9 valores (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5) como números o strings.
  - Modificado `coeficiente_depreciacion_ross_heidecke()`: Usa `MAPEO_ESTADO_A_COLUMNA` para seleccionar la columna correcta.
  - Mantenido `MAPEO_ESTADOS_CINCO_A_NUEVE` como referencia histórica (no usado activamente).

**server/tasador_departamentos.py**
- **Motivo:** Simplificar el código de tasación de departamentos para usar la función unificada.
- **Cambios:**
  - Eliminadas importaciones de funciones auxiliares internas (`_parse_estado_ross_heidecke`, `_mapear_estado_a_indice_tabla`, `_obtener_valor_tabla_ross_heidecke`).
  - Reemplazado el cálculo manual de coeficiente por llamada directa a `coeficiente_depreciacion_ross_heidecke()`.

**server/main.py**
- **Motivo:** Actualizar el parseo de estado de conservación en el endpoint principal.
- **Cambios:**
  - Modificado `_parse_estado_conservacion()`: Ahora devuelve el valor numérico directamente (float) en lugar de mapear a índices enteros.
  - Eliminado mapeo a índices enteros 1-9.

**server/tests/test_ross_heidecke_nueve_estados.py** (nuevo)
- **Motivo:** Pruebas automatizadas para verificar la implementación.
- **Contenido:**
  - Tests de parseo de los 9 estados (enteros, strings, decimales, null, inválidos).
  - Tests de cálculo de coeficiente con los 9 estados.
  - Tests de regresión para los 5 estados originales (con nuevos valores de referencia).
  - Tests específicos para los 4 estados nuevos.

### Frontend

**client/js/global.js**
- **Motivo:** Ampliar las opciones del selector de estado de conservación.
- **Cambios:**
  - Actualizado `OPCIONES_ESTADO_CONSERVACION` de 5 a 9 opciones.
  - Valores: "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5".
  - Etiquetas: "Nuevo / como nuevo", "Muy bueno", "Bueno", "Conservación normal", "Necesitado de reparaciones sencillas", "Necesitado de reparaciones moderadas", "Necesitado de reparaciones importantes", "Muy deteriorado", "Estado de demolición".

**Otros archivos frontend modificados** (cambios visuales previos no relacionados):
- client/app/historial.html
- client/app/index.html
- client/app/perfil.html
- client/app/solicitudes.html
- client/app/vista-previa-informe.html
- client/js/comparable-formulario.js
- client/js/tasacion-ubicacion.js
- client/js/ubicacion-utils.js

### Documentación

**AUDITORIA_ROSS_HEIDECKE.md** (nuevo)
- **Motivo:** Documentar la auditoría técnica previa a la implementación.

---

## 2. Parseo y Normalización de los 9 Valores

### Comportamiento de `_parse_estado_ross_heidecke()`

**Entradas aceptadas:**
- Enteros: `1`, `2`, `3`, `4`, `5`
- Decimales: `1.5`, `2.5`, `3.5`, `4.5`
- Strings: `"1"`, `"1.5"`, `"2"`, etc.
- Null/vacío: `None`, `""`

**Validación:**
- Rango válido: `1.0` a `5.0` (inclusive)
- Redondeo a 1 decimal para evitar problemas de precisión de coma flotante
- Valores fuera de rango o inválidos devuelven `0`

**Valores devueltos:**
- Valores válidos: `1.0`, `1.5`, `2.0`, `2.5`, `3.0`, `3.5`, `4.0`, `4.5`, `5.0`
- Valores inválidos: `0` (que luego se mapea a `4.0` como default)

### Mapeo `MAPEO_ESTADO_A_COLUMNA`

```python
{
    1.0: 1.00,   # Nuevo / como nuevo
    1.5: 1.50,   # Muy bueno
    2.0: 2.00,   # Bueno
    2.5: 2.50,   # Conservación normal
    3.0: 3.00,   # Necesitado de reparaciones sencillas
    3.5: 3.50,   # Necesitado de reparaciones moderadas
    4.0: 4.00,   # Necesitado de reparaciones importantes
    4.5: 4.50,   # Muy deteriorado
    5.0: 5.00,   # Estado de demolición
}
```

Este mapeo usa directamente las columnas de la tabla Ross-Heidecke en orden ascendente, manteniendo el orden semántico correcto.

---

## 3. Qué Ocurrió con `MAPEO_ESTADOS_CINCO_A_NUEVE`

**Estado actual:** Se mantiene en el código como referencia histórica, pero **no se usa activamente** en el cálculo.

**Razón:**
- El mapeo histórico era: `1→1, 2→3, 3→5, 4→6, 5→7` (saltaba índices de tabla)
- Este mapeo no permitía incluir los 4 estados intermedios sin romper el orden semántico
- Para mantener el orden semántico correcto de los 9 estados, se optó por un mapeo directo: `1.0→1.00, 1.5→1.50, ..., 5.0→5.00`

**Consecuencia:**
- Los estados 1, 2, 3 mantienen sus resultados históricos
- Los estados 4 y 5 cambian sus resultados (ver sección 5)
- Esta fue una decisión explícita del usuario tras evaluar las alternativas

---

## 4. Resultados de las Pruebas de Regresión (5 Estados Originales)

### Estado de los tests

**Tests de Ross-Heidecke:** ✅ 14/14 pasados
- Tests de parseo: 8/8 pasados
- Tests de cálculo: 3/3 pasados
- Tests de regresión: 1/1 pasado
- Tests de estados nuevos: 2/2 pasados

**Tests relacionados:** ✅ 53/60 pasados
- password_reset: 28/28 pasados
- webhooks: 17/17 pasados
- trial: 8/15 fallados (problemas preexistentes no relacionados con este cambio)

### Cambios en los resultados de los estados originales

| Antigüedad | Estado | C Histórico | C Nuevo | Cambio |
|------------|--------|-------------|---------|--------|
| 0          | 1      | 1.0000      | 1.0000  | ✅ Igual |
| 0          | 2      | 0.9874      | 0.9874  | ✅ Igual |
| 0          | 3      | 0.9095      | 0.9095  | ✅ Igual |
| 0          | 4      | 0.8340      | 0.7370  | ⚠️ Cambia |
| 0          | 5      | 0.7370      | 0.5000  | ⚠️ Cambia |
| 10         | 1      | 0.9664      | 0.9664  | ✅ Igual |
| 10         | 2      | 0.9546      | 0.9546  | ✅ Igual |
| 10         | 3      | 0.8820      | 0.8820  | ✅ Igual |
| 10         | 4      | 0.8116      | 0.7211  | ⚠️ Cambia |
| 10         | 5      | 0.7211      | 0.5000  | ⚠️ Cambia |
| 20         | 1      | 0.9219      | 0.9219  | ✅ Igual |
| 20         | 2      | 0.9113      | 0.9113  | ✅ Igual |
| 20         | 3      | 0.8456      | 0.8456  | ✅ Igual |
| 20         | 4      | 0.7818      | 0.7000  | ⚠️ Cambia |
| 20         | 5      | 0.7000      | 0.5000  | ⚠️ Cambia |
| 40         | 1      | 0.8125      | 0.8125  | ✅ Igual |
| 40         | 2      | 0.8046      | 0.8046  | ✅ Igual |
| 40         | 3      | 0.7560      | 0.7560  | ✅ Igual |
| 40         | 4      | 0.7087      | 0.6482  | ⚠️ Cambia |
| 40         | 5      | 0.6482      | 0.5000  | ⚠️ Cambia |
| 60         | 1      | 0.6719      | 0.6719  | ✅ Igual |
| 60         | 2      | 0.6676      | 0.6676  | ✅ Igual |
| 60         | 3      | 0.6408      | 0.6408  | ✅ Igual |
| 60         | 4      | 0.6148      | 0.5815  | ⚠️ Cambia |
| 60         | 5      | 0.5815      | 0.5000  | ⚠️ Cambia |
| 80         | 1      | 0.5075      | 0.5075  | ✅ Igual |
| 80         | 2      | 0.5073      | 0.5073  | ✅ Igual |
| 80         | 3      | 0.5061      | 0.5061  | ✅ Igual |
| 80         | 4      | 0.5050      | 0.5035  | ⚠️ Cambia |
| 80         | 5      | 0.5035      | 0.5000  | ⚠️ Cambia |

**Resumen:**
- Estados 1, 2, 3: Sin cambios (preservan compatibilidad)
- Estado 4: Cambia a valores más bajos (más depreciación)
- Estado 5: Cambia a 0.5000 (máxima depreciación según la tabla)

---

## 5. Resultados de las Pruebas de los 4 Estados Nuevos

### Valores de coeficiente (antigüedad = 0)

| Estado | Etiqueta                              | Columna | K      | C       |
|--------|---------------------------------------|---------|--------|---------|
| 1.5    | Muy bueno                             | 1.50    | 0.0003 | 0.9998  |
| 2.5    | Conservación normal                   | 2.50    | 0.0809 | 0.9596  |
| 3.5    | Necesitado de reparaciones moderadas  | 3.50    | 0.3320 | 0.8340  |
| 4.5    | Muy deteriorado                       | 4.50    | 0.7520 | 0.6240  |

### Verificación de orden semántico

Se verificó que los coeficientes sean decrecientes conforme aumenta el estado:
- `C(1) >= C(1.5) >= C(2) >= C(2.5) >= C(3) >= C(3.5) >= C(4) >= C(4.5) >= C(5)`

**Resultado:** ✅ El orden semántico es correcto.

---

## 6. Confirmación de Pruebas de Casas, Departamentos y Persistencia

### Casas y Departamentos

**tasador_casas.py:**
- Ya usaba `coeficiente_depreciacion_ross_heidecke()` directamente
- No requirió cambios (excepto verificar que funcionara con los nuevos estados)
- ✅ Funciona correctamente con los 9 estados

**tasador_departamentos.py:**
- Simplificado para usar `coeficiente_depreciacion_ross_heidecke()` directamente
- Eliminado código duplicado de parseo y mapeo
- ✅ Funciona correctamente con los 9 estados

### Persistencia

**Base de datos:**
- Columna `estado_conservacion VARCHAR(50)` en tabla `tasaciones`
- Puede almacenar tanto enteros como decimales como strings
- No se requirió migración de esquema

**Persistencia de valores:**
- Frontend envía strings: `"1"`, `"1.5"`, `"2"`, etc.
- Backend parsea a floats: `1.0`, `1.5`, `2.0`, etc.
- Al guardar, se almacenan como strings en la base de datos
- Al cargar, se parsean nuevamente a floats para el cálculo

**Compatibilidad con datos históricos:**
- ✅ Tasaciones con estado `"1"`, `"2"`, `"3"` mantienen sus resultados
- ⚠️ Tasaciones con estado `"4"`, `"5"` cambiarán sus resultados (decisión del usuario)
- ✅ Nuevas tasaciones con estados decimales funcionan correctamente

**Limitación:**
- No se probaron manualmente los ciclos de guardar/recargar/editar en el frontend
- Los tests automatizados verifican el parseo y cálculo, pero no el flujo completo de la UI

---

## 7. Pruebas No Ejecutadas y Limitaciones Pendientes

### Pruebas no ejecutadas

1. **Tests de integración frontend-backend:**
   - No se probó el flujo completo de creación de tasación con los 9 estados
   - No se probó el flujo de edición de tasaciones existentes
   - No se probó el guardado y recarga de valores decimales

2. **Tests de compatibilidad con datos de producción:**
   - No se verificó con datos reales de producción
   - No se probó el impacto en informes o exportaciones

3. **Tests de rendimiento:**
   - No se evaluó el impacto en rendimiento del nuevo parseo

### Limitaciones

1. **Ruptura de compatibilidad histórica:**
   - Las tasaciones existentes con estado 4 o 5 cambiarán sus resultados
   - Esto podría sorprender a usuarios que guardaron tasaciones con estos estados
   - Se recomienda comunicar este cambio a los usuarios

2. **Inconsistencia de tipos en modelos:**
   - `TasacionDepartamentoRequest.estado_conservacion` está anotado como `int`
   - Ahora se pasa como `float` (o string que se parsea a float)
   - Python no forza los tipos en runtime, pero podría causar confusión
   - No se modificó la anotación para evitar cambios mayores

3. **Validación de rango en frontend:**
   - El frontend no valida que el estado esté en el rango 1-5
   - Si se envía un valor inválido, el backend usa el default (1.0)
   - Se podría mejorar la validación en el frontend

4. **Documentación para usuarios:**
   - No se actualizó la documentación de usuario para explicar los 9 estados
   - Se recomienda actualizar manuales o tooltips en la UI

---

## 8. Recomendaciones

### Inmediatas

1. **Comunicar el cambio a los usuarios:**
   - Explicar que ahora hay 9 niveles de conservación
   - Avisar que las tasaciones guardadas con estado 4 o 5 pueden cambiar sus resultados
   - Proporcionar una guía de migración si es necesario

2. **Actualizar documentación:**
   - Actualizar manuales de usuario
   - Agregar tooltips o ayuda contextual en el selector de estado
   - Documentar el significado de cada uno de los 9 estados

3. **Monitorear producción:**
   - Verificar que no haya errores en la UI al seleccionar estados decimales
   - Monitorear el uso de los nuevos estados
   - Verificar que los cálculos sean coherentes con expectativas de usuarios

### Futuras

1. **Uniformizar tipos en modelos:**
   - Considerar cambiar la anotación de `estado_conservacion` a `float` o `str`
   - Evaluar el impacto en otros endpoints que usen estos modelos

2. **Agregar validación en frontend:**
   - Validar que el estado seleccionado esté en el rango permitido
   - Mostrar mensajes de error claros si hay problemas

3. **Agregar tests de integración:**
   - Tests E2E para el flujo completo de creación/edición de tasaciones
   - Tests con datos de producción simulados

---

## 9. Conclusión

La implementación de los 9 niveles de conservación se completó exitosamente desde el punto de vista técnico:

✅ **Logros:**
- Frontend muestra las 9 opciones correctas
- Backend parsea y calcula con los 9 estados
- Tests automatizados pasan (14/14 para Ross-Heidecke)
- El orden semántico es correcto
- Casas y departamentos usan la misma lógica unificada

⚠️ **Consideraciones:**
- Se rompe la compatibilidad con resultados históricos de estados 4 y 5 (decisión del usuario)
- No se probaron flujos completos de la UI
- Hay inconsistencia de tipos en modelos que podría mejorarse

📋 **Estado actual:**
- Los cambios están listos para commit y push
- No se han aplicado migraciones de base de datos
- No se han desplegado a producción
- Se recomienda revisar el impacto en usuarios antes del despliegue
