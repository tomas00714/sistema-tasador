-- ============================================
-- MIGRACIÓN 022: Crear tabla solicitud_comparable_aceptacion
-- Fecha: 2026-08-21
-- Descripción: Tabla intermedia para registrar la aceptación/rechazo
--              de comparables recibidos mediante solicitudes.
--              El estado pertenece a la relación solicitud-comparable,
--              no al comparable en sí, para mantener separación de responsabilidades.
-- ============================================

CREATE TABLE IF NOT EXISTS solicitud_comparable_aceptacion (
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    comparable_id INTEGER NOT NULL REFERENCES comparables(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('aceptado', 'rechazado')),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    PRIMARY KEY (solicitud_id, comparable_id)
);

-- Índices para consultas habituales
CREATE INDEX IF NOT EXISTS idx_solicitud_comparable_aceptacion_comparable ON solicitud_comparable_aceptacion(comparable_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_comparable_aceptacion_usuario ON solicitud_comparable_aceptacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_comparable_aceptacion_estado ON solicitud_comparable_aceptacion(estado);
