-- ============================================
-- MIGRACIÓN 029: Ampliar columna scope de mercadopago_sellers a TEXT
-- Fecha: 2026-10-01
-- Descripción: En producción el callback OAuth del Seller falló con
-- "value too long for type character varying(500)": Mercado Pago devuelve
-- en el campo ``scope`` de /oauth/token la lista completa de permisos
-- otorgados por el Seller a la aplicación Marketplace, que puede superar
-- los 500 caracteres. Se amplía la columna a TEXT (longitud variable sin
-- límite práctico). No altera datos existentes ni otros tipos.
-- ============================================

ALTER TABLE mercadopago_sellers ALTER COLUMN scope TYPE TEXT;
