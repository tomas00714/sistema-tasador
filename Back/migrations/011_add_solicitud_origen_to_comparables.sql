-- Agrega la relación opcional entre comparables y la solicitud que los originó.
-- Se usa una columna en la tabla comparables (no tabla intermedia) para mantener
-- simetría con tasacion_origen_id y porque cada comparable pertenece a una sola solicitud.

ALTER TABLE comparables
ADD COLUMN IF NOT EXISTS solicitud_origen_id INTEGER REFERENCES solicitudes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comparables_solicitud_origen ON comparables(solicitud_origen_id);
