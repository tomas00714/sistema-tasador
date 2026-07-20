/* =========================
   TASACION COMPARABLES
   Gestión de comparables
========================= */

function limpiarComparableManualDocListeners() {
    comparableManualDocListeners.forEach(fn => {
        document.removeEventListener("click", fn);
    });
    comparableManualDocListeners.length = 0;
}

function registrarComparableManualDocListener(fn) {
    document.addEventListener("click", fn);
    comparableManualDocListeners.push(fn);
}

function hayDatosComparableManual() {
    const frente = document.getElementById("compManualFrenteInput")?.value;
    const fondo = document.getElementById("compManualFondoInput")?.value;
    const superficie = document.getElementById("compManualSuperficieInput")?.value;
    const valor = document.getElementById("compManualValorInput")?.value;
    const direccion = document.getElementById("compManualDireccionInput")?.value;

    return !!(frente || fondo || superficie || valor || direccion);
}

function cerrarModalComparables() {
    limpiarComparableManualDocListeners();

    const overlay = document.getElementById("comparablesModalOverlay");
    const cont = document.getElementById("comparablesModalContenido");

    if (overlay) {
        overlay.classList.remove("active");
    }

    if (cont) {
        cont.innerHTML = "";
    }

    comparablePanelModo = null;
}

function renderComparablesDerecha() {
    const wrap = document.getElementById("comparablesListaDinamica");
    const contador = document.getElementById("comparablesContador");

    if (!wrap) {
        return;
    }

    const n = datosTasacion.comparables.length;

    if (contador) {
        contador.textContent = n;
    }

    if (!n) {
        wrap.innerHTML = `
            <div class="comparables-vacio">
                <div class="comparables-vacio-icono">⊕</div>
                <h4>No hay comparables agregados</h4>
                <p>Se recomienda minimo 3 comparables para mas precision</p>
            </div>
        `;
        return;
    }

    // Usar comparables directamente de memoria (ya son objetos completos)
    wrap.innerHTML = datosTasacion.comparables.map((comparable, idx) => {
        if (!comparable) return '';
        
        const u = comparable.ubicacion || {};
        const detalles = generarDetallesComparable(comparable);
        const valorFmt = comparable.valor != null && comparable.valor !== "" ? Number(comparable.valor).toLocaleString("es-AR") : "—";
        const tipoValorTxt = comparable.tipoValor === "oferta" ? "Oferta" : "Venta";
        const badge = comparable.fuente === "manual" ? "Manual" : "Desde tasación";

        return `
            <div class="comparable-item-fila">
                <div>
                    <h4>${escapeHtml(u.direccion || "Sin dirección")}</h4>
                    <div class="comparable-item-meta">
                        ${escapeHtml(u.localidad || "")}, ${escapeHtml(u.provincia || "")}<br>
                        Tipo: ${escapeHtml(etiquetaTipoInmueble(comparable.tipoInmueble))} · ${detalles}<br>
                        Valor (${tipoValorTxt}): $ ${valorFmt}
                    </div>
                    <span class="comparable-item-badge">${badge}</span>
                </div>
                <button type="button" class="btn-quitar-comparable" data-quitar-comparable="${idx}">Quitar</button>
            </div>
        `;
    }).join('');
}

function etiquetaTipoInmueble(tipo) {
    const mapa = {
        lote: "Lote",
        casa: "Casa",
        departamento: "Departamento / PH"
    };

    if (!tipo) {
        return "—";
    }

    const t = String(tipo).toLowerCase();
    return mapa[t] || tipo;
}

function generarDetallesComparable(comparable) {
    if (!comparable) return "—";

    const tipo = String(comparable.tipoInmueble || "").toLowerCase();
    const parts = [];

    if (tipo === "lote") {
        parts.push(`Lote: ${comparable.tipoLote ? escapeHtml(comparable.tipoLote) : "—"}`);
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
        if (comparable.cochera) amenities.push("cochera");
        if (comparable.tieneAscensor) amenities.push("ascensor");
        if (comparable.tienePileta) amenities.push("pileta");
        if (comparable.tieneJardin) amenities.push("jardín");
        if (amenities.length) parts.push(amenities.join(" · "));
    }

    return parts.join(" · ") || "—";
}

async function leerHistorialDesdeAPI() {
    try {
        const tasaciones = await listarTasacionesAPI(1);
        return tasaciones.map(t => ({
            id: t.id,
            idNum: parseInt(t.id.split('-')[1]),
            tipo: t.tipo,
            estado: t.estado,
            ...t.datos,
            comparables: t.comparables_ids || [],
            datosCompletos: t.datos
        }));
    } catch (e) {
        console.error('Error al leer historial desde API:', e);
        return [];
    }
}

function formatearFechaRelativa(fecha) {
    const ahora = new Date();
    const creada = new Date(fecha);
    const diff = Math.floor((ahora - creada) / 1000);
    const dias = Math.floor(diff / 86400);

    if (dias <= 0) {
        return "Hoy";
    }

    if (dias === 1) {
        return "Hace 1 día";
    }

    return `Hace ${dias} días`;
}

function bindComparableManualUbicacion() {
    limpiarComparableManualDocListeners();

    const inputProv = document.getElementById("compManualProvinciaInput");
    const listProv = document.getElementById("compManualProvinciaList");
    const inputLoc = document.getElementById("compManualLocalidadInput");
    const listLoc = document.getElementById("compManualLocalidadList");

    if (!inputProv || !listProv || !inputLoc || !listLoc) {
        return;
    }

    function renderProv(filtro = "") {
        listProv.innerHTML = "";
        const filtradas = filtrarProvincias(filtro);

        if (!filtradas.length) {
            listProv.style.display = "none";
            return;
        }

        filtradas.forEach(provincia => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = provincia.nombre;
            item.addEventListener("click", () => {
                inputProv.value = provincia.nombre;
                listProv.style.display = "none";
                cargarLocalidadesComparableManual(provincia.nombre);
            });
            listProv.appendChild(item);
        });

        listProv.style.display = "block";
    }

    function renderLoc(filtro = "") {
        listLoc.innerHTML = "";
        const filtradas = filtrarLocalidades(filtro, 30);

        if (!filtradas.length) {
            listLoc.style.display = "none";
            return;
        }

        filtradas.forEach(localidad => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = localidad.nombre;
            item.addEventListener("click", () => {
                inputLoc.value = localidad.nombre;
                listLoc.style.display = "none";
            });
            listLoc.appendChild(item);
        });

        listLoc.style.display = "block";
    }

    inputProv.addEventListener("focus", () => {
        renderProv();
    });

    inputProv.addEventListener("input", () => {
        renderProv(inputProv.value);
        const valorInput = inputProv.value.trim();
        if (valorInput) {
            const match = buscarProvincia(valorInput);
            if (match) {
                inputProv.value = match.nombre;
                listProv.style.display = "none";
                cargarLocalidadesComparableManual(match.nombre);
            }
        }
    });

    inputLoc.addEventListener("focus", () => {
        if (!inputLoc.disabled) {
            renderLoc();
        }
    });

    inputLoc.addEventListener("input", () => {
        renderLoc(inputLoc.value);
        const valorInput = inputLoc.value.trim();
        if (valorInput && !inputLoc.disabled) {
            const match = buscarLocalidad(valorInput);
            if (match) {
                inputLoc.value = match.nombre;
                listLoc.style.display = "none";
            }
        }
    });

    const cerrarListas = e => {
        const rootProv = inputProv.parentElement;
        const rootLoc = inputLoc.parentElement;

        if (rootProv && !rootProv.contains(e.target)) {
            listProv.style.display = "none";
        }

        if (rootLoc && !rootLoc.contains(e.target)) {
            listLoc.style.display = "none";
        }
    };

    registrarComparableManualDocListener(cerrarListas);
}

async function cargarLocalidadesComparableManual(provinciaNombre) {
    const inputLoc = document.getElementById("compManualLocalidadInput");
    const listLoc = document.getElementById("compManualLocalidadList");

    if (!inputLoc || !listLoc) {
        return;
    }

    inputLoc.disabled = true;
    inputLoc.placeholder = "Cargando localidades...";
    listLoc.style.display = "none";

    try {
        await cargarLocalidades(provinciaNombre);

        inputLoc.disabled = false;
        inputLoc.placeholder = "Escribí una localidad";
        inputLoc.value = "";

    } catch (e) {
        console.error(e);
        inputLoc.disabled = false;
        inputLoc.placeholder = "Error al cargar localidades";
    }
}

function inicializarTipoLoteComparableManual() {
    const input = document.getElementById("compManualTipoLoteInput");
    const list = document.getElementById("compManualTipoLoteList");

    if (!input || !list) {
        return;
    }

    const items = list.querySelectorAll(".autocomplete-item");

    input.addEventListener("click", () => {
        list.style.display = "block";
    });

    items.forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent.trim();
            list.style.display = "none";
        });
    });

    const cerrar = e => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    };

    registrarComparableManualDocListener(cerrar);
}

async function agregarComparableManualDesdeFormulario() {
    const btn = document.getElementById("btnAgregarComparableManual");
    if (btn) btn.disabled = true;

    const direccion = document.getElementById("compManualDireccionInput")?.value.trim();
    const provincia = document.getElementById("compManualProvinciaInput")?.value.trim();
    const localidad = document.getElementById("compManualLocalidadInput")?.value.trim();
    const tipoLoteInput = document.getElementById("compManualTipoLoteInput");
    const tipoLote = tipoLoteInput ? tipoLoteInput.value.trim() : "";
    const valorRaw = document.getElementById("compManualValorInput")?.value;
    const tipoValor = document.querySelector('input[name="compManualTipoValor"]:checked')?.value || "venta";
    const esLote = datosTasacion.tipo === "lote";

    try {
        if (!direccion || !provincia || !localidad) {
            alert("Completá dirección, provincia y localidad.");
            return;
        }

        if (esLote && !tipoLote) {
            alert("Seleccioná el tipo de lote.");
            return;
        }

        const frenteComp = parseFloat(document.getElementById("compManualFrenteInput")?.value) || 0;
        const fondoComp = parseFloat(document.getElementById("compManualFondoInput")?.value) || 0;
        let superficieComp = parseFloat(document.getElementById("compManualSuperficieInput")?.value) || 0;

        if (!frenteComp) {
            alert("Completá el frente del comparable.");
            return;
        }

        if (!superficieComp && fondoComp) {
            superficieComp = frenteComp * fondoComp;
        }

        if (!superficieComp) {
            alert("Completá la superficie del comparable.");
            return;
        }

        if (valorRaw === "" || valorRaw == null || Number.isNaN(Number(valorRaw))) {
            alert("Ingresá un valor numérico válido.");
            return;
        }

        // Crear comparable como entidad independiente
        const comparable = await crearComparable({
            fuente: "manual",
            tipoInmueble: datosTasacion.tipo,
            tipoLote: esLote ? tipoLote : null,
            ubicacion: {
                direccion: formatearDireccion(direccion),
                provincia,
                localidad
            },
            frente: frenteComp,
            fondo: fondoComp || null,
            superficie: superficieComp,
            valor: Number(valorRaw),
            tipoValor
        });

        // NO guardar en storage, solo agregar a memoria
        datosTasacion.comparables.push(comparable);

        resultadoCalculado = false;
        actualizarIndicadoresProgreso();
        actualizarEstadoBotonSiguiente();

        cerrarModalComparables();
        renderComparablesDerecha();
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function agregarComparableDesdeHistorial(id) {
    const btn = document.querySelector(`[data-historial-id="${id}"]`);
    if (btn) btn.disabled = true;

    try {
        const tasaciones = await leerTasaciones();
        const t = tasaciones.find(x => String(x.id) === String(id));

        if (!t) {
            console.error("No se encontró tasación con ID:", id, "en historial:", tasaciones);
            return;
        }

        const ya = datosTasacion.comparables.some(c => c.id === id);

        if (ya) {
            alert("Esa tasación ya está en comparables.");
            return;
        }

        const snap = JSON.parse(JSON.stringify(t));

        let valor = snap.valor || snap.resultado?.valor_final || snap.datosCompletos?.resultado?.valor_final || 0;

        if (!valor) {
            const ingresado = prompt(
                "Esta tasación no tiene valor guardado. " +
                "Ingresá el valor total del comparable (USD):"
            );

            if (ingresado === null || ingresado === "" || Number.isNaN(Number(ingresado))) {
                return;
            }

            valor = Number(ingresado);
        }

        // Crear comparable como entidad independiente usando la API
        const comparable = await crearComparable({
            fuente: "deTasacion",
            tipoInmueble: snap.tipo || null,
            tipoLote: snap.lote?.tipoLote || null,
            ubicacion: snap.ubicacion || {},
            frente: snap.lote?.caracteristicas?.frente || null,
            fondo: snap.lote?.caracteristicas?.fondo || null,
            superficie: snap.lote?.caracteristicas?.superficie || null,
            valor,
            tipoValor: "venta",
            lote: snap.lote || null,
            departamento: snap.departamento || null,
            casa: snap.casa || null
        });

        // Agregar el objeto completo a la tasación (se guardará en API al guardar la tasación)
        datosTasacion.comparables.push(comparable);

        resultadoCalculado = false;
        actualizarIndicadoresProgreso();
        actualizarEstadoBotonSiguiente();

        cerrarModalComparables();
        renderComparablesDerecha();
    } finally {
        if (btn) btn.disabled = false;
    }
}

function onComparablesContenidoClick(e) {
    const tipo = datosTasacion.tipo || 'lote';
    const pasos = pasosPorTipo[tipo] || [];
    const comparablesIndex = pasos.indexOf('comparables');
    const pasoComparables = comparablesIndex !== -1 ? comparablesIndex + 2 : (tipo === 'departamento' ? 5 : 4);
    
    if (pasoActual !== pasoComparables) {
        return;
    }

    const accion = e.target.closest("[data-accion-comparable]");
    if (accion) {
        if (accion.dataset.accionComparable === "manual") {
            abrirModalComparable(tipo, async (datos) => {
                await agregarComparableDesdeFormularioModal(datos);
            });
        } else if (accion.dataset.accionComparable === "historial") {
            // Abrir modal en modo seleccionar existente
            abrirModalComparable(tipo, null, 'seleccionar');
        }
        return;
    }

    const btnQuitar = e.target.closest("[data-quitar-comparable]");
    if (btnQuitar) {
        const idx = Number(btnQuitar.dataset.quitarComparable);
        if (!Number.isNaN(idx)) {
            datosTasacion.comparables.splice(idx, 1);
            renderComparablesDerecha();
            actualizarEstadoBotonSiguiente();
        }
        return;
    }
}

function inicializarComparablesPantalla() {
    if (!comparablesContenidoClickInicializado) {
        const contenido = getContenidoTasacion();
        contenido.addEventListener("click", onComparablesContenidoClick);
        comparablesContenidoClickInicializado = true;
    }

    renderComparablesDerecha();
}

function mostrarPantallaComparables() {
    const tipo = datosTasacion.tipo || 'lote';
    const pasos = pasosPorTipo[tipo] || [];
    const comparablesIndex = pasos.indexOf('comparables');
    
    if (comparablesIndex !== -1) {
        pasoActual = comparablesIndex + 2;
    } else {
        pasoActual = tipo === 'departamento' ? 5 : 4;
    }

    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    const btn = getBtnSiguiente();

    if (btn) {
        btn.textContent = "Siguiente";
        btn.disabled = datosTasacion.comparables.length < 1;
        if (datosTasacion.comparables.length >= 1) {
            btn.classList.add("activo");
        } else {
            btn.classList.remove("activo");
        }
    }

    cerrarModalComparables();

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `
        <div class="titulo-seccion">
            <h1>Comparables</h1>
            <p>Agregá propiedades comparables para calcular la tasación.</p>
        </div>
        <div class="comparables-layout">
            <div class="comparables-columna-izq">
                <div class="comparables-acciones">
                    <div class="accion-comparable" data-accion-comparable="manual" role="button" tabindex="0">
                        <div class="accion-icono">➕</div>
                        <div>
                            <h3>Agregar manualmente</h3>
                            <p>Crear un comparable cargando sus características.</p>
                        </div>
                    </div>
                    <div class="accion-comparable" data-accion-comparable="historial" role="button" tabindex="0">
                        <div class="accion-icono">🕘</div>
                        <div>
                            <h3>Usar tasación/comparable existente</h3>
                            <p>Seleccionar una tasación o un comparable previo del historial.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="comparables-lista">
                <div class="comparables-header">
                    <h3>Comparables seleccionados</h3>
                    <span id="comparablesContador">${datosTasacion.comparables.length}</span>
                </div>
                <div id="comparablesListaDinamica"></div>
            </div>
        </div>
    `;

    inicializarComparablesPantalla();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}

async function agregarComparableDesdeFormularioModal(datos) {
    // Crear comparable como entidad independiente, incluyendo lat/lon y lote para persistirlo bien
    const comparable = await crearComparable({
        ...datos,
        fuente: "manual",
        tipoInmueble: datos.tipoInmueble
    });
    
    // NO guardar en storage, solo agregar a memoria
    datosTasacion.comparables.push(comparable);
    
    resultadoCalculado = false;
    actualizarIndicadoresProgreso();
    actualizarEstadoBotonSiguiente();
    
    renderComparablesDerecha();
}
