-- ============================================
-- MIGRACIÓN 028: Autorización OAuth del Seller (Mercado Pago Marketplace)
-- Fecha: 2026-09-29
-- Descripción: Crea la infraestructura para persistir la autorización
-- OAuth que el Seller (cuenta de Mercado Pago del socio) otorgará a
-- nuestra aplicación Marketplace. Los tokens se almacenan cifrados
-- (Fernet) y nunca salen del backend. Habilita el futuro Split 1:1 con
-- Checkout Pro (marketplace_fee); NO se usa para Checkout API ni
-- application_fee.
-- ============================================

-- ============================================
-- TABLA: mercadopago_sellers
-- ============================================
CREATE TABLE IF NOT EXISTS mercadopago_sellers (
    id SERIAL PRIMARY KEY,
    -- user_id que Mercado Pago devuelve en el intercambio del authorization code.
    -- Identifica a la cuenta Seller autorizada.
    mp_user_id BIGINT NOT NULL UNIQUE,
    -- Tokens OAuth del Seller, cifrados en reposo (Fernet). Nunca en texto plano.
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    -- Metadata no sensible devuelta por /oauth/token
    public_key VARCHAR(255),
    scope VARCHAR(500),
    token_type VARCHAR(50),
    expires_in INTEGER,
    token_expira_en TIMESTAMP,
    live_mode BOOLEAN DEFAULT FALSE,
    -- Estado del vínculo OAuth
    estado VARCHAR(20) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa', 'revocada', 'error')),
    -- Usuario interno (admin) que inició el proceso de autorización
    autorizado_por_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mercadopago_sellers
CREATE INDEX IF NOT EXISTS idx_mp_sellers_estado ON mercadopago_sellers(estado);
