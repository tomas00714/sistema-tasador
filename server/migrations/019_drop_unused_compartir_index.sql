-- ============================================
-- MIGRACIÓN 019: Eliminar índice no utilizado
-- Fecha: 2026-08-08
-- Descripción: El índice idx_tasaciones_compartir_usuario se usaba
-- únicamente para contar los compartidos mensuales del usuario.
-- Dado que esa lógica fue eliminada, el índice ya no es necesario.
-- ============================================

DROP INDEX IF EXISTS idx_tasaciones_compartir_usuario;
