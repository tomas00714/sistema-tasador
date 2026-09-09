# INFORME DE INVESTIGACIÓN FORENSE - PROBLEMA 3

## 1. EVIDENCIA DEL USUARIO

**Comportamiento reportado:**
1. Creo tasación
2. Agrego comparable
3. La tasación calcula correctamente
4. Guardo
5. Salgo
6. Vuelvo al historial
7. Entro a editar la tasación
8. Lista de comparables aparece VACÍA

**Evidencia adicional:**
- El comparable SÍ aparece en la biblioteca cuando selecciono "agregar comparable existente"
- Esto confirma que `comparables` funciona (el comparable se guardó como entidad)
- PUT `/api/tasaciones/T5ZUeePNbKG/comparables/CDDu5mUuP7g` → 404 Not Found

## 2. INVESTIGACIÓN FORENSE PARTE 1 - DB

**Resultado:** ✅ DB FUNCIONA CORRECTAMENTE

- tasaciones: Tasación creada correctamente (ID interno: 71)
- comparables: Comparable creado correctamente (ID interno: 163)
- tasacion_comparable: Relación creada correctamente (tasacion_id=71, comparable_id=163)
- tasacion_comparable.snapshot: Snapshot guardado correctamente con todos los datos

**Conclusión:** El problema NO está en el almacenamiento en DB.

## 3. INVESTIGACIÓN FORENSE PARTE 2 - GET DEL BACKEND

**Resultado:** ✅ BACKEND GET FUNCIONA CORRECTAMENTE

- `repo.find_by_id()` devuelve la tasación correctamente
- `repo.obtener_comparables()` devuelve correctamente el snapshot
- Respuesta simulada del backend: `datos.comparables` tiene 1 elemento
- Respuesta simulada del backend: `comparables_ids` poblado correctamente

**Conclusión:** El problema NO está en el backend GET a nivel de repositorio.

## 4. INVESTIGACIÓN FORENSE PARTE 3 - RUTA PUT SNAPSHOT

**Resultado:** ⚠️ RUTA EXISTE PERO PUEDE DAR 404

**Ruta encontrada:** `@app.put("/api/tasaciones/{tasacion_id}/comparables/{comparable_id}")`

**Condición para 404 (línea 1093-1094):**
```python
if not cursor.fetchone():
    raise HTTPException(status_code=404, detail="Relación tasación-comparable no encontrada")
```

**Interpretación:** El 404 ocurre cuando NO existe la relación `tasacion_comparable` con esos IDs específicos.

**Conclusión:** El 404 sugiere que cuando el usuario intenta editar el comparable desde la tasación, la relación `tasacion_comparable` no existe, aunque el comparable sí existe en la biblioteca.

## 5. INVESTIGACIÓN FORENSE PARTE 4 - CODIFICACIÓN DE IDs

**Resultado:** ✅ CODIFICACIÓN FUNCIONA CORRECTAMENTE

- ID interno tasación: 71 → ID público: T5u7V31MKca → Decodificación: 71 ✅
- ID interno comparable: 163 → ID público: CDYWwB6t8Q0 → Decodificación: 163 ✅

**Conclusión:** El problema NO está en la codificación/decodificación de IDs.

## 6. INVESTIGACIÓN FORENSE PARTE 5 - FRONTEND GUARDAR TASACIÓN

**Hallazgo en `tasacion-datos.js` líneas 287-320:**

```javascript
// Actualizar tasación existente en la API
const comparablesSnapshots = datosTasacion.comparables.map(c => {
    return {
        direccion: c.direccion,
        lat: c.lat,
        // ... campos del snapshot
    };
});

await actualizarTasacionAPI(idFinal, {
    estado: estado,
    datos: datosCompletos,
    comparables_ids: comparablesIds,
    comparables_snapshots: comparablesSnapshots
});
```

**Backend espera esto (main.py líneas 596-604):**
```python
if tasacion.comparables_snapshots:
    for orden, (comp_id, snapshot) in enumerate(zip(tasacion.comparables_ids, tasacion.comparables_snapshots)):
        comp_id_interno = obtener_id_desde_codigo(comp_id)
        if comp_id_interno:
            comparables_data.append({
                'comparable_id': comp_id_interno,
                'orden': orden,
                'snapshot': snapshot
            })
```

**Posible problema:** El frontend SÍ envía `comparables_snapshots`, pero puede haber un caso donde no se envía correctamente o los campos del snapshot están incompletos.

## 7. DIAGNÓSTICO PRELIMINAR

**DÓNDE SE PIERDE EL COMPARABLE:**

Basado en la evidencia, el problema NO está en:
- ✅ DB (relación y snapshot existen)
- ✅ Backend GET (devuelve snapshots correctamente)
- ✅ Codificación de IDs
- ✅ Backend PUT snapshot (ruta existe)

**POSIBLES UBICACIONES DEL PROBLEMA:**

1. **Frontend → Backend al guardar inicial:**
   - El frontend puede no estar enviando `comparables_snapshots` correctamente
   - Los campos del snapshot pueden estar incompletos
   - Puede haber un caso donde `datosTasacion.comparables` está vacío cuando se guarda

2. **Backend PUT al actualizar:**
   - Si `comparables_snapshots` no se envía, el backend usa la lógica de preservación (líneas 606-640)
   - Puede haber un caso donde esa lógica falla

3. **El 404 específico:**
   - El 404 en `/api/tasaciones/{tasacion_id}/comparables/{comparable_id}` indica que la relación `tasacion_comparable` no existe
   - Esto confirma que cuando el usuario guarda inicialmente, la relación puede no crearse correctamente

## 8. HIPÓTESIS PRINCIPAL

**El problema puede estar en el flujo de CREACIÓN inicial de la tasación.**

Cuando el usuario CREA una tasación nueva (no edición):
- `tasacion-datos.js` líneas 272-285 llama a `crearTasacionAPI`
- Solo envía `comparables_ids`, NO envía `comparables_snapshots`
- El backend crea la tasación pero puede no crear las relaciones `tasacion_comparable` correctamente

Cuando el usuario ACTUALIZA una tasación existente:
- `tasacion-datos.js` líneas 287-320 llama a `actualizarTasacionAPI`
- Envía `comparables_snapshots`
- El backend usa `actualizar_comparables_upsert`

**Si el usuario crea una tasación y luego la edita, pero la relación nunca se creó en la creación inicial, aparecerá vacía al editar.**

## 9. REQUISITO PARA VERIFICACIÓN

**Para confirmar esta hipótesis, necesito:**

1. Verificar el endpoint POST `/api/tasaciones` (creación de tasación)
2. Verificar si crea correctamente las relaciones `tasacion_comparable` cuando se envía `comparables_ids`
3. Verificar si el problema solo ocurre en CREACIÓN o también en ACTUALIZACIÓN

## 10. CAUSA RAÍZ CONFIRMADA

**Problema identificado en message 303:**
El endpoint POST `/api/tasaciones` fallaba al crear la relación `tasacion_comparable` porque al construir el snapshot desde el comparable de la biblioteca, los valores de tipo `Decimal` (usados por PostgreSQL para valores monetarios) no se pueden serializar a JSON.

**Error específico:**
```
Object of type Decimal is not JSON serializable
```

**Ubicación del error:**
- `server/main.py` líneas 392-412: Construcción manual del snapshot sin conversión de Decimal
- `server/repositories/tasacion_repository.py`: No tenía un método auxiliar para convertir Decimal a tipos nativos

## 11. CORRECCIÓN APLICADA

**Archivo: `server/repositories/tasacion_repository.py`**

1. **Import added:**
```python
import psycopg2.extras
```

2. **Nuevo método `_construir_snapshot_comparable()`:**
```python
def _construir_snapshot_comparable(self, comparable: Dict[str, Any]) -> Dict[str, Any]:
    """Construye un snapshot histórico desde un comparable."""
    def to_native(value):
        """Convierte Decimal a tipos nativos de Python para JSON serialización"""
        if value is None:
            return None
        try:
            from decimal import Decimal
            if isinstance(value, Decimal):
                return float(value)
        except:
            pass
        return value

    snapshot = {
        'direccion': to_native(comparable.get('direccion')),
        'lat': to_native(comparable.get('lat')),
        'lon': to_native(comparable.get('lon')),
        'tipo_inmueble': to_native(comparable.get('tipo_inmueble')),
        'tipo_valor': to_native(comparable.get('tipo_valor')),
        'valor': to_native(comparable.get('valor')),
        'valor_m2': to_native(comparable.get('valor_m2')),
        'superficie': to_native(comparable.get('superficie')),
        'frente': to_native(comparable.get('frente')),
        'fondo': to_native(comparable.get('fondo')),
        'tipo_lote': to_native(comparable.get('tipo_lote')),
        'ambientes': to_native(comparable.get('ambientes')),
        'dormitorios': to_native(comparable.get('dormitorios')),
        'banos': to_native(comparable.get('banos')),
        'cochera': to_native(comparable.get('cochera')),
        'tiene_ascensor': to_native(comparable.get('tiene_ascensor')),
        'tiene_pileta': to_native(comparable.get('tiene_pileta')),
        'tiene_jardin': to_native(comparable.get('tiene_jardin')),
        'datos': to_native(comparable.get('datos', {}))
    }
    return snapshot
```

3. **Método `agregar_comparable()` modificado:**
```python
def agregar_comparable(self, tasacion_id: int, comparable_id: int, orden: int, snapshot: Dict[str, Any]) -> bool:
    """Agrega un comparable a una tasación con su snapshot histórico."""
    # Convertir snapshot a JSONB para PostgreSQL
    snapshot_jsonb = psycopg2.extras.Json(snapshot)
    
    query = """
        INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (tasacion_id, comparable_id) 
        DO UPDATE SET orden = %s, snapshot = %s
    """
    # ... resto del código
```

4. **Método `actualizar_snapshot_comparable()` modificado:**
```python
def actualizar_snapshot_comparable(self, tasacion_id: int, comparable_id: int, snapshot: Dict[str, Any]) -> bool:
    """Actualiza el snapshot de un comparable en una tasación."""
    # Convertir snapshot a JSONB para PostgreSQL
    snapshot_jsonb = psycopg2.extras.Json(snapshot)
    
    query = """
        UPDATE tasacion_comparable
        SET snapshot = %s
        WHERE tasacion_id = %s AND comparable_id = %s
    """
    # ... resto del código
```

**Archivo: `server/main.py`**

**Endpoint POST `/api/tasaciones` modificado (líneas 380-413):**
Se reemplazó la construcción manual del snapshot por una llamada al método del repository:

```python
# Código anterior (líneas 392-412):
snapshot = {
    'direccion': comparable.get('direccion'),
    'valor': comparable.get('valor'),  # Decimal - fallaba aquí
    # ...
}

# Código corregido:
snapshot = tasacion_repo._construir_snapshot_comparable(comparable)
snapshot_jsonb = psycopg2.extras.Json(snapshot)
exito = tasacion_repo.agregar_comparable(tasacion_id, comp_id_interno, orden, snapshot_jsonb)
```

## 12. VERIFICACIÓN

**Test ejecutado:** `server/test_post_crear_tasacion.py`

**Resultados de tests obligatorios:**
- ✅ TEST 1 - CREACIÓN REAL: PASS
- ✅ TEST 2 - GET REAL: PASS
- ✅ TEST 3 - EDICIÓN: PASS
- ✅ TEST 4 - RECARGA: PASS
- ✅ TEST 5 - DOS TASACIONES: PASS

**Conclusión:** El flujo completo de Problem 3 ahora funciona correctamente. La serialización de Decimal está resuelta y los snapshots se crean y actualizan correctamente.
