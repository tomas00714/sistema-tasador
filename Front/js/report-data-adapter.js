/**
 * Adaptador: convierte una tasación del historial al formato del informe.
 */

const STORAGE_KEY_INFORME = 'tasacionParaInformeId';

async function obtenerTasacionParaInforme() {
    const id = localStorage.getItem(STORAGE_KEY_INFORME);
    if (!id) return null;
    
    try {
        const tasacion = await obtenerTasacionAPI(id);
        if (!tasacion) return null;
        
        return {
            id: tasacion.id,
            idNum: parseInt(tasacion.id.split('-')[1]),
            tipo: tasacion.tipo,
            estado: tasacion.estado,
            ...tasacion.datos,
            comparables: tasacion.comparables_ids || [],
            datosCompletos: tasacion.datos,
            resultado: tasacion.datos?.resultado || null,
            fechaCreacion: tasacion.fecha_creacion
        };
    } catch (error) {
        console.error('Error al obtener tasación para informe:', error);
        return null;
    }
}

async function resolverComparablesDeTasacion(tasacion) {
    if (!tasacion) return [];

    const ids = tasacion.comparables || [];
    if (!ids.length) return [];

    const comparables = [];
    for (const id of ids) {
        if (id && typeof id === 'object' && id.id) {
            comparables.push(id);
        } else {
            try {
                const comparable = await obtenerComparableAPI(id);
                if (comparable) {
                    comparables.push({
                        id: comparable.id,
                        ...comparable.datos
                    });
                }
            } catch (e) {
                console.error(`Error al cargar comparable ${id}:`, e);
            }
        }
    }

    return comparables.filter(Boolean);
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
        date: comp.fechaCreacion ? formatearFechaInforme(comp.fechaCreacion) : '—'
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
        base.security = (d.amenities || []).includes('seguridad') || (d.infraestructura || []).includes('seguridad');
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
                { label: 'Ubicación en edificio', value: valorSeguro(d.ubicacionEdificio) },
                { label: 'Ascensor', value: d.tieneAscensor === 'si' ? 'Sí' : d.tieneAscensor === 'no' ? 'No' : '—' }
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
            'Estado y calidad constructiva',
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

    return {
        reportInfo: {
            title: 'Informe de Tasación',
            date: formatearFechaInforme(tasacion.fechaCreacion),
            reportNumber: tasacion.id || '—',
            tasador: '—',
            matricula: '—'
        },
        property: mapearPropiedad(tasacion),
        characteristics: mapearCaracteristicas(tasacion),
        comparables: comparablesFiltrados.map(mapearComparableParaInforme),
        valuation: mapearValuacion(tasacion),
        photos: fotosRaw.map((foto, i) => ({
            url: foto.url || foto.src || null,
            description: foto.description || foto.descripcion || `Fotografía ${i + 1}`
        })),
        methodology: mapearMetodologia(tasacion),
        client: {
            name: '—',
            purpose: 'Tasación comercial',
            contact: '—'
        }
    };
}
