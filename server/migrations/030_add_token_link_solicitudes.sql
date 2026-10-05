-- MIGRACIÓN 030: Token aleatorio para links públicos de solicitudes
--
-- Objetivo: el link público de una solicitud dejaba de ser un secreto
-- real: se generaba a partir del código Optimus del ID secuencial, que
-- es enumerable con algoritmo público. Se agrega una columna
-- token_link impredecible (la genera la aplicación con
-- secrets.token_urlsafe; el backfill usa valores aleatorios por fila).
--
-- Compatibilidad: las solicitudes existentes reciben un token nuevo al
-- migrar. Los links compartidos antes del despliegue dejan de resolver
-- (la app muestra el link actualizado al consultar la solicitud).

ALTER TABLE solicitudes
    ADD COLUMN IF NOT EXISTS token_link VARCHAR(128);

-- Backfill: token aleatorio por fila. md5 de random()+clock_timestamp()
-- produce 32 hex chars impredecibles (no derivables del ID).
UPDATE solicitudes
SET token_link = md5(random()::text || clock_timestamp()::text)
WHERE token_link IS NULL;

ALTER TABLE solicitudes
    ALTER COLUMN token_link SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_token_link
    ON solicitudes(token_link);
