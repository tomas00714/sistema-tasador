-- ============================================
-- MIGRACIÓN 027: Agregar teléfono a profesionales
-- Fecha: 2026-09-08
-- Descripción: Añade el campo telefono a la tabla profesionales.
-- ============================================

ALTER TABLE profesionales
ADD COLUMN IF NOT EXISTS telefono VARCHAR(255);
