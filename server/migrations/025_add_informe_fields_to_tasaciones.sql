-- ============================================
-- MIGRACIÓN 025: Agregar campos específicos del informe
-- Fecha: 2026-09-02
-- Descripción: Agrega nomenclatura catastral, cliente y finalidad
--              para completar la información del informe de tasación
-- ============================================

-- Agregar campos de informe a la tabla tasaciones
ALTER TABLE tasaciones 
ADD COLUMN IF NOT EXISTS nomenclatura_catastral VARCHAR(100),
ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(200),
ADD COLUMN IF NOT EXISTS finalidad VARCHAR(200) DEFAULT 'Tasación comercial';

-- Índices para búsquedas futuras
CREATE INDEX IF NOT EXISTS idx_tasaciones_nomenclatura ON tasaciones(nomenclatura_catastral);
CREATE INDEX IF NOT EXISTS idx_tasaciones_cliente ON tasaciones(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_tasaciones_finalidad ON tasaciones(finalidad);
