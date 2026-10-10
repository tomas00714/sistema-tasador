-- ============================================
-- MIGRACIÓN 034: Corregir constraint de tokens activos
-- Fecha: 2026-10-09
-- Descripción: Reemplaza constraint incorrecto por índice único parcial
-- ============================================

-- Esta migración corrige el problema del constraint usuario_token_unico
-- que permitía múltiples tokens activos por usuario.
-- Reemplaza por un índice UNIQUE parcial que garantiza máximo un token activo.

-- 1. Eliminar el constraint incorrecto si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_token_unico'
        AND conrelid = 'password_reset_tokens'::regclass
    ) THEN
        ALTER TABLE password_reset_tokens DROP CONSTRAINT usuario_token_unico;
        RAISE NOTICE 'Constraint usuario_token_unico eliminado';
    END IF;
END $$;

-- 2. Verificar y recrear el índice único parcial si es necesario
-- Esta sección verifica si el índice existe con la definición correcta
-- Si existe con definición incorrecta, falla explícitamente para evitar problemas silenciosos
DO $$
DECLARE
    index_exists BOOLEAN;
    index_def_correct BOOLEAN;
BEGIN
    -- Verificar si el índice existe
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_password_reset_tokens_usuario_activo'
        AND schemaname = 'public'
    ) INTO index_exists;

    IF index_exists THEN
        -- Verificar que la definición sea correcta
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes i
            JOIN pg_class t ON t.relname = i.tablename
            JOIN pg_namespace n ON n.nspname = i.schemaname
            WHERE i.indexname = 'idx_password_reset_tokens_usuario_activo'
            AND i.schemaname = 'public'
            AND i.tablename = 'password_reset_tokens'
            AND i.indexdef LIKE '%CREATE UNIQUE INDEX%'
            AND i.indexdef LIKE '%ON password_reset_tokens(usuario_id)%'
            AND i.indexdef LIKE '%WHERE utilizado = false%'
        ) INTO index_def_correct;

        IF index_def_correct THEN
            RAISE NOTICE 'Índice idx_password_reset_tokens_usuario_activo ya existe con definición correcta';
        ELSE
            RAISE EXCEPTION 'El índice idx_password_reset_tokens_usuario_activo existe pero su definición es incorrecta. Manualmente elimínalo y vuelve a ejecutar la migración.';
        END IF;
    ELSE
        -- Crear el índice con la definición correcta
        CREATE UNIQUE INDEX idx_password_reset_tokens_usuario_activo
        ON password_reset_tokens(usuario_id)
        WHERE utilizado = false;
        RAISE NOTICE 'Índice idx_password_reset_tokens_usuario_activo creado';
    END IF;
END $$;

-- 3. Invalidar tokens activos duplicados conservando solo el más reciente por usuario
-- Esto maneja el caso donde ya existan tokens activos duplicados en producción
WITH tokens_duplicados AS (
    SELECT
        usuario_id,
        array_agg(id ORDER BY fecha_creacion DESC) as token_ids
    FROM password_reset_tokens
    WHERE utilizado = false
    AND expiracion > CURRENT_TIMESTAMP
    GROUP BY usuario_id
    HAVING count(*) > 1
)
UPDATE password_reset_tokens
SET utilizado = true, fecha_utilizacion = CURRENT_TIMESTAMP
WHERE id IN (
    SELECT unnest(token_ids)[2:]  -- Mantener solo el primero (más reciente), invalidar el resto
    FROM tokens_duplicados
);

-- 5. Recrear índice compuesto para consultas de tokens válidos (mejorado)
DROP INDEX IF EXISTS idx_password_reset_tokens_validos;
CREATE INDEX idx_password_reset_tokens_validos
ON password_reset_tokens(usuario_id, utilizado, expiracion)
WHERE utilizado = false AND expiracion > CURRENT_TIMESTAMP;
