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

function generarTablaResultadosPerfil(tasacion) {
    if (!tasacion.resultado || !tasacion.resultado.comparables) {
        return `<p class="historial-sin-datos">No hay datos de resultados disponibles</p>`;
    }

    const r = tasacion.resultado;
    const esLote = tasacion.tipo === 'lote';

    // Get custom coefficients if available
    const coeficientesPersonalizados = tasacion.datosCompletos?.coeficientesPersonalizados || {};
    
    // Get custom coefficients for comparables (excluding 'lote')
    const todosCoeficientesComparables = [];
    Object.keys(coeficientesPersonalizados).forEach(index => {
        if (index !== 'lote') {
            const coefs = coeficientesPersonalizados[index];
            coefs.forEach(coef => {
                if (!todosCoeficientesComparables.find(c => c.id === coef.id)) {
                    todosCoeficientesComparables.push(coef);
                }
            });
        }
    });

    // Get custom coefficients for lot
    const coeficientesLote = coeficientesPersonalizados['lote'] || [];

    let filasHTML = "";

    // Generate rows for comparables
    const filasComp = (r.comparables || [])
        .map((c, index) => {
            const coefUbicacion = c.coef_ubicacion || 1;
            const coefAct = c.coef_act || 1;

            // Generate cells for all custom coefficients
            const celdasCoefPersonalizados = todosCoeficientesComparables.map(coef => {
                const coefPersonalizado = coeficientesPersonalizados[index]?.find(c => c.id === coef.id);
                if (coefPersonalizado) {
                    return `<td><strong>${coefPersonalizado.valor.toFixed(2)}</strong></td>`;
                } else {
                    return `<td>-</td>`;
                }
            }).join('');

            if (esLote) {
                return `
                    <tr>
                        <td>${escapeHtml(c.direccion)}</td>
                        <td>${formatearMoneda(c.valor_lote)}</td>
                        <td>${formatearMoneda(c.valor_m2)}</td>
                        <td>${c.frente}</td>
                        <td>${c.fondo || '-'}</td>
                        <td>${c.fos || '-'}</td>
                        <td>${c.fot || '-'}</td>
                        <td>${c.coef_fitto_comparable ? c.coef_fitto_comparable.toFixed(2) : '1.00'}</td>
                        <td>${coefUbicacion.toFixed(2)}</td>
                        <td>${coefAct.toFixed(2)}</td>
                        ${celdasCoefPersonalizados}
                        <td><strong>${formatearMoneda(c.valor_m2_homogeneizado)}</strong></td>
                    </tr>
                `;
            } else {
                // Departamento
                return `
                    <tr>
                        <td>${escapeHtml(c.direccion)}</td>
                        <td>${formatearMoneda(c.valor)}</td>
                        <td>${formatearMoneda(c.valor / (c.superficie || 1))}</td>
                        <td>${c.superficie || '-'}</td>
                        <td><strong>${formatearMoneda(c.valor / (c.superficie || 1))}</strong></td>
                        <td>${c.coeficiente ? c.coeficiente.toFixed(2) : '1.00'}</td>
                        <td>1.00</td>
                        <td>1.00</td>
                        <td><strong>${formatearMoneda(c.valor / (c.superficie || 1))}</strong></td>
                    </tr>
                `;
            }
        })
        .join("");

    filasHTML += filasComp;

    // Calculate average
    const valorPromedio = r.comparables && r.comparables.length > 0
        ? r.comparables.reduce((sum, c) => sum + c.valor_m2_homogeneizado, 0) / r.comparables.length
        : 0;

    // Generate table headers based on type
    let theadHTML = "";
    if (esLote) {
        theadHTML = `
            <tr>
                <th>Dirección</th>
                <th>Valor del lote</th>
                <th>Valor por m²</th>
                <th>Frente</th>
                <th>Fondo</th>
                <th>FOS</th>
                <th>FOT</th>
                <th>F&C</th>
                <th>Ubicacion</th>
                <th>Actividad</th>
                ${todosCoeficientesComparables.map(coef => `<th>${coef.nombre}</th>`).join('')}
                <th>Valor por m² homogeneizado</th>
            </tr>
        `;
    } else {
        theadHTML = `
            <tr>
                <th>Dirección</th>
                <th>Valor</th>
                <th>Valor m²</th>
                <th>Superficie</th>
                <th>Valor m² homogeneizado</th>
                <th>Coeficiente</th>
                <th>Ubicacion</th>
                <th>Actividad</th>
                <th>Valor m² final</th>
            </tr>
        `;
    }

    // Generate tfoot
    let tfootHTML = "";
    if (esLote) {
        tfootHTML = `
            <tr class="valor-promedio-row">
                <td><strong>Valor promedio:</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                ${todosCoeficientesComparables.map(() => `<td></td>`).join('')}
                <td><strong>${formatearMoneda(valorPromedio)}</strong></td>
            </tr>
        `;
    }

    const tablaComparables = `
        <div class="resultado-tabla-scroll">
            <h4>Detalle de comparables</h4>
            <table class="resultado-tabla">
                <thead>${theadHTML}</thead>
                <tbody>${filasHTML}</tbody>
                ${tfootHTML ? `<tfoot>${tfootHTML}</tfoot>` : ""}
            </table>
        </div>
    `;

    let tablaLote = "";
    if (esLote) {
        // Generate lot row
        const car = tasacion.lote?.caracteristicas || {};
        const frente = parseFloat(car.frente) || 0;
        const fondo = car.fondo ? parseFloat(car.fondo) : null;
        const valorM2Lote = r.valor_m2 || 0;
        const valorTotalLote = r.valor_final || 0;
        const coefFittoLote = r.coeficiente_fitto_lote || 1.0;
        const coefUbicacionLote = r.coeficiente_ubicacion || 1.0;
        const coefActividadLote = r.coeficiente_actividad || 1.0;

        const filaLoteTasar = `
            <tr class="fila-lote-tasar" style="color: #0066cc;">
                <td><strong>${formatearDireccion(tasacion.ubicacion?.direccion || 'Lote a tasar')}</strong></td>
                <td><strong>${frente}</strong></td>
                <td><strong>${fondo || '-'}</strong></td>
                <td><strong>${car.fos || '-'}</strong></td>
                <td><strong>${car.fot || '-'}</strong></td>
                <td><strong>${formatearMoneda(r.valor_promedio_homogeneizado)}</strong></td>
                <td><strong>${coefFittoLote.toFixed(2)}</strong></td>
                <td><strong>${coefUbicacionLote.toFixed(2)}</strong></td>
                <td><strong>${coefActividadLote.toFixed(2)}</strong></td>
                ${coeficientesLote.map(coef => {
                    return `<td><strong>${coef.valor.toFixed(2)}</strong></td>`;
                }).join('')}
                <td><strong>${formatearMoneda(valorTotalLote)}</strong></td>
                <td><strong>${formatearMoneda(valorM2Lote)}</strong></td>
            </tr>
        `;

        const theadLote = `
            <tr>
                <th>Dirección</th>
                <th>Frente</th>
                <th>Fondo</th>
                <th>FOS</th>
                <th>FOT</th>
                <th>Valor promedio de comp.</th>
                <th>F&C</th>
                <th>Ubicacion</th>
                <th>Actividad</th>
                ${coeficientesLote.map(coef => `<th>${coef.nombre}</th>`).join('')}
                <th>Valor del lote</th>
                <th>Valor por m²</th>
            </tr>
        `;

        tablaLote = `
            <div class="resultado-tabla-scroll">
                <h4>Detalle del inmueble tasado</h4>
                <table class="resultado-tabla">
                    <thead>${theadLote}</thead>
                    <tbody>${filaLoteTasar}</tbody>
                </table>
            </div>
        `;
    }

    return `
        ${tablaComparables}
        ${tablaLote}
    `;
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

    const tasacionesFiltradas = filtrarTasacionesHistorial();

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
        if (tasacion.lote?.caracteristicas?.frente && tasacion.lote?.caracteristicas?.fondo) {
            frenteFondo = `${tasacion.lote.caracteristicas.frente}m x ${tasacion.lote.caracteristicas.fondo}m`;
        }
    } else if (tasacion.departamento?.caracteristicas?.superficie) {
        superficie = `${tasacion.departamento.caracteristicas.superficie} m²`;
    }

    // Lot type / Property type
    let tipoPropiedad = "—";
    if (esLote && tasacion.lote?.tipoLote) {
        tipoPropiedad = tasacion.lote.tipoLote;
    } else if (!esLote && tasacion.departamento?.tipo) {
        tipoPropiedad = tasacion.departamento.tipo;
    }

    // Services
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

    // Amenities (for departments)
    const amenidadesHtml =
        tasacion.departamento &&
        tasacion.departamento.amenidades &&
        tasacion.departamento.amenidades.length
            ? tasacion.departamento.amenidades.map(amenidad => `
                <div class="chip-servicio">
                    ${amenidad}
                </div>
            `).join("")
            : "";

    // Infrastructure (for departments)
    const infraestructuraHtml =
        tasacion.departamento &&
        tasacion.departamento.infraestructura &&
        tasacion.departamento.infraestructura.length
            ? tasacion.departamento.infraestructura.map(infra => `
                <div class="chip-servicio">
                    ${infra}
                </div>
            `).join("")
            : "";

    // Observations
    const observaciones = esLote
        ? (tasacion.lote?.observaciones || "Sin observaciones")
        : (tasacion.departamento?.observaciones || "Sin observaciones");

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

                <!-- Row 3: Services (and amenities/infrastructure for departments) -->
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

                ${!esLote && amenidadesHtml ? `
                <!-- Row 3b: Amenities (for departments) -->
                <div class="perfil-row">
                    <div class="perfil-card-item perfil-card-full">
                        <div class="perfil-item-label">
                            Amenidades
                        </div>
                        <div class="perfil-servicios">
                            ${amenidadesHtml}
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
                        <div class="perfil-resultados-placeholder">
                            ${generarTablaResultadosPerfil(tasacion)}
                        </div>
                    </div>
                </div>

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

            </div>

            <!-- Barra inferior fija -->
            <div class="perfil-barra-inferior">
                <div class="perfil-barra-inferior-derecha">
                    <button type="button" class="perfil-btn-accion" id="btnEditarPerfil">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button type="button" class="perfil-btn-accion perfil-btn-eliminar" id="btnEliminarPerfil">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>

        </div>
    `;

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
