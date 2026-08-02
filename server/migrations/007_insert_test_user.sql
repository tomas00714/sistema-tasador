-- ============================================
-- MIGRACIÓN 007: Insertar usuario de prueba
-- Fecha: 2026-07-12
-- Descripción: Insertar usuario de prueba con ID 1 para pruebas iniciales.
-- NOTA: Este usuario NO es administrador. Los administradores se determinan
-- únicamente por su email en las variables de entorno ADMIN_EMAIL_*.
-- ============================================

-- Insertar usuario de prueba si no existe
INSERT INTO usuarios (id, email, nombre, apellido, plan_id, estado)
VALUES (1, 'test@example.com', 'Usuario', 'Prueba', 1, 'activo')
ON CONFLICT (id) DO NOTHING;
