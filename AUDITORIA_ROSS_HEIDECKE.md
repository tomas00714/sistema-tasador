# AUDITORÍA TÉCNICA: ESTADO DE CONSERVACIÓN Y COEFICIENTE ROSS-HEIDECKE

Fecha: 2026-10-28
Objetivo: Auditoría del funcionamiento actual del campo "Estado de Conservación" y su relación con el coeficiente de depreciación de Ross-Heidecke, evaluando la viabilidad de incorporar 9 niveles de conservación.

---

## A. ARQUITECTURA ACTUAL

### A.1 Definición del input en el frontend

**Archivo:** `client/js/global.js` (líneas 225-231)

```javascript
const OPCIONES_ESTADO_CONSERVACION = [
    { label: '1 - Excelente', valor: '1' },
    { label: '2 - Bueno', valor: '2' },
    { label: '3 - Regular', valor: '3' },
    { label: '4 - Malo', valor: '4' },
    { label: '5 - Muy malo', valor: '5' }
];
```

**Características:**
- **Valores internos:** Strings `"1"`, `"2"`, `"3"`, `"4"`, `"5"`
- **Etiquetas visibles:** Texto descriptivo con número
- **Sin diferencia entre casas y departamentos:** Ambos usan la misma definición
- **Sin valor por defecto explícito:** El usuario debe seleccionar
- **Formato:** String (texto), no número ni índice de array

**Función generadora:** `generarInputEstadoConservacion()` en `client/js/global.js` (líneas 438-448)

```javascript
function generarInputEstadoConservacion({ inputId, listId, label = 'Estado de conservación', value = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar estado',
        opciones: OPCIONES_ESTADO_CONSERVACION.map(opcion => ({ ...opcion, attrs: { valor: opcion.valor } })),
        value,
        claseInputGroup
    });
}
```

**Uso en formularios:**
- Casas: `client/js/tasacion-casa.js` (línea 129)
- Departamentos: `client/js/tasacion-departamento.js` (línea 187)
- Comparables: `client/js/comparable-formulario.js` (líneas 175, 231)

**ID del input:** `estadoConservacionInput`

---

### A.2 Captura y almacenamiento en el frontend

**Captura del valor:**

**Casas:** `client/js/tasacion-casa.js` (líneas 417-418)
```javascript
if (estadoConservacionInput) {
    datosTasacion.casa.estadoConservacion = estadoConservacionInput.value;
}
```

**Departamentos:** `client/js/tasacion-datos.js` (línea 585)
```javascript
datosTasacion.departamento.estadoConservacion = document.getElementById("estadoConservacionInput").value;
```

**Objeto de datos:** `datosTasacion.casa.estadoConservacion` o `datosTasacion.departamento.estadoConservacion`
- **Tipo:** String
- **Valores posibles:** `"1"`, `"2"`, `"3"`, `"4"`, `"5"`

---

### A.3 Transmisión al backend

**Endpoint de tasación:** POST `/api/tasaciones` (main.py)

**Parseo del estado:** `server/main.py` (líneas 396-404)

```python
def _parse_estado_conservacion(texto):
    """Convierte el texto de estado de conservación a entero 1-5."""
    if not texto:
        return 1
    import re
    match = re.match(r"\s*(\d+)", str(texto))
    if match:
        return int(match.group(0))
    return 1
```

**Comportamiento:**
- Extrae el primer dígito del string usando regex
- Convierte a entero
- Si está vacío o no hay dígito, retorna 1 (Excelente) como default
- No valida que el valor esté en rango 1-5

**Uso en construcción de requests:**

**Departamentos:** `server/main.py` (línea 435)
```python
estado_conservacion=_parse_estado_conservacion(inmueble.get("estadoConservacion", "")),
```

**Casas:** `server/main.py` (línea 453)
```python
estado_conservacion=inmueble.get("estadoConservacion", ""),
```

---

### A.4 Modelos Pydantic

**Departamentos:** `server/models.py` (líneas 99-110)

```python
class TasacionDepartamentoRequest(BaseModel):
    direccion: str
    tipo: str  # departamento o ph
    superficie_cubierta: float
    antiguedad: int  # años
    estado_conservacion: int  # 1-5, mapeado internamente a 1-9
    vida_util: Optional[int] = 80
    # ...
```

**Casas:** `server/models.py` (líneas 125-135)

```python
class TasacionCasaRequest(BaseModel):
    direccion: str
    tipo: str = "casa"
    superficie_cubierta: float
    antiguedad: int = 0
    estado_conservacion: str  # <-- NOTA: str, no int
    vida_util: Optional[int] = 80
    caracteristica_constructiva: float
    # ...
```

**Inconsistencia encontrada:**
- Departamentos: `estado_conservacion: int`
- Casas: `estado_conservacion: str`

---

### A.5 Almacenamiento en base de datos

**Tabla:** `tasaciones`
**Columna:** `estado_conservacion VARCHAR(50)`
**Definición:** `server/migrations/001_create_initial_tables.sql` (línea 109)

```sql
-- Campos específicos DEPARTAMENTO
ambientes VARCHAR(20),
dormitorios VARCHAR(20),
banos VARCHAR(20),
cochera BOOLEAN,
baulera BOOLEAN,
tiene_ascensor BOOLEAN,
antiguedad VARCHAR(50),
estado_conservacion VARCHAR(50),  <-- VARCHAR(50)
ubicacion_piso VARCHAR(50),
ubicacion_planta VARCHAR(50),
superficie_cubierta DECIMAL(10,2),
```

**Tipo de dato:** VARCHAR(50) - texto de hasta 50 caracteres
**Valores actuales:** Strings "1", "2", "3", "4", "5"

---

### A.6 Recuperación al editar una tasación existente

**Flujo:**

1. **Historial:** `client/js/historial.js` (línea 1568)
   ```javascript
   localStorage.setItem("tasacionEnEdicion", JSON.stringify(tasacion));
   ```

2. **Navegación:** `client/js/tasacion-navegacion.js` (líneas 280-299)
   ```javascript
   const tasacionEnEdicion = localStorage.getItem("tasacionEnEdicion");
   if (tasacionEnEdicion) {
       const tasacion = JSON.parse(tasacionEnEdicion);
       if (tasacion.datosCompletos) {
           await cargarDatosCompletos(tasacion.datosCompletos);
       }
   }
   ```

3. **Carga de datos:** `client/js/tasacion-datos.js` (líneas 210-269)
   ```javascript
   async function cargarDatosCompletos(datosCompletos) {
       // ...
       if (datosCompletos.tipo === 'departamento') {
           datosTasacion.departamento = JSON.parse(JSON.stringify(datosCompletos.departamento));
       } else if (datosCompletos.tipo === 'casa') {
           datosTasacion.casa = datosCompletos.casa ? JSON.parse(JSON.stringify(datosCompletos.casa)) : {};
       }
       // ...
   }
   ```

**Comportamiento:**
- Los datos se almacenan en localStorage como JSON
- Al editar, se carga el objeto completo
- `estadoConservacion` se restaura como string desde el JSON
- No hay conversión ni validación al cargar

---

### A.7 Cálculo del coeficiente Ross-Heidecke

**Archivo:** `server/tablas/ross_heidecke.py`

**Función principal:** `coeficiente_depreciacion_ross_heidecke()` (líneas 27-48)

```python
def coeficiente_depreciacion_ross_heidecke(antiguedad, estado, vida_util=80):
    """
    Calcula el coeficiente de depreciación (C = 1 - K/2) usando la tabla Ross-Heidecke.

    Args:
        antiguedad: Años de antigüedad.
        estado: Estado de conservación (1-5, o string del frontend).
        vida_util: Vida útil en años (default 80).

    Returns:
        float: Coeficiente de depreciación (0-1).
    """
    ant = int(antiguedad) if antiguedad else 0
    vu = int(vida_util) if vida_util else 80
    if vu <= 0:
        vu = 80
    ant = max(ant, 0)
    porcentaje_vida = round((ant / vu) * 100)
    porcentaje_vida = min(max(porcentaje_vida, 0), 99)
    estado_tabla = MAPEO_ESTADOS_CINCO_A_NUEVE.get(_parse_estado_ross_heidecke(estado), 7)
    coeficiente_k = coeficiente_ross_heidecke(porcentaje_vida, estado_tabla)
    return 1 - (coeficiente_k / 2)
```

**Mapeo de estados:** `server/tablas/ross_heidecke.py` (líneas 6-12)

```python
MAPEO_ESTADOS_CINCO_A_NUEVE = {
    1: 1,   # Excelente
    2: 3,   # Bueno -> Buena
    3: 5,   # Regular -> Regular
    4: 6,   # Malo -> Malo
    5: 7    # Muy malo -> Muy malo
}
```

**Parseo del estado:** `server/tablas/ross_heidecke.py` (líneas 15-24)

```python
def _parse_estado_ross_heidecke(estado):
    """Extrae el primer dígito de un string de estado o devuelve el entero."""
    if estado is None:
        return 0
    if isinstance(estado, int):
        return estado if 1 <= estado <= 5 else 0
    match = re.search(r"\d+", str(estado))
    if match:
        return int(match.group(0))
    return 0
```

**Flujo del cálculo:**
1. Calcular porcentaje de vida: `antiguedad / vida_util * 100` (redondeado a entero 0-99)
2. Parsear estado a entero 1-5 usando `_parse_estado_ross_heidecke()`
3. Mapear estado 1-5 a estado de tabla 1-9 usando `MAPEO_ESTADOS_CINCO_A_NUEVE`
4. Buscar coeficiente K en `TABLA_ROSS_HEIDECKE[porcentaje_vida][estado_tabla]`
5. Calcular coeficiente de depreciación: `C = 1 - K/2`

---

### A.8 Uso del coeficiente resultante

**Departamentos:** `server/tasador_departamentos.py` (líneas 68-84)

```python
# Mapear los 5 estados de la interfaz a los 9 estados de la tabla
estado_tabla = MAPEO_ESTADOS_CINCO_A_NUEVE.get(datos.estado_conservacion, 7)

# Obtener coeficiente K de la tabla Ross y Heidecke
coeficiente_k = coeficiente_ross_heidecke(porcentaje_vida, estado_tabla)
logger.debug(f"Coeficiente K: {coeficiente_k}")

# Calcular coeficiente de depreciación C = 1 - k/2
coeficiente_depreciacion = 1 - (coeficiente_k / 2)
logger.debug(f"Coeficiente de depreciación C: {coeficiente_depreciacion}")

# Calcular valor inicial
valor_inicial = datos.superficie_cubierta * datos.valor_m2_referencia

# Aplicar depreciación
valor_depreciado = valor_inicial * coeficiente_depreciacion
```

**Casas:** `server/tasador_casas.py` (líneas 52-64)

```python
coeficiente_ross = coeficiente_depreciacion_ross_heidecke(
    datos.antiguedad,
    datos.estado_conservacion,
    vida_util
)
caracteristica_constructiva = getattr(datos, "caracteristica_constructiva", 1) or 1

# ...

valor_m2 = datos.valor_m2_referencia
valor_base = superficie_cubierta * valor_m2
valor_final = valor_base * coeficiente_ross * caracteristica_constructiva
```

**Frontend:** `client/js/tasacion-resultado.js` (líneas 527-540)

```javascript
// Ross-Heidecke del objetivo: el backend devuelve el coeficiente de depreciación
// ya calculado (rossHeidecke; en resultados antiguos coeficiente_estado).
let targetRossHeidecke;
if (r.coeficiente_depreciacion != null) {
    targetRossHeidecke = parseFloat(r.coeficiente_depreciacion) || 1;
} else if (r.coeficiente_k != null) {
    const k = parseFloat(r.coeficiente_k);
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
} else {
    const k = parseFloat(r.rossHeidecke || depto.rossHeidecke || 0);
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
}

const targetCoefTotal = targetUbicacionPlanta * targetUbicacionPiso * targetCaracteristicaConstructiva * targetSuperficieCubierta * targetUbicacion * targetActividad * targetPersonalizadoTotal * targetRossHeidecke;
```

---

### A.9 Actualización de la interfaz

**El cálculo es exclusivamente backend:**
- `client/js/tasacion-datos.js` (línea 603): `// El cálculo de Ross-Heidecke ahora es responsabilidad exclusiva del backend`
- El frontend solo muestra el resultado calculado por el backend
- No hay recálculo en el frontend al cambiar el estado

---

## B. IMPLEMENTACIÓN ROSS-HEIDECKE

### B.1 Estructura de la tabla

**Archivo:** `server/tablas/ross_heidecke.py` (líneas 51-1152)

**Tipo:** Matriz codificada directamente en Python (diccionario de diccionarios)

**Estructura:**
```python
TABLA_ROSS_HEIDECKE = {
    0: {      # Porcentaje de vida = 0%
        1.00: 0.000,    # Estado 1 (Excelente)
        1.50: 0.032,    # Estado 1.5 (Muy buena)
        2.00: 2.520,    # Estado 2 (Buena)
        2.50: 8.090,    # Estado 2.5 (Normal)
        3.00: 18.100,   # Estado 3 (Regular)
        3.50: 33.200,   # Estado 3.5 (Malo)
        4.00: 52.600,   # Estado 4 (Muy malo)
        4.50: 75.200,   # Estado 4.5 (Demolición)
        5.00: 100.000   # Estado 5 (Irrecuperable)
    },
    1: {      # Porcentaje de vida = 1%
        1.00: 0.505,
        1.50: 0.537,
        # ...
    },
    # ... hasta 99%
}
```

**Dimensiones:**
- **Filas:** 100 (porcentaje de vida 0-99)
- **Columnas:** 9 (estados 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00)

**Valores de la tabla:** Coeficiente K (porcentaje de depreciación, 0-100)

---

### B.2 Significado de filas y columnas

**Filas (clave principal):** Porcentaje de vida transcurrida (0-99)
- Calculado como: `antiguedad / vida_util * 100`
- Redondeado a entero
- Limitado a rango 0-99

**Columnas (clave secundaria):** Estado de conservación (1.00-5.00)
- 1.00: Excelente / Nuevo
- 1.50: Muy buena
- 2.00: Buena
- 2.50: Normal / Conservación normal
- 3.00: Regular
- 3.50: Malo
- 4.00: Muy malo
- 4.50: Demolición
- 5.00: Irrecuperable

**Relación:** Cada celda contiene el coeficiente K de depreciación para ese par (antigüedad, estado)

---

### B.3 Algoritmo de búsqueda

**Función:** `coeficiente_ross_heidecke()` en `server/tablas/ross_heidecke.py` (líneas 1157-1207)

```python
def coeficiente_ross_heidecke(porcentaje_vida, estado):
    """
    Calcula el coeficiente K de Ross y Heidecke.

    Args:
        porcentaje_vida: Porcentaje de vida transcurrida (0-99)
        estado: Estado del bien (1-9, donde 1=EXCELENTE, 9=IRRECUPERABLE)

    Returns:
        Coeficiente K (valor de la tabla dividido por 100)
    """
    try:
        tabla_porcentaje = TABLA_ROSS_HEIDECKE.get(porcentaje_vida)

        if tabla_porcentaje is None:
            logger.warning(f"Porcentaje de vida {porcentaje_vida} no encontrado en tabla Ross-Heidecke, usando coeficiente 1.0")
            return 1.00

        # Mapear estado (1-9) a los valores de la tabla (1.00-5.00)
        estado_valores = {
            1: 1.00,   # EXCELENTE
            2: 1.50,   # MUY BUENA
            3: 2.00,   # BUENA
            4: 2.50,   # NORMAL
            5: 3.00,   # REGULAR
            6: 3.50,   # MALO
            7: 4.00,   # MUY MALO
            8: 4.50,   # DEMOLICION
            9: 5.00    # IRRECUPERABLE
        }

        estado_valor = estado_valores.get(estado)

        if estado_valor is None:
            logger.warning(f"Estado {estado} no válido en tabla Ross-Heidecke, usando coeficiente 1.0")
            return 1.00

        valor_tabla = tabla_porcentaje.get(estado_valor)

        if valor_tabla is None:
            logger.warning(f"Valor de tabla no encontrado para porcentaje {porcentaje_vida} y estado {estado}, usando coeficiente 1.0")
            return 1.00

        # El valor obtenido en la tabla debe dividirse por cien para obtener el coeficiente K
        return valor_tabla / 100
    except Exception as e:
        logger.error(f"Error al calcular coeficiente Ross-Heidecke: {e}")
        return 1.00
```

**Criterio de búsqueda:**
- **Coincidencia exacta** por porcentaje de vida (entero 0-99)
- **Coincidencia exacta** por estado (1-9 mapeado a 1.00-5.00)
- **Sin interpolación** entre valores
- **Sin redondeo** del porcentaje de vida (ya viene redondeado)

---

### B.4 Valores de estado admitidos por el cálculo

**La tabla admite 9 estados:** 1, 2, 3, 4, 5, 6, 7, 8, 9
- Mapeados a claves de columna: 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00

**El código actual usa solo 5:** 1, 3, 5, 6, 7 (via mapeo desde 1-5 de la interfaz)

**Mapeo actual:**
- Interfaz 1 → Tabla 1 (Excelente)
- Interfaz 2 → Tabla 3 (Buena)
- Interfaz 3 → Tabla 5 (Regular)
- Interfaz 4 → Tabla 6 (Malo)
- Interfaz 5 → Tabla 7 (Muy malo)

**Estados intermedios NO utilizados actualmente:**
- Tabla 2 (1.50): Muy buena
- Tabla 4 (2.50): Normal
- Tabla 8 (4.50): Demolición
- Tabla 9 (5.00): Irrecuperable

---

### B.5 Comportamiento ante valores no contemplados

**Porcentaje de vida fuera de rango:**
- Límite superior: 99 (capped)
- Límite inferior: 0 (capped)
- Si porcentaje > 99: se usa 99
- Si porcentaje < 0: se usa 0

**Estado no válido (fuera de 1-9):**
- Se usa default: estado 7 (Muy malo)
- Mensaje de warning en logs
- Coeficiente 1.00 (sin depreciación)

**Porcentaje de vida no encontrado en tabla:**
- Se usa coeficiente 1.00 (sin depreciación)
- Mensaje de warning en logs

**Estado no mapeado en tabla:**
- Se usa coeficiente 1.00 (sin depreciación)
- Mensaje de warning en logs

**Error general (excepción):**
- Se usa coeficiente 1.00 (sin depreciación)
- Mensaje de error en logs

---

### B.6 Duplicaciones

**No se encontraron duplicaciones:**
- La tabla está definida en un solo archivo: `server/tablas/ross_heidecke.py`
- Las funciones de cálculo están en el mismo archivo
- No hay implementaciones alternativas en otros archivos
- `client/js/calculos-coeficientes.js` indica que el cálculo se delega al backend

---

## C. VIABILIDAD DE INCORPORAR 9 NIVELES

### C.1 Estado actual de la tabla

**HECHO COMPROBADO:** La tabla Ross-Heidecke YA TIENE los 9 estados intermedios implementados.

**Evidencia:** `server/tablas/ross_heidecke.py` (líneas 51-1152)
- La matriz tiene 9 columnas: 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00
- Cada porcentaje de vida (0-99) tiene valores para los 9 estados
- La función `coeficiente_ross_heidecke()` acepta estados 1-9

**Conclusión:** No es necesario modificar la tabla ni los datos de cálculo. Los estados intermedios ya existen en la implementación.

---

### C.2 ¿Puede el código trabajar con valores decimales?

**Análisis del parseo actual:**

**Frontend:**
- `OPCIONES_ESTADO_CONSERVACION` usa strings: `"1"`, `"2"`, `"3"`, `"4"`, `"5"`
- Puede agregar opciones con strings: `"1.5"`, `"2.5"`, `"3.5"`, `"4.5"`

**Backend - `_parse_estado_ross_heidecke()`:**
```python
def _parse_estado_ross_heidecke(estado):
    if estado is None:
        return 0
    if isinstance(estado, int):
        return estado if 1 <= estado <= 5 else 0
    match = re.search(r"\d+", str(estado))  # <-- Extrae PRIMER dígito
    if match:
        return int(match.group(0))
    return 0
```

**PROBLEMA IDENTIFICADO:**
- El regex `\d+` extrae solo el primer dígito
- `"1.5"` → extrae `"1"` → devuelve `1`
- `"2.5"` → extrae `"2"` → devuelve `2`
- **Los decimales se truncarían al entero más bajo**

**Conclusión:** El código actual NO puede trabajar con los valores decimales 1.5, 2.5, 3.5, 4.5 tal como están definidos en la propuesta. Necesita modificación.

---

### C.3 Situación actual: ¿Interfaz vs Tabla?

**HECHO COMPROBADO:** Hay un mapeo intermedio que convierte 5 estados de la interfaz a 9 estados de la tabla.

**Mapeo actual:** `server/tablas/ross_heidecke.py` (líneas 6-12)
```python
MAPEO_ESTADOS_CINCO_A_NUEVE = {
    1: 1,   # Excelente
    2: 3,   # Bueno -> Buena
    3: 5,   # Regular -> Regular
    4: 6,   # Malo -> Malo
    5: 7    # Muy malo -> Muy malo
}
```

**Estados de la tabla que ya existen pero NO se exponen:**
- 2 (1.50): Muy buena
- 4 (2.50): Normal
- 8 (4.50): Demolición
- 9 (5.00): Irrecuperable

**Conclusión:** Los estados intermedios 2, 4, 8, 9 ya existen en la tabla pero no se exponen en la interfaz. El estado 3 (1.50) también existe pero no se usa.

---

### C.4 Determinación de la situación

**SITUACIÓN CORRESPONDIENTE:** Se necesita modificar la interfaz y el mapeo, pero NO la tabla ni los datos de cálculo.

**Detalle:**
1. **Tabla:** ✅ Ya tiene 9 estados
2. **Función de cálculo:** ✅ Ya acepta estados 1-9
3. **Mapeo:** ❌ Solo mapea 1-5 a subconjunto de 1-9
4. **Parseo:** ❌ No soporta decimales
5. **Interfaz:** ❌ Solo muestra 5 opciones
6. **Modelos:** ⚠️ Inconsistencia (int vs str)
7. **Base de datos:** ✅ VARCHAR(50) soporta strings decimales

---

## D. RIESGOS Y COMPATIBILIDAD

### D.1 Formato de datos en tasaciones existentes

**Base de datos:** `estado_conservacion VARCHAR(50)`
- **Valores actuales:** Strings "1", "2", "3", "4", "5"
- **Sin restricción de CHECK:** No hay validación a nivel de base de datos
- **Sin restricción de tipo:** VARCHAR acepta cualquier string

**LocalStorage y JSON:**
- Los datos se almacenan como JSON
- `estadoConservacion` se guarda como string
- No hay conversión al cargar

**Conclusión:** Las tasaciones existentes usan strings enteros "1"-"5". Cambiar las opciones no alterará los datos guardados.

---

### D.2 ¿Cambiar las opciones modificaría el significado?

**NO**, por las siguientes razones:

1. **Los valores actuales son strings:** "1", "2", "3", "4", "5"
2. **Nuevos valores propuestos:** También strings: "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"
3. **Los valores enteros existentes se mantienen:** "1", "2", "3", "4", "5" siguen significando lo mismo
4. **No hay renumeración:** No se cambia 1→2, 2→3, etc.
5. **Parseo actual extrae el primer dígito:** "1" sigue siendo 1, "2" sigue siendo 2

**Riesgo:** Si el parseo se modifica para soportar decimales, debe preservar la compatibilidad con valores enteros.

---

### D.3 Datos antiguos con formatos diferentes

**No se encontraron evidencias de formatos diferentes:**
- Las migraciones no modifican `estado_conservacion`
- No hay scripts de migración específicos para este campo
- Los modelos no indican cambios históricos

**Conclusión:** No hay datos antiguos con formatos diferentes que deban manejarse.

---

### D.4 Recuperación correcta de estados existentes

**Flujo de edición:**
1. Base de datos → API → Frontend (como string)
2. Frontend → localStorage (como string)
3. localStorage → Formulario (como string)

**Comportamiento actual:**
- El formulario espera strings
- Los datos actuales son strings "1"-"5"
- La recuperación funciona correctamente

**Riesgo:** Si se agregan opciones con strings decimales, el autocomplete debe poder mostrar el valor actual aunque no esté en la lista (o se debe asegurar que esté).

---

### D.5 Validaciones, normalizaciones, serialización

**Validaciones actuales:**
- Frontend: `validators/casa-validator.js` y `validators/departamento-validator.js` validan que el campo no esté vacío
- Backend: `_parse_estado_conservacion()` extrae el primer dígito, no valida rango
- Modelos: `TasacionDepartamentoRequest` usa `int`, `TasacionCasaRequest` usa `str`

**Normalización:**
- Frontend: No hay normalización explícita
- Backend: `_parse_estado_conservacion()` extrae dígito y convierte a int

**Serialización:**
- API: JSON
- Base de datos: VARCHAR(50)
- LocalStorage: JSON

**Riesgos:**
1. **Inconsistencia de tipos:** Departamentos usan int, casas usan str en modelos
2. **Falta de validación de rango:** No se valida que el estado esté en rango válido
3. **Parseo limitado:** El regex actual no soporta decimales

---

### D.6 Restricciones del backend

**Base de datos:** No hay restricciones (VARCHAR sin CHECK)

**Modelos Pydantic:**
- Departamentos: `estado_conservacion: int` (implicitamente restringe a int)
- Casas: `estado_conservacion: str` (sin restricción)

**Lógica de cálculo:**
- `_parse_estado_ross_heidecke()` valida 1-5 para int, pero no para string con decimales
- Si el parseo devuelve 0 (valor inválido), se usa default 7 (Muy malo)

**Conclusión:** No hay restricciones fuertes que impidan agregar opciones, pero hay inconsistencias que deberían resolverse.

---

### D.7 Informes, exportaciones, historial

**Informes:** `client/js/report-components.js` (línea 933)
```javascript
if (!isEmptyEditable(estadoConservacion)) itemsIntrinsecos.push(itemTecnico('Estado de conservación:', estadoConservacion));
```
- Muestra el valor como string
- No hay transformación

**Exportaciones:** No se encontraron exportaciones específicas de este campo

**Historial:** `client/js/historial.js`
- Muestra el valor como string
- No hay transformación

**Conclusión:** El campo se usa como string en informes y visualización. Cambiar el formato no debería romper nada, siempre que se preserve el string.

---

### D.8 ¿Qué podría romperse?

**Si se modifica el parseo para soportar decimales:**
1. **Compatibilidad con valores enteros:** Debe asegurarse que "1", "2", "3", "4", "5" sigan funcionando
2. **Mapeo:** Debe actualizarse para soportar más de 5 estados
3. **Modelos:** Debería uniformizarse el tipo (int vs str)

**Si NO se modifica el parseo:**
1. **Los valores decimales se truncarían:** "1.5" → 1, "2.5" → 2
2. **Resultados incorrectos:** Los estados intermedios no tendrían efecto

**Si se cambia el mapeo sin cambiar el parseo:**
1. **Los valores decimales no funcionarían:** Se truncarían antes del mapeo

**Si se agregan opciones en la interfaz sin cambiar el backend:**
1. **Los usuarios podrían seleccionar valores que no funcionan correctamente**
2. **Los resultados serían incorrectos**

---

### D.9 Cómo evitar romper

**Recomendaciones:**
1. **Modificar el parseo para soportar decimales:** Cambiar el regex o la lógica
2. **Actualizar el mapeo:** Extender `MAPEO_ESTADOS_CINCO_A_NUEVE` o eliminarlo
3. **Uniformizar modelos:** Usar el mismo tipo en departamentos y casas
4. **Agregar validación de rango:** Validar que el estado esté en rango válido
5. **Probar con datos antiguos:** Asegurar que "1"-"5" sigan funcionando
6. **Probar con nuevos valores:** Asegurar que "1.5", "2.5", etc. funcionen

---

## E. PLAN DE IMPLEMENTACIÓN RECOMENDADO

### E.1 Archivos que deben modificarse

**1. Frontend - Opciones:**
- `client/js/global.js` (líneas 225-231)
  - Agregar opciones: "1.5", "2.5", "3.5", "4.5"
  - Actualizar labels con la nomenclatura propuesta

**2. Backend - Parseo:**
- `server/tablas/ross_heidecke.py` (líneas 15-24)
  - Modificar `_parse_estado_ross_heidecke()` para soportar decimales
  - Opciones:
    - Cambiar regex a `\d+(\.\d+)?` para capturar enteros y decimales
    - O usar `float()` en lugar de `int()`
  - Actualizar validación de rango para aceptar 1-9 (en lugar de 1-5)

**3. Backend - Mapeo:**
- `server/tablas/ross_heidecke.py` (líneas 6-12)
  - Opción A: Eliminar `MAPEO_ESTADOS_CINCO_A_NUEVE` y usar el estado directamente
  - Opción B: Extender el mapeo para incluir todos los 9 estados

**4. Backend - Modelos:**
- `server/models.py` (línea 109)
  - Cambiar `TasacionDepartamentoRequest.estado_conservacion` de `int` a `str` para consistencia
  - O mantener `int` si se decide que el parseo debe convertir a int antes de los modelos

**5. Backend - Parseo en main.py:**
- `server/main.py` (líneas 396-404)
  - Actualizar `_parse_estado_conservacion()` para soportar decimales
  - O eliminar esta función y usar `_parse_estado_ross_heidecke()` directamente

---

### E.2 Orden recomendado de cambios

**Fase 1: Preparación**
1. Crear test unitario para `_parse_estado_ross_heidecke()` con valores actuales ("1"-"5")
2. Crear test unitario para `_parse_estado_ross_heidecke()` con nuevos valores ("1.5", "2.5", etc.)
3. Verificar que los tests actuales pasan

**Fase 2: Backend**
4. Modificar `_parse_estado_ross_heidecke()` para soportar decimales
5. Verificar que los tests con valores actuales pasen
6. Verificar que los tests con nuevos valores pasen
7. Actualizar o eliminar `MAPEO_ESTADOS_CINCO_A_NUEVE`
8. Actualizar `_parse_estado_conservacion()` en main.py
9. Uniformizar modelos (int vs str)
10. Ejecutar tests de integración existentes

**Fase 3: Frontend**
11. Agregar nuevas opciones en `OPCIONES_ESTADO_CONSERVACION`
12. Probar manualmente que el autocomplete muestra las nuevas opciones
13. Probar que se pueden seleccionar las nuevas opciones
14. Probar que el backend recibe los valores correctamente

**Fase 4: Validación**
15. Crear tasación con cada uno de los 9 estados
16. Verificar que el coeficiente Ross-Heidecke sea correcto
17. Editar tasaciones antiguas y verificar que el estado se muestre correctamente
18. Verificar que el cálculo no cambie para estados 1-5

---

### E.3 Pruebas de regresión

**Pruebas específicas:**

1. **Comparar coeficiente para los 5 estados actuales:**
   - Crear tasación con estado "1" (Excelente)
   - Verificar coeficiente Ross-Heidecke
   - Repetir para "2", "3", "4", "5"
   - Comparar con valores de referencia (pre-cambio)
   - Verificar que sean idénticos

2. **Probar los 4 valores intermedios:**
   - Crear tasación con estado "1.5"
   - Verificar que no se trunque a "1"
   - Verificar coeficiente Ross-Heidecke
   - Repetir para "2.5", "3.5", "4.5"
   - Verificar que los coeficientes sean intermedios entre los enteros correspondientes

3. **Probar diferentes antigüedades:**
   - Probar con antigüedad 0, 10, 20, 40, 60, 80 años
   - Verificar que el coeficiente cambie correctamente con la antigüedad
   - Verificar que no haya errores en la tabla para porcentajes extremos

4. **Probar casas y departamentos:**
   - Crear tasación de casa con cada estado
   - Crear tasación de departamento con cada estado
   - Verificar que ambos tipos funcionen correctamente

5. **Abrir y guardar tasaciones antiguas:**
   - Cargar tasación existente con estado "1"
   - Verificar que el input muestre "1 - Excelente"
   - Guardar sin modificar
   - Verificar que el estado siga siendo "1"
   - Repetir para "2", "3", "4", "5"

6. **Cambiar estado y verificar actualización:**
   - Crear tasación con estado "1"
   - Cambiar a "1.5"
   - Recalcular
   - Verificar que el coeficiente cambie
   - Cambiar a "2"
   - Recalcular
   - Verificar que el coeficiente cambie

7. **Casos de valores faltantes o inválidos:**
   - Enviar estado vacío
   - Verificar que se use default (1 o 7)
   - Enviar estado "0"
   - Verificar que se use default
   - Enviar estado "10"
   - Verificar que se use default
   - Enviar estado "abc"
   - Verificar que se use default

8. **Persistencia:**
   - Crear tasación con estado "1.5"
   - Guardar
   - Recargar la página
   - Editar la tasación
   - Verificar que el estado siga siendo "1.5"
   - Repetir para todos los estados

---

## F. DUDAS PENDIENTES

### F.1 Fuente de la tabla Ross-Heidecke

**No se encontró referencia a la fuente original:**
- No hay comentarios en el código que indiquen la fuente
- No hay archivo de documentación
- No se confirma si la tabla sigue exactamente la tabla original de Ross-Heidecke

**Implicación:** Si se agrega un estado intermedio, debe verificarse que el valor en la tabla sea correcto según la teoría original.

---

### F.2 Inconsistencia de tipos en modelos

**Pregunta:** ¿Por qué `TasacionDepartamentoRequest` usa `int` y `TasacionCasaRequest` usa `str`?

**Posibles respuestas:**
- Error histórico
- Diferencia intencional en diseño
- Departamentos validan más estrictamente

**Recomendación:** Uniformizar el tipo para evitar confusiones.

---

### F.3 Comportamiento con valores decimales en el mapeo

**Pregunta:** Si se usa `MAPEO_ESTADOS_CINCO_A_NUEVE`, ¿cómo se mapearían los valores decimales?

**Opciones:**
- Eliminar el mapeo y usar el estado directamente (convertir de string a float, luego a entero 1-9)
- Extender el mapeo para incluir "1.5" → 2, "2.5" → 4, etc.

**Recomendación:** Eliminar el mapeo simplifica el código y reduce posibilidades de error.

---

### F.4 Validación en el frontend

**Pregunta:** ¿Debe el frontend validar que el estado esté en rango válido?

**Actual:** Solo valida que no esté vacío

**Recomendación:** Agregar validación para asegurar que el valor esté en el rango permitido (1-9 o 1-5 si se mantiene el mapeo).

---

### F.5 Nomenclatura de los estados

**Pregunta:** ¿La nomenclatura propuesta coincide con la teoría original de Ross-Heidecke?

**Propuesta:**
- 1: Nuevo / como nuevo
- 1.5: Muy bueno
- 2: Bueno
- 2.5: Conservación normal
- 3: Necesitado de reparaciones sencillas
- 3.5: Necesitado de reparaciones moderadas
- 4: Necesitado de reparaciones importantes
- 4.5: Muy deteriorado
- 5: Estado de demolición

**Actual (tabla):**
- 1: EXCELENTE
- 2: MUY BUENA
- 3: BUENA
- 4: NORMAL
- 5: REGULAR
- 6: MALO
- 7: MUY MALO
- 8: DEMOLICION
- 9: IRRECUPERABLE

**Recomendación:** Verificar que la nomenclatura propuesta sea consistente con la teoría antes de implementar.

---

## CONCLUSIONES

### Hechos comprobados

1. **La tabla Ross-Heidecke ya tiene 9 estados implementados** (filas 0-99, columnas 1.00-5.00)
2. **El código actual usa solo 5 estados** (1-5 de la interfaz, mapeados a 1,3,5,6,7 de la tabla)
3. **El parseo actual NO soporta decimales** (extrae solo el primer dígito con regex `\d+`)
4. **Los datos se almacenan como strings** en base de datos (VARCHAR(50))
5. **No hay restricciones fuertes** en base de datos ni validación de rango
6. **Hay inconsistencia de tipos** en modelos (int vs str)
7. **Los estados intermedios 2,4,8,9 de la tabla no se exponen** en la interfaz

### Viabilidad

**SITUACIÓN:** Se necesita modificar la interfaz y el parseo, pero NO la tabla ni los datos de cálculo.

**Cambios necesarios:**
1. ✅ Frontend: Agregar 4 opciones nuevas (1.5, 2.5, 3.5, 4.5)
2. ❌ Backend: Modificar parseo para soportar decimales
3. ❌ Backend: Actualizar o eliminar mapeo
4. ❌ Backend: Uniformizar modelos
5. ❌ Backend: Agregar validación de rango

### Riesgos

**Riesgos identificados:**
1. Si no se modifica el parseo, los decimales se truncarán y no funcionarán
2. Si no se uniformizan los modelos, puede haber confusiones
3. Si no se valida el rango, valores inválidos pueden causar resultados incorrectos
4. Los datos antiguos ("1"-"5") deben seguir funcionando

**Mitigación:**
- Tests unitarios para el parseo
- Tests de regresión para los 5 estados actuales
- Validación de rango en frontend y backend
- Uniformización de tipos

### Recomendación final

**Implementar los 9 niveles es viable** con las siguientes modificaciones:

1. Modificar `_parse_estado_ross_heidecke()` para soportar decimales
2. Agregar las 4 opciones nuevas en `OPCIONES_ESTADO_CONSERVACION`
3. Eliminar `MAPEO_ESTADOS_CINCO_A_NUEVE` o extenderlo
4. Uniformizar el tipo en modelos (recomendado: str)
5. Agregar validación de rango (1-9)
6. Ejecutar pruebas de regresión exhaustivas

**NO es necesario:**
- Modificar la tabla Ross-Heidecke
- Modificar la función `coeficiente_ross_heidecke()`
- Modificar la base de datos
- Migrar datos existentes
