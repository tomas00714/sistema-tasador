-- ============================================
-- MIGRACIÓN 033: Tabla de tokens de recuperación de contraseña
-- Fecha: 2026-10-09
-- Descripción: Crear tabla segura para tokens de recuperación
-- ============================================

-- Nota: Esta tabla reemplaza el uso inseguro de token_recuperacion_password
-- en la tabla usuarios. Los tokens se almacenan como hash, no en texto plano.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expiracion TIMESTAMP NOT NULL,
    utilizado BOOLEAN DEFAULT false,
    fecha_utilizacion TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Un usuario no puede tener más de un token activo a la vez
    CONSTRAINT usuario_token_unico UNIQUE (usuario_id, utilizado)
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario ON password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiracion ON password_reset_tokens(expiracion);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_utilizado ON password_reset_tokens(utilizado);

-- Índice compuesto para consultas de tokens válidos
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_validos
    ON password_reset_tokens(usuario_id, utilizado, expiracion)
    WHERE utilizado = false AND expiracion > CURRENT_TIMESTAMP;

-- Trigger para limpiar tokens expirados automáticamente
CREATE OR REPLACE FUNCTION limpiar_tokens_expirados()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expiracion < CURRENT_TIMESTAMP - INTERVAL '1 day';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar limpieza periódica (opcional: puede invocarse desde un cron job)
-- Por ahora, solo definimos la función para uso manual
