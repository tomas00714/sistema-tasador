let tasaciones = [];

async function cargarHistorialDesdeAPI() {
    try {
        tasaciones = await leerTasaciones();
        if (!Array.isArray(tasaciones)) {
            tasaciones = [];
        }
    } catch (e) {
        console.error('Error al cargar historial desde API:', e);
        tasaciones = [];
    }
}

function leerHistorialDesdeStorage() {
    // Esta función está deprecada, usar cargarHistorialDesdeAPI() en su lugar
    console.warn('leerHistorialDesdeStorage está deprecado, usar cargarHistorialDesdeAPI');
    return [];
}

let tasacionPerfilAbiertaId = null;

let mapa = null;

let tilesLayerHistorial = null;

let capaMarcadores = null;

let historialInicializado = false;

let lista = null;

let tabActual = "todas";
let tipoFiltroActual = "todos";
let busquedaActual = "";

const TILE_URLS = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

function limpiarMapaHistorial() {
    if (mapa) {
        if (capaMarcadores) {
            capaMarcadores.clearLayers();
            capaMarcadores = null;
        }
        if (tilesLayerHistorial) {
            mapa.removeLayer(tilesLayerHistorial);
            tilesLayerHistorial = null;
        }
        mapa.remove();
        mapa = null;
    }
}

/* =========================
   HELPER FUNCTIONS
========================= */

function formatearMoneda(valor) {
    if (!valor || isNaN(valor)) return "$0";
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatearDireccion(direccion) {
    if (!direccion) return "";
    return direccion
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}


/* =========================
   INICIALIZACIÓN
========================= */

function cambiarTilesMapaHistorial() {
    if (!mapa || !tilesLayerHistorial) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

    mapa.removeLayer(tilesLayerHistorial);
    tilesLayerHistorial = L.tileLayer(
        tileUrl,
        { attribution: '© CartoDB, © OpenStreetMap' }
    ).addTo(mapa);
}

async function inicializarHistorial() {

    lista =
        document.querySelector(
            ".lista-propiedades"
        );

    if (!lista) {
        return;
    }

    // Cargar tasaciones desde la API
    await cargarHistorialDesdeAPI();

    if (!historialInicializado) {

        const mapEl =
            document.getElementById("map");

        if (!mapEl) {
            return;
        }

        // Limpiar mapa existente si hay uno
        limpiarMapaHistorial();

        mapa = L.map("map").setView(
            [-34.6037, -58.3816],
            5
        );

        const isDarkMode = document.body.classList.contains('dark-mode');
        const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

        tilesLayerHistorial = L.tileLayer(
            tileUrl,
            {
                attribution: '© CartoDB, © OpenStreetMap'
            }
        ).addTo(mapa);

        capaMarcadores =
            L.layerGroup().addTo(mapa);

        const modalOverlay =
            document.getElementById(
                "modalOverlay"
            );

        const cerrarModal =
            document.getElementById(
                "cerrarModal"
            );

        if (cerrarModal) {

            cerrarModal.addEventListener(
                "click",
                cerrarPerfil
            );
        }

        if (modalOverlay) {

            modalOverlay.addEventListener(
                "click",
                e => {

                    // Check if click is outside the perfil card
                    const perfilCard = e.target.closest('.perfil-card');
                    if (!perfilCard && e.target === modalOverlay) {

                        cerrarPerfil();
                    }
                }
            );
        }

        historialInicializado = true;
    }

    renderHistorial();

    inicializarFiltrosHistorial();

    if (mapa) {

        setTimeout(() => {

            mapa.invalidateSize();
        }, 360);
    }
}

window.inicializarHistorial =
    inicializarHistorial;

/* =========================
   LISTA
========================= */

function getTipoInmuebleHistorial(tasacion) {
    const tipo = String(tasacion?.tipo || "").toLowerCase();

    if (tipo === "lote") {
        return "lote";
    }

    if (tipo === "casa") {
        return "casa";
    }

    if (tipo === "departamento" || tipo === "ph") {
        return "ph";
    }

    const tipoDepartamento = String(tasacion?.departamento?.tipo || "").toLowerCase();
    if (tipoDepartamento.includes("ph")) {
        return "ph";
    }

    return "ph";
}

function filtrarTasacionesHistorial() {
    let resultado = [...tasaciones];

    if (tabActual === "completadas") {
        resultado = resultado.filter(t => t.estado === "completada");
    } else if (tabActual === "borradores") {
        resultado = resultado.filter(t => t.estado === "borrador");
    }

    if (tipoFiltroActual !== "todos") {
        resultado = resultado.filter(t => getTipoInmuebleHistorial(t) === tipoFiltroActual);
    }

    if (busquedaActual.trim()) {
        const termino = busquedaActual.trim().toLowerCase();
        resultado = resultado.filter(t => {
            const direccion = String(t.ubicacion?.direccion || "").toLowerCase();
            const localidad = String(t.ubicacion?.localidad || "").toLowerCase();
            const provincia = String(t.ubicacion?.provincia || "").toLowerCase();
            const codigo = String(t.codigo || t.id || "").toLowerCase();
            return direccion.includes(termino) || localidad.includes(termino) || provincia.includes(termino) || codigo.includes(termino);
        });
    }

    return resultado;
}

function renderHistorial() {

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (capaMarcadores) {

        capaMarcadores.clearLayers();
    }

    const tasacionesFiltradas = filtrarTasacionesHistorial().sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : new Date(0);
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : new Date(0);
        return fechaB - fechaA;
    });

    if (!tasacionesFiltradas.length) {

        const hayFiltrosActivos = tabActual !== "todas" || tipoFiltroActual !== "todos" || busquedaActual.trim();

        lista.innerHTML = `

            <p class="historial-vacio">
                ${hayFiltrosActivos
                    ? "No hay tasaciones que coincidan con los filtros aplicados."
                    : "No hay tasaciones en esta categoría."}
            </p>

        `;

        return;
    }

    tasacionesFiltradas.forEach(tasacion => {

        let precio = "—";
        if (tasacion.resultado?.valor_final) {
            precio = `USD ${(tasacion.resultado.valor_final).toLocaleString('es-AR')}`;
        } else if (tasacion.datosCompletos?.resultado?.valor_final) {
            precio = `USD ${(tasacion.datosCompletos.resultado.valor_final).toLocaleString('es-AR')}`;
        }

        lista.innerHTML += construirCardMinimizada({
            item: tasacion,
            precio,
            fecha: formatearFecha(tasacion.fechaCreacion),
            tipoLabel: tasacion.tipo.charAt(0).toUpperCase() + tasacion.tipo.slice(1),
            estadoLabel: tasacion.estado === "borrador" ? "Borrador" : "Completada",
            estadoBadgeClass: tasacion.estado === "borrador"
                ? "card-minimizada-badge-borrador"
                : "card-minimizada-badge-completada",
            onClick: `abrirPerfilTasacion('${tasacion.id}')`
        });


        const mostrarEnMapa = tabActual === "borradores"
            ? (tasacion.ubicacion.lat && tasacion.ubicacion.lon)
            : (tasacion.ubicacion.lat && tasacion.ubicacion.lon);

        if (
            capaMarcadores &&
            mostrarEnMapa
        ) {

            L.marker([

                tasacion.ubicacion.lat,
                tasacion.ubicacion.lon

            ])

            .addTo(capaMarcadores)

            .bindPopup(`

                <b>
                    ${tasacion.ubicacion.direccion}
                </b>

                <br>

                ${tasacion.ubicacion.localidad},
                ${tasacion.ubicacion.provincia}

                <br>

                Tipo:
                ${tasacion.tipo}

                <br>

                Estado:
                ${tasacion.estado || "completada"}

            `);
        }
    });
}

/* =========================
   FILTROS
========================= */

function inicializarFiltrosHistorial() {

    const tabs = document.querySelectorAll(".btn-tab");
    const filtrosTipo = document.querySelectorAll(".btn-filtro-tipo");
    const inputBusqueda = document.querySelector(".input-busqueda");

    const tabActivo = document.querySelector(".btn-tab.active");
    if (tabActivo) {
        tabActual = tabActivo.dataset.tab || "todas";
    }

    const filtroActivo = document.querySelector(".btn-filtro-tipo.active");
    if (filtroActivo) {
        tipoFiltroActual = filtroActivo.dataset.tipoFiltro || "todos";
    }

    if (inputBusqueda) {
        busquedaActual = inputBusqueda.value.trim().toLowerCase();
        inputBusqueda.addEventListener("input", (event) => {
            busquedaActual = event.target.value.trim().toLowerCase();
            renderHistorial();
        });
    }

    tabs.forEach(tab => {

        tab.addEventListener("click", () => {

            tabs.forEach(t => t.classList.remove("active"));

            tab.classList.add("active");

            tabActual = tab.dataset.tab;

            renderHistorial();
        });
    });

    filtrosTipo.forEach(filtro => {
        filtro.addEventListener("click", () => {
            filtrosTipo.forEach(item => item.classList.remove("active"));
            filtro.classList.add("active");
            tipoFiltroActual = filtro.dataset.tipoFiltro || "todos";
            renderHistorial();
        });
    });
}

/* =========================
   FECHA RELATIVA
========================= */

function formatearFecha(fecha) {
    if (!fecha) return "";

    const creada = new Date(fecha);

    if (Number.isNaN(creada.getTime())) {
        return "";
    }

    return creada.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}

/* =========================
   MODAL PERFIL
========================= */

function eliminarTasacion(id) {
    mostrarModalGenerico({
        titulo: "¿Estás seguro de eliminar?",
        mensaje: "¿Deseas eliminar esta tasación del historial? Esta acción no se puede deshacer.",
        botones: [
            {
                texto: "Cancelar",
                clase: "btn-confirmacion-cancelar",
                onClick: () => {
                    ocultarModalGenerico();
                }
            },
            {
                texto: "Eliminar",
                clase: "btn-confirmacion-no-guardar",
                onClick: async () => {
                    ocultarModalGenerico();
                    try {
                        await eliminarTasacionEntidad(id);
                        tasaciones = tasaciones.filter(t => t.id !== id);
                        cerrarPerfil();
                        renderHistorial();
                    } catch (e) {
                        console.error('Error al eliminar tasación:', e);
                        alert('No se pudo eliminar la tasación. Revisá la consola o el servidor.');
                    }
                }
            }
        ],
        cerrarAlClick: false
    });
}

window.abrirPerfilTasacion = function(id) {
    try {
        const modalOverlay =
            document.getElementById("modalOverlay");

        const contenidoModal =
            document.getElementById("contenidoModal");

        const tasacion =
            tasaciones.find(t => t.id === id);

        if (!tasacion || !contenidoModal) {
            return;
        }

    tasacionPerfilAbiertaId = id;

    const tipo = tasacion.tipo || 'lote';
    const esLote = tipo === 'lote';

    // Buscar el valor final en múltiples lugares
    let precio = "—";
    if (tasacion.resultado?.valor_final) {
        precio = `USD ${(tasacion.resultado.valor_final).toLocaleString('es-AR')}`;
    } else if (tasacion.datosCompletos?.resultado?.valor_final) {
        precio = `USD ${(tasacion.datosCompletos.resultado.valor_final).toLocaleString('es-AR')}`;
    }

    // Value per m2
    let valorM2 = "—";
    if (tasacion.resultado?.valor_m2) {
        valorM2 = `USD ${(tasacion.resultado.valor_m2).toLocaleString('es-AR')}`;
    } else if (tasacion.datosCompletos?.resultado?.valor_m2) {
        valorM2 = `USD ${(tasacion.datosCompletos.resultado.valor_m2).toLocaleString('es-AR')}`;
    }

    // Surface area
    let superficie = "—";
    let frenteFondo = "";
    if (esLote) {
        if (tasacion.lote?.caracteristicas?.superficie) {
            superficie = `${tasacion.lote.caracteristicas.superficie} m²`;
        }
        const frente = tasacion.lote?.caracteristicas?.frente;
        const fondo = tasacion.lote?.caracteristicas?.fondoFicticio || tasacion.lote?.caracteristicas?.fondo;
        if (frente && fondo) {
            frenteFondo = `${frente}m x ${fondo}m`;
        }
    } else if (tasacion.casa?.caracteristicas?.superficie) {
        superficie = `${tasacion.casa.caracteristicas.superficie} m²`;
    } else if (tasacion.departamento?.caracteristicas?.superficie) {
        superficie = `${tasacion.departamento.caracteristicas.superficie} m²`;
    }

    // Lot type / Property type
    let tipoPropiedad = "—";
    if (esLote && tasacion.lote?.tipoLote) {
        tipoPropiedad = tasacion.lote.tipoLote;
    } else if (!esLote && tasacion.departamento?.tipo) {
        tipoPropiedad = tasacion.departamento.tipo;
    } else if (tasacion.tipo) {
        tipoPropiedad = tasacion.tipo.charAt(0).toUpperCase() + tasacion.tipo.slice(1);
    }

    // Services
    const servicios = esLote
        ? (tasacion.lote?.servicios || [])
        : (tasacion.casa?.servicios || tasacion.departamento?.servicios || []);
    const serviciosHtml = servicios.length
        ? servicios.map(servicio => `<div class="chip-servicio">${servicio}</div>`).join("")
        : `<p class="historial-sin-datos">Sin servicios cargados</p>`;

    // Amenities (only for departments)
    const amenitiesHtml =
        tasacion.departamento?.amenities && tasacion.departamento.amenities.length
            ? tasacion.departamento.amenities.map(amenidad => `<div class="chip-servicio">${amenidad}</div>`).join("")
            : "";

    // Infrastructure (departments and houses)
    const infraestructura =
        tasacion.casa?.infraestructura || tasacion.departamento?.infraestructura || [];
    const infraestructuraHtml =
        infraestructura.length
            ? infraestructura.map(infra => `<div class="chip-servicio">${infra}</div>`).join("")
            : "";

    // Observations
    const observaciones = esLote
        ? (tasacion.lote?.observaciones || "Sin observaciones")
        : (tasacion.casa?.observaciones || tasacion.departamento?.observaciones || "Sin observaciones");

    // Lote: mejoras
    const mejoras = esLote
        ? (tasacion.lote?.mejoras || "Sin mejoras")
        : null;

    // Lote: additional characteristics
    const orientacion = tasacion.ubicacion?.orientacion || '—';
    const segundaCalle = tasacion.lote?.caracteristicas?.segundaCalle || '—';
    const zona = tasacion.lote?.caracteristicas?.zona || '—';

    // Department / House: additional characteristics
    const ambientes = !esLote
        ? (tasacion.casa?.ambientes || tasacion.departamento?.ambientes || '—')
        : null;
    const dormitorios = !esLote
        ? (tasacion.casa?.dormitorios || tasacion.departamento?.dormitorios || '—')
        : null;
    const banos = !esLote
        ? (tasacion.casa?.banos || tasacion.departamento?.banos || '—')
        : null;
    const cochera = !esLote
        ? (tasacion.casa?.cochera === true ? 'Sí' : tasacion.departamento?.cochera === true ? 'Sí' : 'No')
        : null;
    const baulera = !esLote
        ? (tasacion.casa?.baulera === true ? 'Sí' : tasacion.departamento?.baulera === true ? 'Sí' : 'No')
        : null;
    const ubicacionPlanta = !esLote ? (tasacion.departamento?.ubicacionPlanta || '—') : null;
    const ubicacionPiso = !esLote ? (tasacion.departamento?.ubicacionPiso || '—') : null;
    const tieneAscensor = !esLote ? (tasacion.departamento?.tieneAscensor || '—') : null;
    const antiguedad = !esLote
        ? (tasacion.casa?.antiguedad || tasacion.departamento?.antiguedad || '—')
        : null;
    const estadoConservacion = !esLote
        ? (tasacion.casa?.estadoConservacion || tasacion.departamento?.estadoConservacion || '—')
        : null;
    const caracteristicaConstructiva = !esLote
        ? (tasacion.casa?.caracteristicaConstructiva || tasacion.departamento?.caracteristicaConstructiva || '—')
        : null;
    const superficieCubierta = !esLote
        ? (tasacion.casa?.superficieCubierta || tasacion.departamento?.superficieCubierta || '—')
        : null;
    const superficieTotal = !esLote ? (tasacion.casa?.superficieTotal || '—') : null;

    const zonificacionLote = esLote ? (tasacion.lote?.caracteristicas?.zonificacion || '—') : null;
    const fotLote = esLote ? (tasacion.lote?.caracteristicas?.fot != null ? tasacion.lote.caracteristicas.fot : '—') : null;
    const fosLote = esLote ? (tasacion.lote?.caracteristicas?.fos != null ? tasacion.lote.caracteristicas.fos : '—') : null;

    const zonificacionCasa = !esLote && tasacion.casa ? (tasacion.casa.zonificacion || '—') : null;
    const fotCasa = !esLote && tasacion.casa ? (tasacion.casa.fot != null ? tasacion.casa.fot : '—') : null;
    const fosCasa = !esLote && tasacion.casa ? (tasacion.casa.fos != null ? tasacion.casa.fos : '—') : null;

    const fotDepto = !esLote && tasacion.departamento ? (tasacion.departamento.fot != null ? tasacion.departamento.fot : '—') : null;
    const fosDepto = !esLote && tasacion.departamento ? (tasacion.departamento.fos != null ? tasacion.departamento.fos : '—') : null;

    const hom = !esLote
        ? (tasacion.casa?.homogeneizacion || tasacion.departamento?.homogeneizacion)
        : null;
    const tablaHomogeneizacion = (!esLote && hom)
        ? `
            <div class="resultado-tabla-wrap">
                <h3>Homogeneización de superficies</h3>
                <div class="resultado-tabla-scroll">
                    ${generarTablaHomogeneizacion(tipo, hom, '', true)}
                </div>
            </div>
        `
        : '';

    // Additional characteristics section
    let perfilCaracteristicasHtml = '';
    if (esLote) {
        perfilCaracteristicasHtml = `
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Orientación</div>
                        <div class="perfil-item-value">${orientacion}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Segunda calle</div>
                        <div class="perfil-item-value">${segundaCalle}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Zona</div>
                        <div class="perfil-item-value">${zona}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Zonificación</div>
                        <div class="perfil-item-value">${zonificacionLote}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">FOT</div>
                        <div class="perfil-item-value">${fotLote}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">FOS</div>
                        <div class="perfil-item-value">${fosLote}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (tasacion.departamento) {
        perfilCaracteristicasHtml = `
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Ambientes</div>
                        <div class="perfil-item-value">${ambientes}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Dormitorios</div>
                        <div class="perfil-item-value">${dormitorios}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Baños</div>
                        <div class="perfil-item-value">${banos}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Ubicación en planta</div>
                        <div class="perfil-item-value">${ubicacionPlanta}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Ubicación piso</div>
                        <div class="perfil-item-value">${ubicacionPiso}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Antigüedad</div>
                        <div class="perfil-item-value">${antiguedad}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Estado de conservación</div>
                        <div class="perfil-item-value">${estadoConservacion}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Característica constructiva</div>
                        <div class="perfil-item-value">${caracteristicaConstructiva}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Superficie cubierta</div>
                        <div class="perfil-item-value">${superficieCubierta}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Cochera</div>
                        <div class="perfil-item-value">${cochera}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Baulera</div>
                        <div class="perfil-item-value">${baulera}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Ascensor</div>
                        <div class="perfil-item-value">${tieneAscensor}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">FOT</div>
                        <div class="perfil-item-value">${fotDepto}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">FOS</div>
                        <div class="perfil-item-value">${fosDepto}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Orientación</div>
                        <div class="perfil-item-value">${orientacion}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (tasacion.casa) {
        perfilCaracteristicasHtml = `
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Ambientes</div>
                        <div class="perfil-item-value">${ambientes}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Dormitorios</div>
                        <div class="perfil-item-value">${dormitorios}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Baños</div>
                        <div class="perfil-item-value">${banos}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Superficie cubierta</div>
                        <div class="perfil-item-value">${superficieCubierta}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Superficie total</div>
                        <div class="perfil-item-value">${superficieTotal}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Antigüedad</div>
                        <div class="perfil-item-value">${antiguedad}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Estado de conservación</div>
                        <div class="perfil-item-value">${estadoConservacion}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Características constructivas</div>
                        <div class="perfil-item-value">${caracteristicaConstructiva}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Cochera</div>
                        <div class="perfil-item-value">${cochera}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Baulera</div>
                        <div class="perfil-item-value">${baulera}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Orientación</div>
                        <div class="perfil-item-value">${orientacion}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">Zonificación</div>
                        <div class="perfil-item-value">${zonificacionCasa}</div>
                    </div>
                </div>
            </div>
            <div class="perfil-row">
                <div class="perfil-grid-3">
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">FOT</div>
                        <div class="perfil-item-value">${fotCasa}</div>
                    </div>
                    <div class="perfil-card-item">
                        <div class="perfil-item-label">FOS</div>
                        <div class="perfil-item-value">${fosCasa}</div>
                    </div>
                </div>
            </div>
        `;
    }

    const compartirBtnHtml = tasacion.estado === 'completada'
        ? `<button type="button" class="perfil-btn-accion" id="btnCompartirPerfil">
                <i class="fa-solid fa-share-nodes"></i> Compartir
           </button>`
        : '';

    contenidoModal.innerHTML = `

        <div class="perfil-card-container">

            <!-- Barra superior fija -->
            <div class="perfil-barra-superior">
                <button type="button" class="perfil-btn-volver" id="btnVolverPerfil">
                    ← Volver
                </button>
            </div>

            <div class="perfil-card">

                <!-- Row 1: Blue horizontal card with date, address, location, and value -->
                <div class="perfil-row">
                    <div class="perfil-card-azul">
                        <div class="perfil-card-azul-left">
                            <div class="perfil-codigo">
                                Código: ${tasacion.id || '—'}
                            </div>
                            <div class="perfil-fecha">
                                ${formatearFecha(tasacion.fechaCreacion)}
                            </div>
                            <div class="perfil-direccion">
                                ${tasacion.ubicacion.direccion}
                            </div>
                            <div class="perfil-ubicacion">
                                ${tasacion.ubicacion.localidad}, ${tasacion.ubicacion.provincia}
                            </div>
                        </div>
                        <div class="perfil-card-azul-right">
                            <div class="perfil-valor-titulo">
                                Valor de tasación
                            </div>
                            <div class="perfil-valor">
                                ${precio}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Row 2: 3 columns with value per m2, surface, and type -->
                <div class="perfil-row">
                    <div class="perfil-grid-3">
                        <div class="perfil-card-item">
                            <div class="perfil-item-label">
                                Valor por m²
                            </div>
                            <div class="perfil-item-value">
                                ${valorM2}
                            </div>
                        </div>
                        <div class="perfil-card-item">
                            <div class="perfil-item-label">
                                Superficie
                            </div>
                            <div class="perfil-item-value">
                                ${superficie}
                            </div>
                            ${frenteFondo ? `<div class="perfil-item-sub">${frenteFondo}</div>` : ""}
                        </div>
                        <div class="perfil-card-item">
                            <div class="perfil-item-label">
                                ${esLote ? 'Tipo de lote' : 'Tipo'}
                            </div>
                            <div class="perfil-item-value">
                                ${tipoPropiedad}
                            </div>
                        </div>
                    </div>
                </div>

                ${perfilCaracteristicasHtml}

                <!-- Row 3: Services (and amenities/infrastructure for departments and houses) -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Servicios
                        </div>
                        <div class="perfil-servicios">
                            ${serviciosHtml}
                        </div>
                    </div>
                </div>

                ${!esLote && amenitiesHtml ? `
                <!-- Row 3b: Amenities (for departments) -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Amenidades
                        </div>
                        <div class="perfil-servicios">
                            ${amenitiesHtml}
                        </div>
                    </div>
                </div>
                ` : ""}

                ${!esLote && infraestructuraHtml ? `
                <!-- Row 3c: Infrastructure (for departments) -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Infraestructura
                        </div>
                        <div class="perfil-servicios">
                            ${infraestructuraHtml}
                        </div>
                    </div>
                </div>
                ` : ""}

                <!-- Row 4: Results table (immutable) -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Resultados
                        </div>
                        <div id="perfil-resultados-renderer" class="perfil-resultados-placeholder"></div>
                    </div>
                </div>

                ${tablaHomogeneizacion ? `
                <!-- Row 4b: Homogeneización de superficies -->
                <div class="perfil-row">
                    ${tablaHomogeneizacion}
                </div>
                ` : ""}

                <!-- Row 5: Observations -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Observaciones
                        </div>
                        <div class="perfil-observaciones">
                            ${observaciones}
                        </div>
                    </div>
                </div>

                ${esLote ? `
                <!-- Row 6: Mejoras -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Mejoras
                        </div>
                        <div class="perfil-observaciones">
                            ${mejoras}
                        </div>
                    </div>
                </div>
                ` : ""}

            </div>

            <!-- Barra inferior fija -->
            <div class="perfil-barra-inferior">
                <div class="perfil-barra-inferior-derecha">
                    <button type="button" class="perfil-btn-accion" id="btnEditarPerfil">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    ${compartirBtnHtml}
                    <button type="button" class="perfil-btn-accion perfil-btn-eliminar" id="btnEliminarPerfil">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>

        </div>
    `;

    // Renderizar tablas reutilizando el mismo componente de la pantalla final
    const contenedorResultados = document.getElementById("perfil-resultados-renderer");
    if (contenedorResultados && tasacion.resultado && typeof ResultadosRenderer !== 'undefined') {
        const datosTasacion = tasacion.datosCompletos || tasacion;
        const renderer = new ResultadosRenderer(
            contenedorResultados,
            tasacion.resultado,
            tasacion.tipo || 'lote',
            datosTasacion,
            'lectura'
        );
        renderer.renderizar();
    } else if (contenedorResultados) {
        contenedorResultados.innerHTML = '<p class="historial-sin-datos">No hay datos de resultados disponibles</p>';
    }

    // Back button event listener
    document
        .getElementById("btnVolverPerfil")
        ?.addEventListener("click", cerrarPerfil);

    // Edit button event listener
    document
        .getElementById("btnEditarPerfil")
        ?.addEventListener("click", () => editarTasacion(id));

    // Delete button event listener
    document
        .getElementById("btnEliminarPerfil")
        ?.addEventListener("click", () => eliminarTasacion(id));

    // Share button event listener
    document
        .getElementById("btnCompartirPerfil")
        ?.addEventListener("click", () => {
            if (window.abrirModalCompartir) {
                window.abrirModalCompartir(tasacion.id);
            }
        });

    // Add perfil-modal class to override modal-tasacion styles
    const modalTasacion = document.getElementById("modalTasacion");
    if (modalTasacion) {
        modalTasacion.classList.add("perfil-modal");
    }

    // Add modal-open class to body and html to remove borders
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");

    modalOverlay?.classList.add("active");
    } catch (error) {
        console.error("Error in abrirPerfilTasacion:", error);
    }
}

window.cerrarPerfil = function() {

    tasacionPerfilAbiertaId = null;

    // Remove perfil-modal class from modal-tasacion
    const modalTasacion = document.getElementById("modalTasacion");
    if (modalTasacion) {
        modalTasacion.classList.remove("perfil-modal");
    }

    // Remove modal-open class from body and html
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");

    document
        .getElementById("modalOverlay")
        ?.classList.remove("active");
}

function editarTasacion(id) {
    const tasacion = tasaciones.find(t => t.id === id);

    if (!tasacion) {
        alert("No se encontró la tasación");
        return;
    }

    // Guardar la tasación completa para el modo edición
    localStorage.setItem("tasacionEnEdicion", JSON.stringify(tasacion));

    // Cerrar el modal
    cerrarPerfil();

    // Navegar a la página de tasación
    window.location.href = "tasacion.html";
}

document
    .getElementById("modalOverlay")
    ?.addEventListener("click", (e) => {

        if (e.target === e.currentTarget) {
            cerrarPerfil();
        }

    });

/* Página historial.html independiente */
if (
    document.body &&
    !document.body.dataset.vista &&
    document.getElementById("map")
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => inicializarHistorial()
    );
}
