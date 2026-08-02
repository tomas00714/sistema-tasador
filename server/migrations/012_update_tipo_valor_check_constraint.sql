-- ============================================
-- MIGRACIÓN 012: Actualizar CHECK constraint tipo_valor
-- Fecha: 2026-07-29
-- Descripción: Reemplazar 'alquiler' por 'oferta' en el CHECK constraint
--              de la columna tipo_valor en la tabla comparables.
--              'alquiler' nunca se implementó en el sistema.
-- ============================================

-- Eliminar el CHECK constraint existente
ALTER TABLE comparables 
DROP CONSTRAINT IF EXISTS comparables_tipo_valor_check;

-- Crear el nuevo CHECK constraint con 'oferta' en lugar de 'alquiler'
ALTER TABLE comparables 
ADD CONSTRAINT comparables_tipo_valor_check 
CHECK (tipo_valor IN ('venta', 'oferta'));
