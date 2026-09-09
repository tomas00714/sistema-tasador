/* =========================
   TASACION COMPONENTES
   Generadores de HTML reutilizables
========================= */

function generarHTMLDatosInforme(tipoInmueble) {
    const mostrarAmbientes = tipoInmueble === 'casa' || tipoInmueble === 'departamento';
    
    return `
        <div class="separador-formulario"></div>
        
        <div class="seccion-campos">
            <h3>Datos del informe</h3>
            <div class="form-grid">
                <div class="input-group">
                    <label>Nomenclatura catastral</label>
                    <input type="text" id="nomenclaturaCatastralInput" placeholder="Ej: CIR-123-ABC" value="${datosInforme.nomenclaturaCatastral || ""}">
                </div>
                
                <div class="input-group">
                    <label>Solicitante / Cliente</label>
                    <input type="text" id="clienteNombreInput" placeholder="Nombre del cliente" value="${datosInforme.clienteNombre || ""}">
                </div>
                
                <div class="input-group">
                    <label>Finalidad de la tasación</label>
                    <input type="text" id="finalidadInput" placeholder="Ej: Tasación comercial" value="${datosInforme.finalidad || "Tasación comercial"}">
                </div>
            </div>
        </div>
        
        <div class="separador-formulario"></div>
        
        <div class="seccion-campos">
            <h3>Características del entorno</h3>
            <div class="form-grid">
                <div class="input-group full-width">
                    <label>Descripción general</label>
                    <textarea id="entornoDescripcionInput" placeholder="Descripción general del entorno..." rows="3">${datosInforme.entorno?.descripcion || ""}</textarea>
                </div>
                
                <div class="input-group">
                    <label>Transporte público</label>
                    <input type="text" id="entornoTransporteInput" placeholder="Líneas de transporte cercanas" value="${datosInforme.entorno?.transporte || ""}">
                </div>
                
                <div class="input-group">
                    <label>Comercios</label>
                    <input type="text" id="entornoComerciosInput" placeholder="Comercios cercanos" value="${datosInforme.entorno?.comercios || ""}">
                </div>
                
                <div class="input-group">
                    <label>Universidades / Facultades</label>
                    <input type="text" id="entornoUniversidadesInput" placeholder="Instituciones educativas cercanas" value="${datosInforme.entorno?.universidades || ""}">
                </div>
                
                <div class="input-group">
                    <label>Puntos de interés</label>
                    <input type="text" id="entornoPuntosInteresInput" placeholder="Parques, plazas, etc." value="${datosInforme.entorno?.puntosInteres || ""}">
                </div>
            </div>
        </div>
        
        ${mostrarAmbientes ? generarHTMLAmbientes() : ''}
    `;
}

function generarHTMLAmbientes() {
    let ambientesHTML = '';
    
    if (datosInforme.ambientes && datosInforme.ambientes.length > 0) {
        datosInforme.ambientes.forEach((ambiente, index) => {
            ambientesHTML += generarHTMLAmbienteItem(index, ambiente);
        });
    }
    
    return `
        <div class="separador-formulario"></div>
        
        <div class="seccion-campos">
            <h3>Detalle de ambientes</h3>
            <div id="ambientesContainer">
                ${ambientesHTML}
            </div>
            <button type="button" class="btn-secondary" id="btnAgregarAmbiente" style="margin-top: 16px;">
                <i class="fa-solid fa-plus"></i> Agregar ambiente
            </button>
        </div>
    `;
}

function generarHTMLAmbienteItem(index, ambiente = {}) {
    return `
        <div class="ambiente-item" data-index="${index}">
            <div class="ambiente-header">
                <h4>Ambiente ${index + 1}</h4>
                <button type="button" class="btn-eliminar-ambiente" data-index="${index}" title="Eliminar ambiente">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="ambiente-campos">
                <div class="input-group">
                    <label>Nombre del ambiente</label>
                    <input type="text" class="ambiente-nombre" data-index="${index}" placeholder="Ej: Dormitorio principal" value="${ambiente.nombre || ""}">
                </div>
                
                <div class="input-group">
                    <label>Medidas</label>
                    <input type="text" class="ambiente-medidas" data-index="${index}" placeholder="Ej: 4m x 5m" value="${ambiente.medidas || ""}">
                </div>
                
                <div class="input-group full-width">
                    <label>Descripción</label>
                    <textarea class="ambiente-descripcion" data-index="${index}" placeholder="Descripción del ambiente..." rows="2">${ambiente.descripcion || ""}</textarea>
                </div>
            </div>
        </div>
    `;
}

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
        tipoLoteHTML = generarInputTipoLote({ inputId: 'tipoLoteInput', listId: 'tipoLoteList', value: datosTasacion.lote.tipoLote || "" });
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
                    <input type="text" id="localidadInput" placeholder="${datosTasacion.ubicacion.provincia ? 'Escribí una localidad' : 'Seleccionar provincia primero'}" autocomplete="off" ${datosTasacion.ubicacion.provincia ? '' : 'disabled'} value="${datosTasacion.ubicacion.localidad || ""}">
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
                    <input type="checkbox" data-amenity="${amenity}" value="${amenity}" ${amenitiesActuales.includes(amenity) ? "checked" : ""}>
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
