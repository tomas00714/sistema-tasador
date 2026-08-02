-- ============================================
-- MIGRACIÓN 006: Hacer tipo_inmueble opcional
-- Fecha: 2026-07-12
-- Descripción: Hacer tipo_inmueble opcional para usar datos JSONB
-- ============================================

-- Hacer tipo_inmueble opcional en tasaciones
ALTER TABLE tasaciones ALTER COLUMN tipo_inmueble DROP NOT NULL;
