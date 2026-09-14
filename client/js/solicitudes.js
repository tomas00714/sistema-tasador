/* =========================
   PÁGINA DE SOLICITUDES
   Gestión de solicitudes de comparables
========================= */

let solicitudes = [];
let estadoFiltro = 'todas';
let solicitudActual = null;

const ETIQUETAS_TIPO = {
    lote: 'Lote',
    casa: 'Casa',
    departamento: 'Departamento'
};

const ICONOS_TIPO = {
    lote: 'fa-square',
    casa: 'fa-house',
    departamento: 'fa-building'
};

function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    try {
        const f = new Date(fechaStr);
        return f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) {
        return '—';
    }
}

function formatearFechaHora(fechaStr) {
    if (!fechaStr) return '—';
    try {
        const f = new Date(fechaStr);
        return f.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '—';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function cargarSolicitudes() {
    const cargando = document.getElementById('solicitudesCargando');
    const vacio = document.getElementById('solicitudesVacio');
    const lista = document.getElementById('solicitudesLista');

    if (cargando) cargando.style.display = 'flex';
    if (vacio) vacio.style.display = 'none';

    try {
        const params = estadoFiltro !== 'todas' ? `?estado=${estadoFiltro}` : '';
        const data = await obtenerSolicitudesAPI(params);
        solicitudes = data || [];

        if (cargando) cargando.style.display = 'none';

        if (solicitudes.length === 0) {
            if (vacio) vacio.style.display = 'flex';
            if (cargando) cargando.style.display = 'none';
            lista.innerHTML = '';
            if (vacio) lista.appendChild(vacio);
        } else {
            if (vacio) vacio.style.display = 'none';
            renderSolicitudes();
        }
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        if (cargando) cargando.style.display = 'none';
        if (vacio) {
            vacio.style.display = 'flex';
            const h3 = vacio.querySelector('h3');
            const p = vacio.querySelector('p');
            if (h3) h3.textContent = 'Error al cargar solicitudes';
            if (p) p.textContent = 'Intentá nuevamente más tarde.';
        }
    }
}

function renderSolicitudes() {
    const lista = document.getElementById('solicitudesLista');
    if (!lista) return;

    lista.innerHTML = '';

    solicitudes.slice().reverse().forEach(solicitud => {
        const card = crearTarjetaSolicitud(solicitud);
        lista.appendChild(card);
    });
}

function crearTarjetaSolicitud(solicitud) {
    const card = document.createElement('div');
    card.className = 'solicitud-card';
    card.onclick = (e) => {
        // No abrir modal si se hace clic en el botón de copiar
        if (e.target.closest('.btn-copiar-link')) {
            return;
        }
        mostrarDetalleSolicitud(solicitud);
    };

    const tipoLabel = ETIQUETAS_TIPO[solicitud.tipo_inmueble] || solicitud.tipo_inmueble || '—';
    const tipoIcono = ICONOS_TIPO[solicitud.tipo_inmueble] || 'fa-question';
    const estadoClass = solicitud.estado || 'pendiente';

    const datos = solicitud.datos || {};
    const mensaje = datos.mensaje || '';
    const fechaCreacion = formatearFecha(solicitud.fecha_creacion);
    const fechaExpiracion = formatearFecha(solicitud.fecha_expiracion);
    const linkPublico = solicitud.link_publico || '';

    card.innerHTML = `
        <div class="solicitud-card-header">
            <div class="solicitud-card-tipo">
                <i class="fa-solid ${tipoIcono}"></i>
                <span>${escapeHtml(tipoLabel)}</span>
            </div>
            <span class="solicitud-card-estado ${estadoClass}">${escapeHtml(solicitud.estado || 'Pendiente')}</span>
        </div>
        <div class="solicitud-card-info">
            <div class="solicitud-card-meta">
                <span>
                    <i class="fa-solid fa-calendar"></i>
                    Creada: ${escapeHtml(fechaCreacion)}
                </span>
                <span>
                    <i class="fa-solid fa-clock"></i>
                    Expira: ${escapeHtml(fechaExpiracion)}
                </span>
            </div>
            ${mensaje ? `<div class="solicitud-card-mensaje">${escapeHtml(mensaje)}</div>` : ''}
            <div class="solicitud-card-comparables">
                <i class="fa-solid fa-list"></i>
                <span>${solicitud.estado === 'completada' ? 'Comparables recibidos' : 'Esperando respuestas'}</span>
            </div>
            ${linkPublico ? `
                <div class="solicitud-card-link">
                    <button type="button" class="btn-copiar-link" onclick="copiarLinkSolicitud('${escapeHtml(linkPublico)}', event)">
                        <i class="fa-solid fa-copy"></i> Copiar link
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

function mostrarDetalleSolicitud(solicitud) {
    solicitudActual = solicitud;
    const modal = document.getElementById('modalDetalleSolicitud');
    const contenido = document.getElementById('solicitudDetalleContenido');

    if (!modal || !contenido) return;

    const tipoLabel = ETIQUETAS_TIPO[solicitud.tipo_inmueble] || solicitud.tipo_inmueble || '—';
    const estadoClass = solicitud.estado || 'pendiente';

    const datos = solicitud.datos || {};
    const mensaje = datos.mensaje || '';
    const fechaCreacion = formatearFechaHora(solicitud.fecha_creacion);
    const fechaExpiracion = formatearFechaHora(solicitud.fecha_expiracion);
    const fechaCompletacion = formatearFechaHora(solicitud.fecha_completacion);
    const linkPublico = solicitud.link_publico || '';

    contenido.innerHTML = `
        <div class="solicitud-detalle-header">
            <div class="solicitud-detalle-tipo">${escapeHtml(tipoLabel)}</div>
            <span class="solicitud-detalle-estado ${estadoClass}">${escapeHtml(solicitud.estado || 'Pendiente')}</span>
        </div>

        <div class="solicitud-detalle-info">
            <div class="solicitud-detalle-meta">
                <div class="solicitud-detalle-meta-item">
                    <span class="solicitud-detalle-meta-label">Fecha de creación</span>
                    <span class="solicitud-detalle-meta-value">${escapeHtml(fechaCreacion)}</span>
                </div>
                <div class="solicitud-detalle-meta-item">
                    <span class="solicitud-detalle-meta-label">Fecha de expiración</span>
                    <span class="solicitud-detalle-meta-value">${escapeHtml(fechaExpiracion)}</span>
                </div>
                ${fechaCompletacion !== '—' ? `
                    <div class="solicitud-detalle-meta-item">
                        <span class="solicitud-detalle-meta-label">Fecha de completación</span>
                        <span class="solicitud-detalle-meta-value">${escapeHtml(fechaCompletacion)}</span>
                    </div>
                ` : ''}
            </div>

            ${mensaje ? `
                <div class="solicitud-detalle-mensaje">
                    <strong>Información adicional:</strong><br>
                    ${escapeHtml(mensaje)}
                </div>
            ` : ''}

            ${linkPublico ? `
                <div class="solicitud-detalle-link">
                    <strong>Link público:</strong>
                    <div class="solicitud-detalle-link-container">
                        <input type="text" readonly value="${escapeHtml(linkPublico)}" class="solicitud-detalle-link-input">
                        <button type="button" class="btn-copiar-link-detalle" onclick="copiarLinkSolicitud('${escapeHtml(linkPublico)}')">
                            <i class="fa-solid fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            ` : ''}

            <div class="solicitud-detalle-comparables">
                <div class="solicitud-detalle-comparables-header">
                    <h3>Comparables recibidos</h3>
                </div>
                <div class="solicitud-detalle-comparables-lista" id="comparablesLista">
                    <p style="color: var(--color-text-secondary); font-size: 14px;">Cargando comparables...</p>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');

    // Cargar comparables
    cargarComparablesDeSolicitud(solicitud);
}

async function cargarComparablesDeSolicitud(solicitud) {
    const lista = document.getElementById('comparablesLista');
    if (!lista) return;

    try {
        // Usar el endpoint por ID de solicitud autenticado para obtener estado de aceptación
        const comparables = await obtenerComparablesDeSolicitudPorIdAPI(solicitud.id);

        if (!comparables || comparables.length === 0) {
            lista.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 14px;">No hay comparables recibidos aún.</p>';
            return;
        }

        lista.innerHTML = '';
        comparables.forEach(comparable => {
            const item = crearItemComparable(comparable, solicitud);
            lista.appendChild(item);
        });
    } catch (error) {
        console.error('Error al cargar comparables:', error);
        lista.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 14px;">Error al cargar comparables.</p>';
    }
}

function crearItemComparable(comparable, solicitud) {
    const item = document.createElement('div');
    item.className = 'solicitud-detalle-comparable';

    const datos = comparable.datos || {};
    const ubicacion = datos.ubicacion || {};
    const direccion = ubicacion.direccion || datos.direccion || 'Sin dirección';
    const localidad = ubicacion.localidad || datos.localidad || '';
    const provincia = ubicacion.provincia || datos.provincia || '';

    const valor = datos.valor?.monto || datos.valor || '—';
    const tipo = comparable.tipo_inmueble || datos.tipoInmueble || datos.tipo || '—';
    
    const estadoAceptacion = comparable.estado_aceptacion || 'pendiente';
    const observaciones = comparable.observaciones || '';

    const esPendiente = estadoAceptacion === 'pendiente';
    const esAceptado = estadoAceptacion === 'aceptado';
    const esRechazado = estadoAceptacion === 'rechazado';

    let estadoLabel = estadoAceptacion;
    let estadoClass = estadoAceptacion;

    if (esPendiente) {
        estadoLabel = 'Pendiente';
        estadoClass = 'pendiente';
    } else if (esAceptado) {
        estadoLabel = 'Aceptado';
        estadoClass = 'aceptado';
    } else if (esRechazado) {
        estadoLabel = 'Rechazado';
        estadoClass = 'rechazado';
    }

    item.innerHTML = `
        <div class="solicitud-detalle-comparable-header">
            <div class="solicitud-detalle-comparable-direccion">${escapeHtml(direccion)}</div>
            <div class="solicitud-detalle-comparable-meta">
                ${escapeHtml(localidad)}${localidad && provincia ? ', ' : ''}${escapeHtml(provincia)}
            </div>
            <span class="solicitud-detalle-comparable-estado ${estadoClass}">${escapeHtml(estadoLabel)}</span>
        </div>
        <div class="solicitud-detalle-comparable-info">
            <div class="solicitud-detalle-comparable-meta">
                Tipo: ${escapeHtml(tipo)} · Valor: $${Number(valor).toLocaleString('es-AR')}
            </div>
            ${observaciones ? `
                <div class="solicitud-detalle-comparable-observaciones">
                    <strong>Observaciones:</strong> ${escapeHtml(observaciones)}
                </div>
            ` : ''}
        </div>
        <div class="solicitud-detalle-comparable-acciones">
            ${esPendiente ? `
                <button type="button" class="btn-aceptar" onclick="aceptarComparable('${solicitud.id}', '${comparable.id}')">
                    <i class="fa-solid fa-check"></i> Aceptar
                </button>
                <button type="button" class="btn-rechazar" onclick="abrirModalRechazar('${solicitud.id}', '${comparable.id}')">
                    <i class="fa-solid fa-times"></i> Rechazar
                </button>
            ` : ''}
            ${esAceptado ? `
                <span class="solicitud-detalle-comparable-feedback aceptado">
                    <i class="fa-solid fa-check-circle"></i> Aceptado
                </span>
            ` : ''}
            ${esRechazado ? `
                <span class="solicitud-detalle-comparable-feedback rechazado">
                    <i class="fa-solid fa-times-circle"></i> Rechazado
                </span>
            ` : ''}
        </div>
    `;

    item.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return;
        await mostrarPerfilComparableSolicitud(comparable, solicitud.id);
    });

    return item;
}

async function mostrarPerfilComparableSolicitud(comparableAPI, solicitudId) {
    const datos = comparableAPI.datos || {};
    const datosSinId = { ...datos };
    delete datosSinId.id;

    const tipo = datosSinId.tipoInmueble || datosSinId.tipo || comparableAPI.tipo_inmueble || 'lote';
    const camposEspecificos = {};
    if (tipo === 'casa') {
        camposEspecificos.superficie = datosSinId.superficieCubierta ?? datosSinId.superficie ?? null;
        camposEspecificos.superficieTerreno = datosSinId.superficieTerreno ?? null;
        camposEspecificos.antiguedad = datosSinId.antiguedad ?? null;
    } else if (tipo === 'departamento') {
        camposEspecificos.superficie = datosSinId.superficieTotal ?? datosSinId.superficie ?? null;
        camposEspecificos.antiguedad = datosSinId.antiguedad ?? null;
    } else if (tipo === 'lote') {
        camposEspecificos.frente = datosSinId.frente ?? null;
        camposEspecificos.fondo = datosSinId.fondo ?? null;
        camposEspecificos.superficie = datosSinId.superficie ?? null;
        camposEspecificos.tipoLote = datosSinId.tipoLote ?? null;
    }

    const comparable = {
        ...datosSinId,
        ...camposEspecificos,
        id: comparableAPI.id,
        fuente: comparableAPI.fuente || datosSinId.fuente || null,
        tasacionOrigenId: comparableAPI.tasacion_origen_id || datosSinId.tasacionOrigenId || null,
        fechaCreacion: comparableAPI.fecha_creacion,
        fechaModificacion: comparableAPI.fecha_modificacion,
        tipoInmueble: tipo,
        solicitudId: solicitudId,
        estadoAceptacion: comparableAPI.estado_aceptacion || 'pendiente'
    };

    if (typeof window.abrirPerfilComparable === 'function') {
        await window.abrirPerfilComparable(comparable);
    } else {
        mostrarToast('No se pudo abrir el perfil del comparable');
    }
}

function abrirModalCrearSolicitud() {
    const modal = document.getElementById('modalCrearSolicitud');
    if (modal) {
        modal.classList.add('active');
    }
}

function cerrarModalCrearSolicitud() {
    const modal = document.getElementById('modalCrearSolicitud');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('formCrearSolicitud').reset();
    }
}

function cerrarModalDetalleSolicitud() {
    const modal = document.getElementById('modalDetalleSolicitud');
    if (modal) {
        modal.classList.remove('active');
        solicitudActual = null;
    }
}

function copiarLinkSolicitud(link, event) {
    if (event) {
        event.stopPropagation();
    }
    
    navigator.clipboard.writeText(link).then(() => {
        mostrarToast('Link copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar link:', err);
        mostrarToast('Error al copiar link');
    });
}

async function aceptarComparable(solicitudId, comparableId) {
    try {
        await aceptarComparableSolicitudAPI(solicitudId, comparableId);
        mostrarToast('Comparable aceptado');
        
        // Recargar comparables
        if (solicitudActual) {
            await cargarComparablesDeSolicitud(solicitudActual);
        }
    } catch (error) {
        console.error('Error al aceptar comparable:', error);
        mostrarToast('Error al aceptar comparable');
    }
}

function abrirModalRechazar(solicitudId, comparableId) {
    const modal = document.getElementById('modalRechazarComparable');
    const form = document.getElementById('formRechazarComparable');
    
    if (modal && form) {
        document.getElementById('rechazarSolicitudId').value = solicitudId;
        document.getElementById('rechazarComparableId').value = comparableId;
        document.getElementById('rechazarObservaciones').value = '';
        modal.classList.add('active');
    }
}

function cerrarModalRechazarComparable() {
    const modal = document.getElementById('modalRechazarComparable');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('formRechazarComparable').reset();
    }
}

async function rechazarComparable(e) {
    e.preventDefault();
    
    const solicitudId = document.getElementById('rechazarSolicitudId').value;
    const comparableId = document.getElementById('rechazarComparableId').value;
    const observaciones = document.getElementById('rechazarObservaciones').value;
    
    try {
        await rechazarComparableSolicitudAPI(solicitudId, comparableId, observaciones || null);
        mostrarToast('Comparable rechazado');
        cerrarModalRechazarComparable();
        
        // Recargar comparables
        if (solicitudActual) {
            await cargarComparablesDeSolicitud(solicitudActual);
        }
    } catch (error) {
        console.error('Error al rechazar comparable:', error);
        mostrarToast('Error al rechazar comparable');
    }
}

async function crearSolicitud(e) {
    e.preventDefault();

    const tipo = document.getElementById('solicitudTipo').value;
    const mensaje = document.getElementById('solicitudMensaje').value;

    if (!tipo) {
        mostrarToast('Por favor selecciona un tipo de inmueble');
        return;
    }

    try {
        const datos = {};
        if (mensaje) {
            datos.mensaje = mensaje;
        }

        const solicitud = {
            tipo_inmueble: tipo,
            estado: 'pendiente',
            datos: datos
        };

        await crearSolicitudAPI(solicitud);

        cerrarModalCrearSolicitud();
        mostrarToast('Solicitud creada exitosamente');
        cargarSolicitudes();
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        mostrarToast('Error al crear la solicitud. Intentá nuevamente.');
    }
}

window.aceptarComparableSolicitud = async function(solicitudId, comparableId) {
    await aceptarComparable(solicitudId, comparableId);
    if (typeof window.cerrarPerfil === 'function') {
        window.cerrarPerfil();
    }
};

window.rechazarComparableSolicitud = function(solicitudId, comparableId) {
    abrirModalRechazar(solicitudId, comparableId);
    if (typeof window.cerrarPerfil === 'function') {
        window.cerrarPerfil();
    }
};

function initSolicitudes() {
    // Cargar solicitudes iniciales
    cargarSolicitudes();

    // Filtros de estado
    const filtros = document.querySelectorAll('.btn-segment[data-estado]');
    const segmentedControl = document.querySelector('.segmented-control');
    const segmentedPill = document.querySelector('.segmented-pill');
    
    if (segmentedControl && segmentedPill) {
        const actualizarPill = (index) => {
            const btn = filtros[index];
            if (!btn) return;
            segmentedPill.style.width = `${btn.offsetWidth}px`;
            segmentedPill.style.transform = `translateX(${btn.offsetLeft}px)`;
        };
        
        // Inicializar pill en la primera posición
        actualizarPill(0);
        
        filtros.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                filtros.forEach(f => f.classList.remove('active'));
                btn.classList.add('active');
                estadoFiltro = btn.dataset.estado;
                actualizarPill(index);
                cargarSolicitudes();
            });
        });
    } else {
        // Fallback si no existe el segmented control
        filtros.forEach(btn => {
            btn.addEventListener('click', () => {
                filtros.forEach(f => f.classList.remove('active'));
                btn.classList.add('active');
                estadoFiltro = btn.dataset.estado;
                cargarSolicitudes();
            });
        });
    }

    // Botón crear solicitud
    const btnCrear = document.getElementById('btnCrearSolicitud');
    if (btnCrear) {
        btnCrear.addEventListener('click', () => {
            abrirModalCrearSolicitud();
        });
    }

    // Modal crear solicitud
    const btnCerrarCrear = document.getElementById('cerrarModalCrearSolicitud');
    const btnCancelarCrear = document.getElementById('btnCancelarCrearSolicitud');
    const formCrear = document.getElementById('formCrearSolicitud');

    if (btnCerrarCrear) {
        btnCerrarCrear.addEventListener('click', cerrarModalCrearSolicitud);
    }
    if (btnCancelarCrear) {
        btnCancelarCrear.addEventListener('click', cerrarModalCrearSolicitud);
    }
    if (formCrear) {
        formCrear.addEventListener('submit', crearSolicitud);
    }

    // Modal detalle solicitud
    const btnCerrarDetalle = document.getElementById('cerrarModalDetalleSolicitud');
    if (btnCerrarDetalle) {
        btnCerrarDetalle.addEventListener('click', cerrarModalDetalleSolicitud);
    }

    // Modal rechazar comparable
    const btnCerrarRechazar = document.getElementById('cerrarModalRechazarComparable');
    const btnCancelarRechazar = document.getElementById('btnCancelarRechazarComparable');
    const formRechazar = document.getElementById('formRechazarComparable');

    if (btnCerrarRechazar) {
        btnCerrarRechazar.addEventListener('click', cerrarModalRechazarComparable);
    }
    if (btnCancelarRechazar) {
        btnCancelarRechazar.addEventListener('click', cerrarModalRechazarComparable);
    }
    if (formRechazar) {
        formRechazar.addEventListener('submit', rechazarComparable);
    }

    // Cerrar modales al hacer clic fuera
    if (document.getElementById('modalCrearSolicitud')) {
        document.getElementById('modalCrearSolicitud').addEventListener('click', (e) => {
            if (e.target.id === 'modalCrearSolicitud') {
                cerrarModalCrearSolicitud();
            }
        });
    }

    if (document.getElementById('modalDetalleSolicitud')) {
        document.getElementById('modalDetalleSolicitud').addEventListener('click', (e) => {
            if (e.target.id === 'modalDetalleSolicitud') {
                cerrarModalDetalleSolicitud();
            }
        });
    }

    if (document.getElementById('modalRechazarComparable')) {
        document.getElementById('modalRechazarComparable').addEventListener('click', (e) => {
            if (e.target.id === 'modalRechazarComparable') {
                cerrarModalRechazarComparable();
            }
        });
    }

    // Cerrar perfil de comparable al hacer clic en el overlay
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay' && typeof window.cerrarPerfil === 'function') {
                window.cerrarPerfil();
            }
        });
    }
    
}

function mostrarToast(mensaje) {
    // Crear elemento toast si no existe
    let toast = document.getElementById('toast-notificacion');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notificacion';
        toast.className = 'toast-notificacion';
        document.body.appendChild(toast);
    }
    
    toast.textContent = mensaje;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSolicitudes);
} else {
    initSolicitudes();
}
