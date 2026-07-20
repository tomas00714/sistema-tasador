"""
Utilidad para extraer campos específicos de los datos JSON y mapearlos
a columnas de la base de datos, siguiendo el modelo híbrido del proyecto.
"""

from typing import Dict, Any


def extraer_valor(datos: Dict[str, Any], *rutas, default=None, transform=None):
    """Extrae un valor de un diccionario anidado siguiendo varias rutas posibles."""
    for ruta in rutas:
        valor = datos
        if isinstance(ruta, str):
            ruta = [ruta]
        try:
            for key in ruta:
                if isinstance(valor, dict):
                    valor = valor.get(key, default)
                else:
                    valor = default
                    break
        except Exception:
            valor = default
        if valor is not None and valor != default:
            break
    
    if transform and valor is not None:
        try:
            valor = transform(valor)
        except Exception:
            valor = default
    
    return valor if valor is not None else default


def mapear_tasacion_a_columnas(datos: Dict[str, Any]) -> Dict[str, Any]:
    """Mapea datos de una tasación a las columnas específicas de la tabla."""
    columnas = {}
    
    if not datos or not isinstance(datos, dict):
        return columnas
    
    # Ubicación
    ubicacion = datos.get('ubicacion', {})
    if isinstance(ubicacion, dict):
        columnas['direccion'] = ubicacion.get('direccion')
        columnas['provincia'] = ubicacion.get('provincia')
        columnas['localidad'] = ubicacion.get('localidad')
        columnas['codigo_postal'] = ubicacion.get('codigoPostal')
        columnas['lat'] = extraer_valor(ubicacion, 'lat', 'latitud', default=None, transform=float)
        columnas['lon'] = extraer_valor(ubicacion, 'lon', 'longitud', 'lng', default=None, transform=float)
        columnas['orientacion'] = ubicacion.get('orientacion')
    
    # Resultado y valor
    resultado = datos.get('resultado', {})
    if isinstance(resultado, dict):
        columnas['valor_final'] = extraer_valor(resultado, 'valor_final', 'valorFinal', 'valor', default=None, transform=float)
        columnas['valor_m2'] = extraer_valor(resultado, 'valor_m2', 'valorM2', 'valorUnitario', default=None, transform=float)
    
    # Tipo de inmueble
    tipo = datos.get('tipo', 'lote').lower()
    columnas['tipo_inmueble'] = tipo
    
    # Campos específicos por tipo
    if tipo == 'lote':
        lote = datos.get('lote', {})
        if isinstance(lote, dict):
            caracteristicas = lote.get('caracteristicas', {})
            if isinstance(caracteristicas, dict):
                columnas['tipo_lote'] = lote.get('tipoLote') or caracteristicas.get('tipoLote')
                columnas['frente'] = extraer_valor(caracteristicas, 'frente', 'frenteMetros', default=None, transform=float)
                columnas['fondo'] = extraer_valor(caracteristicas, 'fondo', 'fondoMetros', default=None, transform=float)
                columnas['fos'] = extraer_valor(caracteristicas, 'fos', 'FOS', default=None, transform=float)
                columnas['fot'] = extraer_valor(caracteristicas, 'fot', 'FOT', default=None, transform=float)
                columnas['zonificacion'] = caracteristicas.get('zonificacion')
                columnas['superficie_total'] = extraer_valor(caracteristicas, 'superficie', 'superficieTotal', 'superficieTerreno', default=None, transform=float)
                columnas['superficie_homogeneizada'] = extraer_valor(caracteristicas, 'superficieHomogeneizada', 'superficieHomo', default=None, transform=float)
    
    elif tipo == 'departamento':
        depto = datos.get('departamento', {})
        if isinstance(depto, dict):
            columnas['ambientes'] = extraer_valor(depto, 'ambientes', 'cantAmbientes', default=None, transform=int)
            columnas['dormitorios'] = extraer_valor(depto, 'dormitorios', 'cantDormitorios', default=None, transform=int)
            columnas['banos'] = extraer_valor(depto, 'banos', 'cantBanos', 'banios', default=None, transform=int)
            columnas['cochera'] = extraer_valor(depto, 'cochera', 'tieneCochera', default=None, transform=lambda v: bool(v))
            columnas['baulera'] = extraer_valor(depto, 'baulera', 'tieneBaulera', default=None, transform=lambda v: bool(v))
            columnas['tiene_ascensor'] = extraer_valor(depto, 'tieneAscensor', 'ascensor', default=None, transform=lambda v: bool(v) if isinstance(v, bool) else v in ('si', 'Si', 'SI', 'sí', 'true'))
            columnas['antiguedad'] = str(depto.get('antiguedad')) if depto.get('antiguedad') is not None else None
            columnas['estado_conservacion'] = depto.get('estadoConservacion')
            columnas['ubicacion_piso'] = depto.get('ubicacionPiso')
            columnas['ubicacion_planta'] = depto.get('ubicacionPlanta')
            columnas['superficie_cubierta'] = extraer_valor(depto, 'superficieCubierta', 'superficie', default=None, transform=float)
            columnas['superficie_total'] = extraer_valor(depto, 'superficieTotal', 'superficieCubierta', default=None, transform=float)
            columnas['superficie_homogeneizada'] = extraer_valor(depto, 'superficieHomogeneizada', 'totalHomogeneizada', 'totalSuperficie', default=None, transform=float)
    
    elif tipo == 'casa':
        casa = datos.get('casa', {})
        if isinstance(casa, dict):
            columnas['ambientes'] = extraer_valor(casa, 'ambientes', 'cantAmbientes', default=None, transform=int)
            columnas['dormitorios'] = extraer_valor(casa, 'dormitorios', 'cantDormitorios', default=None, transform=int)
            columnas['banos'] = extraer_valor(casa, 'banos', 'cantBanos', 'banios', default=None, transform=int)
            columnas['cochera'] = extraer_valor(casa, 'cochera', 'tieneCochera', default=None, transform=lambda v: bool(v))
            columnas['tiene_pileta'] = extraer_valor(casa, 'tienePileta', 'pileta', default=None, transform=lambda v: bool(v))
            columnas['tiene_jardin'] = extraer_valor(casa, 'tieneJardin', 'jardin', default=None, transform=lambda v: bool(v))
            columnas['superficie_cubierta'] = extraer_valor(casa, 'superficieCubierta', 'superficie', default=None, transform=float)
            columnas['superficie_terreno'] = extraer_valor(casa, 'superficieTerreno', 'superficieTotal', default=None, transform=float)
            columnas['superficie_total'] = extraer_valor(casa, 'superficieTotal', 'superficieCubierta', default=None, transform=float)
    
    # Limpiar valores vacíos para evitar conflictos con NOT NULL
    columnas_limpias = {}
    for k, v in columnas.items():
        if v is not None and v != '' and v != 'None' and v != 'null':
            columnas_limpias[k] = v
    
    return columnas_limpias


def mapear_comparable_a_columnas(datos: Dict[str, Any]) -> Dict[str, Any]:
    """Mapea datos de un comparable a las columnas específicas de la tabla."""
    columnas = {}
    
    if not datos or not isinstance(datos, dict):
        return columnas
    
    # Ubicación
    ubicacion = datos.get('ubicacion', {})
    if isinstance(ubicacion, dict):
        columnas['direccion'] = ubicacion.get('direccion')
        columnas['provincia'] = ubicacion.get('provincia')
        columnas['localidad'] = ubicacion.get('localidad')
        columnas['codigo_postal'] = ubicacion.get('codigoPostal')
        columnas['lat'] = extraer_valor(ubicacion, 'lat', 'latitud', default=None, transform=float)
        columnas['lon'] = extraer_valor(ubicacion, 'lon', 'longitud', 'lng', default=None, transform=float)
    
    # Tipo inmueble: el frontend envia 'tipoInmueble', no 'tipo'
    tipo = (datos.get('tipoInmueble') or datos.get('tipo', 'lote')).lower()
    columnas['tipo_inmueble'] = tipo
    
    # Valor y superficie
    columnas['valor'] = extraer_valor(datos, 'valor', 'valor_total', 'valorTotal', 'precio', default=None, transform=float)
    columnas['valor_m2'] = extraer_valor(datos, 'valor_m2', 'valorM2', 'valorUnitario', default=None, transform=float)
    columnas['superficie'] = extraer_valor(datos, 'superficie', 'superficieTotal', 'superficieCubierta', default=None, transform=float)
    columnas['frente'] = extraer_valor(datos, 'frente', 'frenteMetros', ['lote', 'caracteristicas', 'frente'], default=None, transform=float)
    columnas['fondo'] = extraer_valor(datos, 'fondo', 'fondoMetros', ['lote', 'caracteristicas', 'fondo'], default=None, transform=float)
    
    # Tipo de valor
    tipo_valor = datos.get('tipoValor') or datos.get('tipo_valor') or 'venta'
    columnas['tipo_valor'] = tipo_valor.lower()
    
    # Campos específicos por tipo
    if tipo == 'lote':
        lote = datos.get('lote', datos if 'tipoLote' in datos else {})
        if isinstance(lote, dict):
            columnas['tipo_lote'] = lote.get('tipoLote') or datos.get('tipoLote')
    
    elif tipo == 'departamento':
        depto = datos.get('departamento', {})
        if isinstance(depto, dict):
            columnas['ambientes'] = extraer_valor(depto, 'ambientes', 'cantAmbientes', default=None, transform=int)
            columnas['dormitorios'] = extraer_valor(depto, 'dormitorios', 'cantDormitorios', default=None, transform=int)
            columnas['banos'] = extraer_valor(depto, 'banos', 'cantBanos', 'banios', default=None, transform=int)
            columnas['cochera'] = extraer_valor(depto, 'cochera', 'tieneCochera', default=None, transform=lambda v: bool(v))
            columnas['tiene_ascensor'] = extraer_valor(depto, 'tieneAscensor', 'ascensor', default=None, transform=lambda v: bool(v) if isinstance(v, bool) else v in ('si', 'Si', 'SI', 'sí', 'true'))
    
    elif tipo == 'casa':
        casa = datos.get('casa', {})
        if isinstance(casa, dict):
            columnas['ambientes'] = extraer_valor(casa, 'ambientes', 'cantAmbientes', default=None, transform=int)
            columnas['dormitorios'] = extraer_valor(casa, 'dormitorios', 'cantDormitorios', default=None, transform=int)
            columnas['banos'] = extraer_valor(casa, 'banos', 'cantBanos', 'banios', default=None, transform=int)
            columnas['tiene_pileta'] = extraer_valor(casa, 'tienePileta', 'pileta', default=None, transform=lambda v: bool(v))
            columnas['tiene_jardin'] = extraer_valor(casa, 'tieneJardin', 'jardin', default=None, transform=lambda v: bool(v))
    
    # Limpiar valores vacíos
    columnas_limpias = {}
    for k, v in columnas.items():
        if v is not None and v != '' and v != 'None' and v != 'null':
            columnas_limpias[k] = v
    
    return columnas_limpias
