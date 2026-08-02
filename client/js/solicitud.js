/* =========================
   SOLICITUD PÚBLICA
   Permite responder una solicitud de comparables a través de un link.
========================= */

let solicitud = null;
let comparablesPendientes = [];
let modo = 'cargando';
let linkPublico = null;
let vistaActual = 'lista';

const ETIQUETAS_ORIGEN = {
    manual: 'Manual',
    tasacion: 'De tasación',
    comparable: 'De comparable'
};

const CLASES_ORIGEN_BADGE = {
    manual: 'origen-manual',
    tasacion: 'origen-tasacion',
    comparable: 'origen-comparable'
};

const VISTA_DURACION_MS = 350;

function generarIdLocal() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return String(Date.now()) + String(Math.random()).slice(2, 8);
}

function obtenerParametroLink() {
    const params = new URLSearchParams(window.location.search);
    return params.get('link') || params.get('l') || '';
}

function obtenerUsuarioActual() {
    if (typeof window !== 'undefined' && window.usuarioActual) {
        return window.usuarioActual;
    }
    return { usuario_id: 1, nombre: 'Usuario' };
}

function formatearFechaSimple(fechaStr) {
    if (!fechaStr) return '';
    try {
        const f = new Date(fechaStr);
        return f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) {
        return '';
    }
}

function formatearPrecio(monto) {
    if (monto == null || monto === '') return '—';
    const n = Number(monto);
    if (isNaN(n)) return '—';
    return `$ ${n.toLocaleString('es-AR')}`;
}

function normalizarComparableEntrante(c) {
    const datos = c.datos || {};
    const origen = datos.origen_solicitud || 'manual';
    const tipo = c.tipo_inmueble || datos.tipoInmueble || datos.tipo || 'lote';
    const valorRaw = datos.valor;
    let valorMonto = null;
    let valorTipo = datos.tipoValor || 'venta';

    if (valorRaw != null && typeof valorRaw === 'object') {
        valorMonto = valorRaw.monto;
        if (valorRaw.tipo) valorTipo = valorRaw.tipo;
    } else {
        valorMonto = valorRaw;
    }

    const datosEditor = {
        tipo,
        ubicacion: datos.ubicacion || {},
        valor: { monto: valorMonto, tipo: valorTipo }
    };

    if (tipo === 'lote') {
        const loteBackend = datos.lote || {};
        datosEditor.lote = {
            frente: datos.frente ?? loteBackend.frente ?? null,
            fondo: datos.fondo ?? loteBackend.fondo ?? null,
            superficie: datos.superficie ?? loteBackend.superficie ?? null,
            tipoLote: datos.tipoLote || loteBackend.tipoLote || ''
        };
    } else if (tipo === 'casa') {
        const casaBackend = datos.casa || {};
        datosEditor.casa = {
            superficieCubierta: datos.superficieCubierta ?? casaBackend.superficieCubierta ?? null,
            superficieTerreno: datos.superficieTerreno ?? casaBackend.superficieTerreno ?? null,
            antiguedad: datos.antiguedad ?? casaBackend.antiguedad ?? null
        };
    } else if (tipo === 'departamento') {
        const deptoBackend = datos.departamento || {};
        datosEditor.departamento = {
            superficieTotal: datos.superficieTotal ?? deptoBackend.superficieTotal ?? null,
            antiguedad: datos.antiguedad ?? deptoBackend.antiguedad ?? null,
            tieneAscensor: datos.tieneAscensor ?? deptoBackend.tieneAscensor ?? false
        };
    }

    return {
        id: generarIdLocal(),
        origen,
        originalId: datos.origen_id || null,
        fechaCreacion: c.fecha_creacion,
        datos: datosEditor
    };
}

/* Carga inicial */

async function initSolicitud() {
    if (typeof asegurarDatasetProvincias === 'function') {
        try {
            await asegurarDatasetProvincias();
        } catch (e) {
            console.warn('No se pudieron cargar provincias:', e);
        }
    }

    linkPublico = obtenerParametroLink();
    if (!linkPublico) {
        mostrarError('No se proporcionó un enlace de solicitud.');
        return;
    }
    await cargarSolicitud();
}

async function cargarSolicitud() {
    mostrarCargando(true);
    try {
        const data = await obtenerSolicitudPorLinkAPI(linkPublico);
        if (!data) {
            mostrarError('La solicitud no existe o ya no está disponible.');
            return;
        }

        solicitud = {
            id: data.id,
            usuarioId: data.usuario_id,
            tasacionId: data.tasacion_id,
            linkPublico: data.link_publico,
            estado: data.estado,
            datos: data.datos || {},
            tipoInmueble: data.tipo_inmueble || data.datos?.tipo || 'lote'
        };

        if (solicitud.estado === 'completada') {
            modo = 'enviado';
            const comparablesAPI = await obtenerComparablesDeSolicitudAPI(linkPublico);
            comparablesPendientes = comparablesAPI.map(c => normalizarComparableEntrante(c));
            renderSolicitud();
        } else if (solicitud.estado === 'expirada') {
            mostrarError('La solicitud expiró y ya no acepta respuestas.');
        } else {
            modo = 'edicion';
            renderSolicitud();
        }
    } catch (e) {
        console.error('Error al cargar solicitud:', e);
        mostrarError('No se pudo cargar la solicitud. Intentá más tarde.');
    } finally {
        mostrarCargando(false);
    }
}

/* Renderizado */

function renderSolicitud() {
    const encabezado = document.getElementById('solicitudEncabezado');
    const header = document.getElementById('solicitudHeader');
    const contador = document.getElementById('solicitudContador');
    const comparablesWrap = document.getElementById('solicitudComparables');
    const mensajeEnvio = document.getElementById('solicitudMensajeEnvio');
    const btnAgregar = document.getElementById('btnAgregarComparable');

    if (!header || !comparablesWrap) return;

    const d = solicitud.datos || {};
    const solicitante = d.solicitante || d.nombre || 'Solicitante';
    const mensaje = d.mensaje || '';
    const cantidadSolicitada = d.cantidad != null ? d.cantidad : 'N/D';
    const tipoLabel = typeof etiquetaTipoInmueble === 'function'
        ? etiquetaTipoInmueble(solicitud.tipoInmueble)
        : (solicitud.tipoInmueble || 'Lote');

    header.innerHTML = `
        <div class="solicitud-encabezado-marca">
            <div class="marca-logo"><i class="fa-solid fa-home"></i></div>
            <span class="marca-nombre">Tasador</span>
        </div>
        <div class="solicitud-encabezado-datos">
            <h1>Solicitud de comparables</h1>
            <p>
                <strong>${escapeHtml(solicitante)}</strong> solicitó comparables para un
                <strong>${escapeHtml(tipoLabel)}</strong>.
            </p>
            ${mensaje ? `<p>${escapeHtml(mensaje)}</p>` : ''}
            <div class="solicitud-meta">
                <span class="solicitud-badge">${escapeHtml(tipoLabel)}</span>
                <span class="solicitud-badge">${escapeHtml(String(cantidadSolicitada))} solicitados</span>
                <span class="solicitud-badge">${comparablesPendientes.length} agregados</span>
            </div>
        </div>
    `;

    if (encabezado) encabezado.style.display = 'block';
    if (contador) contador.textContent = comparablesPendientes.length;

    renderListaComparables(comparablesWrap);

    if (modo === 'enviado') {
        mensajeEnvio.style.display = 'block';
        btnAgregar.style.display = 'none';
        actualizarBottomNav('enviado');
    } else {
        mensajeEnvio.style.display = 'none';
        btnAgregar.style.display = 'block';
        btnAgregar.onclick = mostrarSelectorOrigen;
        actualizarBottomNav('lista');
    }
}

function renderListaComparables(wrap) {
    wrap.innerHTML = '';

    if (comparablesPendientes.length === 0) {
        wrap.innerHTML = `
            <div class="comparables-vacio">
                <div class="comparables-vacio-icono">⊕</div>
                <h4>No hay comparables agregados</h4>
                <p>Agregá al menos un comparable para poder enviar la respuesta.</p>
            </div>
        `;
        if (modo === 'edicion') {
            const btn = document.createElement('button');
            btn.className = 'btn-agregar-comparable';
            btn.textContent = '+ Agregar comparable';
            btn.onclick = mostrarSelectorOrigen;
            wrap.appendChild(btn);
        }
        return;
    }

    comparablesPendientes.forEach(p => {
        wrap.appendChild(crearFilaComparable(p));
    });
}

function crearFilaComparable(p) {
    const datos = p.datos || {};
    const tipo = datos.tipo || datos.tipoInmueble || solicitud.tipoInmueble;
    const u = datos.ubicacion || {};
    const monto = datos.valor?.monto ?? datos.valor;
    const tipoValor = datos.valor?.tipo || 'venta';
    const precio = formatearPrecio(monto);
    const badgeClass = CLASES_ORIGEN_BADGE[p.origen] || '';
    const badgeLabel = ETIQUETAS_ORIGEN[p.origen] || 'Manual';

    const compParaDetalles = {};
    Object.assign(compParaDetalles, datos);
    if (tipo === 'lote' && datos.lote) {
        compParaDetalles.tipoLote = datos.lote.tipoLote;
        compParaDetalles.frente = datos.lote.frente;
        compParaDetalles.fondo = datos.lote.fondo;
        compParaDetalles.superficie = datos.lote.superficie;
    } else if (tipo === 'casa' && datos.casa) {
        compParaDetalles.superficieCubierta = datos.casa.superficieCubierta;
        compParaDetalles.superficieTerreno = datos.casa.superficieTerreno;
        compParaDetalles.antiguedad = datos.casa.antiguedad;
    } else if (tipo === 'departamento' && datos.departamento) {
        compParaDetalles.superficieTotal = datos.departamento.superficieTotal;
        compParaDetalles.antiguedad = datos.departamento.antiguedad;
        compParaDetalles.tieneAscensor = datos.departamento.tieneAscensor;
    }
    compParaDetalles.tipoInmueble = tipo;

    const detalles = typeof generarDetallesComparable === 'function'
        ? generarDetallesComparable(compParaDetalles)
        : generarDetallesFallback(compParaDetalles);

    const tipoLabel = typeof etiquetaTipoInmueble === 'function'
        ? etiquetaTipoInmueble(tipo)
        : (tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '—');

    const fila = document.createElement('div');
    fila.className = 'comparable-item-fila';
    fila.innerHTML = `
        <div>
            <h4>${escapeHtml(u.direccion || 'Sin dirección')}</h4>
            <div class="comparable-item-meta">
                ${escapeHtml(u.localidad || '')}${u.localidad && u.provincia ? ', ' : ''}${escapeHtml(u.provincia || '')}<br>
                Tipo: ${escapeHtml(tipoLabel)} · ${detalles}<br>
                Valor (${tipoValor === 'oferta' ? 'Oferta' : 'Venta'}): ${precio}
            </div>
            <span class="comparable-item-badge ${badgeClass}">${escapeHtml(badgeLabel)}</span>
        </div>
        ${modo === 'edicion' ? `
            <div class="comparable-acciones">
                <button type="button" class="btn-solicitud-editar" data-id="${escapeHtml(p.id)}">Editar</button>
                <button type="button" class="btn-solicitud-eliminar" data-id="${escapeHtml(p.id)}">Eliminar</button>
            </div>
        ` : ''}
    `;

    if (modo === 'edicion') {
        fila.querySelector('.btn-solicitud-editar').onclick = () => editarComparable(p.id);
        fila.querySelector('.btn-solicitud-eliminar').onclick = () => eliminarComparable(p.id);
    }

    return fila;
}

function generarDetallesFallback(comparable) {
    const tipo = String(comparable.tipoInmueble || '').toLowerCase();
    const parts = [];

    if (tipo === 'lote') {
        parts.push(`Lote: ${comparable.tipoLote ? escapeHtml(comparable.tipoLote) : '—'}`);
        if (comparable.frente) parts.push(`Frente: ${comparable.frente} m`);
        if (comparable.fondo) parts.push(`Fondo: ${comparable.fondo} m`);
        if (comparable.superficie) parts.push(`Sup: ${comparable.superficie} m²`);
    } else {
        if (comparable.superficie) parts.push(`Sup: ${comparable.superficie} m²`);
        if (comparable.superficieTerreno) parts.push(`Terreno: ${comparable.superficieTerreno} m²`);
        if (comparable.ambientes) parts.push(`${comparable.ambientes} amb`);
        if (comparable.dormitorios) parts.push(`${comparable.dormitorios} dorm`);
        if (comparable.banos) parts.push(`${comparable.banos} baño`);
        const amenities = [];
        if (comparable.cochera) amenities.push('cochera');
        if (comparable.tieneAscensor) amenities.push('ascensor');
        if (comparable.tienePileta) amenities.push('pileta');
        if (comparable.tieneJardin) amenities.push('jardín');
        if (amenities.length) parts.push(amenities.join(' · '));
    }

    return parts.join(' · ') || '—';
}

function mostrarCargando(visible) {
    const loading = document.getElementById('solicitudLoading');
    const error = document.getElementById('solicitudError');
    const vistas = document.getElementById('solicitudVistas');
    const encabezado = document.getElementById('solicitudEncabezado');

    if (!loading) return;

    loading.style.display = visible ? 'block' : 'none';
    if (error) error.style.display = 'none';
    if (vistas) vistas.style.display = visible ? 'none' : 'flex';
    if (encabezado && !visible && modo !== 'error') encabezado.style.display = 'block';
}

function mostrarError(mensaje) {
    modo = 'error';
    const loading = document.getElementById('solicitudLoading');
    const vistas = document.getElementById('solicitudVistas');
    const error = document.getElementById('solicitudError');
    const encabezado = document.getElementById('solicitudEncabezado');
    const bottom = document.getElementById('solicitudBottomBar');

    if (loading) loading.style.display = 'none';
    if (vistas) vistas.style.display = 'none';
    if (encabezado) encabezado.style.display = 'none';
    if (bottom) bottom.style.display = 'none';
    if (error) {
        error.style.display = 'block';
        error.querySelector('p').textContent = mensaje;
    }
}

/* Navegación entre vistas */

function cambiarVista(nombre, onPreparar, onCompleto) {
    const lista = document.getElementById('solicitudVistaLista');
    const form = document.getElementById('solicitudVistaFormulario');
    const vistas = document.getElementById('solicitudVistas');
    if (!lista || !form || !vistas) return;

    const saliente = nombre === 'lista' ? form : lista;
    const entrante = nombre === 'lista' ? lista : form;

    if (saliente === entrante) {
        if (onPreparar) onPreparar();
        if (onCompleto) onCompleto();
        return;
    }

    entrante.classList.remove('vista-saliendo');
    entrante.classList.add('vista-entrando');
    void entrante.offsetWidth;

    if (onPreparar) onPreparar();

    vistas.style.minHeight = entrante.scrollHeight + 'px';

    entrante.classList.remove('vista-entrando');
    entrante.classList.add('vista-activa');

    saliente.classList.add('vista-saliendo');
    void saliente.offsetWidth;
    saliente.classList.remove('vista-activa');

    vistaActual = nombre;

    setTimeout(() => {
        saliente.classList.remove('vista-saliendo');
        entrante.classList.remove('vista-entrando');
        vistas.style.minHeight = '';
        if (onCompleto) onCompleto();
    }, VISTA_DURACION_MS);
}

function volverALaLista() {
    cambiarVista('lista', null, () => {
        renderSolicitud();
        if (window.comparableEditor && window.comparableEditor.mapa) {
            try {
                window.comparableEditor.mapa.remove();
            } catch (e) { /* ignore */ }
        }
    });
}

/* Bottom nav */

function actualizarBottomNav(estado) {
    const bottom = document.getElementById('solicitudBottomBar');
    const btnCancelar = document.getElementById('btnBottomCancelar');
    const btnAccion = document.getElementById('btnBottomAccion');
    if (!bottom || !btnCancelar || !btnAccion) return;

    bottom.style.display = 'flex';

    if (estado === 'enviado') {
        bottom.style.display = 'none';
        return;
    }

    if (estado === 'formulario') {
        btnCancelar.style.display = 'block';
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.disabled = false;
        btnCancelar.onclick = () => window.comparableEditor.cerrar();
        btnAccion.style.margin = '';

        btnAccion.textContent = 'Agregar';
        btnAccion.disabled = false;
        btnAccion.classList.add('activo');
        btnAccion.classList.remove('disabled');
        btnAccion.onclick = () => window.comparableEditor.guardar();
        return;
    }

    btnCancelar.style.display = 'none';
    btnAccion.style.margin = '0 auto';
    btnAccion.textContent = 'Enviar comparables';
    btnAccion.onclick = enviarSolicitud;

    if (comparablesPendientes.length === 0) {
        btnAccion.disabled = true;
        btnAccion.classList.remove('activo');
        btnAccion.classList.add('disabled');
    } else {
        btnAccion.disabled = false;
        btnAccion.classList.add('activo');
        btnAccion.classList.remove('disabled');
    }
}

/* Agregar / editar comparables en memoria */

function mostrarSelectorOrigen() {
    mostrarModalGenerico({
        titulo: 'Agregar comparable',
        mensaje: '¿Cómo querés agregar el comparable?',
        botones: [
            {
                texto: 'Manualmente',
                clase: 'btn-confirmar',
                onClick: () => {
                    ocultarModalGenerico();
                    abrirEditorManual();
                }
            },
            {
                texto: 'Desde mi cuenta',
                clase: 'btn-secundario',
                onClick: () => {
                    ocultarModalGenerico();
                    abrirSelectorCuenta();
                }
            },
            {
                texto: 'Cancelar',
                clase: 'btn-cancelar',
                onClick: ocultarModalGenerico
            }
        ]
    });
}

function abrirEditorManual() {
    if (!window.comparableEditor) {
        alert('El editor de comparables no está disponible.');
        return;
    }

    cambiarVista('formulario', () => {
        window.comparableEditor.abrirEn(document.getElementById('solicitudEditor'), {
            modo: 'solicitud',
            tipo: solicitud.tipoInmueble,
            footer: false,
            onGuardar: (datos) => {
                comparablesPendientes.push({
                    id: generarIdLocal(),
                    origen: 'manual',
                    datos
                });
            },
            onCancelar: volverALaLista
        });
    }, () => {
        actualizarBottomNav('formulario');
        if (window.comparableEditor && window.comparableEditor.mapa) {
            window.comparableEditor.mapa.invalidateSize();
        }
    });
}

function abrirSelectorCuenta() {
    abrirModalComparable(
        solicitud.tipoInmueble,
        null,
        'seleccionar',
        (items, categoria) => {
            items.forEach(item => {
                const convertido = convertirItemASolicitud(item, categoria);
                if (convertido) {
                    comparablesPendientes.push({
                        id: generarIdLocal(),
                        origen: convertido.origen,
                        originalId: convertido.originalId,
                        datos: convertido.datos
                    });
                }
            });
            renderSolicitud();
        }
    );
}

function convertirItemASolicitud(item, categoria) {
    const origen = categoria === 'tasaciones' ? 'tasacion' : 'comparable';
    const tipo = item.tipo || item.tipoInmueble || solicitud.tipoInmueble;

    let datos = {
        tipo,
        ubicacion: item.ubicacion || {}
    };

    if (origen === 'tasacion') {
        const monto = item.resultado?.valor_final ?? item.datosCompletos?.resultado?.valor_final ?? 0;
        datos.valor = { monto, tipo: 'venta' };
    } else {
        const valorRaw = item.valor;
        if (valorRaw != null && typeof valorRaw === 'object') {
            datos.valor = { monto: valorRaw.monto, tipo: valorRaw.tipo || item.tipoValor || 'venta' };
        } else {
            datos.valor = { monto: valorRaw ?? 0, tipo: item.tipoValor || 'venta' };
        }
    }

    if (tipo === 'lote') {
        if (origen === 'tasacion') {
            const lote = item.lote || {};
            const car = lote.caracteristicas || {};
            datos.lote = {
                frente: car.frente ?? lote.frente ?? null,
                fondo: car.fondo ?? lote.fondo ?? null,
                superficie: car.superficie ?? lote.superficie ?? null,
                tipoLote: lote.tipoLote || ''
            };
        } else {
            const lote = item.lote || {};
            datos.lote = {
                frente: item.frente ?? lote.frente ?? null,
                fondo: item.fondo ?? lote.fondo ?? null,
                superficie: item.superficie ?? lote.superficie ?? null,
                tipoLote: item.tipoLote || lote.tipoLote || ''
            };
        }
    } else if (tipo === 'casa') {
        datos.casa = item.casa || {
            superficieCubierta: item.superficieCubierta ?? null,
            superficieTerreno: item.superficieTerreno ?? null,
            antiguedad: item.antiguedad ?? null
        };
    } else if (tipo === 'departamento') {
        datos.departamento = item.departamento || {
            superficieTotal: item.superficieTotal ?? null,
            antiguedad: item.antiguedad ?? null,
            tieneAscensor: item.tieneAscensor ?? false
        };
    }

    return { origen, originalId: item.id, datos };
}

function editarComparable(id) {
    const pendiente = comparablesPendientes.find(p => p.id === id);
    if (!pendiente || !window.comparableEditor) return;

    cambiarVista('formulario', () => {
        window.comparableEditor.abrirEn(document.getElementById('solicitudEditor'), {
            modo: 'editar',
            tipo: pendiente.datos.tipo || pendiente.datos.tipoInmueble || solicitud.tipoInmueble,
            datos: pendiente.datos,
            footer: false,
            onGuardar: (datos) => {
                pendiente.datos = datos;
            },
            onCancelar: volverALaLista
        });
    }, () => {
        actualizarBottomNav('formulario');
        if (window.comparableEditor && window.comparableEditor.mapa) {
            window.comparableEditor.mapa.invalidateSize();
        }
    });
}

function eliminarComparable(id) {
    comparablesPendientes = comparablesPendientes.filter(p => p.id !== id);
    renderSolicitud();
}

/* Envío */

function normalizarParaEnvio(datos) {
    const flat = { ...datos };
    const tipo = flat.tipo || flat.tipoInmueble;

    if (flat.tipo) {
        flat.tipoInmueble = flat.tipoInmueble || flat.tipo;
    }

    if (flat.valor != null && typeof flat.valor === 'object') {
        flat.tipoValor = flat.valor.tipo || 'venta';
        flat.valor = flat.valor.monto;
    }

    if (tipo === 'lote' && flat.lote) {
        flat.frente = flat.lote.frente ?? flat.frente ?? null;
        flat.fondo = flat.lote.fondo ?? flat.fondo ?? null;
        flat.superficie = flat.lote.superficie ?? flat.superficie ?? null;
        flat.tipoLote = flat.lote.tipoLote || flat.tipoLote || null;
    } else if (tipo === 'casa' && flat.casa) {
        flat.superficieCubierta = flat.casa.superficieCubierta ?? flat.superficieCubierta ?? null;
        flat.superficieTerreno = flat.casa.superficieTerreno ?? flat.superficieTerreno ?? null;
        flat.antiguedad = flat.casa.antiguedad ?? flat.antiguedad ?? null;
    } else if (tipo === 'departamento' && flat.departamento) {
        flat.superficieTotal = flat.departamento.superficieTotal ?? flat.superficieTotal ?? null;
        flat.antiguedad = flat.departamento.antiguedad ?? flat.antiguedad ?? null;
        flat.tieneAscensor = flat.departamento.tieneAscensor ?? flat.tieneAscensor ?? null;
    }

    return flat;
}

async function enviarSolicitud() {
    if (comparablesPendientes.length === 0) {
        mostrarModalGenerico({
            titulo: 'Faltan comparables',
            mensaje: 'Agregá al menos un comparable antes de enviar.',
            botones: [{ texto: 'Entendido', clase: 'btn-confirmar', onClick: ocultarModalGenerico }]
        });
        return;
    }

    const btn = document.getElementById('btnBottomAccion');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
    }

    try {
        const usuario = obtenerUsuarioActual();
        const payload = {
            comparables: comparablesPendientes.map(p => ({
                datos: normalizarParaEnvio(p.datos),
                origen: p.origen,
                originalId: p.originalId || null
            })),
            colaborador: {
                usuario_id: usuario?.usuario_id || null,
                nombre: usuario?.nombre || null
            }
        };

        await contribuirSolicitudAPI(linkPublico, payload);
        modo = 'enviado';
        if (vistaActual !== 'lista') {
            cambiarVista('lista', null, renderSolicitud);
        } else {
            renderSolicitud();
        }
    } catch (e) {
        console.error('Error al enviar solicitud:', e);
        mostrarModalGenerico({
            titulo: 'Error',
            mensaje: 'No se pudo enviar la solicitud. Revisá la consola o intentá más tarde.',
            botones: [{ texto: 'Aceptar', clase: 'btn-confirmar', onClick: ocultarModalGenerico }]
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Enviar comparables';
        }
    }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', initSolicitud);
