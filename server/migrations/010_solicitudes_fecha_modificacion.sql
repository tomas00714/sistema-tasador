-- Agregar fecha_modificacion a solicitudes y trigger para mantenerla actualizada

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_solicitudes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitudes_modificacion ON solicitudes;
CREATE TRIGGER trg_solicitudes_modificacion
    BEFORE UPDATE ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_solicitudes();
