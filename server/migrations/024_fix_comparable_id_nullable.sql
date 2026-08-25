-- ============================================
-- MIGRACIÓN 024: CORREGIR comparable_id PARA PERMITIR NULL
-- ============================================
-- La FK tiene ON DELETE SET NULL pero la columna es NOT NULL
-- Esto genera un error cuando se elimina un comparable de la biblioteca
-- ============================================

BEGIN;

-- Modificar comparable_id para permitir NULL
ALTER TABLE tasacion_comparable ALTER COLUMN comparable_id DROP NOT NULL;

COMMIT;

-- Verificación
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasacion_comparable' 
AND column_name = 'comparable_id';
