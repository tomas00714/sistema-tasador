/* Pantalla 5: cálculo y resultado (requiere tasacion.js cargado antes) */

function mostrarMenuOpcionesComparable(index, buttonElement) {
    // Cerrar cualquier menú existente
    const menuExistente = document.querySelector('.menu-opciones-comparable');
    if (menuExistente) {
        menuExistente.remove();
        return;
    }

    // Crear el menú
    const menu = document.createElement('div');
    menu.className = 'menu-opciones-comparable';
    menu.innerHTML = `
        <div class="menu-opciones-item" data-action="agregar-coeficiente" data-index="${index}">
            Agregar coeficiente
        </div>
        <div class="menu-opciones-item menu-opciones-eliminar" data-action="eliminar" data-index="${index}">
            Eliminar
        </div>
    `;

    // Posicionar el menú
    const rect = buttonElement.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.style.zIndex = '1000';

    // Agregar al DOM
    document.body.appendChild(menu);

    // Agregar event listeners
    menu.querySelectorAll('.menu-opciones-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const index = parseInt(e.target.dataset.index);
            
            if (action === 'eliminar') {
                if (confirm('¿Estás seguro de eliminar este comparable?')) {
                    quitarComparable(index);
                }
            } else if (action === 'agregar-coeficiente') {
                mostrarModalAgregarCoeficiente(index);
            }
            
            menu.remove();
        });
    });

    // Cerrar menú al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarMenu(e) {
            if (!menu.contains(e.target) && e.target !== buttonElement) {
                menu.remove();
                document.removeEventListener('click', cerrarMenu);
            }
        });
    }, 0);
}

function mostrarModalAgregarCoeficiente(index) {
    // Cerrar cualquier modal existente
    const modalExistente = document.querySelector('.modal-agregar-coeficiente');
    if (modalExistente) {
        modalExistente.remove();
    }

    // Crear el modal
    const modal = document.createElement('div');
    modal.className = 'modal-agregar-coeficiente';
    modal.innerHTML = `
        <div class="modal-agregar-coeficiente-content">
            <div class="modal-agregar-coeficiente-header">
                <h3>Agregar coeficiente personalizado</h3>
                <button type="button" class="modal-agregar-coeficiente-cerrar" id="cerrarModalCoeficiente">✕</button>
            </div>
            <div class="modal-agregar-coeficiente-body">
                <div class="input-group">
                    <label for="coeficienteRazon">Razón del coeficiente</label>
                    <input type="text" id="coeficienteRazon" placeholder="Ej: Estado de conservación, Vista, etc.">
                </div>
                <div class="input-group">
                    <label for="coeficienteValor">Valor del coeficiente</label>
                    <input type="number" id="coeficienteValor" placeholder="1.0" step="0.01" min="0">
                </div>
            </div>
            <div class="modal-agregar-coeficiente-footer">
                <button type="button" class="btn-modal-cancelar" id="cancelarCoeficiente">Cancelar</button>
                <button type="button" class="btn-modal-confirmar" id="confirmarCoeficiente">Agregar</button>
            </div>
        </div>
    `;

    // Agregar al DOM
    document.body.appendChild(modal);

    // Event listeners
    const cerrarBtn = document.getElementById('cerrarModalCoeficiente');
    const cancelarBtn = document.getElementById('cancelarCoeficiente');
    const confirmarBtn = document.getElementById('confirmarCoeficiente');

    const cerrarModal = () => modal.remove();

    cerrarBtn.addEventListener('click', cerrarModal);
    cancelarBtn.addEventListener('click', cerrarModal);

    confirmarBtn.addEventListener('click', () => {
        const razon = document.getElementById('coeficienteRazon').value.trim();
        const valor = parseFloat(document.getElementById('coeficienteValor').value);

        if (!razon) {
            alert('Por favor, ingresa la razón del coeficiente.');
            return;
        }

        if (isNaN(valor) || valor <= 0) {
            alert('Por favor, ingresa un valor válido para el coeficiente (mayor a 0).');
            return;
        }

        // Guardar el coeficiente personalizado (acumulativo)
        if (!coeficientesPersonalizados[index]) {
            coeficientesPersonalizados[index] = [];
        }
        coeficientesPersonalizados[index].push({
            id: `coef-${coeficienteIdCounter++}`,
            nombre: razon,
            valor: valor
        });

        cerrarModal();

        // Auto-recalcular with the new coefficient
        recalcularConCoeficientes();
    });

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

function quitarComparable(index) {
    datosTasacion.comparables.splice(index, 1);

    if (datosTasacion.comparables.length < 1) {
        alert("Mínimo 1 comparable requerido. Volviendo a pantalla de comparables.");
        mostrarPantallaComparables();
        return;
    }

    // Recalculate with remaining comparables
    calcularYMostrarResultado();
}

function recalcularConCoeficientes() {
    // Collect all coefficient values from DOM (for ubicacion and ACT)
    const coeficientes = {};
    
    // Get ubicacion coefficients from DOM
    document.querySelectorAll(".coef-ubicacion-input").forEach(input => {
        const index = input.dataset.index;
        coeficientes[index] = coeficientes[index] || {};
        coeficientes[index].ubicacion = parseFloat(input.value) || 1;
    });
    
    // Get ACT coefficients from DOM
    document.querySelectorAll(".coef-act-input").forEach(input => {
        const index = input.dataset.index;
        coeficientes[index] = coeficientes[index] || {};
        coeficientes[index].act = parseFloat(input.value) || 1;
    });
    
    // Get custom coefficients from data structure (not DOM)
    Object.keys(coeficientesPersonalizados).forEach(index => {
        coeficientes[index] = coeficientes[index] || {};
        coeficientes[index].personalizados = {};
        coeficientesPersonalizados[index].forEach(coef => {
            coeficientes[index].personalizados[coef.id] = coef.valor;
        });
    });
    
    // Update the comparables with new homogenized values
    const r = resultadoTasacion;
    if (r && r.comparables) {
        r.comparables.forEach((c, index) => {
            const indexStr = index.toString();
            const coef = coeficientes[indexStr] || {};
            
            const coefFitto = c.coef_fitto_comparable || 1;
            const coefUbicacion = coef.ubicacion || 1;
            const coefAct = coef.act || 1;
            
            // Multiply all custom coefficients for this comparable
            let coefPersonalizadoTotal = 1;
            if (coef.personalizados) {
                Object.values(coef.personalizados).forEach(val => {
                    coefPersonalizadoTotal *= val;
                });
            }
            
            // New formula: original m² / (all coefficients multiplied)
            const coeficienteTotal = coefFitto * coefUbicacion * coefAct * coefPersonalizadoTotal;
            c.valor_m2_homogeneizado = c.valor_m2 / coeficienteTotal;
            
            // Store the coefficients for future reference
            c.coef_ubicacion = coefUbicacion;
            c.coef_act = coefAct;
            c.coef_personalizado_total = coefPersonalizadoTotal;
        });
        
        // Recalculate average
        const valorPromedio = r.comparables.reduce((sum, c) => sum + c.valor_m2_homogeneizado, 0) / r.comparables.length;
        
        // Recalculate final value
        const car = datosTasacion.lote.caracteristicas || {};
        let superficie = parseFloat(car.superficie) || 0;
        if (!superficie) {
            const frente = parseFloat(car.frente) || 0;
            const fondo = car.fondo ? parseFloat(car.fondo) : null;
            if (frente && fondo) {
                superficie = frente * fondo;
            }
        }
        
        r.valor_m2 = valorPromedio;
        r.valor_final = valorPromedio * superficie;
        
        // Update the display
        mostrarPantallaResultado();
    }
}

function normalizarTipologiaApi(tipoLote) {

    const mapa = {
        "medial": "medial",
        "esquina": "esquina",
        "esquina larga (+30m)": "esquina_larga",
        "esquina_larga": "esquina_larga",
        "salida a dos calles": "dos_calles",
        "dos_calles": "dos_calles",
        "irregular": "irregular"
    };

    if (!tipoLote) {
        return "medial";
    }

    const t = String(tipoLote).toLowerCase().trim();

    return mapa[t] || "medial";
}

function mapearComparableApi(c) {

    if (c.fuente === "manual") {

        return {
            direccion: c.ubicacion.direccion,
            valor_total: c.valor,
            tipo_valor: c.tipoValor,
            frente: c.frente,
            fondo: c.fondo || null,
            superficie: c.superficie,
            tipologia: normalizarTipologiaApi(c.tipoLote),
            ajuste_manual_porcentaje: 0
        };
    }

    const snap = c.snapshot || {};
    const car = snap.lote?.caracteristicas || {};
    const frente = parseFloat(car.frente) || 0;
    const fondo = car.fondo ? parseFloat(car.fondo) : null;
    let superficie = parseFloat(car.superficie) || 0;

    if (!superficie && frente && fondo) {
        superficie = frente * fondo;
    }

    const valorTotal =
        c.valor ||
        snap.resultado?.valor_final ||
        0;

    // Get direccion from snapshot - the snapshot contains the full tasacion object
    // which has ubicacion.direccion at the top level
    const direccion = snap.ubicacion?.direccion || "Sin dirección";

    return {
        direccion: direccion,
        valor_total: valorTotal,
        tipo_valor: c.tipoValor || "venta",
        frente,
        fondo,
        superficie,
        tipologia: normalizarTipologiaApi(
            snap.lote?.tipoLote
        ),
        ajuste_manual_porcentaje: 0
    };
}

function armarPayloadTasacion(opciones = {}) {

    const car =
        datosTasacion.lote.caracteristicas || {};

    const frente = parseFloat(car.frente) || 0;
    const fondo =
        car.fondo ? parseFloat(car.fondo) : null;

    let superficie =
        parseFloat(car.superficie) || 0;

    if (!superficie && frente && fondo) {
        superficie = frente * fondo;
    }

    const zonaRaw = car.zona;
    const zona =
        zonaRaw ? parseInt(zonaRaw, 10) : null;

    return {
        direccion:
            datosTasacion.ubicacion.direccion,
        tipologia: normalizarTipologiaApi(
            datosTasacion.lote.tipoLote
        ),
        zona: Number.isNaN(zona) ? null : zona,
        frente,
        fondo,
        superficie,
        equipamientos:
            datosTasacion.lote.servicios || [],
        comparables:
            datosTasacion.comparables.map(
                mapearComparableApi
            )
    };
}

function formatearMoneda(n) {

    return Number(n).toLocaleString("es-AR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

async function calcularYMostrarResultado(
    opciones = {}
) {

    const payload = armarPayloadTasacion(opciones);
    console.log("Payload enviado al backend:", payload);

    const btnSiguiente = getBtnSiguiente();
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (btnSiguiente) {
        btnSiguiente.disabled = true;
        btnSiguiente.classList.remove("activo");
    }

    // Show loading overlay
    if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
    }

    try {

        console.log("Haciendo llamada a:", API_TASACION + "/tasar/lote");
        const res = await fetch(
            API_TASACION + "/tasar/lote",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(60000) // 60 second timeout
            }
        );

        console.log("Respuesta del backend - status:", res.status);
        const data = await res.json();
        console.log("Respuesta del backend - data:", data);

        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }

        if (!res.ok) {

            const msg =
                data.detail ||
                "Error al calcular la tasación";

            console.error("Error del backend:", data);
            alert(
                "Error del backend: " +
                (typeof msg === "string"
                    ? msg
                    : JSON.stringify(msg))
            );

            if (btnSiguiente) {
                btnSiguiente.disabled = false;
                btnSiguiente.classList.add("activo");
            }

            return;
        }

        resultadoTasacion = data;
        datosTasacion.resultado = data;

        console.log("Llamando a mostrarPantallaResultado()");
        mostrarPantallaResultado();

    } catch (e) {

        console.error("Error en la llamada al backend:", e);
        console.log("Usando modo demo sin backend");

        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }

        // Modo demo: generar resultado simulado con coeficientes reales
        const car = datosTasacion.lote.caracteristicas || {};
        const frente = parseFloat(car.frente) || 0;
        const fondo = car.fondo ? parseFloat(car.fondo) : null;
        let superficie = parseFloat(car.superficie) || 0;

        if (!superficie && frente && fondo) {
            superficie = frente * fondo;
        }

        // Calcular valor promedio de comparables homogeneizados con coeficientes
        const comparablesHomogeneizados = datosTasacion.comparables.map(c => {
            const sup = c.superficie || superficie;
            const frenteComp = c.frente || 0;
            const fondoComp = c.fondo || (sup / frenteComp) || 0;

            // Calcular valor m2 del comparable
            const valorM2 = c.valor / sup;

            // Simular coeficiente Fitto-Cervini (en modo demo usamos 1.0)
            // En producción esto vendría del backend
            const coefFittoComp = 1.0;
            const coefFittoObj = 1.0;

            // Calcular valor base y homogeneizado
            const valorBase = valorM2 / coefFittoComp;
            const valorHomogeneizado = valorBase * coefFittoObj;

            // Simular coeficiente de tipología (en modo demo usamos 1.0)
            const coefTipologia = 1.0;
            const valorFinal = valorHomogeneizado * coefTipologia;

            return {
                direccion: c.ubicacion?.direccion || c.direccion || "Sin dirección",
                valor_lote: c.valor,
                valor_m2: valorM2,
                frente: frenteComp,
                fondo: fondoComp,
                fos: null,
                fot: null,
                coef_fitto_relacion: coefFittoObj / coefFittoComp,
                coef_tipologia: coefTipologia,
                valor_m2_homogeneizado: valorFinal
            };
        });

        const valorPromedioHomogeneizado = comparablesHomogeneizados.length > 0
            ? comparablesHomogeneizados.reduce((a, b) => a + b.valor_m2_homogeneizado, 0) / comparablesHomogeneizados.length
            : 100000;

        // Calcular coeficiente del lote a tasar (demo: usar 1.0)
        const coeficienteLote = 1.0;

        // Generar resultado simulado con nueva fórmula: valor promedio * coeficiente * superficie
        resultadoTasacion = {
            valor_final: valorPromedioHomogeneizado * coeficienteLote * superficie,
            valor_m2: valorPromedioHomogeneizado,
            superficie: superficie,
            coeficiente_lote: coeficienteLote,
            comparables: comparablesHomogeneizados
        };

        datosTasacion.resultado = resultadoTasacion;

        resultadoCalculado = true;

        console.log("Resultado demo generado:", resultadoTasacion);
        mostrarPantallaResultado();
    }
}

// Store original values for restoration
let valorFinalOriginal = null;
let ajustePorcentajeOriginal = null;
let valorModificado = false;

// Store custom coefficients for each comparable
// Structure: { index: [ { nombre: string, valor: number, id: string } ] }
let coeficientesPersonalizados = {};
let coeficienteIdCounter = 0;

function mostrarPantallaResultado() {

    // Establecer pasoActual usando estructura dinámica
    const tipo = datosTasacion.tipo || 'lote';
    const pasos = pasosPorTipo[tipo] || [];
    const resultadoIndex = pasos.indexOf('resultado');
    
    if (resultadoIndex !== -1) {
        pasoActual = resultadoIndex + 2; // +2 porque array empieza en 0 y paso 1 es común
    } else {
        // Fallback a paso 5 para lote
        pasoActual = 5;
    }

    actualizarIndicadoresProgreso();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    cerrarModalComparables();

    const contenido = getContenidoTasacion();
    if (!contenido) {
        return;
    }

    const r = resultadoTasacion;

    if (!r) {
        return;
    }

    // Debug info en consola (sin alert visual)
    if (r.comparables && r.comparables.length > 0) {
        const formulasDebug = r.comparables
            .map((c, i) => {
                const coef = c.coef_fitto_comparable !== undefined ? c.coef_fitto_comparable : '?';
                const formula = c.debug_formula || `${c.valor_m2} / ${coef} = ${c.valor_m2_homogeneizado}`;
                return `Comparable ${i+1} (${c.direccion}): ${formula}`;
            })
            .join('\n');
        console.log("FÓRMULAS DE HOMOGENEIZACIÓN:\n" + formulasDebug);
    }

    // Store original values
    valorFinalOriginal = r.valor_final;
    ajustePorcentajeOriginal = r.ajuste_final_porcentaje || 0;
    valorModificado = false;

    // Calcular datos del lote a tasar para mostrar como primera fila
    const car = datosTasacion.lote.caracteristicas || {};
    const frente = parseFloat(car.frente) || 0;
    const fondo = car.fondo ? parseFloat(car.fondo) : null;
    let superficie = parseFloat(car.superficie) || 0;
    if (!superficie && frente && fondo) {
        superficie = frente * fondo;
    }
    const valorM2Lote = r.valor_m2 || 0;
    const valorTotalLote = r.valor_final || 0;

    // Get all unique custom coefficient names (cumulative)
    const todosCoeficientes = [];
    Object.values(coeficientesPersonalizados).forEach(coefs => {
        coefs.forEach(coef => {
            if (!todosCoeficientes.find(c => c.id === coef.id)) {
                todosCoeficientes.push(coef);
            }
        });
    });

    const filaLoteTasar = `
        <tr class="fila-lote-tasar" style="color: #0066cc;">
            <td><strong>${escapeHtml(datosTasacion.ubicacion.direccion || 'Lote a tasar')}</strong></td>
            <td><strong>${formatearMoneda(valorTotalLote)}</strong></td>
            <td><strong>${formatearMoneda(valorM2Lote)}</strong></td>
            <td><strong>${frente}</strong></td>
            <td><strong>${fondo || '-'}</strong></td>
            <td><strong>${car.fos || '-'}</strong></td>
            <td><strong>${car.fot || '-'}</strong></td>
            <td><strong>1.00</strong></td>
            <td><input type="number" class="coef-ubicacion-input" data-index="-1" value="1.00" step="0.01" min="0"></td>
            <td><input type="number" class="coef-act-input" data-index="-1" value="1.00" step="0.01" min="0"></td>
            ${todosCoeficientes.map(coef => {
                const loteCoef = coeficientesPersonalizados['-1']?.find(c => c.id === coef.id);
                return `<td><button type="button" class="coef-mas-btn" data-index="-1" data-coef-id="${coef.id}">+</button></td>`;
            }).join('')}
            <td><strong>${formatearMoneda(valorM2Lote)}</strong></td>
            <td></td>
        </tr>
    `;

    const filasComp = (r.comparables || [])
        .map((c, index) => {
            // Use stored coefficient values if available, otherwise default to 1.00
            const coefUbicacion = c.coef_ubicacion || 1;
            const coefAct = c.coef_act || 1;
            
            // Generate cells for all custom coefficients
            const celdasCoefPersonalizados = todosCoeficientes.map(coef => {
                const coefPersonalizado = coeficientesPersonalizados[index]?.find(c => c.id === coef.id);
                if (coefPersonalizado) {
                    return `<td><input type="number" class="coef-personalizado-input" data-index="${index}" data-coef-id="${coef.id}" value="${coefPersonalizado.valor}" step="0.01" min="0"></td>`;
                } else {
                    return `<td><button type="button" class="coef-mas-btn" data-index="${index}" data-coef-id="${coef.id}">+</button></td>`;
                }
            }).join('');
            
            return `
        <tr data-comparable-index="${index}">
            <td>${escapeHtml(c.direccion)}</td>
            <td>${formatearMoneda(c.valor_lote)}</td>
            <td>${formatearMoneda(c.valor_m2)}</td>
            <td>${c.frente}</td>
            <td>${c.fondo || '-'}</td>
            <td>${c.fos || '-'}</td>
            <td>${c.fot || '-'}</td>
            <td>${c.coef_fitto_comparable ? c.coef_fitto_comparable.toFixed(2) : '1.00'}</td>
            <td><input type="number" class="coef-ubicacion-input" data-index="${index}" value="${coefUbicacion.toFixed(2)}" step="0.01" min="0"></td>
            <td><input type="number" class="coef-act-input" data-index="${index}" value="${coefAct.toFixed(2)}" step="0.01" min="0"></td>
            ${celdasCoefPersonalizados}
            <td><strong>${formatearMoneda(c.valor_m2_homogeneizado)}</strong></td>
            <td>
                <button type="button" class="btn-opciones-comparable" data-index="${index}">
                    •••
                </button>
            </td>
        </tr>
    `;
        })
        .join("");

    // Calculate average of homogenized m2 values
    const valorPromedio = r.comparables && r.comparables.length > 0
        ? r.comparables.reduce((sum, c) => sum + c.valor_m2_homogeneizado, 0) / r.comparables.length
        : 0;

    const d = "div";

    contenido.innerHTML = `

        <${d} class="titulo-seccion">

            <h1>Resultado de la tasación</h1>

            <p>
                Valor estimado según comparables homogeneizados (Fitto y Cervini).
            </p>

        </${d}>

        <${d} class="resultado-layout-vertical">

            <${d} class="resultado-valor-card">

                <${d} class="resultado-valor-top">
                    <${d} class="resultado-valor-left">
                        <span class="resultado-etiqueta">Valor final</span>
                        ${valorModificado ? `
                            <${d} class="valor-cambiado-container">
                                <span class="valor-original">$ ${formatearMoneda(valorFinalOriginal)}</span>
                                <span class="valor-nuevo">$ ${formatearMoneda(r.valor_final)}</span>
                            </${d}>
                        ` : `
                            <${d} class="resultado-valor" id="resultadoValorFinal">
                                $ ${formatearMoneda(r.valor_final)}
                            </${d}>
                        `}
                    </${d}>
                </${d}>

                <${d} class="resultado-separador"></${d}>

                <${d} class="resultado-meta">
                    <${d}>
                        <span>USD/m² promedio</span>
                        <strong>$ ${formatearMoneda(r.valor_m2)}</strong>
                    </${d}>
                    <${d}>
                        <span>Superficie</span>
                        <strong>${r.superficie} m²</strong>
                    </${d}>
                </${d}>

            </${d}>

            <${d} class="resultado-tabla-wrap">

                <h3>Detalle de comparables</h3>

                <${d} class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        <thead>
                            <tr>
                                <th>Dirección</th>
                                <th>Valor del lote</th>
                                <th>Valor por m²</th>
                                <th>Frente</th>
                                <th>Fondo</th>
                                <th>FOS</th>
                                <th>FOT</th>
                                <th>Coeficiente</th>
                                <th>Ubicacion</th>
                                <th>ACT</th>
                                ${todosCoeficientes.map(coef => `<th>${coef.nombre}</th>`).join('')}
                                <th>Valor por m² homogeneizado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${filaLoteTasar}${filasComp}</tbody>
                        <tfoot>
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
                                ${todosCoeficientes.map(() => `<td></td>`).join('')}
                                <td><strong>${formatearMoneda(valorPromedio)}</strong></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </${d}>

                <button type="button" class="btn-recalcular" id="btnRecalcular" disabled>
                    Recalcular
                </button>

            </${d}>

        </${d}>
    `;

    // Add event listeners for coeficiente inputs
    document.querySelectorAll(".coef-ubicacion-input, .coef-act-input, .coef-personalizado-input").forEach(input => {
        input.addEventListener("input", () => {
            const btnRecalcular = document.getElementById("btnRecalcular");
            if (btnRecalcular) {
                btnRecalcular.disabled = false;
            }
        });
    });

    // Add event listeners for '+' buttons (custom coefficient)
    document.querySelectorAll(".coef-mas-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            const coefId = e.target.dataset.coefId;
            const cell = e.target.parentElement;
            
            // Find the coefficient definition to get the name
            const coefDef = todosCoeficientes.find(c => c.id === coefId);
            
            // Replace the button with an input field
            cell.innerHTML = `<input type="number" class="coef-personalizado-input" data-index="${index}" data-coef-id="${coefId}" value="1.00" step="0.01" min="0">`;
            
            // Add event listener to the new input
            const newInput = cell.querySelector('.coef-personalizado-input');
            newInput.addEventListener("input", () => {
                const btnRecalcular = document.getElementById("btnRecalcular");
                if (btnRecalcular) {
                    btnRecalcular.disabled = false;
                }
            });
            
            // Save the value when the input loses focus
            newInput.addEventListener("blur", () => {
                const valor = parseFloat(newInput.value) || 1;
                if (!coeficientesPersonalizados[index]) {
                    coeficientesPersonalizados[index] = [];
                }
                // Check if this coefficient already exists for this comparable
                const existingIndex = coeficientesPersonalizados[index].findIndex(c => c.id === coefId);
                if (existingIndex >= 0) {
                    // Update existing
                    coeficientesPersonalizados[index][existingIndex].valor = valor;
                } else {
                    // Add new
                    coeficientesPersonalizados[index].push({
                        id: coefId,
                        nombre: coefDef ? coefDef.nombre : 'Coeficiente',
                        valor: valor
                    });
                }
            });
            
            // Focus the input
            newInput.focus();
        });
    });

    // Add event listener for recalcular button
    const btnRecalcular = document.getElementById("btnRecalcular");
    if (btnRecalcular) {
        btnRecalcular.addEventListener("click", () => {
            recalcularConCoeficientes();
            btnRecalcular.disabled = true;
        });
    }

    // Add event listeners for opciones buttons
    document.querySelectorAll(".btn-opciones-comparable").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            mostrarMenuOpcionesComparable(index, e.target);
        });
    });

    // Add event listeners for remove comparable buttons (si todavía existen)
    document
        .querySelectorAll(".btn-quitar-comparable")
        .forEach(btn => {
            btn.addEventListener("click", (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm("¿Estás seguro de quitar este comparable?")) {
                    quitarComparable(index);
                }
            });
        });

    const btn = document.getElementById("btnSiguiente");
    if (btn) {
        btn.disabled = false;
        btn.classList.add("activo");
        actualizarTextoBotonSiguiente();

        // Re-initialize the button handler to ensure proper event handling
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            manejarBtnSiguiente();
        });
    }
}
