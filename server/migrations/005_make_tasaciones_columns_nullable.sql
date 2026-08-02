-- ============================================
-- MIGRACIÓN 005: Hacer columnas de tasaciones opcionales
-- Fecha: 2026-07-12
-- Descripción: Hacer columnas NOT NULL opcionales para usar datos JSONB
-- ============================================

-- Hacer columnas de ubicación opcionales en tasaciones
ALTER TABLE tasaciones ALTER COLUMN direccion DROP NOT NULL;
ALTER TABLE tasaciones ALTER COLUMN provincia DROP NOT NULL;
ALTER TABLE tasaciones ALTER COLUMN localidad DROP NOT NULL;
ALTER TABLE tasaciones ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE tasaciones ALTER COLUMN lon DROP NOT NULL;
