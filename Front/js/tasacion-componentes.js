/* =========================
   TASACION COMPONENTES
   Generadores de HTML reutilizables
========================= */

function generarHTMLUbicacionConMapa(opciones = {}) {
    const incluirOrientacion = opciones.incluirOrientacion || false;
    const orientacionValue = opciones.orientacion || "";
    const incluirTipoLote = opciones.incluirTipoLote || false;

    let orientacionHTML = "";
    if (incluirOrientacion) {
        orientacionHTML = `
            <div class="input-group">
                <label>Orientación</label>
                <div class="autocomplete-container">
                    <input type="text" id="orientacionInput" placeholder="Seleccionar orientación" autocomplete="off" readonly value="${orientacionValue}">
                    <div class="autocomplete-list" id="orientacionList">
                        <div class="autocomplete-item">Norte</div>
                        <div class="autocomplete-item">Noreste</div>
                        <div class="autocomplete-item">Este</div>
                        <div class="autocomplete-item">Sureste</div>
                        <div class="autocomplete-item">Sur</div>
                        <div class="autocomplete-item">Suroeste</div>
                        <div class="autocomplete-item">Oeste</div>
                        <div class="autocomplete-item">Noroeste</div>
                    </div>
                </div>
            </div>
        `;
    }

    let tipoLoteHTML = "";
    if (incluirTipoLote) {
        tipoLoteHTML = `
            <div class="input-group">
                <label>Tipo de lote</label>
                <div class="autocomplete-container">
                    <input type="text" id="tipoLoteInput" placeholder="Seleccionar tipo" autocomplete="off" readonly value="${datosTasacion.lote.tipoLote || ""}">
                    <div class="autocomplete-list" id="tipoLoteList">
                        <div class="autocomplete-item">Medial</div>
                        <div class="autocomplete-item">Esquina</div>
                        <div class="autocomplete-item">Esquina larga (+30m)</div>
                        <div class="autocomplete-item">Salida a dos calles</div>
                        <div class="autocomplete-item">Irregular</div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="form-left">
            <div class="input-group">
                <label>Dirección</label>
                <input type="text" id="direccionInput" value="${datosTasacion.ubicacion.direccion || ""}">
            </div>

            <div class="input-group">
                <label>Provincia</label>
                <div class="autocomplete-container">
                    <input type="text" id="provinciaInput" placeholder="Escribí una provincia" autocomplete="off" value="${datosTasacion.ubicacion.provincia || ""}">
                    <div class="autocomplete-list" id="provinciaList"></div>
                </div>
            </div>

            <div class="input-group">
                <label>Localidad</label>
                <div class="autocomplete-container">
                    <input type="text" id="localidadInput" placeholder="Seleccionar provincia primero" autocomplete="off" disabled value="${datosTasacion.ubicacion.localidad || ""}">
                    <div class="autocomplete-list" id="localidadList"></div>
                </div>
            </div>

            ${orientacionHTML}
            ${tipoLoteHTML}
        </div>

        <div class="form-right">
            <div id="mapaTasacion" class="mapa-placeholder"></div>
        </div>
    `;
}

function generarHTMLServicios(serviciosActuales = []) {
    return generarHTMLConCache('servicios', () => {
        const opcionesServicios = ["Agua", "Luz", "Gas", "Cloacas", "Pavimento", "Ripio"];

        return opcionesServicios.map(servicio => `
            <div class="check-servicio">
                <label>
                    <input type="checkbox" data-servicio="${servicio}" value="${servicio}" ${serviciosActuales.includes(servicio) ? "checked" : ""}>
                    ${servicio}
                </label>
            </div>
        `).join("");
    }, serviciosActuales);
}

function generarHTMLAmenities(amenitiesActuales = []) {
    return generarHTMLConCache('amenities', () => {
        const opcionesAmenities = [
            "Pileta", "Gimnasio", "SUM", "Quincho", "Seguridad 24hs", "Lavadero",
            "Balcón", "Terraza", "Sauna", "Solarium", "Jacuzzi", "Parrilla",
            "Laundry", "Coworking", "Terraza común", "Espacios verdes"
        ];

        return opcionesAmenities.map(amenity => `
            <div class="check-servicio">
                <label>
                    <input type="checkbox" value="${amenity}" ${amenitiesActuales.includes(amenity) ? "checked" : ""}>
                    ${amenity}
                </label>
            </div>
        `).join("");
    }, amenitiesActuales);
}

function generarHTMLInfraestructura(infraestructuraActuales = []) {
    return generarHTMLConCache('infraestructura', () => {
        const opcionesInfraestructura = [
            "Ascensor", "Encargado", "Seguridad", "Portero electrónico",
            "Cámara de seguridad", "Hall de ingreso"
        ];

        return opcionesInfraestructura.map(infra => `
            <div class="check-servicio">
                <label>
                    <input type="checkbox" data-infraestructura="${infra}" value="${infra}" ${infraestructuraActuales.includes(infra) ? "checked" : ""}>
                    ${infra}
                </label>
            </div>
        `).join("");
    }, infraestructuraActuales);
}

function inicializarOrientacion() {
    const input = document.getElementById("orientacionInput");
    const list = document.getElementById("orientacionList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarOrientacionLote() {
    const input = document.getElementById("orientacionLoteInput");
    const list = document.getElementById("orientacionLoteList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            datosTasacion.ubicacion.orientacion = item.textContent;
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatearMoneda(valor) {
    if (valor == null || valor === "") return "—";
    return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
