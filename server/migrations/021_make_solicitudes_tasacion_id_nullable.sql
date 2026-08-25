-- ============================================
-- MIGRACIÓN 021: Hacer tasacion_id opcional en solicitudes
-- Fecha: 2026-08-21
-- Descripción: Permite crear solicitudes independientes de tasaciones
--              haciendo tasacion_id nullable. El código ya está preparado
--              para aceptar solicitudes sin tasación asociada.
-- ============================================

-- Hacer tasacion_id opcional en solicitudes
ALTER TABLE solicitudes ALTER COLUMN tasacion_id DROP NOT NULL;
