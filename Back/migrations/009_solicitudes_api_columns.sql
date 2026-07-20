-- Adaptar tabla solicitudes al modelo usado por la API
-- El API espera tasacion_id, datos y estado con valores 'pendiente', 'aceptada', 'rechazada'

ALTER TABLE solicitudes
    ADD COLUMN IF NOT EXISTS tasacion_id INTEGER REFERENCES tasaciones(id),
    ADD COLUMN IF NOT EXISTS datos JSONB NOT NULL DEFAULT '{}';

-- Migrar datos existentes si es posible
UPDATE solicitudes SET tasacion_id = tasacion_generada_id WHERE tasacion_id IS NULL AND tasacion_generada_id IS NOT NULL;

ALTER TABLE solicitudes
    ALTER COLUMN tipo_inmueble DROP NOT NULL;

-- Ajustar check de estado para incluir aceptada y rechazada
ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS solicitudes_estado_check;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'completada', 'expirada'));
