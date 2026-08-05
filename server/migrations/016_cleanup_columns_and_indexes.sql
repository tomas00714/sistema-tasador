-- ============================================
-- MIGRACIÓN 016: Limpieza de columnas redundantes, tipos correctos e índices útiles
-- Fecha: 2026-08-04
-- Descripción:
--   - Elimina columnas muertas en tasaciones: resultado, tipo, comparables_ids.
--   - Normaliza antiguedad y estado_conservacion a INTEGER.
--   - Agrega índices compuestos útiles para listados por usuario.
-- ============================================

-- Eliminar columnas redundantes/muertas
ALTER TABLE tasaciones DROP COLUMN IF EXISTS resultado;
ALTER TABLE tasaciones DROP COLUMN IF EXISTS tipo;
ALTER TABLE tasaciones DROP COLUMN IF EXISTS comparables_ids;

-- Eliminar índices de columnas que ya no existen (seguro si no existen)
DROP INDEX IF EXISTS idx_tasaciones_resultado;
DROP INDEX IF EXISTS idx_tasaciones_comparables_ids;

-- Nota: no se elimina idx_tasaciones_tipo porque apunta a tipo_inmueble, no a la antigua columna tipo.

-- Corregir tipos de datos de campos inconsistentes
ALTER TABLE tasaciones
    ALTER COLUMN antiguedad TYPE INTEGER
    USING CASE
        WHEN antiguedad ~ '^\s*\d+\s*$' THEN antiguedad::INTEGER
        ELSE NULL
    END;

ALTER TABLE tasaciones
    ALTER COLUMN estado_conservacion TYPE INTEGER
    USING CASE
        WHEN estado_conservacion ~ '\d' THEN (substring(estado_conservacion from '\d+'))::INTEGER
        ELSE NULL
    END;

-- Agregar índices útiles para listados paginados y filtros
CREATE INDEX IF NOT EXISTS idx_tasaciones_usuario_fecha ON tasaciones(usuario_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_tasaciones_usuario_tipo ON tasaciones(usuario_id, tipo_inmueble);
CREATE INDEX IF NOT EXISTS idx_tasaciones_usuario_estado ON tasaciones(usuario_id, estado);

CREATE INDEX IF NOT EXISTS idx_comparables_usuario_fecha ON comparables(usuario_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_comparables_usuario_tipo ON comparables(usuario_id, tipo_inmueble);
CREATE INDEX IF NOT EXISTS idx_comparables_usuario_fuente ON comparables(usuario_id, fuente);

CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario_fecha ON solicitudes(usuario_id, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario_estado ON solicitudes(usuario_id, estado);
