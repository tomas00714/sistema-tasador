# INFORME DE AUDITORÍA - RESET CONTROLADO DE RENDER

## A) CÓMO ESTÁ CONFIGURADA LA CONEXIÓN A RENDER

### Archivo de Configuración
- **Archivo principal:** `server/database.py`
- **Variables de entorno:** Cargadas desde archivo `.env` (en directorio `server/`)
- **Método de conexión:** Prioriza `DATABASE_URL`, fallback a variables `DB_*`

### Variables de Entorno Esperadas
El código espera las siguientes variables de entorno:

1. **Opción 1 (Prioridad):** `DATABASE_URL`
   - URL completa de conexión PostgreSQL
   - Formato: `postgresql://user:password@host:port/database`
   - Parseada con `psycopg2.extensions.parse_dsn()`

2. **Opción 2 (Fallback):** Variables individuales
   - `DB_HOST` (default: localhost)
   - `DB_PORT` (default: 5432)
   - `DB_NAME` (default: tasador)
   - `DB_USER` (default: postgres)
   - `DB_PASSWORD` (default: postgres)
   - `DB_SSLMODE` (opcional, para SSL)

### Archivo de Ejemplo
- **Archivo:** `server/.env.example`
- **Contiene:** Ejemplo de configuración local, NO tiene credenciales de Render

### Código Frontend
- **Archivo:** `client/js/api-client.js` (línea 17)
- **URL de producción:** `https://sistema-tasador.onrender.com`
- **Esto indica que la aplicación está desplegada en Render**

---

## B) SI DEVIN TIENE ACCESO REAL A ESA BASE

### Estado Actual
- **NO hay archivo `.env`** en el directorio `server/`
- **DATABASE_URL:** NOT SET en el entorno actual
- **Configuración actual:** Usa `DB_HOST=localhost`, `DB_NAME=tasador`, `DB_USER=postgres`
- **Conclusión:** **NO hay acceso directo desde el entorno actual de Devin a la base de Render**

### Acceso Potencial
- Para acceder a la base de Render, se necesitaría:
  1. Crear archivo `.env` con credenciales de Render
  2. O pasar credenciales como variables de entorno al ejecutar scripts
  3. O usar la DATABASE_URL de Render

### Riesgo de Seguridad
- **NO debo escribir credenciales sensibles en código**
- **NO debo pedir al usuario que comparta contraseñas directamente**
- La DATABASE_URL de Render contiene credenciales sensibles

---

## C) QUÉ TABLAS Y REGISTROS ELIMINARÍA EL RESET

### Tablas a Eliminar Directamente (Objetivo Principal)
1. **tasaciones** - Todas las tasaciones
2. **comparables** - Todos los comparables de la biblioteca
3. **tasacion_comparable** - Todas las relaciones entre tasaciones y comparables
4. **tasaciones_compartir** - Todos los registros de compartir

### Tablas Eliminadas por CASCADE (Automático)
1. **solicitud_comparable_aceptacion** - Registros que dependen de comparables
   - FK: `solicitud_comparable_aceptacion.comparable_id -> comparables.id`
   - ON DELETE: CASCADE
   - **Impacto:** Eliminaría todos los registros de aceptación de comparables en solicitudes

### Tablas que NO se Eliminan (Preservadas)
1. **usuarios** - Todos los usuarios del sistema
2. **solicitudes** - Todas las solicitudes (pero con FKs nulladas)
3. **planes** - Planes de suscripción
4. **suscripciones** - Suscripciones de usuarios
5. **pagos** - Registros de pagos

---

## D) QUÉ TABLAS Y REGISTROS QUEDARÍAN PRESERVADOS

### Entidades Completamente Preservadas
1. **usuarios** - NO se toca
2. **planes** - NO se toca
3. **suscripciones** - NO se toca
4. **pagos** - NO se toca

### Entidades Parcialmente Preservadas (con FKs nulladas)
1. **solicitudes** - Registros preservados, pero:
   - `solicitudes.tasacion_id` → NULL
   - `solicitudes.tasacion_generada_id` → NULL
2. **comparables** - Eliminados completamente (target principal)

---

## E) QUÉ CASCADAS OCURRIRÍAN

### Al Eliminar COMPARABLES
**[CASCADE] solicitud_comparable_aceptacion**
- `solicitud_comparable_aceptacion.comparable_id -> comparables.id`
- **Resultado:** Eliminaría todos los registros de `solicitud_comparable_aceptacion` que tengan un `comparable_id` válido

**[SET NULL] tasacion_comparable**
- `tasacion_comparable.comparable_id -> comparables.id`
- **Resultado:** NULLearía `comparable_id` en `tasacion_comparable` (ya que vamos a eliminar toda la tabla, esto es irrelevante)

### Al Eliminar TASACIONES
**[CASCADE] tasacion_comparable**
- `tasacion_comparable.tasacion_id -> tasaciones.id`
- **Resultado:** Eliminaría todos los registros de `tasacion_comparable` (ya que vamos a eliminar toda la tabla, esto es irrelevante)

**[CASCADE] tasaciones_compartir**
- `tasaciones_compartir.tasacion_id -> tasaciones.id`
- **Resultado:** Eliminaría todos los registros de `tasaciones_compartir` (ya que vamos a eliminar toda la tabla, esto es irrelevante)

### FKs que Deben Ser NULLeadas (NO ACTION)
**[NO ACTION] comparables.tasacion_origen_id**
- `comparables.tasacion_origen_id -> tasaciones.id`
- **Acción requerida:** NULLear antes de eliminar tasaciones

**[NO ACTION] solicitudes.tasacion_id**
- `solicitudes.tasacion_id -> tasaciones.id`
- **Acción requerida:** NULLear antes de eliminar tasaciones

**[NO ACTION] solicitudes.tasacion_generada_id**
- `solicitudes.tasacion_generada_id -> tasaciones.id`
- **Acción requerida:** NULLear antes de eliminar tasaciones

---

## F) SQL EXACTO PROPUESTO PARA EL RESET SELECTIVO

```sql
-- ============================================
-- RESET CONTROLADO DE TASACIONES Y COMPARABLES - RENDER
-- ============================================
-- Preserva: usuarios, solicitudes, planes, suscripciones, pagos
-- Elimina: tasaciones, comparables, tasacion_comparable, tasaciones_compartir
-- ============================================

BEGIN;

-- 1. NULLear FKs con NO ACTION hacia tasaciones (para poder borrar tasaciones)
UPDATE solicitudes SET tasacion_id = NULL WHERE tasacion_id IS NOT NULL;
UPDATE solicitudes SET tasacion_generada_id = NULL WHERE tasacion_generada_id IS NOT NULL;
UPDATE comparables SET tasacion_origen_id = NULL WHERE tasacion_origen_id IS NOT NULL;

-- 2. Eliminar datos en orden inverso para evitar errores de FK

-- 2.1 Eliminar relaciones tasacion_comparable
DELETE FROM tasacion_comparable;

-- 2.2 Eliminar tasaciones_compartir (depende de tasaciones)
DELETE FROM tasaciones_compartir;

-- 2.3 Eliminar comparables
DELETE FROM comparables;

-- 2.4 Eliminar tasaciones
DELETE FROM tasaciones;

-- Nota: solicitud_comparable_aceptacion se eliminará automáticamente por CASCADE
-- cuando se eliminen comparables (FK: comparable_id -> comparables.id ON DELETE CASCADE)

COMMIT;
```

---

## G) MÉTODO DE VERIFICACIÓN ANTES/DESPUÉS

### Verificación ANTES (Pre-Reset)
```sql
SELECT 'usuarios' as tabla, COUNT(*) as conteo FROM usuarios
UNION ALL
SELECT 'solicitudes' as tabla, COUNT(*) as conteo FROM solicitudes
UNION ALL
SELECT 'solicitud_comparable_aceptacion' as tabla, COUNT(*) as conteo FROM solicitud_comparable_aceptacion
UNION ALL
SELECT 'tasaciones' as tabla, COUNT(*) as conteo FROM tasaciones
UNION ALL
SELECT 'comparables' as tabla, COUNT(*) as conteo FROM comparables
UNION ALL
SELECT 'tasacion_comparable' as tabla, COUNT(*) as conteo FROM tasacion_comparable
UNION ALL
SELECT 'tasaciones_compartir' as tabla, COUNT(*) as conteo FROM tasaciones_compartir
UNION ALL
SELECT 'suscripciones' as tabla, COUNT(*) as conteo FROM suscripciones;
```

### Verificación DESPUÉS (Post-Reset)
```sql
SELECT 'usuarios' as tabla, COUNT(*) as conteo FROM usuarios
UNION ALL
SELECT 'solicitudes' as tabla, COUNT(*) as conteo FROM solicitudes
UNION ALL
SELECT 'solicitud_comparable_aceptacion' as tabla, COUNT(*) as conteo FROM solicitud_comparable_aceptacion
UNION ALL
SELECT 'tasaciones' as tabla, COUNT(*) as conteo FROM tasaciones
UNION ALL
SELECT 'comparables' as tabla, COUNT(*) as conteo FROM comparables
UNION ALL
SELECT 'tasacion_comparable' as tabla, COUNT(*) as conteo FROM tasacion_comparable
UNION ALL
SELECT 'tasaciones_compartir' as tabla, COUNT(*) as conteo FROM tasaciones_compartir
UNION ALL
SELECT 'suscripciones' as tabla, COUNT(*) as conteo FROM suscripciones;
```

### Verificación de Referencias Rotas
```sql
-- Verificar que no quedan referencias rotas
SELECT COUNT(*) FROM solicitudes
WHERE tasacion_id IS NOT NULL AND tasacion_id NOT IN (SELECT id FROM tasaciones);

SELECT COUNT(*) FROM comparables
WHERE tasacion_origen_id IS NOT NULL AND tasacion_origen_id NOT IN (SELECT id FROM tasaciones);

SELECT COUNT(*) FROM solicitud_comparable_aceptacion
WHERE comparable_id IS NOT NULL AND comparable_id NOT IN (SELECT id FROM comparables);
```

---

## RESUMEN DEL PLAN

### Qué HARÉ si me autorizas
1. **Pedir credenciales de forma segura** (variables de entorno o archivo temporal)
2. **Ejecutar verificación ANTES** (conteos actuales)
3. **Ejecutar SQL de reset** (el especificado arriba)
4. **Ejecutar verificación DESPUÉS** (conteos finales)
5. **Verificar referencias rotas** (debe ser 0)
6. **Generar informe final** (comparación antes/después)

### Qué NO haré
- ❌ NO modificar FKs
- ❌ NO cambiar esquema
- ❌ NO eliminar usuarios
- ❌ NO eliminar solicitudes
- ❌ NO escribir credenciales en código
- ❌ NO ejecutar nada sin autorización

### Lo que necesito de ti
1. **Autorización para proceder** con el reset de Render
2. **Credenciales de forma segura** (pueden ser variables de entorno temporales)
3. **Confirmación** de que aceptas que `solicitud_comparable_aceptacion` se eliminará por CASCADE

---

## PREGUNTAS PARA EL USUARIO

1. **¿Autorizas el reset de Render con el plan especificado?**
2. **¿Cómo prefieres proporcionar las credenciales de forma segura?**
3. **¿Estás de acuerdo con que `solicitud_comparable_aceptacion` se eliminará por CASCADE?**
