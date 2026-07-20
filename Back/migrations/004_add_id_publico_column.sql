-- ============================================
-- MIGRACIÓN 004: Agregar columna id_publico a tasaciones
-- Fecha: 2026-07-12
-- Descripción: Agregar columna VARCHAR para ID público (T-102)
-- ============================================

-- Agregar columna id_publico a tasaciones
ALTER TABLE tasaciones ADD COLUMN IF NOT EXISTS id_publico VARCHAR(20) UNIQUE DEFAULT '';

-- Agregar índice para id_publico
CREATE INDEX IF NOT EXISTS idx_tasaciones_id_publico ON tasaciones(id_publico);

-- Agregar columna id_publico a comparables
ALTER TABLE comparables ADD COLUMN IF NOT EXISTS id_publico VARCHAR(20) UNIQUE DEFAULT '';

-- Agregar índice para id_publico en comparables
CREATE INDEX IF NOT EXISTS idx_comparables_id_publico ON comparables(id_publico);

-- Agregar columna id_publico a solicitudes
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS id_publico VARCHAR(20) UNIQUE DEFAULT '';

-- Agregar índice para id_publico en solicitudes
CREATE INDEX IF NOT EXISTS idx_solicitudes_id_publico ON solicitudes(id_publico);
