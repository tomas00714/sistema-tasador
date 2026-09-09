/**
 * Adaptador: convierte una tasación del historial al formato del informe.
 */

// Ya no se usa STORAGE_KEY_INFORME - el ID viene de la URL

// ============================================
// SELECTOR TIPO-AWARE
// ============================================

class TasacionDataSelector {
    constructor(tasacion) {
        this.tasacion = tasacion;
        this.tipo = tasacion.tipo || 'lote';
    }

    // Selector genérico que obtiene dato según tipo
    getDato(rutaLote, rutaDepto, rutaCasa, fallback = '—') {
        switch (this.tipo) {
            case 'lote':
                return this.getNested(this.tasacion.lote, rutaLote) || fallback;
            case 'departamento':
                return this.getNested(this.tasacion.departamento, rutaDepto) || fallback;
            case 'casa':
                return this.getNested(this.tasacion.casa, rutaCasa) || fallback;
            default:
                return fallback;
        }
    }

    getNested(obj, path) {
        if (!obj || !path) return null;
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }

    // Métodos específicos para datos comunes
    getSuperficieTotal() {
        return this.getDato(
            'caracteristicas.superficie',
            'homogeneizacion.totalSuperficie',
            'superficieTotal'
        );
    }

    getSuperficieCubierta() {
        return this.getDato(
            'caracteristicas.superficie',
            'superficieCubierta',
            'superficieCubierta'
        );
    }

    getAmbientes() {
        return this.getDato(
            null,
            'ambientes',
            'ambientes'
        );
    }

    getDormitorios() {
        return this.getDato(
            null,
            'dormitorios',
            'dormitorios'
        );
    }

    getBanos() {
        return this.getDato(
            null,
            'banos',
            'banos'
        );
    }

    getAntiguedad() {
        return this.getDato(
            'caracteristicas.antiguedad',
            'antiguedad',
            'antiguedad'
        );
    }

    getCaracteristicaConstructiva() {
        return this.getDato(
            null,
            'caracteristicaConstructiva',
            'caracteristicaConstructiva'
        );
    }

    getEstadoConservacion() {
        return this.getDato(
            null,
            'estadoConservacion',
            'estadoConservacion'
        );
    }

    getHomogeneizacion() {
        return this.getDato(
            null,
            'homogeneizacion',
            'homogeneizacion'
        );
    }

    getServicios() {
        return this.getDato(
            'servicios',
            'servicios',
            'servicios',
            []
        );
    }

    // Para campos que solo existen en algunos tipos
    tieneAmenities() {
        return this.tipo === 'departamento' && this.tasacion.departamento?.amenities;
    }

    getAmenities() {
        return this.tieneAmenities() ? this.tasacion.departamento.amenities : [];
    }

    tieneInfraestructura() {
        return this.tipo === 'departamento' && this.tasacion.departamento?.infraestructura;
    }

    getInfraestructura() {
        return this.tieneInfraestructura() ? this.tasacion.departamento.infraestructura : [];
    }

    getTipoLote() {
        return this.tipo === 'lote' ? this.tasacion.lote?.tipoLote : null;
    }

    getZonificacion() {
        return this.getDato(
            'caracteristicas.zonificacion',
            null,
            'zonificacion'
        );
    }

    getFOT() {
        return this.getDato(
            'caracteristicas.fot',
            'fot',
            'fot'
        );
    }

    getFOS() {
        return this.getDato(
            'caracteristicas.fos',
            'fos',
            'fos'
        );
    }

    getFrente() {
        return this.getDato(
            'caracteristicas.frente',
            null,
            null
        );
    }

    getFondo() {
        return this.getDato(
            'caracteristicas.fondo',
            null,
            null
        );
    }

    getFondoFicticio() {
        return this.getDato(
            'caracteristicas.fondoFicticio',
            null,
            null
        );
    }

    getSegundaCalle() {
        return this.getDato(
            'caracteristicas.segundaCalle',
            null,
            null
        );
    }

    getZona() {
        return this.getDato(
            'caracteristicas.zona',
            null,
            null
        );
    }

    getObservaciones() {
        return this.getDato(
            'observaciones',
            'observaciones',
            'observaciones'
        );
    }

    getMejoras() {
        return this.getDato(
            'mejoras',
            null,
            null
        );
    }

    getCochera() {
        return this.getDato(
            null,
            'cochera',
            'cochera',
            false
        );
    }

    getBaulera() {
        return this.getDato(
            null,
            'baulera',
            'baulera',
            false
        );
    }

    getUbicacionPlanta() {
        return this.getDato(
            null,
            'ubicacionPlanta',
            null
        );
    }

    getUbicacionPiso() {
        return this.getDato(
            null,
            'ubicacionPiso',
            null
        );
    }

    getTieneAscensor() {
        return this.getDato(
            null,
            'tieneAscensor',
            null
        );
    }

    getVidaUtil() {
        return this.getDato(
            null,
            'vidaUtil',
            'vidaUtil'
        );
    }

    // Configuración de qué mostrar según tipo
    mostrarAmbientes() {
        return this.tipo !== 'lote';
    }

    mostrarHomogeneizacion() {
        return this.tipo !== 'lote';
    }

    mostrarAmenities() {
        return this.tipo === 'departamento';
    }

    mostrarInfraestructura() {
        return this.tipo === 'departamento';
    }

    mostrarCaracteristicasConstructivas() {
        return this.tipo !== 'lote';
    }

    mostrarTipoLote() {
        return this.tipo === 'lote';
    }

    mostrarMedidasPerimetro() {
        return this.tipo === 'lote';
    }
}

async function obtenerTasacionParaInforme() {
    // Obtener ID de la URL en lugar de localStorage
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return null;
    
    try {
        const tasacion = await obtenerTasacionAPI(id);
        if (!tasacion) return null;
        
        return {
            id: tasacion.id,
            tipo: tasacion.tipo,
            estado: tasacion.estado,
            origen: tasacion.origen || 'propia',
            ...tasacion.datos,
            comparables: tasacion.datos?.comparables || [],  // Usar snapshots desde datos.comparables
            comparables_ids: tasacion.comparables_ids || [],  // Mantener IDs por compatibilidad
            datosCompletos: tasacion.datos,
            resultado: tasacion.datos?.resultado || null,
            fechaCreacion: tasacion.fecha_creacion,
            // Nuevos campos de informe
            nomenclaturaCatastral: tasacion.nomenclatura_catastral || null,
            clienteNombre: tasacion.cliente_nombre || null,
            finalidad: tasacion.finalidad || 'Tasación comercial',
            // Datos estructurados de informe
            entorno: tasacion.datos?.entorno || null,
            ambientes: tasacion.datos?.ambientes || null
        };
    } catch (error) {
        console.error('Error al obtener tasación para informe:', error);
        return null;
    }
}

function resolverComparablesDeTasacion(tasacion) {
    if (!tasacion) return [];

    // Los snapshots ya están en tasacion.comparables (datos.datos.comparables del backend)
    // No necesitamos hacer llamadas a la API
    const comparables = tasacion.comparables || [];
    
    // Si es un array de snapshots (objetos completos), usarlos directamente
    if (Array.isArray(comparables) && comparables.length > 0) {
        // Verificar si el primer elemento es un snapshot (tiene datos completos)
        if (typeof comparables[0] === 'object' && comparables[0].id) {
            return comparables;
        }
    }
    
    // Si no hay snapshots, devolver array vacío
    return [];
}

function obtenerFotosDeTasacion(tasacion) {
    if (!tasacion) return [];
    const fotos = tasacion.fotos || tasacion.photos || [];
    return Array.isArray(fotos) ? fotos : [];
}

function formatearFechaInforme(fecha) {
    const d = fecha ? new Date(fecha) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function capitalizar(texto) {
    if (!texto) return '—';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function valorSeguro(valor, fallback = '—') {
    if (valor === null || valor === undefined || valor === '') return fallback;
    return valor;
}

function mapearComparableParaInforme(comp) {
    const dir = comp.ubicacion?.direccion || comp.direccion || 'Sin dirección';
    const superficie = parseFloat(
        comp.superficie ||
        comp.lote?.caracteristicas?.superficie ||
        comp.departamento?.superficieCubierta ||
        comp.casa?.superficieCubierta ||
        0
    ) || 0;
    const valor = parseFloat(comp.valor) || 0;

    // Obtener fotos del comparable si existen
    const fotos = comp.fotos || comp.photos || comp.snapshot?.fotos || comp.snapshot?.photos || [];

    return {
        id: comp.id,
        address: dir,
        city: comp.ubicacion?.localidad || '',
        surfaceTotal: superficie || '—',
        rooms: comp.departamento?.ambientes || comp.casa?.ambientes || '—',
        age: comp.departamento?.antiguedad || comp.lote?.caracteristicas?.antiguedad || '—',
        distance: comp.distancia ?? '—',
        price: valor,
        pricePerM2: superficie > 0 ? Math.round(valor / superficie) : 0,
        date: comp.fechaCreacion ? formatearFechaInforme(comp.fechaCreacion) : '—',
        photos: Array.isArray(fotos) ? fotos : []
    };
}

function mapearPropiedad(tasacion) {
    const ub = tasacion.ubicacion || {};
    const base = {
        type: capitalizar(tasacion.tipo),
        address: valorSeguro(ub.direccion),
        city: valorSeguro(ub.localidad),
        province: valorSeguro(ub.provincia),
        country: 'Argentina',
        orientation: valorSeguro(ub.orientacion),
        surfaceTotal: '—',
        surfaceCovered: '—',
        rooms: '—',
        bedrooms: '—',
        bathrooms: '—',
        age: '—',
        floor: '—',
        totalFloors: '—',
        parking: false,
        storage: false,
        balcony: false,
        terrace: false,
        pool: false,
        gym: false,
        security: false
    };

    if (tasacion.tipo === 'lote') {
        const car = tasacion.lote?.caracteristicas || {};
        base.surfaceTotal = valorSeguro(car.superficie);
        base.surfaceCovered = valorSeguro(car.superficie);
        return base;
    }

    if (tasacion.tipo === 'departamento') {
        const d = tasacion.departamento || {};
        const hom = d.homogeneizacion || {};
        base.surfaceTotal = valorSeguro(hom.totalSuperficie || hom.totalHomogeneizada || d.superficieCubierta);
        base.surfaceCovered = valorSeguro(d.superficieCubierta);
        base.rooms = valorSeguro(d.ambientes);
        base.bedrooms = valorSeguro(d.dormitorios);
        base.bathrooms = valorSeguro(d.banos);
        base.age = valorSeguro(d.antiguedad);
        base.parking = !!d.cochera;
        base.storage = !!d.baulera;
        base.balcony = (hom.balcon?.superficie || 0) > 0;
        base.security = (d.amenities || []).includes('seguridad') || (d.infraestructura || []).includes('Seguridad');
        base.gym = (d.amenities || []).includes('gimnasio');
        base.pool = (d.amenities || []).includes('pileta');
        return base;
    }

    if (tasacion.tipo === 'casa') {
        const c = tasacion.casa || {};
        base.surfaceTotal = valorSeguro(c.superficieTotal || c.superficieCubierta);
        base.surfaceCovered = valorSeguro(c.superficieCubierta);
        base.rooms = valorSeguro(c.ambientes);
        base.bedrooms = valorSeguro(c.dormitorios);
        base.bathrooms = valorSeguro(c.banos);
        base.age = valorSeguro(c.antiguedad);
        base.parking = !!c.cochera;
        return base;
    }

    return base;
}

function mapearCaracteristicas(tasacion) {
    if (tasacion.tipo === 'lote') {
        const car = tasacion.lote?.caracteristicas || {};
        return {
            constructionQuality: '—',
            state: '—',
            heating: '—',
            cooling: '—',
            flooring: '—',
            kitchen: '—',
            windows: '—',
            extra: [
                { label: 'Tipo de lote', value: valorSeguro(tasacion.lote?.tipoLote) },
                { label: 'FOT', value: valorSeguro(car.fot) },
                { label: 'FOS', value: valorSeguro(car.fos) },
                { label: 'Zonificación', value: valorSeguro(car.zonificacion) },
                { label: 'Servicios', value: (tasacion.lote?.servicios || []).join(', ') || '—' }
            ]
        };
    }

    if (tasacion.tipo === 'departamento') {
        const d = tasacion.departamento || {};
        return {
            constructionQuality: valorSeguro(d.caracteristicaConstructiva),
            state: valorSeguro(d.estadoConservacion),
            heating: '—',
            cooling: '—',
            flooring: '—',
            kitchen: '—',
            windows: '—',
            extra: [
                { label: 'Ubicación en planta', value: valorSeguro(d.ubicacionPlanta) },
                { label: 'Ascensor', value: d.tieneAscensor === 'si' ? 'Sí' : d.tieneAscensor === 'no' ? 'No' : '—' },
                { label: 'FOT', value: valorSeguro(d.fot) },
                { label: 'FOS', value: valorSeguro(d.fos) }
            ]
        };
    }

    if (tasacion.tipo === 'casa') {
        const c = tasacion.casa || {};
        return {
            constructionQuality: valorSeguro(c.caracteristicaConstructiva),
            state: valorSeguro(c.estadoConservacion),
            heating: '—',
            cooling: '—',
            flooring: '—',
            kitchen: '—',
            windows: '—',
            extra: [
                { label: 'Zonificación', value: valorSeguro(c.zonificacion) },
                { label: 'FOT', value: valorSeguro(c.fot) },
                { label: 'FOS', value: valorSeguro(c.fos) }
            ]
        };
    }

    return {
        constructionQuality: '—',
        state: '—',
        heating: '—',
        cooling: '—',
        flooring: '—',
        kitchen: '—',
        windows: '—',
        extra: []
    };
}

function mapearValuacion(tasacion) {
    const resultado = tasacion.resultado || tasacion.datosCompletos?.resultado || {};
    const valorFinal = parseFloat(resultado.valor_final) || 0;
    const valorM2 = parseFloat(resultado.valor_m2) || 0;

    return {
        estimatedValue: valorFinal,
        valuePerM2: valorM2,
        minValue: valorFinal > 0 ? Math.round(valorFinal * 0.95) : 0,
        maxValue: valorFinal > 0 ? Math.round(valorFinal * 1.05) : 0,
        currency: 'USD',
        methodology: resultado.metodo || 'Comparación de mercado con homogeneización'
    };
}

function mapearMetodologia(tasacion) {
    const tipo = tasacion.tipo || 'inmueble';
    return {
        description: `Se utilizó el método de comparación de mercado sobre propiedades similares, aplicando criterios de homogeneización propios del tipo ${tipo}.`,
        factors: [
            'Ubicación y entorno',
            'Superficie y distribución',
            'Estado y característica constructiva',
            'Antigüedad y conservación',
            'Comparables de mercado seleccionados'
        ],
        adjustments: [
            'Homogeneización por coeficientes de ajuste',
            'Promediado de valores unitarios homogeneizados'
        ]
    };
}

async function tasacionToReportData(tasacion, opciones = {}) {
    const comparablesRaw = opciones.comparablesResueltos || await resolverComparablesDeTasacion(tasacion);
    const comparablesIds = opciones.selectedComparableIds;
    const comparablesFiltrados = comparablesIds
        ? comparablesRaw.filter(c => comparablesIds.includes(c.id))
        : comparablesRaw;

    const fotosRaw = obtenerFotosDeTasacion(tasacion);
    
    // Incorporar configuración del informe
    const config = opciones.config || {};
    const usuario = opciones.usuario || {};
    const profesional = opciones.profesional || {};

    const nombreCompletoTasador = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();

    // Los datos del perfil inicializan el informe, pero reportConfig
    // tiene prioridad para conservar las ediciones del usuario en Preview.
    const reportInfo = {
        title: config.title ?? 'Informe de Tasación',
        date: formatearFechaInforme(tasacion.fechaCreacion),
        reportNumber: tasacion.id || '—',
        tasador: config.tasador ?? (nombreCompletoTasador || ''),
        matricula: config.matricula ?? (profesional.matricula || ''),
        client: tasacion.clienteNombre || '—',
        // Datos profesionales desde el perfil del usuario
        inmobiliaria: config.inmobiliaria ?? (profesional.nombre_inmobiliaria || ''),
        telefono: config.telefono ?? (profesional.telefono || ''),
        email: config.email ?? (usuario.email || ''),
        foto_perfil: profesional.foto_perfil || null,
        logo_inmobiliaria: profesional.logo_inmobiliaria || null,
        logo_inmobiliaria_url: profesional.logo_inmobiliaria ? `${API_BASE_URL}/uploads/${profesional.logo_inmobiliaria}` : null,
        foto_perfil_url: profesional.foto_perfil ? `${API_BASE_URL}/uploads/${profesional.foto_perfil}` : null
    };

    const client = {
        name: tasacion.clienteNombre || '—',
        purpose: tasacion.finalidad || config.finalidadTasacion || 'Tasación comercial',
        contact: '—'
    };

    const methodology = {
        description: config.textoMetodologia || mapearMetodologia(tasacion).description,
        factors: mapearMetodologia(tasacion).factors,
        adjustments: mapearMetodologia(tasacion).adjustments
    };

    return {
        reportInfo,
        property: mapearPropiedad(tasacion),
        characteristics: mapearCaracteristicas(tasacion),
        comparables: comparablesFiltrados.map(mapearComparableParaInforme),
        valuation: mapearValuacion(tasacion),
        photos: fotosRaw.map((foto, i) => ({
            url: foto.url || foto.src || null,
            description: foto.description || foto.descripcion || `Fotografía ${i + 1}`
        })),
        methodology,
        client,
        // Agregar la tasación completa para el selector
        tasacion: tasacion,
        // Agregar datos de resultado y coeficientes para la tabla técnica
        resultado: tasacion.resultado || null,
        coeficientesPersonalizados: tasacion.coeficientesPersonalizados || null,
        // Agregar configuración adicional del informe
        introduction: config.introduction || '',
        observations: config.observations || '',
        conclusion: config.conclusion || '',
        consideracionesPrevias: config.consideracionesPrevias || '',
        descripcionEntorno: config.descripcionEntorno || '',
        puntosInteres: config.puntosInteres || '',
        // Datos profesionales
        showProfessionalData: config.showProfessionalData !== false,
        // Condiciones de trabajo
        showWorkConditions: config.showWorkConditions !== false,
        comision: config.comision || '',
        exclusividad: config.exclusividad || '',
        plazoTrabajo: config.plazoTrabajo || '',
        condicionesAdicionales: config.condicionesAdicionales || '',
        // Presentación del valor
        valorModalidad: config.valorModalidad || 'tasacion',
        valorPublicacion: config.valorPublicacion !== undefined && config.valorPublicacion !== '' ? parseFloat(config.valorPublicacion) : null,
        valorCierre: config.valorCierre !== undefined && config.valorCierre !== '' ? parseFloat(config.valorCierre) : null,
        valorRangoMin: config.valorRangoMin !== undefined && config.valorRangoMin !== '' ? parseFloat(config.valorRangoMin) : null,
        valorRangoMax: config.valorRangoMax !== undefined && config.valorRangoMax !== '' ? parseFloat(config.valorRangoMax) : null,
        // Propiedades en competencia
        showCompetition: config.showCompetition || false,
        // Análisis FODA
        showFODA: config.showFODA || false,
        fodaFortalezas: config.fodaFortalezas || '',
        fodaOportunidades: config.fodaOportunidades || '',
        fodaDebilidades: config.fodaDebilidades || '',
        fodaAmenazas: config.fodaAmenazas || ''
    };
}
