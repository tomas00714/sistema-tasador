-- ============================================
-- MIGRACIÓN 002: Tabla de Contadores
-- Fecha: 2024-07-08
-- Descripción: Creación de tabla para contadores de IDs
-- ============================================

-- ============================================
-- TABLA: contadores
-- ============================================
CREATE TABLE IF NOT EXISTS contadores (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(10) UNIQUE NOT NULL CHECK (tipo IN ('T', 'C', 'U', 'S')),
    valor INTEGER NOT NULL DEFAULT 100,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para contadores
CREATE INDEX IF NOT EXISTS idx_contadores_tipo ON contadores(tipo);

-- Trigger para actualizar fecha_modificacion
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_contadores()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_fecha_modificacion_contadores
    BEFORE UPDATE ON contadores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_contadores();

-- Insertar contadores iniciales
INSERT INTO contadores (tipo, valor)
VALUES 
    ('T', 100),
    ('C', 100),
    ('U', 100),
    ('S', 100)
ON CONFLICT (tipo) DO NOTHING;
