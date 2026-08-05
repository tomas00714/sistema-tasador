-- Migracion: permitir valores descriptivos (Monoambiente, 6+, 5+) en ambientes, dormitorios y banos
-- La conversion de INTEGER a VARCHAR no pierde datos numericos ya que se transforman en texto.

ALTER TABLE IF EXISTS tasaciones
    ALTER COLUMN ambientes TYPE VARCHAR(20),
    ALTER COLUMN dormitorios TYPE VARCHAR(20),
    ALTER COLUMN banos TYPE VARCHAR(20);

ALTER TABLE IF EXISTS comparables
    ALTER COLUMN ambientes TYPE VARCHAR(20),
    ALTER COLUMN dormitorios TYPE VARCHAR(20),
    ALTER COLUMN banos TYPE VARCHAR(20);
