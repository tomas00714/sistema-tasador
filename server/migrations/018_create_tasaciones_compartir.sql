-- ============================================
-- MIGRACIÓN 018: Tabla de enlaces de compartir tasaciones
-- Fecha: 2026-08-07
-- Descripción: Permite generar enlaces públicos para compartir tasaciones
-- ============================================

CREATE TABLE IF NOT EXISTS tasaciones_compartir (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    tasacion_id INTEGER NOT NULL REFERENCES tasaciones(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'usado', 'expirado', 'revocado')),
    usos_maximos INTEGER DEFAULT 1,
    usos_realizados INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP,
    fecha_ultimo_uso TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasaciones_compartir_token ON tasaciones_compartir(token);
CREATE INDEX IF NOT EXISTS idx_tasaciones_compartir_tasacion ON tasaciones_compartir(tasacion_id);
CREATE INDEX IF NOT EXISTS idx_tasaciones_compartir_usuario ON tasaciones_compartir(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tasaciones_compartir_estado ON tasaciones_compartir(estado);
