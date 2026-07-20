-- ============================================
-- MIGRACIÓN 001: Tablas Iniciales MVP
-- Fecha: 2024-07-08
-- Descripción: Creación de tablas principales del sistema
-- ============================================

-- ============================================
-- TABLA: schema_migrations (control de migraciones)
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: planes
-- ============================================
CREATE TABLE IF NOT EXISTS planes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    limite_tasaciones_mensuales INTEGER DEFAULT 10,
    limite_comparables_mensuales INTEGER DEFAULT 50,
    limite_compartidos_mensuales INTEGER DEFAULT 20,
    precio_mensual DECIMAL(10,2) DEFAULT 0,
    caracteristicas JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true
);

-- Insertar planes por defecto
INSERT INTO planes (nombre, descripcion, limite_tasaciones_mensuales, limite_comparables_mensuales, limite_compartidos_mensuales, precio_mensual, caracteristicas)
VALUES 
    ('Free', 'Plan gratuito con límites básicos', 10, 50, 20, 0, '{"features": ["tasaciones_basicas", "comparables_manuales"]}'),
    ('Pro', 'Plan profesional con límites extendidos', 100, 500, 200, 2999.00, '{"features": ["tasaciones_basicas", "comparables_manuales", "compartidos_ilimitados", "export_pdf"]}'),
    ('Enterprise', 'Plan empresarial sin límites', NULL, NULL, NULL, 9999.00, '{"features": ["todo_ilimitado", "api_access", "soporte_prioritario"]}')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    plan_id INTEGER REFERENCES planes(id) DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'eliminado')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_plan ON usuarios(plan_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);

-- ============================================
-- TABLA: tasaciones
-- ============================================
CREATE TABLE IF NOT EXISTS tasaciones (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    
    -- Ubicación (embebida, sin PostGIS)
    direccion VARCHAR(500) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    lat DECIMAL(10, 8) NOT NULL,
    lon DECIMAL(11, 8) NOT NULL,
    orientacion VARCHAR(50),
    
    -- Campos para filtrado (columnas)
    tipo_inmueble VARCHAR(20) NOT NULL CHECK (tipo_inmueble IN ('lote', 'departamento', 'casa')),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'completada', 'archivada')),
    origen VARCHAR(20) DEFAULT 'propia' CHECK (origen IN ('propia', 'compartida', 'solicitud')),
    origen_id VARCHAR(50),
    
    -- Datos para filtros y estadísticas
    valor_final DECIMAL(15,2),
    valor_m2 DECIMAL(10,2),
    superficie_total DECIMAL(10,2),
    superficie_homogeneizada DECIMAL(10,2),
    
    -- Campos específicos LOTE
    tipo_lote VARCHAR(50),
    frente DECIMAL(10,2),
    fondo DECIMAL(10,2),
    fos DECIMAL(5,2),
    fot DECIMAL(5,2),
    zonificacion VARCHAR(50),
    
    -- Campos específicos DEPARTAMENTO
    ambientes INTEGER,
    dormitorios INTEGER,
    banos INTEGER,
    cochera BOOLEAN,
    baulera BOOLEAN,
    tiene_ascensor BOOLEAN,
    antiguedad VARCHAR(50),
    estado_conservacion VARCHAR(50),
    ubicacion_piso VARCHAR(50),
    ubicacion_planta VARCHAR(50),
    superficie_cubierta DECIMAL(10,2),
    
    -- Campos específicos CASA
    tiene_pileta BOOLEAN,
    tiene_jardin BOOLEAN,
    superficie_terreno DECIMAL(10,2),
    
    -- Fechas para filtros temporales
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_completacion TIMESTAMP,
    
    -- Datos variables en JSONB
    datos JSONB NOT NULL DEFAULT '{}',
    resultado JSONB,
    coeficientes_personalizados JSONB DEFAULT '{}',
    observaciones TEXT
);

-- Índices para tasaciones
CREATE INDEX IF NOT EXISTS idx_tasaciones_usuario ON tasaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tasaciones_tipo ON tasaciones(tipo_inmueble);
CREATE INDEX IF NOT EXISTS idx_tasaciones_estado ON tasaciones(estado);
CREATE INDEX IF NOT EXISTS idx_tasaciones_fecha ON tasaciones(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_tasaciones_valor ON tasaciones(valor_final);
CREATE INDEX IF NOT EXISTS idx_tasaciones_superficie ON tasaciones(superficie_total);
CREATE INDEX IF NOT EXISTS idx_tasaciones_provincia ON tasaciones(provincia);
CREATE INDEX IF NOT EXISTS idx_tasaciones_localidad ON tasaciones(localidad);
CREATE INDEX IF NOT EXISTS idx_tasaciones_coords ON tasaciones(lat, lon);
CREATE INDEX IF NOT EXISTS idx_tasaciones_ambientes ON tasaciones(ambientes);
CREATE INDEX IF NOT EXISTS idx_tasaciones_dormitorios ON tasaciones(dormitorios);
CREATE INDEX IF NOT EXISTS idx_tasaciones_cochera ON tasaciones(cochera);
CREATE INDEX IF NOT EXISTS idx_tasaciones_tipo_lote ON tasaciones(tipo_lote);
CREATE INDEX IF NOT EXISTS idx_tasaciones_zonificacion ON tasaciones(zonificacion);

-- Índices GIN para JSONB
CREATE INDEX IF NOT EXISTS idx_tasaciones_datos ON tasaciones USING GIN(datos);

-- ============================================
-- TABLA: comparables
-- ============================================
CREATE TABLE IF NOT EXISTS comparables (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    tasacion_origen_id INTEGER REFERENCES tasaciones(id),
    
    -- Ubicación (embebida, sin PostGIS)
    direccion VARCHAR(500) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    lat DECIMAL(10, 8) NOT NULL,
    lon DECIMAL(11, 8) NOT NULL,
    
    -- Campos para filtrado (columnas)
    tipo_inmueble VARCHAR(20) NOT NULL CHECK (tipo_inmueble IN ('lote', 'departamento', 'casa')),
    fuente VARCHAR(20) DEFAULT 'manual' CHECK (fuente IN ('manual', 'de_tasacion', 'compartido')),
    tipo_valor VARCHAR(20) DEFAULT 'venta' CHECK (tipo_valor IN ('venta', 'alquiler')),
    
    -- Datos para filtros y estadísticas
    valor DECIMAL(15,2) NOT NULL,
    valor_m2 DECIMAL(10,2),
    superficie DECIMAL(10,2),
    frente DECIMAL(10,2),
    fondo DECIMAL(10,2),
    
    -- Campos específicos LOTE
    tipo_lote VARCHAR(50),
    
    -- Campos específicos DEPARTAMENTO
    ambientes INTEGER,
    dormitorios INTEGER,
    banos INTEGER,
    cochera BOOLEAN,
    tiene_ascensor BOOLEAN,
    
    -- Campos específicos CASA
    tiene_pileta BOOLEAN,
    tiene_jardin BOOLEAN,
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos variables en JSONB
    datos JSONB NOT NULL DEFAULT '{}',
    observaciones TEXT,
    
    -- Metadatos de compartición
    id_enviador INTEGER REFERENCES usuarios(id),
    id_creador INTEGER REFERENCES usuarios(id),
    nombre_creador VARCHAR(100)
);

-- Índices para comparables
CREATE INDEX IF NOT EXISTS idx_comparables_usuario ON comparables(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comparables_tipo ON comparables(tipo_inmueble);
CREATE INDEX IF NOT EXISTS idx_comparables_fuente ON comparables(fuente);
CREATE INDEX IF NOT EXISTS idx_comparables_valor ON comparables(valor);
CREATE INDEX IF NOT EXISTS idx_comparables_superficie ON comparables(superficie);
CREATE INDEX IF NOT EXISTS idx_comparables_provincia ON comparables(provincia);
CREATE INDEX IF NOT EXISTS idx_comparables_localidad ON comparables(localidad);
CREATE INDEX IF NOT EXISTS idx_comparables_coords ON comparables(lat, lon);

-- Índices GIN para JSONB
CREATE INDEX IF NOT EXISTS idx_comparables_datos ON comparables USING GIN(datos);

-- ============================================
-- TABLA: tasacion_comparable (N:M)
-- ============================================
CREATE TABLE IF NOT EXISTS tasacion_comparable (
    id SERIAL PRIMARY KEY,
    tasacion_id INTEGER NOT NULL REFERENCES tasaciones(id) ON DELETE CASCADE,
    comparable_id INTEGER NOT NULL REFERENCES comparables(id) ON DELETE CASCADE,
    orden INTEGER DEFAULT 0,
    fecha_agregacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tasacion_id, comparable_id)
);

-- Índices para tasacion_comparable
CREATE INDEX IF NOT EXISTS idx_tasacion_comparable_tasacion ON tasacion_comparable(tasacion_id);
CREATE INDEX IF NOT EXISTS idx_tasacion_comparable_comparable ON tasacion_comparable(comparable_id);

-- ============================================
-- TABLA: solicitudes
-- ============================================
CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    tasacion_generada_id INTEGER REFERENCES tasaciones(id),
    
    -- Campos para filtrado
    tipo_inmueble VARCHAR(20) NOT NULL CHECK (tipo_inmueble IN ('lote', 'departamento', 'casa')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'expirada')),
    
    -- Link público
    link_publico VARCHAR(255) UNIQUE,
    fecha_expiracion TIMESTAMP,
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_completacion TIMESTAMP,
    
    -- Datos solicitados
    datos_solicitados JSONB NOT NULL DEFAULT '{}'
);

-- Índices para solicitudes
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_link ON solicitudes(link_publico);

-- ============================================
-- TRIGGERS PARA MANTENIMIENTO AUTOMÁTICO
-- ============================================

-- Trigger para actualizar fecha_modificación en tasaciones
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_tasaciones()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasaciones_modificacion ON tasaciones;
CREATE TRIGGER trg_tasaciones_modificacion
    BEFORE UPDATE ON tasaciones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_tasaciones();

-- Trigger para actualizar fecha_modificación en comparables
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_comparables()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comparables_modificacion ON comparables;
CREATE TRIGGER trg_comparables_modificacion
    BEFORE UPDATE ON comparables
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_comparables();

-- Trigger para actualizar fecha_modificación en usuarios
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_usuarios()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_modificacion ON usuarios;
CREATE TRIGGER trg_usuarios_modificacion
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_usuarios();
