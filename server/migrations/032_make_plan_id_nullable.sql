-- ============================================
-- MIGRACIÓN 032: Hacer suscripciones.plan_id nullable
-- Fecha: 2026-10-07
-- Descripción: Permitir suscripciones sin plan asociado
--              para el modelo de Mercado Pago sin preapproval_plan_id.
-- ============================================

-- Hacer plan_id nullable en suscripciones
ALTER TABLE suscripciones ALTER COLUMN plan_id DROP NOT NULL;
