-- Migracion: eliminar datos antiguos de 'calidadConstruccion' que no son compatibles con 'caracteristicaConstructiva'

UPDATE tasaciones
SET datos = datos
    #- '{calidadConstruccion}'
    #- '{calidadConstruccionCoef}'
    #- '{casa,calidadConstruccion}'
    #- '{casa,calidadConstruccionCoef}'
WHERE datos ? 'calidadConstruccion'
   OR datos ? 'calidadConstruccionCoef'
   OR (datos -> 'casa') ? 'calidadConstruccion'
   OR (datos -> 'casa') ? 'calidadConstruccionCoef';

UPDATE comparables
SET datos = datos
    #- '{calidadConstruccion}'
    #- '{calidadConstruccionCoef}'
    #- '{casa,calidadConstruccion}'
    #- '{casa,calidadConstruccionCoef}'
WHERE datos ? 'calidadConstruccion'
   OR datos ? 'calidadConstruccionCoef'
   OR (datos -> 'casa') ? 'calidadConstruccion'
   OR (datos -> 'casa') ? 'calidadConstruccionCoef';
