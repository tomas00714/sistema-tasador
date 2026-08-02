-- ============================================
-- MIGRACIÓN 003: Agregar columna datos a tasaciones
-- Fecha: 2026-07-12
-- Descripción: Agregar columna JSONB para datos flexibles
-- ============================================

-- Agregar columna datos a tasaciones
ALTER TABLE tasaciones ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}';

-- Agregar columna comparables_ids (array de IDs de comparables)
ALTER TABLE tasaciones ADD COLUMN IF NOT EXISTS comparables_ids INTEGER[] DEFAULT '{}';

-- Agregar columna tipo (para compatibilidad con frontend)
ALTER TABLE tasaciones ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'lote';

-- Agregar índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_tasaciones_datos ON tasaciones USING GIN (datos);
