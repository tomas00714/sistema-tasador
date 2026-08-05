# Mejoras futuras del modelo de datos

Este documento contiene recomendaciones técnicas deliberadamente **no implementadas** en el ciclo actual porque aún no son necesarias o implican cambios arquitectónicos importantes. Se priorizó mantener compatibilidad, no duplicar lógica y no agregar funcionalidades que todavía no se usan.

## 1. Geoespacial y normalización de ubicación

### PostGIS
- Migrar `lat` y `lon` a una columna `geography(POINT, 4326)` para consultas por distancia y mapas de calor.
- Agregar `geohash` o `h3_index` para agregaciones geográficas y mapas de calor.
- Crear una dimensión `zonas` con códigos únicos, nombres normalizados y relación con `tasaciones` y `comparables`.

### Normalización de provincias/localidades
- Reemplazar `provincia` y `localidad` como texto libre por `zona_id` o códigos oficiales.
- Mantener `provincia_nombre` y `localidad_nombre` como columnas descriptivas si es necesario.

## 2. Auditoría, versionado y soft delete

- `deleted_at` en `tasaciones`, `comparables`, `solicitudes` y `usuarios` para soft delete.
- `created_by`, `updated_by`, `ip_address`, `user_agent`.
- Tabla `auditoria_cambios` con `entidad`, `entidad_id`, `usuario_id`, `timestamp`, `diff`.
- Versionado de `datos` JSONB para poder reproducir estados históricos.

## 3. Análisis y métricas

### Tabla `valores_reales`
- Guardar `valor_real` de una tasación junto con `fecha_real` y `fuente` para medir precisión del modelo.

### Eventos y logs
- `api_logs` o `eventos` para métricas de uso (login, export, compartir, recálculo).
- `usuario_plan_historial` para saber en qué plan estaba un usuario al momento de cada tasación.

### Materialized views
- `mv_estadisticas_zona`: promedios de `valor_m2`, cantidad de tasaciones y comparables por zona.
- `mv_uso_usuarios`: tasaciones por mes, logins, etc.

## 4. Escalabilidad

- Particionamiento de `tasaciones` y `comparables` por `fecha_creacion` o `tipo_inmueble` cuando se superen las 100.000 filas.
- Uso de `BRIN` en `fecha_creacion` y `jsonb_path_ops` en `datos`.
- Extracción progresiva de campos JSONB a columnas estructuradas según se usen en filtros/estadísticas.

## 5. Entidades adicionales

- `archivos` / `adjuntos` para fotos y documentos.
- `notificaciones` vinculadas a `usuarios` y `solicitudes`.
- `pagos` / `facturas` / `suscripciones` para planes de pago.
- `comparable_eventos` para registrar uso, descarte y peso de cada comparable en una tasación.

## 6. Datos sensibles y administración

- `usuarios.rol` (`admin`, `usuario`, `soporte`) para no depender exclusivamente de `ADMIN_EMAIL_*` en `.env`.
- Anonimización de direcciones exactas en reportes agregados o exportaciones.
- Políticas de acceso para datos de terceros en `solicitudes`.
