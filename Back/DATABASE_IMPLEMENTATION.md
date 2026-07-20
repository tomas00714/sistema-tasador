# Implementación de Base de Datos PostgreSQL - MVP

## Resumen de Implementación

Esta etapa ha integrado PostgreSQL al backend del proyecto Tasador, manteniendo la compatibilidad con el sistema actual basado en localStorage.

## Tablas Implementadas (MVP)

### 1. **planes**
- Gestión de planes de suscripción (Free, Pro, Enterprise)
- Límites de uso (tasaciones, comparables, compartidos)
- Datos insertados por defecto

### 2. **usuarios**
- Autenticación (email/password y Google)
- Asociación con planes
- Estados (activo, suspendido, eliminado)
- UUID para identificación única

### 3. **tasaciones**
- Entidad principal del negocio
- Ubicación embebida (sin tabla separada)
- Campos para filtros y estadísticas
- Campos específicos por tipo de inmueble (lote, departamento, casa)
- JSONB para datos variables

### 4. **comparables**
- Propiedades de referencia
- Ubicación embebida
- Metadatos de compartición
- JSONB para datos variables

### 5. **tasacion_comparable**
- Relación N:M entre tasaciones y comparables
- Orden de comparables
- Fecha de agregación

### 6. **solicitudes**
- Solicitudes de datos de tasación
- Links públicos
- Estados (pendiente, completada, expirada)

## Características Técnicas

### Sin PostGIS
- Coordenadas almacenadas en `lat` (DECIMAL(10,8)) y `lon` (DECIMAL(11,8))
- Sin funciones geoespaciales
- Sin índices GIST
- Suficiente para el proyecto actual

### Triggers Automáticos
- `actualizar_fecha_modificacion_tasaciones`: Actualiza fecha_modificación en UPDATE
- `actualizar_fecha_modificacion_comparables`: Actualiza fecha_modificación en UPDATE
- `actualizar_fecha_modificacion_usuarios`: Actualiza fecha_modificación en UPDATE

### Índices
- B-tree para filtros frecuentes (usuario, tipo, estado, fechas, etc.)
- GIN para búsquedas en JSONB
- Índices compuestos para coordenadas (lat, lon)

## Sistema de Migraciones

### Estructura
- Directorio: `Back/migrations/`
- Archivos: `001_create_initial_tables.sql`
- Tabla de control: `schema_migrations`

### Endpoints
- `POST /api/migrations/run`: Ejecuta migraciones pendientes
- `GET /api/migrations/status`: Estado de migraciones

### Ejecución
```bash
# Ejecutar migraciones
curl -X POST http://127.0.0.1:8000/api/migrations/run

# Ver estado
curl http://127.0.0.1:8000/api/migrations/status
```

## Capa de Acceso a Datos (Repositorios)

### BaseRepository
- Operaciones CRUD genéricas
- `find_by_id`, `find_all`, `create`, `update`, `delete`
- `find_where` para consultas con condiciones

### Repositorios Específicos
- `UsuarioRepository`: Operaciones con usuarios
- `TasacionRepository`: Operaciones con tasaciones y comparables
- `ComparableRepository`: Operaciones con comparables
- `SolicitudRepository`: Operaciones con solicitudes

## Configuración

### Variables de Entorno (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasador
DB_USER=postgres
DB_PASSWORD=postgres
```

### Dependencias Agregadas
- `psycopg2-binary>=2.9.9`: Driver de PostgreSQL
- `python-dotenv>=1.0.0`: Carga de variables de entorno

## Pool de Conexiones

- Inicialización automática al iniciar el servidor
- Mínimo: 1 conexión
- Máximo: 10 conexiones
- Cierre automático al detener el servidor

## Compatibilidad con localStorage

### Estado Actual
- ✅ Frontend no modificado
- ✅ localStorage sigue funcionando
- ✅ Endpoints existentes sin cambios
- ✅ Sistema operativo normalmente

### Próxima Etapa
- Migración progresiva de tasaciones a PostgreSQL
- Migración progresiva de comparables a PostgreSQL
- Implementación de endpoints CRUD para tasaciones/comparables
- Actualización gradual del frontend

## Tablas Futuras (No Implementadas)

### sesiones
- Gestión de sesiones para autenticación con Google
- Tokens de acceso/refresh
- Dispositivos múltiples
- Revocación de sesiones

### pagos
- Historial de transacciones
- Integración con pasarelas de pago
- Reintentos y reembolsos
- Webhooks

### notificaciones
- Sistema de notificaciones
- Solicitudes pendientes
- Compartidos recibidos
- Alertas de planes

### auditoria
- Logs de cambios críticos
- Rastreo de acciones administrativas
- Compliance y debugging

### api_keys
- Control de acceso para APIs externas
- Rate limiting y scopes
- Revocación
- Analytics de uso

## Verificación de Implementación

### Conexión PostgreSQL
```bash
# Ver logs del servidor
# Debe mostrar:
# "Pool de conexiones a PostgreSQL inicializado correctamente"
# "Conexión exitosa a PostgreSQL. Versión: PostgreSQL 18.4..."
```

### Migraciones
```bash
# Verificar tablas creadas
# - planes
# - usuarios
# - tasaciones
# - comparables
# - tasacion_comparable
# - solicitudes
# - schema_migrations
```

### Endpoints Funcionales
- `GET /`: Servidor funcionando
- `GET /api/ids`: Contadores (localStorage)
- `POST /api/migrations/run`: Ejecutar migraciones
- `GET /api/migrations/status`: Estado migraciones
- `POST /tasar/lote`: Tasación de lote (existente)
- `POST /tasar/departamento`: Tasación de departamento (existente)

## Próximos Pasos

1. Implementar endpoints CRUD para tasaciones
2. Implementar endpoints CRUD para comparables
3. Crear servicio de migración localStorage → PostgreSQL
4. Actualizar frontend para usar nuevos endpoints
5. Implementar autenticación con Google
6. Implementar sistema de planes y pagos
