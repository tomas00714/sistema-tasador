let tasaciones;

try {

    tasaciones =
        JSON.parse(
            localStorage.getItem(
                "historialTasaciones"
            )
        );

    if (!Array.isArray(tasaciones)) {

        tasaciones = [];
    }

} catch (e) {

    tasaciones = [];
}

let tasacionPerfilAbiertaId = null;

let mapa = null;

let tilesLayerHistorial = null;

let capaMarcadores = null;

let historialInicializado = false;

let lista = null;

let tabActual = "todas";

const TILE_URLS = {
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

/* =========================
   INICIALIZACIÓN
========================= */

function guardarHistorial() {

    localStorage.setItem(
        "historialTasaciones",
        JSON.stringify(tasaciones)
    );
}

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

function inicializarHistorial() {

    lista =
        document.querySelector(
            ".lista-propiedades"
        );

    if (!lista) {
        return;
    }

    if (!historialInicializado) {

        const mapEl =
            document.getElementById("map");

        if (!mapEl) {
            return;
        }

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

                    if (
                        e.target ===
                        modalOverlay
                    ) {

                        cerrarPerfil();
                    }
                }
            );
        }

        historialInicializado = true;
    }

    renderHistorial();

    inicializarTabs();

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

function renderHistorial() {

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (capaMarcadores) {

        capaMarcadores.clearLayers();
    }

    let tasacionesFiltradas = tasaciones;

    if (tabActual === "completadas") {

        tasacionesFiltradas = tasaciones.filter(t => t.estado === "completada");

    } else if (tabActual === "borradores") {

        tasacionesFiltradas = tasaciones.filter(t => t.estado === "borrador");

    }

    if (!tasacionesFiltradas.length) {

        lista.innerHTML = `

            <p class="historial-vacio">
                No hay tasaciones en esta categoría.
            </p>

        `;

        return;
    }

    tasacionesFiltradas.forEach(tasacion => {

        const estadoBadge = tasacion.estado === "borrador"
            ? `<span class="card-badge card-badge-borrador">Borrador</span>`
            : `<span class="card-badge card-badge-completada">Completada</span>`;

        const tipoBadge = `<span class="card-badge card-badge-tipo">${tasacion.tipo.charAt(0).toUpperCase() + tasacion.tipo.slice(1)}</span>`;

        // Buscar el valor en múltiples lugares
        let precio = "—";
        if (tasacion.resultado?.valor_m2_homogeneizado) {
            precio = `USD ${(tasacion.resultado.valor_m2_homogeneizado).toLocaleString('es-AR')}`;
        } else if (tasacion.datosCompletos?.resultado?.valor_m2_homogeneizado) {
            precio = `USD ${(tasacion.datosCompletos.resultado.valor_m2_homogeneizado).toLocaleString('es-AR')}`;
        }

        lista.innerHTML += `

            <div class="card-historial"
                onclick="abrirPerfilTasacion(${tasacion.id})">

                <div class="card-grid">
                    <div class="card-left">
                        <div class="card-image">
                            <i class="fa-solid fa-camera"></i>
                        </div>
                    </div>

                    <div class="card-main">
                        <div class="card-header">
                            <div class="card-date-time">
                                <i class="fa-solid fa-calendar"></i>
                                <span>${formatearFecha(tasacion.fechaCreacion)}</span>
                            </div>
                            ${tipoBadge}
                        </div>

                        <div class="card-address">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${tasacion.ubicacion.direccion}</span>
                        </div>

                        <div class="card-location">
                            <span>${tasacion.ubicacion.localidad}, ${tasacion.ubicacion.provincia}</span>
                            <div class="card-state">
                                ${estadoBadge}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card-divider"></div>

                <div class="card-price">
                    <i class="fa-solid fa-dollar-sign"></i>
                    <span>${precio}</span>
                </div>

            </div>
        `;


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
   TABS
========================= */

function inicializarTabs() {

    const tabs = document.querySelectorAll(".btn-tab");

    tabs.forEach(tab => {

        tab.addEventListener("click", () => {

            tabs.forEach(t => t.classList.remove("active"));

            tab.classList.add("active");

            tabActual = tab.dataset.tab;

            renderHistorial();
        });
    });
}

/* =========================
   FECHA RELATIVA
========================= */

function formatearFecha(fecha) {

    const ahora = new Date();

    const creada = new Date(fecha);

    const diff =
        Math.floor(
            (ahora - creada) / 1000
        );

    const dias =
        Math.floor(diff / 86400);

    if (dias <= 0) {
        return "Hoy";
    }

    if (dias === 1) {
        return "Hace 1 día";
    }

    return `Hace ${dias} días`;
}

/* =========================
   MODAL PERFIL
========================= */

function eliminarTasacion(id) {

    tasaciones =
        tasaciones.filter(t => t.id !== id);

    guardarHistorial();

    cerrarPerfil();

    renderHistorial();
}

function abrirPerfilTasacion(id) {

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

    const serviciosHtml =
        tasacion.lote &&
        tasacion.lote.servicios &&
        tasacion.lote.servicios.length
            ? tasacion.lote.servicios.map(servicio => `

                <div class="chip-servicio">

                    ${servicio}

                </div>

            `).join("")
            : `<p class="historial-sin-datos">Sin servicios cargados</p>`;

    contenidoModal.innerHTML = `

        <div class="modal-header">

            <div class="modal-imagen"></div>

            <div class="modal-header-info">

                <div class="modal-titulo">

                    <h2>
                        ${tasacion.ubicacion.direccion}
                    </h2>

                    <p>

                        ${tasacion.ubicacion.localidad},
                        ${tasacion.ubicacion.provincia}

                    </p>

                </div>

                <div class="modal-tiempo">

                    ${formatearFecha(
                        tasacion.fechaCreacion
                    )}

                </div>

            </div>

        </div>

        <div class="modal-contenido-scroll">

            <div class="modal-seccion">

                <h3>
                    Información
                </h3>

                <div class="modal-grid">

                    <div class="modal-item">

                        <span>Tipo</span>

                        <strong>
                            ${tasacion.tipo}
                        </strong>

                    </div>

                    <div class="modal-item">

                        <span>Tipo de lote</span>

                        <strong>
                            ${
                                tasacion.lote &&
                                tasacion.lote.tipoLote
                                    ? tasacion.lote.tipoLote
                                    : "-"
                            }
                        </strong>

                    </div>

                    <div class="modal-item">

                        <span>Frente</span>

                        <strong>

                            ${
                                tasacion.lote &&
                                tasacion.lote.caracteristicas &&
                                tasacion.lote.caracteristicas.frente
                                    ? tasacion.lote.caracteristicas.frente
                                    : "-"
                            } m

                        </strong>

                    </div>

                    <div class="modal-item">

                        <span>Fondo</span>

                        <strong>

                            ${
                                tasacion.lote &&
                                tasacion.lote.caracteristicas &&
                                tasacion.lote.caracteristicas.fondo
                                    ? tasacion.lote.caracteristicas.fondo
                                    : "-"
                            } m

                        </strong>

                    </div>

                    <div class="modal-item">

                        <span>Superficie</span>

                        <strong>

                            ${
                                tasacion.lote &&
                                tasacion.lote.caracteristicas &&
                                tasacion.lote.caracteristicas.superficie
                                    ? tasacion.lote.caracteristicas.superficie
                                    : "-"
                            } m²

                        </strong>

                    </div>

                    <div class="modal-item">

                        <span>Zona</span>

                        <strong>

                            ${
                                tasacion.lote &&
                                tasacion.lote.caracteristicas &&
                                tasacion.lote.caracteristicas.zona
                                    ? tasacion.lote.caracteristicas.zona
                                    : "-"
                            }

                        </strong>

                    </div>

                </div>

            </div>

            <div class="modal-seccion">

                <h3>
                    Servicios
                </h3>

                <div class="modal-servicios">

                    ${serviciosHtml}

                </div>

            </div>

        </div>

        <div class="modal-footer">

            <button
                type="button"
                class="btn-modal btn-eliminar"
                id="btnEliminarTasacion">
                Eliminar
            </button>

            <button
                type="button"
                class="btn-modal btn-editar"
                id="btnEditarTasacion">
                Editar
            </button>

        </div>
    `;

    document
        .getElementById("btnEliminarTasacion")
        ?.addEventListener("click", e => {

            e.stopPropagation();

            if (
                !confirm(
                    "¿Eliminar esta tasación del historial?"
                )
            ) {

                return;
            }

            eliminarTasacion(
                tasacionPerfilAbiertaId
            );
        });

    document
        .getElementById("btnEditarTasacion")
        ?.addEventListener("click", e => {

            e.stopPropagation();

            editarTasacion(
                tasacionPerfilAbiertaId
            );
        });

    modalOverlay?.classList.add("active");
}

function cerrarPerfil() {

    tasacionPerfilAbiertaId = null;

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
    
    // Guardar la tasación a editar en localStorage
    localStorage.setItem("tasacionEnEdicion", JSON.stringify(tasacion));
    
    // Cerrar el modal
    cerrarPerfil();
    
    // Navegar a la página de tasación
    window.location.href = "tasacion.html";
}

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
