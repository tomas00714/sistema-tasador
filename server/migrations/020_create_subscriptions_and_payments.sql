-- ============================================
-- MIGRACIÓN 020: Tablas de suscripciones y pagos
-- Fecha: 2026-08-11
-- Descripción: Crea la infraestructura interna para representar
-- suscripciones mensuales e historial de pagos sin integrar aún
-- Mercado Pago, checkout, webhooks ni lógica de acceso.
-- ============================================

-- ============================================
-- TABLA: suscripciones
-- ============================================
CREATE TABLE IF NOT EXISTS suscripciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES planes(id),
    estado VARCHAR(20) DEFAULT 'pending' CHECK (estado IN ('pending', 'activa', 'en_gracia', 'cancelada', 'vencida')),
    fecha_inicio TIMESTAMP,
    fecha_fin_periodo TIMESTAMP,
    renovacion_automatica BOOLEAN DEFAULT true,
    fecha_cancelacion TIMESTAMP,
    mp_preapproval_id VARCHAR(255),
    mp_external_reference VARCHAR(255),
    monto DECIMAL(10,2) NOT NULL DEFAULT 10,
    moneda VARCHAR(3) NOT NULL DEFAULT 'USD',
    frecuencia INTEGER NOT NULL DEFAULT 1,
    frecuencia_tipo VARCHAR(20) NOT NULL DEFAULT 'months',
    ultimo_pago_id VARCHAR(255),
    ultimo_pago_estado VARCHAR(20),
    ultimo_pago_fecha TIMESTAMP,
    proximo_intento_cobro TIMESTAMP,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para suscripciones
CREATE INDEX IF NOT EXISTS idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_plan ON suscripciones(plan_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_mp_preapproval ON suscripciones(mp_preapproval_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);

-- Restricción parcial: un usuario puede tener como máximo una suscripción
-- en estado vigente (pending, activa, en_gracia o cancelada). Los estados
-- vencidos son históricos y pueden repetirse.
CREATE UNIQUE INDEX IF NOT EXISTS idx_suscripciones_unica_vigente
ON suscripciones(usuario_id)
WHERE estado IN ('pending', 'activa', 'en_gracia', 'cancelada');

-- ============================================
-- TABLA: pagos
-- ============================================
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    suscripcion_id INTEGER NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
    mp_authorized_payment_id VARCHAR(255),
    mp_payment_id VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'pending' CHECK (estado IN ('approved', 'rejected', 'pending', 'refunded')),
    monto DECIMAL(10,2),
    moneda VARCHAR(3),
    fecha_cobro TIMESTAMP,
    fecha_aprobacion TIMESTAMP,
    motivo_rechazo VARCHAR(255),
    raw_response JSONB,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion ON pagos(suscripcion_id);
CREATE INDEX IF NOT EXISTS idx_pagos_mp_authorized ON pagos(mp_authorized_payment_id);
CREATE INDEX IF NOT EXISTS idx_pagos_mp_payment ON pagos(mp_payment_id);
