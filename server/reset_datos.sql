-- ============================================
-- RESET CONTROLADO DE TASACIONES Y COMPARABLES
-- ============================================
-- Este script elimina SOLAMENTE datos de tasaciones/comparables
-- preservando usuarios, solicitudes y otras entidades.
-- ============================================

BEGIN;

-- 1. Deshabilitar FKs que causarían CASCADE hacia entidades que NO debemos eliminar
ALTER TABLE solicitud_comparable_aceptacion DROP CONSTRAINT solicitud_comparable_aceptacion_comparable_id_fkey;
ALTER TABLE suscripciones DROP CONSTRAINT suscripciones_comparable_id_fkey;

-- 2. Eliminar datos en orden inverso para evitar errores de FK

-- 2.1 Eliminar relaciones tasacion_comparable
DELETE FROM tasacion_comparable;

-- 2.2 Eliminar comparables
DELETE FROM comparables;

-- 2.3 Eliminar tasaciones
DELETE FROM tasaciones;

-- 2.4 Eliminar tasaciones_compartir (depende de tasaciones)
DELETE FROM tasaciones_compartir;

-- 3. Reiniciar secuencias (opcional, para IDs limpios)
-- TRUNCATE tasaciones, tasacion_comparable, comparables RESTART IDENTITY CASCADE;

-- 4. Rehabilitar FKs deshabilitadas
ALTER TABLE solicitud_comparable_aceptacion
ADD CONSTRAINT solicitud_comparable_aceptacion_comparable_id_fkey
FOREIGN KEY (comparable_id) REFERENCES comparables(id)
ON DELETE CASCADE;

ALTER TABLE suscripciones
ADD CONSTRAINT suscripciones_comparable_id_fkey
FOREIGN KEY (comparable_id) REFERENCES comparables(id)
ON DELETE CASCADE;

COMMIT;

-- 5. Verificación
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
SELECT 'suscripciones' as tabla, COUNT(*) as conteo FROM suscripciones;
