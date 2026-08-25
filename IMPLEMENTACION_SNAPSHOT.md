# Implementación de Snapshot Histórico en tasacion_comparable

## Resumen de Cambios

### 1. Base de Datos

**Archivo:** `server/migrations/023_add_snapshot_to_tasacion_comparable.sql`

**Cambios:**
- Agregada columna `snapshot` (JSONB) a `tasacion_comparable`
- Cambiada FK `comparable_id` de `ON DELETE CASCADE` a `ON DELETE SET NULL`
- Creado índice GIN en `snapshot` para consultas rápidas
- Migración de datos existentes: snapshots creados desde estado actual de comparables

**Resultado:**
```
tasacion_comparable:
- id
- tasacion_id (FK → tasaciones, ON DELETE CASCADE)
- comparable_id (FK → comparables, ON DELETE SET NULL) ← CAMBIADO
- orden
- fecha_agregacion
- snapshot (JSONB) ← NUEVO
```

### 2. Backend - Repositories

**Archivo:** `server/repositories/tasacion_repository.py`

**Cambios:**
- `agregar_comparable()`: Ahora acepta parámetro `snapshot` opcional
- `_construir_snapshot_comparable()`: Nuevo método para construir snapshot desde comparable
- `obtener_comparables()`: Modificado para devolver snapshots en lugar de consultar `comparables`
- `eliminar_comparable()`: Ahora acepta `comparable_id` opcional (si es NULL elimina todos)
- `actualizar_snapshot_comparable()`: Nuevo método para actualizar snapshot de una relación
- `actualizar_comparables_upsert()`: Nuevo método para actualización incremental de comparables

### 3. Backend - Models

**Archivo:** `server/models.py`

**Cambios:**
- `TasacionUpdate`: Agregado campo `comparables_snapshots` (opcional)

### 4. Backend - Main

**Archivo:** `server/main.py`

**Cambios:**
- `crear_tasacion()`: Ahora construye snapshots desde comparables actuales al crear
- `actualizar_tasacion()`: 
  - Implementado upsert para preservar snapshots existentes
  - Si se proporcionan `comparables_snapshots`, los usa explícitamente
  - Si no, preserva snapshots existentes o crea nuevos desde estado actual
- `obtener_tasacion()`: Sin cambios (usa `obtener_comparables()` que ahora devuelve snapshots)
- **NUEVO ENDPOINT:** `PUT /api/tasaciones/{tasacion_id}/comparables/{comparable_id}`
  - Actualiza solo el snapshot de una relación
  - NO modifica la entidad en `comparables`
  - Verifica autorización de la tasación

### 5. Frontend - API Client

**Archivo:** `client/js/api-client.js`

**Cambios:**
- `actualizarComparableAPI()`: Modificado para enviar body correcto
- **NUEVA FUNCIÓN:** `actualizarSnapshotComparableTasacion()`
  - Llama al endpoint de snapshot
  - Para editar comparables desde dentro de una tasación

### 6. Frontend - Comparable Modal

**Archivo:** `client/js/comparable-modal.js`

**Cambios:**
- `agregarComparableExistente()`: Comentario actualizado
  - Ya NO crea nuevo comparable en biblioteca
  - Solo agrega a memoria (reutiliza ID existente)

### 7. Frontend - Tasacion Comparables

**Archivo:** `client/js/tasacion-comparables.js`

**Cambios:**
- `editarComparableDesdeLista()`: Modificado para distinguir contexto
  - Si está en modo tasación: llama `actualizarSnapshotComparableTasacion()`
  - Si está en biblioteca: llama `actualizarComparable()` (comportamiento anterior)
  - Edición desde tasación ahora modifica solo el snapshot

### 8. Frontend - Tasacion Datos

**Archivo:** `client/js/tasacion-datos.js`

**Cambios:**
- `cargarDatosCompletos()`: Simplificado
  - Ya NO usa `obtenerComparablesBatchAPI()`
  - Usa directamente objetos que vienen del backend (snapshots)
- `guardarTasacion()`: Modificado para enviar snapshots actuales
  - Construye `comparables_snapshots` desde `datosTasacion.comparables`
  - Preserva ediciones de snapshots al guardar

### 9. Frontend - Tasacion Navegacion

**Archivo:** `client/js/tasacion-navegacion.js`

**Cambios:**
- `cargarComparablesDesdeIds()`: Actualizado con advertencia
  - Si recibe IDs (caso antiguo), intenta cargar pero advierte
  - El nuevo modelo siempre debe recibir objetos (snapshots)

## Flujo Nuevo

### Crear Tasación con Comparables

```
Usuario selecciona C1 desde biblioteca
    ↓
Frontend: agregarComparableExistente(C1)
    ↓
Frontend: NO crea nuevo comparable, solo agrega a memoria
    ↓
Frontend: guardarTasacion()
    ↓
Backend: crear_tasacion()
    ↓
Backend: Obtiene C1 desde comparables
    ↓
Backend: Construye snapshot desde C1
    ↓
Backend: INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    ↓
Resultado: T1 → C1 con snapshot histórico
```

### Editar Comparable desde Tasación

```
Usuario edita C1 desde T1
    ↓
Frontend: editarComparableDesdeLista()
    ↓
Frontend: Detecta modo tasación
    ↓
Frontend: actualizarSnapshotComparableTasacion(T1, C1, datosEditados)
    ↓
Backend: PUT /api/tasaciones/T1/comparables/C1
    ↓
Backend: UPDATE tasacion_comparable SET snapshot = datosEditados
    ↓
Resultado: Snapshot de T1 actualizado, C1 en biblioteca NO cambia
```

### Editar Comparable desde Biblioteca

```
Usuario edita C1 desde biblioteca
    ↓
Frontend: actualizarComparable(C1, datosEditados)
    ↓
Backend: PUT /api/comparables/C1
    ↓
Backend: UPDATE comparables SET datos = datosEditados
    ↓
Resultado: C1 en biblioteca actualizado, snapshots existentes NO cambian
```

### Eliminar Comparable de Biblioteca

```
Usuario elimina C1
    ↓
Backend: DELETE FROM comparables WHERE id = C1
    ↓
DB: ON DELETE SET NULL
    ↓
tasacion_comparable.comparable_id = NULL
    ↓
tasacion_comparable.snapshot = (se mantiene)
    ↓
Resultado: T1 sigue funcionando con snapshot
```

### Guardar Tasación con Ediciones

```
Usuario edita C1 desde T1, elimina C2, agrega C3
    ↓
Frontend: guardarTasacion()
    ↓
Frontend: Envía comparables_ids + comparables_snapshots
    ↓
Backend: actualizar_tasacion()
    ↓
Backend: actualizar_comparables_upsert()
    ↓
Para C1: UPDATE snapshot (preserva edición)
Para C2: DELETE relación
Para C3: INSERT con snapshot nuevo
    ↓
Resultado: Snapshots preservados correctamente
```

## Endpoints

### Nuevos

- `PUT /api/tasaciones/{tasacion_id}/comparables/{comparable_id}`
  - Actualiza snapshot de un comparable en una tasación
  - Body: snapshot (JSON)
  - Autorización: usuario debe ser dueño de la tasación

### Modificados

- `POST /api/tasaciones`
  - Ahora construye snapshots al crear relaciones

- `PUT /api/tasaciones/{tasacion_id}`
  - Ahora usa upsert para preservar snapshots
  - Acepta campo opcional `comparables_snapshots`

- Repositorio methods (no endpoints directos):
  - `TasacionRepository.obtener_comparables()`: devuelve snapshots
  - `TasacionRepository.agregar_comparable()`: acepta snapshot
  - `TasacionRepository.actualizar_comparables_upsert()`: nuevo método

## Compatibilidad

### Mantenida

- `datos.comparables` en `tasaciones` aún existe (no eliminado)
- Frontend puede funcionar con datos antiguos (IDs) con advertencia
- Motor de cálculo sin cambios (usa objetos en memoria)

### Transición

- Backend ahora usa `tasacion_comparable.snapshot` como fuente de verdad
- Frontend gradualmente deja de usar `obtenerComparablesBatchAPI()`
- `datos.comparables` se mantiene por compatibilidad pero no se escribe nuevo

## Pruebas Requeridas

### TEST 1: Crear C1, agregar a T1, verificar que NO se cree C2
- Crear comparable en biblioteca
- Agregar a tasación desde modal
- Verificar en DB: solo 1 registro en `comparables`, 1 relación en `tasacion_comparable`

### TEST 2: Editar C1 desde T1, verificar snapshot vs biblioteca
- C1 = $100k en biblioteca
- Agregar a T1
- Editar desde T1 a $110k
- Verificar: `comparables.valor` = 100k, `tasacion_comparable.snapshot.valor` = 110k

### TEST 3: T1 y T2 usan C1, editar desde T1
- C1 agregado a T1 y T2
- Editar desde T1
- Verificar: T2 snapshot NO cambia

### TEST 4: Editar C1 desde biblioteca
- Editar C1 desde biblioteca
- Verificar: `comparables` cambia, snapshots de T1/T2 NO cambian

### TEST 5: Eliminar C1 de biblioteca
- Eliminar C1
- Verificar: `comparables` no tiene C1, `tasacion_comparable.comparable_id` = NULL, snapshot se mantiene

### TEST 6: Abrir T1 después de eliminar C1
- Abrir T1
- Verificar: comparable aparece desde snapshot, sin error

### TEST 7: Editar comparable eliminado desde T1
- Editar desde T1
- Verificar: snapshot se actualiza, NO se intenta modificar `comparables`

### TEST 8: Guardar T1 con ediciones
- Editar C1, eliminar C2, agregar C3
- Guardar
- Verificar: snapshots preservados (C1 editado, C3 nuevo, C2 eliminado)

### TEST 9: Eliminar C1 de T1
- Eliminar relación T1-C1
- Verificar: C1 sigue en biblioteca

### TEST 10: Eliminar T1
- Eliminar T1
- Verificar: relaciones eliminadas, C1 y C2 siguen en biblioteca

## Archivos Modificados

1. `server/migrations/023_add_snapshot_to_tasacion_comparable.sql` (NUEVO)
2. `server/repositories/tasacion_repository.py`
3. `server/models.py`
4. `server/main.py`
5. `client/js/api-client.js`
6. `client/js/comparable-modal.js`
7. `client/js/tasacion-comparables.js`
8. `client/js/tasacion-datos.js`
9. `client/js/tasacion-navegacion.js`

## Próximos Pasos (No implementados aún)

1. Eliminar gradualmente `datos.comparables` de `tasaciones`
2. Eliminar `obtenerComparablesBatchAPI()` del frontend
3. Implementar validación antes de eliminar comparable (advertencia si está en uso)
4. Implementar endpoint para "restaurar" comparable desde snapshot a biblioteca
