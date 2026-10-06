-- ============================================
-- MIGRACIÓN 031: Campos para checkout de suscripción sin plan
-- Fecha: 2026-10-06
-- Descripción: Agrega campos para manejo de suscripciones
-- con pagos pendientes (checkout init_point) y detalles
-- financieros de pagos (monto neto, comisión MP).
-- ============================================

-- ============================================
-- TABLA: suscripciones
-- ============================================

-- init_point: URL de checkout de Mercado Pago para que el usuario complete el pago
ALTER TABLE suscripciones ADD COLUMN init_point TEXT;

-- fecha_inicio_checkout: momento en que se generó el enlace de checkout
ALTER TABLE suscripciones ADD COLUMN fecha_inicio_checkout TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Índices para búsqueda eficiente
CREATE INDEX idx_suscripciones_fecha_checkout ON suscripciones(fecha_inicio_checkout);

-- Índice único en external_reference para fallback en webhooks
CREATE UNIQUE INDEX IF NOT EXISTS idx_suscripciones_external_ref ON suscripciones(mp_external_reference);

-- ============================================
-- TABLA: pagos
-- ============================================

-- monto_neto: importe neto recibido después de comisiones de MP
ALTER TABLE pagos ADD COLUMN monto_neto DECIMAL(10,2);

-- comision_mp: comisión cobrada por Mercado Pago
ALTER TABLE pagos ADD COLUMN comision_mp DECIMAL(10,2);
