-- ============================================
-- MIGRACIÓN 023: Agregar snapshot histórico a tasacion_comparable
-- Fecha: 2026-01-XX
-- Descripción: Agrega columna snapshot para almacenar datos históricos
--              de comparables y cambia ON DELETE CASCADE a SET NULL
--              para permitir eliminar comparables sin perder histórico.
-- ============================================

ALTER TABLE tasacion_comparable
ADD COLUMN IF NOT EXISTS snapshot JSONB DEFAULT '{}';

ALTER TABLE tasacion_comparable
DROP CONSTRAINT IF EXISTS tasacion_comparable_comparable_id_fkey;

ALTER TABLE tasacion_comparable
ADD CONSTRAINT tasacion_comparable_comparable_id_fkey
FOREIGN KEY (comparable_id) REFERENCES comparables(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasacion_comparable_snapshot ON tasacion_comparable USING GIN(snapshot);

UPDATE tasacion_comparable tc
SET snapshot = (
    SELECT jsonb_build_object(
        'direccion', c.direccion,
        'lat', c.lat,
        'lon', c.lon,
        'tipo_inmueble', c.tipo_inmueble,
        'tipo_valor', c.tipo_valor,
        'valor', c.valor,
        'valor_m2', c.valor_m2,
        'superficie', c.superficie,
        'frente', c.frente,
        'fondo', c.fondo,
        'tipo_lote', c.tipo_lote,
        'ambientes', c.ambientes,
        'dormitorios', c.dormitorios,
        'banos', c.banos,
        'cochera', c.cochera,
        'tiene_ascensor', c.tiene_ascensor,
        'tiene_pileta', c.tiene_pileta,
        'tiene_jardin', c.tiene_jardin,
        'datos', c.datos
    )
    FROM comparables c
    WHERE c.id = tc.comparable_id
)
WHERE tc.comparable_id IS NOT NULL
  AND (tc.snapshot = '{}'::jsonb OR tc.snapshot IS NULL);
