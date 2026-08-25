-- ============================================
-- RESET CONTROLADO DE TASACIONES Y COMPARABLES
-- ============================================
-- Este script elimina SOLAMENTE datos de tasaciones/comparables
-- preservando usuarios, solicitudes y otras entidades.
-- ============================================

BEGIN;

-- 1. Deshabilitar FK que causaría CASCADE hacia solicitud_comparable_aceptacion
-- No queremos eliminar solicitud_comparable_aceptacion porque pertenece al sistema de solicitudes
ALTER TABLE solicitud_comparable_aceptacion DROP CONSTRAINT solicitud_comparable_aceptacion_comparable_id_fkey;

-- 2. NULLear FKs de solicitudes hacia tasaciones (para poder borrar tasaciones)
UPDATE solicitudes SET tasacion_id = NULL WHERE tasacion_id IS NOT NULL;
UPDATE solicitudes SET tasacion_generada_id = NULL WHERE tasacion_generada_id IS NOT NULL;

-- 3. NULLear FKs de comparables hacia tasaciones (para poder borrar tasaciones)
UPDATE comparables SET tasacion_origen_id = NULL WHERE tasacion_origen_id IS NOT NULL;

-- 4. Eliminar datos en orden inverso para evitar errores de FK

-- 4.1 Eliminar relaciones tasacion_comparable
DELETE FROM tasacion_comparable;

-- 4.2 Eliminar tasaciones_compartir (depende de tasaciones)
DELETE FROM tasaciones_compartir;

-- 4.3 Eliminar comparables
DELETE FROM comparables;

-- 4.4 Eliminar tasaciones
DELETE FROM tasaciones;

-- 5. Rehabilitar FK deshabilitada (ahora apunta a comparables vacío, pero mantiene la estructura)
ALTER TABLE solicitud_comparable_aceptacion
ADD CONSTRAINT solicitud_comparable_aceptacion_comparable_id_fkey
FOREIGN KEY (comparable_id) REFERENCES comparables(id)
ON DELETE CASCADE;

COMMIT;

-- 6. Verificación
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
