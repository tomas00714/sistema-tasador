-- ============================================
-- MIGRACIÓN 036: Campos para prueba gratuita
-- Fecha: 2026-10-11
-- Descripción: Agrega campos para controlar la prueba gratuita de 15 días.
-- La prueba se activa explícitamente por el usuario, no automáticamente al registrarse.
-- ============================================

-- Agregar campos de trial a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_fin TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_usado BOOLEAN DEFAULT false;

-- Índice para búsquedas rápidas de usuarios con trial vigente
CREATE INDEX IF NOT EXISTS idx_usuarios_trial_vigente ON usuarios(trial_fin) WHERE trial_usado = true AND trial_fin IS NOT NULL;
