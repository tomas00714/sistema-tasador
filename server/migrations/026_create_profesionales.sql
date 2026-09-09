-- ============================================
-- MIGRACIÓN 026: Crear tabla de datos profesionales del usuario
-- Fecha: 2026-09-08
-- Descripción: Almacena la información profesional adicional
--              (matrícula, inmobiliaria, foto y logo) asociada 1:1
--              con la tabla usuarios.
-- ============================================

-- ============================================
-- TABLA: profesionales
-- ============================================
CREATE TABLE IF NOT EXISTS profesionales (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    matricula VARCHAR(100),
    nombre_inmobiliaria VARCHAR(255),
    logo_inmobiliaria VARCHAR(500),
    foto_perfil VARCHAR(500),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para profesionales
CREATE INDEX IF NOT EXISTS idx_profesionales_usuario ON profesionales(usuario_id);

-- Trigger para actualizar fecha_modificacion en profesionales
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_profesionales()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profesionales_modificacion ON profesionales;
CREATE TRIGGER trg_profesionales_modificacion
    BEFORE UPDATE ON profesionales
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_profesionales();
