-- Hacer columnas de comparables opcionales para soportar el modelo híbrido
-- donde los datos pueden residir principalmente en JSONB

ALTER TABLE comparables
    ALTER COLUMN lat DROP NOT NULL,
    ALTER COLUMN lon DROP NOT NULL,
    ALTER COLUMN valor DROP NOT NULL,
    ALTER COLUMN direccion DROP NOT NULL,
    ALTER COLUMN provincia DROP NOT NULL,
    ALTER COLUMN localidad DROP NOT NULL;
