-- ============================================
-- MIGRACIÓN 015: Eliminar columnas id_publico, uuid y link_publico
-- Fecha: 2026-07-31
-- Descripción: Elimina columnas id_publico y uuid de todas las tablas
--              y link_publico de solicitudes, ya que los códigos públicos
--              y links se generan dinámicamente usando Optimus a partir
--              del ID interno.
-- ============================================

-- Eliminar columna id_publico de tasaciones
ALTER TABLE tasaciones DROP COLUMN IF EXISTS id_publico;

-- Eliminar índice de id_publico en tasaciones
DROP INDEX IF EXISTS idx_tasaciones_id_publico;

-- Eliminar columna uuid de tasaciones
ALTER TABLE tasaciones DROP COLUMN IF EXISTS uuid;

-- Eliminar columna id_publico de comparables
ALTER TABLE comparables DROP COLUMN IF EXISTS id_publico;

-- Eliminar índice de id_publico en comparables
DROP INDEX IF EXISTS idx_comparables_id_publico;

-- Eliminar columna uuid de comparables
ALTER TABLE comparables DROP COLUMN IF EXISTS uuid;

-- Eliminar columna id_publico de solicitudes
ALTER TABLE solicitudes DROP COLUMN IF EXISTS id_publico;

-- Eliminar índice de id_publico en solicitudes
DROP INDEX IF EXISTS idx_solicitudes_id_publico;

-- Eliminar columna uuid de solicitudes
ALTER TABLE solicitudes DROP COLUMN IF EXISTS uuid;

-- Eliminar columna link_publico de solicitudes (ahora se genera dinámicamente)
ALTER TABLE solicitudes DROP COLUMN IF EXISTS link_publico;

-- Mantener uuid en usuarios para futuras integraciones (Google OAuth, APIs, etc.)
-- No se elimina uuid de usuarios
