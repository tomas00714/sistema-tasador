# AUDITORÍA: COEFICIENTE ROSS-HEIDECKE NO SE ACTUALIZA EN EL RESULTADO FINAL

## 1. Seguimiento del Dato de Extremo a Extremo

### Etapa 1: Estado de Conservación Seleccionado en el Formulario

**Archivo:** `client/js/global.js` (líneas 225-234)
```javascript
const OPCIONES_ESTADO_CONSERVACION = [
    { label: '1 - Nuevo / como nuevo', valor: '1' },
    { label: '1.5 - Muy bueno', valor: '1.5' },
    { label: '2 - Bueno', valor: '2' },
    { label: '2.5 - Conservación normal', valor: '2.5' },
    { label: '3 - Necesitado de reparaciones sencillas', valor: '3' },
    { label: '3.5 - Necesitado de reparaciones moderadas', valor: '3.5' },
    { label: '4 - Necesitado de reparaciones importantes', valor: '4' },
    { label: '4.5 - Muy deteriorado', valor: '4.5' },
    { label: '5 - Estado de demolición', valor: '5' }
];
```

**Archivo:** `client/js/tasacion-casa.js` (líneas 417-418)
```javascript
if (estadoConservacionInput) {
    datosTasacion.casa.estadoConservacion = estadoConservacionInput.value;
}
```

**Valor:** String (ej. "2", "1.5", etc.)

### Etapa 2: Payload Enviado en POST /tasar

**Archivo:** `client/js/tasacion-resultado.js` (líneas 1316-1339)
```javascript
function armarPayloadTasacion(tipo) {
    const inmueble = JSON.parse(JSON.stringify(datosTasacion[tipo] || {}));
    return {
        tipo: tipo,
        ubicacion: datosTasacion.ubicacion,
        inmueble: inmueble,  // Incluye estadoConservacion como string
        comparables: datosTasacion.comparables || [],
        ajuste_final_porcentaje: 0,
        valor_final_manual: null
    };
}
```

**Valor enviado:** String en `inmueble.estado_conservacion`

### Etapa 3: Valor Recibido y Validado por Pydantic

**Archivo:** `server/models.py` (líneas 99-129)
```python
class TasacionDepartamentoRequest(BaseModel):
    estado_conservacion: str | float  # Acepta ambos tipos

    @field_validator('estado_conservacion', mode='before')
    @classmethod
    def normalizar_estado_conservacion(cls, v):
        """Normaliza a string y valida los 9 valores permitidos."""
        if isinstance(v, (int, float)):
            if isinstance(v, float) and v.is_integer():
                v_str = str(int(v))  # 2.0 → "2"
            else:
                v_str = str(v)  # 1.5 → "1.5"
        else:
            v_str = str(v).strip()

        valores_permitidos = {'1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'}
        if v_str not in valores_permitidos:
            raise ValueError(f"estado_conservacion debe ser uno de: {sorted(valores_permitidos)}")

        return v_str
```

**Valor validado:** String (ej. "2", "1.5")

### Etapa 4: Columna de la Matriz Ross-Heidecke Consultada

**Archivo:** `server/tablas/ross_heidecke.py` (líneas 80-109)
```python
def coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util=80):
    ant = int(antiguedad) if antiguedad else 0
    vu = int(vida_util) if vida_util else 80
    porcentaje_vida = round((ant / vu) * 100)
    porcentaje_vida = min(max(porcentaje_vida, 0), 99)

    estado_num = _parse_estado_ross_heidecke(estado)  # "2" → 2.0

    estado_columna = MAPEO_ESTADO_A_COLUMNA.get(estado_num, 4.00)
    # 2.0 → 2.00 (columna de la matriz)

    tabla_porcentaje = TABLA_ROSS_HEIDECKE.get(porcentaje_vida)
    valor_tabla = tabla_porcentaje.get(estado_columna)
    coeficiente_k = valor_tabla / 100
    return 1 - (coeficiente_k / 2)  # C = 1 - K/2
```

**Mapeo:** `MAPEO_ESTADO_A_COLUMNA` (líneas 4-18)
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

**Columna seleccionada:** Ej. estado "2" → 2.0 → columna 2.00

### Etapa 5: Coeficiente Calculado por el Backend

**Archivo:** `server/tasador_departamentos.py` (líneas 66-70)
```python
coeficiente_depreciacion = coeficiente_depreciacion_ross_heidecke(
    antiguedad, datos.estado_conservacion, vida_util
)
```

**Cálculo:** C = 1 - K/2, donde K viene de la matriz Ross-Heidecke

### Etapa 6: Valor Incluido en la Respuesta JSON

**Archivo:** `server/tasador_departamentos.py` (líneas 112-130)
```python
return {
    ...
    "coeficiente_depreciacion": round(coeficiente_depreciacion, 4),
    ...
    "rossHeidecke": round(coeficiente_depreciacion, 4),
    ...
}
```

**Valor devuelto:** 
- `coeficiente_depreciacion`: C redondeado a 4 decimales
- `rossHeidecke`: Mismo valor C redondeado a 4 decimales

### Etapa 7: Campo Frontend que Muestra "Ross-Heidecke"

**Archivo:** `client/js/config/resultados-config.js` (líneas 199, 212, 233, 267, 285, 297, 310)
```javascript
columnas_objetivo: [
    { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
    ...
]

renderizadores_objetivo: {
    obtenerDatosFila: (resultado, datosTasacion) => {
        const rossHeidecke = resultado.rossHeidecke ?? 1;
        // ...
        return {
            ...
            rossHeidecke,
            ...
        };
    }
}
```

**Campo que muestra:** `resultado.rossHeidecke` (del response JSON)

---

## 2. Comprobación Si el Resultado Cambia Realmente

### Pruebas de Backend (sin frontend)

```python
# Antigüedad = 10, superficie = 100, valor_m2 = 1000

Estado 1:
  Backend devuelve - coeficiente_depreciacion: 0.9664
  Backend devuelve - rossHeidecke: 0.9664
  Valor final: 96640.0

Estado 2:
  Backend devuelve - coeficiente_depreciacion: 0.9546
  Backend devuelve - rossHeidecke: 0.9546
  Valor final: 95465.0

Estado 3:
  Backend devuelve - coeficiente_depreciacion: 0.882
  Backend devuelve - rossHeidecke: 0.882
  Valor final: 88195.0

Estado 4:
  Backend devuelve - coeficiente_depreciacion: 0.7211
  Backend devuelve - rossHeidecke: 0.7211
  Valor final: 72110.0

Estado 5:
  Backend devuelve - coeficiente_depreciacion: 0.5
  Backend devuelve - rossHeidecke: 0.5
  Valor final: 50000.0
```

**Conclusión:** ✅ El backend SÍ cambia el coeficiente correctamente según el estado.

---

## 3. Investigación del Cuadro Final

### Código que Muestra el Cuadro

**Archivo:** `client/js/tasacion-resultado.js` (líneas 1292-1293)
```javascript
} else if (tipo === 'departamento' && typeof recalcularConCoeficientesDepartamento === 'function') {
    await recalcularConCoeficientesDepartamento();
}
```

**Archivo:** `client/js/tasacion-resultado.js` (líneas 441-552)
```javascript
function recalcularConCoeficientesDepartamento() {
    const r = resultadoTasacion;
    if (!r || !r.comparables || r.comparables.length === 0) return;

    // ... cálculo de coeficientes de comparables ...

    // Ross-Heidecke del objetivo (líneas 527-538)
    let targetRossHeidecke;
    if (r.coeficiente_depreciacion != null) {
        targetRossHeidecke = parseFloat(r.coeficiente_depreciacion) || 1;
    } else if (r.coeficiente_k != null) {
        const k = parseFloat(r.coeficiente_k) || 0;
        targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
    } else {
        const k = parseFloat(r.rossHeidecke || depto.rossHeidecke || 0);
        targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
    }

    const targetCoefTotal = targetUbicacionPlanta * targetUbicacionPiso * targetCaracteristicaConstructiva * targetSuperficieCubierta * targetUbicacion * targetActividad * targetPersonalizadoTotal * targetRossHeidecke;

    // Recalcular valor final (líneas 542-549)
    r.valor_m2 = valorPromedio * targetCoefTotal;
    r.valor_final = r.valor_m2 * superficieHomogeneizada;
    r.valor_promedio_homogeneizado = valorPromedio;
    r.superficie_homogeneizada = superficieHomogeneizada;
}
```

### CAUSA IDENTIFICADA

**El frontend RECALCULA el coeficiente Ross-Heidecke en el cliente**

El código en `recalcularConcoefficientesDepartamento()`:
1. Lee `r.coeficiente_depreciacion` del response del backend ✅
2. Lo usa como `targetRossHeidecke` ✅
3. Lo multiplica por otros coeficientes ✅
4. **SOBRESCRIBE `r.rossHeidecke` con el valor recalculado** ❌

El problema NO está en el backend (que devuelve los valores correctos), sino en que el frontend recalcula y sobrescribe el valor.

**Por qué siempre muestra ~0.95:**
- Si los coeficientes del objetivo (ubicación, planta, piso, etc.) son todos 1.0
- Y `targetRossHeidecke` viene del backend (ej. 0.9546 para estado 2)
- Entonces `targetCoefTotal = 1.0 * 1.0 * ... * 0.9546 = 0.9546`
- Pero este valor se usa para recalcular `valor_m2` y `valor_final`, NO para actualizar `r.rossHeidecke`
- **El campo `r.rossHeidecke` que muestra el cuadro NO se actualiza en esta función**

---

## 4. Revisión de la Implementación Reciente

### Cambio en `tasador_departamentos.py`

**Antes:**
```python
"coeficiente_k": round(coeficiente_k, 4),
"coeficiente_depreciacion": round(coeficiente_depreciacion, 4),
"rossHeidecke": round(coeficiente_depreciacion, 4),
```

**Después:**
```python
"coeficiente_depreciacion": round(coeficiente_depreciacion, 4),
"rossHeidecke": round(coeficiente_depreciacion, 4),
```

**Impacto:** El campo `coeficiente_k` ya no existe en el response.

### Código Frontend que Esperaba `coeficiente_k`

**Archivo:** `client/js/tasacion-resultado.js` (líneas 532-534)
```javascript
} else if (r.coeficiente_k != null) {
    const k = parseFloat(r.coeficiente_k) || 0;
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
}
```

**Problema:** Este código está intentando leer `r.coeficiente_k` que ya no existe.

### Comportamiento Actual del Frontend

1. Llama a `tasarAPI(payload)` con el estado seleccionado
2. Backend devuelve respuesta con `coeficiente_depreciacion` y `rossHeidecke` correctos
3. `resultadoTasacion = data` (línea 948) guarda la respuesta
4. `mostrarPantallaResultado()` llama a `recalcularConCoeficientesDepartamento()`
5. `recalcularConCoeficientesDepartamento()` lee `r.coeficiente_depreciacion` ✅
6. Pero NO actualiza `r.rossHeidecke` con el valor recalculado ❌
7. El cuadro muestra `r.rossHeidecke` original del backend (que es correcto)

**SIN EMBARGO:** Si hay alguna caché o estado obsoleto, podría estar mostrando un valor viejo.

---

## 5. CAUSA EXACTA

### Verificación de Hipótesis

✅ **Backend cambia el coeficiente:** Confirmado con pruebas
✅ **Response JSON es correcto:** Confirmado (ambos campos tienen el valor correcto)
✅ **Frontend recibe el valor correcto:** Confirmado (línea 948)
❌ **Frontend recalcula pero NO actualiza el campo mostrado:** Identificado

### Explicación de Por Qué Aparece Aproximadamente 0.95

El usuario dice que el cuadro muestra "aproximadamente 0,95" aunque cambie el estado. 

**Posibles causas:**
1. **Caché del navegador:** El valor podría estar cacheado
2. **Estado obsoleto de la aplicación:** `resultadoTasacion` podría no actualizarse
3. **Valor recalculado sobrescribe:** Si los coeficientes del objetivo no son 1.0, el valor recalculado podría estar sobrescribiendo
4. **Redondeo:** 0.9546 redondeado a 2 decimales sería 0.95

**NECESARIO INVESTIGAR EN EL FRONTEND:**
- Verificar si `r.rossHeidecke` se actualiza en `recalcularConCoeficientesDepartamento()`
- Verificar si hay caché en `datosTasacion.departamento.rossHeidecke`
- Verificar si el renderizado usa un valor calculado en lugar de `resultado.rossHeidecke`

---

## 6. CORRECCIÓN MÍNIMA RECOMENDADA

### Opción A: No Sobrescribir el Valor del Backend

En `client/js/tasacion-resultado.js`, función `recalcularConCoeficientesDepartamento()`:

**Líneas 527-538:**
```javascript
// Ross-Heidecke del objetivo: el backend devuelve C = 1 - K/2 ya calculado.
// Solo si el resultado es viejo (rossHeidecke guardaba K) se aplica la conversión histórica.
let targetRossHeidecke;
if (r.coeficiente_depreciacion != null) {
    targetRossHeidecke = parseFloat(r.coeficiente_depreciacion) || 1;
} else if (r.coeficiente_k != null) {
    const k = parseFloat(r.coeficiente_k) || 0;
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
} else {
    const k = parseFloat(r.rossHeidecke || depto.rossHeidecke || 0);
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
}
```

**Problema:** Este código usa `targetRossHeidecke` para recalcular `valor_m2` y `valor_final`, pero NO actualiza `r.rossHeidecke`.

**Solución:** Agregar al final de la función:
```javascript
// Actualizar rossHeidecke del resultado para que el cuadro muestre el valor correcto
r.rossHeidecke = targetRossHeidecke;
```

### Opción B: No Recalcular el Coeficiente del Objetivo

Si el objetivo NO debe tener su Ross-Heidecke recalculado (solo los comparables), entonces no debería usarse `targetRossHeidecke` en el cálculo de `targetCoefTotal`.

---

## 7. ARCHIVOS MODIFICADOS

**Ninguno modificado aún (solo diagnóstico).**

---

## 8. PRUEBAS EJECUTADAS

✅ **Backend:** 5 estados probados, todos cambian correctamente
✅ **Pydantic validation:** Acepta strings y floats, normaliza a string
✅ **Response JSON:** `coeficiente_depreciacion` y `rossHeidecke` son correctos
❌ **Frontend:** No probado (requiere investigación en navegador)

---

## 9. PRUEBAS NO EJECUTADAS

❌ **Flujo completo frontend-backend:** Requiere navegador
❌ **Verificación de caché:** Requiere navegador
❌ **Verificación de estado obsoleto:** Requiere navegador
❌ **Aplicación de corrección:** Pendiente de aprobación
