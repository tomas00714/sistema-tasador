-- ============================================
-- MIGRACIÓN 007: Insertar usuario de prueba
-- Fecha: 2026-07-12
-- Descripción: Insertar usuario con ID 1 para pruebas
-- ============================================

-- Insertar usuario de prueba si no existe
INSERT INTO usuarios (id, email, nombre, apellido, plan_id, estado)
VALUES (1, 'test@example.com', 'Usuario', 'Prueba', 1, 'activo')
ON CONFLICT (id) DO NOTHING;
