-- Agregar campos de autenticación a la tabla usuarios
-- Migración 013

-- Campos para verificación de email
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_verificacion_email VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_verificacion_email TIMESTAMP;

-- Campos para recuperación de contraseña
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_recuperacion_password VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_expiracion_recuperacion TIMESTAMP;
