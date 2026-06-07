/* Pantalla 5: cálculo y resultado (requiere tasacion.js cargado antes) */

// Valvano coefficient calculation for corner lots
function calcularNValvano(frente, fondo, ladoMayorValor) {
    const F = frente + fondo;
    const m = ladoMayorValor === 'frente' ? frente : fondo;
    if (m === 0) return 0;
    return F / m;
}

async function obtenerCoeficienteValvano(n, zona) {
    try {
        const response = await fetch('../Back/tablas/valvano_data.json');
        const data = await response.json();
        
        // Map zona to table name
        const zonaToTabla = {
            '1': 'Tabla I',
            '2': 'Tabla II',
            '3': 'Tabla III',
            '4': 'Tabla IV'
        };
        
        const tabla = zonaToTabla[zona] || 'Tabla I';
        const tablaData = data.zonas[tabla];
        
        if (!tablaData) return 0;
        
        // Find the closest n value in the table
        const nValues = data.n_values;
        let closestN = nValues[0];
        let minDiff = Math.abs(n - closestN);
        
        for (const nVal of nValues) {
            const diff = Math.abs(n - nVal);
            if (diff < minDiff) {
                minDiff = diff;
                closestN = nVal;
            }
        }
        
        // Get the coefficient for the closest n value
        const nStr = closestN.toFixed(2);
        return tablaData[nStr] || 0;
    } catch (error) {
        console.error('Error loading Valvano table:', error);
        return 0;
    }
}

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
    
    // For lot to be appraised, esquina, and medial, only show "Agregar coeficiente" option
    if (index === 'lote' || index === 'esquina' || index === 'medial') {
        menu.innerHTML = `
            <div class="menu-opciones-item" data-action="agregar-coeficiente" data-index="${index}">
                Agregar coeficiente
            </div>
        `;
    } else {
        menu.innerHTML = `
            <div class="menu-opciones-item" data-action="agregar-coeficiente" data-index="${index}">
                Agregar coeficiente
            </div>
            <div class="menu-opciones-item menu-opciones-eliminar" data-action="eliminar" data-index="${index}">
                Eliminar
            </div>
        `;
    }

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
            const indexStr = e.target.dataset.index;
            // Handle both numeric indices (comparables) and 'lote' (lot to be appraised)
            const indexNum = indexStr === 'lote' ? 'lote' : parseInt(indexStr);
            
            if (action === 'eliminar') {
                if (confirm('¿Estás seguro de eliminar este comparable?')) {
                    quitarComparable(indexNum);
                }
            } else if (action === 'agregar-coeficiente') {
                mostrarModalAgregarCoeficiente(indexNum);
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

        // Re-render the screen to show the new coefficient
        mostrarPantallaResultado();
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

async function recalcularConCoeficientes() {
    // Collect all coefficient values from DOM (for ubicacion and ACT)
    const coeficientes = {};
    
    // Get ubicacion coefficients from DOM
    document.querySelectorAll(".coef-ubicacion-input").forEach(input => {
        const index = input.dataset.index;
        coeficientes[index] = coeficientes[index] || {};
        coeficientes[index].ubicacion = parseFloat(input.value) || 1;
    });
    
    // Get Actualización coefficients from DOM
    document.querySelectorAll(".coef-actualizacion-input").forEach(input => {
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
        
        // Get lot coefficients from DOM (index 'lote')
        const coefLote = coeficientes['lote'] || {};
        const coefUbicacionLote = coefLote.ubicacion || 1;
        const coefActualizacionLote = coefLote.act || 1;
        
        // Get custom coefficients for lot
        let coefPersonalizadoTotalLote = 1;
        if (coefLote.personalizados) {
            Object.values(coefLote.personalizados).forEach(val => {
                coefPersonalizadoTotalLote *= val;
            });
        }
        
        // Recalculate final value with Valvano coefficient for corner lots
        const car = datosTasacion.lote.caracteristicas || {};
        let superficie = parseFloat(car.superficie) || 0;
        if (!superficie) {
            const frente = parseFloat(car.frente) || 0;
            const fondo = car.fondo ? parseFloat(car.fondo) : null;
            if (frente && fondo) {
                superficie = frente * fondo;
            }
        }
        
        let coeficienteValvano = 0;
        const coefFittoLote = r.coeficiente_fitto_lote || 1.0;
        
        // Check if lot type is corner lot and apply Valvano coefficient
        const tipoLote = datosTasacion.lote.tipoLote;
        const esEsquina = tipoLote === "Esquina" || tipoLote === "Esquina larga (+30m)" || tipoLote === "Salida a dos calles";
        
        if (esEsquina) {
            const ladoMayorValor = car.ladoMayorValor || 'frente';
            const zona = car.zona || '1';
            const frente = parseFloat(car.frente) || 0;
            const fondo = car.fondo ? parseFloat(car.fondo) : 0;
            
            // Calculate n = F/m
            const n = calcularNValvano(frente, fondo, ladoMayorValor);
            
            // Get Valvano coefficient
            coeficienteValvano = await obtenerCoeficienteValvano(n, zona);
            
            console.log(`Valvano recalculation - n: ${n.toFixed(2)}, zona: ${zona}, coeficiente: ${coeficienteValvano}`);
        }
        
        // Calculate value for lot to be appraised:
        // valor inicial = valor promedio homogeneizado × superficie
        // valor final = valor inicial × coeficiente Fitto-Cervini × coeficiente Valvano × coeficiente ubicación × coeficiente Actualización × coeficientes personalizados
        const valorInicial = valorPromedio * superficie;
        const coeficienteValvanoTotal = coeficienteValvano > 0 ? coeficienteValvano + 1 : 1;
        const valorFinalLote = valorInicial * coefFittoLote * coeficienteValvanoTotal * coefUbicacionLote * coefActualizacionLote * coefPersonalizadoTotalLote;
        const valorM2Lote = valorFinalLote / superficie;
        
        r.valor_m2 = valorM2Lote;
        r.valor_final = valorFinalLote;
        r.coeficiente_valvano = coeficienteValvano;
        r.coeficiente_ubicacion = coefUbicacionLote;
        r.coeficiente_actualizacion = coefActualizacionLote;
        r.valor_promedio_homogeneizado = valorPromedio;
        
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

function truncarDosDecimales(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return 0;
    return Math.floor(valor * 100) / 100;
}

function formatearDireccion(direccion) {
    if (!direccion) return "";
    return direccion
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function generarCuadroDetalleLote(resultado, tipo, datosTasacion, car, esEsquina, d, esIrregular = false) {
    const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    const valvanoColumna = esEsquina ? `<th>Valvano</th>` : '';
    const valvanoCelda = esEsquina ? `<td><strong>${resultado.extras && resultado.extras.coef_valvano ? truncarDosDecimales(resultado.extras.coef_valvano).toFixed(2) : '-'}</strong></td>` : '';

    // For irregular lots, use "Fondo Ficticio" label and value
    const fondoLabel = esIrregular ? 'Fondo Ficticio' : 'Fondo';
    const fondoValor = esIrregular ? (car.fondoFicticio || resultado.fondo || '-') : (resultado.fondo || '-');

    // Get custom coefficients for this specific type (esquina or medial)
    const coeficientesTipo = coeficientesPersonalizados[tipo] || [];

    return `
            <${d} class="resultado-tabla-wrap">

                <h3>Detalle del lote objetivo (${tipoLabel})</h3>

                <${d} class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        <thead>
                            <tr>
                                <th>Dirección</th>
                                <th>Frente</th>
                                <th>${fondoLabel}</th>
                                <th>FOS</th>
                                <th>FOT</th>
                                <th>Valor promedio de comp.</th>
                                <th>F&C</th>
                                ${valvanoColumna}
                                <th>Ubicacion</th>
                                <th>Actualizacion</th>
                                ${coeficientesTipo.map(coef => `<th><button type="button" class="coef-eliminar-btn" data-coef-id="${coef.id}" data-tipo="${tipo}" title="Eliminar coeficiente">-</button><br><span class="coef-title">${coef.nombre}</span></th>`).join('')}
                                <th>Valor del lote</th>
                                <th>Valor por m²</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="fila-lote-tasar" style="color: #0066cc;">
                                <td><strong>${formatearDireccion(datosTasacion.ubicacion.direccion || 'Lote a tasar')}</strong></td>
                                <td><strong>${resultado.frente || '-'}</strong></td>
                                <td><strong>${fondoValor}</strong></td>
                                <td><strong>${car.fos || '-'}</strong></td>
                                <td><strong>${car.fot || '-'}</strong></td>
                                <td><strong>${formatearMoneda(resultado.valor_promedio_m2)}</strong></td>
                                <td><strong>${truncarDosDecimales(resultado.coeficiente_fitto_lote).toFixed(2)}</strong></td>
                                ${valvanoCelda}
                                <td><input type="number" class="coef-ubicacion-input" data-index="${tipo}" value="${truncarDosDecimales(resultado.coeficiente_ubicacion).toFixed(2)}" step="0.01" min="0"></td>
                                <td><input type="number" class="coef-actualizacion-input" data-index="${tipo}" value="${truncarDosDecimales(resultado.coeficiente_actualizacion).toFixed(2)}" step="0.01" min="0"></td>
                                ${coeficientesTipo.map(coef => {
                                    return `<td><input type="number" class="coef-personalizado-input" data-index="${tipo}" data-coef-id="${coef.id}" value="${coef.valor.toFixed(2)}" step="0.01" min="0"></td>`;
                                }).join('')}
                                <td><strong>${formatearMoneda(resultado.valor_final)}</strong></td>
                                <td><strong>${formatearMoneda(resultado.valor_m2)}</strong></td>
                                <td>
                                    <button type="button" class="btn-opciones-comparable" data-index="${tipo}">
                                        •••
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </${d}>

            </${d}>
    `;
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

        console.log("Coeficiente Fitto del lote objetivo devuelto por backend:", resultadoTasacion.coeficiente_fitto_lote);
        console.log("Coeficiente ubicación del lote objetivo devuelto por backend:", resultadoTasacion.coeficiente_ubicacion);
        console.log("Coeficiente actualización del lote objetivo devuelto por backend:", resultadoTasacion.coeficiente_actualizacion);

        // Ensure lot coefficients are initialized if not provided by backend
        if (!resultadoTasacion.coeficiente_fitto_lote) {
            console.warn("Backend no devolvió coeficiente_fitto_lote, usando 1.0 como fallback");
            resultadoTasacion.coeficiente_fitto_lote = 1.0;
        }
        if (!resultadoTasacion.coeficiente_ubicacion) {
            console.warn("Backend no devolvió coeficiente_ubicacion, usando 1.0 como fallback");
            resultadoTasacion.coeficiente_ubicacion = 1.0;
        }
        if (!resultadoTasacion.coeficiente_actualizacion) {
            console.warn("Backend no devolvió coeficiente_actualizacion, usando 1.0 como fallback");
            resultadoTasacion.coeficiente_actualizacion = 1.0;
        }

        console.log("Llamando a mostrarPantallaResultado()");
        console.log("Antes de llamar, pasoActual:", pasoActual);
        mostrarPantallaResultado();
        console.log("Después de llamar, pasoActual:", pasoActual);

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

        // Calcular coeficiente Fitto-Cervini para el lote a tasar
        // Usamos la misma lógica que para los comparables pero aplicada al lote a tasar
        const coefFittoLote = 1.0; // En modo demo usamos 1.0, en producción vendría del backend

        // Calcular coeficiente Valvano para esquinas
        let coeficienteValvano = 0;
        const tipoLote = datosTasacion.lote.tipoLote;
        const esEsquina = tipoLote === "Esquina" || tipoLote === "Esquina larga (+30m)" || tipoLote === "Salida a dos calles";
        const esEsquinaLarga = tipoLote === "Esquina larga (+30m)" || tipoLote === "esquina_larga";
        const esSalidaDosCalles = tipoLote === "Salida a dos calles" || tipoLote === "dos_calles";

        if (esEsquina && !esSalidaDosCalles) {
            const ladoMayorValor = car.ladoMayorValor || 'frente';
            const zona = car.zona || '1';

            // Calculate n = F/m
            const n = calcularNValvano(frente, fondo, ladoMayorValor);

            // Get Valvano coefficient
            coeficienteValvano = await obtenerCoeficienteValvano(n, zona);

            console.log(`Valvano calculation - n: ${n.toFixed(2)}, zona: ${zona}, coeficiente: ${coeficienteValvano}`);
        }

        // Coeficientes del lote a tasar (ubicación y actualización)
        const coefUbicacionLote = 1.0; // Default, se puede modificar en la UI
        const coefActualizacionLote = 1.0; // Default, se puede modificar en la UI

        // Para salida a dos calles, no se usa coeficiente Fitto-Cervini
        const coefFittoLoteFinal = esSalidaDosCalles ? 1.0 : coefFittoLote;

        // Generar resultado simulado
        if (esEsquinaLarga) {
            // Dividir en esquina y medial para esquina larga (+30m)
            console.log("Modo demo: Detectado esquina larga, dividiendo en esquina y medial");

            let frente_esquina, fondo_esquina, frente_medial, fondo_medial;

            if (fondo > 30) {
                // El fondo excede, se tasa esquina hasta 30m de fondo
                frente_esquina = frente;
                fondo_esquina = 30;
                frente_medial = fondo - 30;
                fondo_medial = frente;
            } else if (frente > 30) {
                // El frente excede, se tasa esquina hasta 30m de frente
                frente_esquina = 30;
                fondo_esquina = fondo;
                frente_medial = frente - 30;
                fondo_medial = fondo;
            } else {
                // Ningún lado excede 30m, tratar como esquina normal
                frente_esquina = frente;
                fondo_esquina = fondo;
                frente_medial = 0;
                fondo_medial = 0;
            }

            const superficie_esquina = frente_esquina * fondo_esquina;
            const superficie_medial = frente_medial * fondo_medial;

            // Calcular Valvano para esquina
            let coef_valvano_esquina = 0;
            const ladoMayorValor = car.ladoMayorValor || 'frente';
            const zona = car.zona || '1';
            const n_esquina = calcularNValvano(frente_esquina, fondo_esquina, ladoMayorValor);
            coef_valvano_esquina = await obtenerCoeficienteValvano(n_esquina, zona);

            // Valores para esquina
            const valor_inicial_esquina = valorPromedioHomogeneizado * superficie_esquina;
            const coeficienteValvanoTotal_esquina = coef_valvano_esquina > 0 ? coef_valvano_esquina + 1 : 1;
            const valor_esquina = valor_inicial_esquina * coeficienteValvanoTotal_esquina;

            // Valores para medial
            const valor_inicial_medial = valorPromedioHomogeneizado * superficie_medial;
            const valor_medial = valor_inicial_medial;

            const superficie_total = superficie_esquina + superficie_medial;
            const valor_final_total = valor_esquina + valor_medial;
            const valor_m2_total = valor_final_total / superficie_total;

            resultadoTasacion = {
                valor_final: valor_final_total,
                valor_m2: valor_m2_total,
                superficie: superficie_total,
                coeficiente_fitto_lote: 1.0,
                coeficiente_valvano: 0,
                coeficiente_ubicacion: coefUbicacionLote,
                coeficiente_actualizacion: coefActualizacionLote,
                valor_promedio_homogeneizado: valorPromedioHomogeneizado,
                comparables: comparablesHomogeneizados,
                resultado_esquina: {
                    direccion: datosTasacion.ubicacion.direccion,
                    tipologia: "Esquina",
                    frente: frente_esquina,
                    fondo: fondo_esquina,
                    superficie: superficie_esquina,
                    valor_promedio_m2: valorPromedioHomogeneizado,
                    valor_final: valor_esquina,
                    valor_m2: valor_esquina / superficie_esquina,
                    coeficiente_fitto_lote: 1.0,
                    coeficiente_ubicacion: 1.0,
                    coeficiente_actualizacion: 1.0,
                    extras: { coef_valvano: coef_valvano_esquina }
                },
                resultado_medial: {
                    direccion: datosTasacion.ubicacion.direccion,
                    tipologia: "Medial",
                    frente: frente_medial,
                    fondo: fondo_medial,
                    superficie: superficie_medial,
                    valor_promedio_m2: valorPromedioHomogeneizado,
                    valor_final: valor_medial,
                    valor_m2: valor_medial / superficie_medial,
                    coeficiente_fitto_lote: 1.0,
                    coeficiente_ubicacion: 1.0,
                    coeficiente_actualizacion: 1.0,
                    extras: {}
                }
            };
        } else {
            // Calcular valor inicial del lote a tasar:
            // valor inicial = valor promedio homogeneizado × superficie
            const valorInicial = valorPromedioHomogeneizado * superficie;

            // Calcular valor final del lote a tasar:
            // valor final = valor inicial × coeficiente Fitto-Cervini × coeficiente Valvano × coeficiente ubicación × coeficiente actualización
            const coeficienteValvanoTotal = coeficienteValvano > 0 ? coeficienteValvano + 1 : 1;
            const valorFinalLote = valorInicial * coefFittoLote * coeficienteValvanoTotal * coefUbicacionLote * coefActualizacionLote;

            // Calcular valor por m² del lote a tasar:
            const valorM2Lote = valorFinalLote / superficie;

            resultadoTasacion = {
                valor_final: valorFinalLote,
                valor_m2: valorM2Lote,
                superficie: superficie,
                coeficiente_fitto_lote: esSalidaDosCalles ? null : coefFittoLoteFinal,
                coeficiente_valvano: coeficienteValvano,
                coeficiente_ubicacion: coefUbicacionLote,
                coeficiente_actualizacion: coefActualizacionLote,
                valor_promedio_homogeneizado: valorPromedioHomogeneizado,
                comparables: comparablesHomogeneizados
            };
        }

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
    console.log("=== INICIO mostrarPantallaResultado ===");
    console.log("pasoActual antes:", pasoActual);
    console.log("datosTasacion.tipo:", datosTasacion.tipo);

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
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    cerrarModalComparables();

    const contenido = getContenidoTasacion();
    console.log("Elemento contenido encontrado:", contenido);
    console.log("Tipo de inmueble:", tipo);
    console.log("Paso actual antes de actualizar:", pasoActual);
    
    if (!contenido) {
        console.error("No se encontró el contenido de tasación");
        return;
    }
    
    console.log("Actualizando contenido de pantalla de resultado, elemento encontrado:", contenido);

    const r = resultadoTasacion;

    console.log("resultadoTasacion:", r);

    if (!r) {
        console.error("resultadoTasacion es null o undefined, no se puede mostrar la pantalla de resultado");
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
    const valorTotalLote = r.valor_final || 0;
    // Calcular valor por m² directamente como valor final dividido por superficie
    const valorM2Lote = superficie > 0 ? valorTotalLote / superficie : 0;
    const coefFittoLote = r.coeficiente_fitto_lote || 1.0;
    const coefValvano = (r.extras && r.extras.coef_valvano) || 0;
    const coefUbicacionLote = r.coeficiente_ubicacion || 1.0;
    const coefActualizacionLote = r.coeficiente_actualizacion || 1.0;

    // Get all unique custom coefficient names for comparables (cumulative)
    const todosCoeficientesComparables = [];
    Object.keys(coeficientesPersonalizados).forEach(index => {
        if (index !== 'lote' && index !== 'esquina' && index !== 'medial') { // Exclude lot, esquina, and medial coefficients
            const coefs = coeficientesPersonalizados[index];
            coefs.forEach(coef => {
                if (!todosCoeficientesComparables.find(c => c.id === coef.id)) {
                    todosCoeficientesComparables.push(coef);
                }
            });
        }
    });

    // Get custom coefficients for lot to be appraised
    const coeficientesLote = coeficientesPersonalizados['lote'] || [];

    // Calculate average of homogenized m2 values
    const valorPromedio = r.comparables && r.comparables.length > 0
        ? r.comparables.reduce((sum, c) => sum + c.valor_m2_homogeneizado, 0) / r.comparables.length
        : 0;

    // Check if lot is corner lot to add Valvano column
    const tipoLote = datosTasacion.lote.tipoLote;
    const esEsquina = tipoLote === "Esquina" || tipoLote === "Esquina larga (+30m)" || tipoLote === "Salida a dos calles";
    const esEsquinaLarga = tipoLote === "Esquina larga (+30m)" || tipoLote === "esquina_larga";
    const esIrregular = tipoLote === "Irregular";
    const esSalidaDosCalles = tipoLote === "Salida a dos calles" || tipoLote === "dos_calles";

    // For irregular lots, use fondo ficticio instead of fondo
    const fondoLabel = esIrregular ? 'Fondo Ficticio' : 'Fondo';
    const fondoValor = esIrregular ? (car.fondoFicticio || fondo || '-') : (fondo || '-');
    const fcValor = (esSalidaDosCalles || r.coeficiente_fitto_lote === null) ? '-' : coefFittoLote.toFixed(2);
    const fcDisabled = (esSalidaDosCalles || r.coeficiente_fitto_lote === null) ? 'disabled' : '';

    const filaLoteTasar = `
        <tr class="fila-lote-tasar" style="color: #0066cc;">
            <td><strong>${formatearDireccion(datosTasacion.ubicacion.direccion || 'Lote a tasar')}</strong></td>
            <td><strong>${frente}</strong></td>
            <td><strong>${fondoValor}</strong></td>
            <td><strong>${car.fos || '-'}</strong></td>
            <td><strong>${car.fot || '-'}</strong></td>
            <td><strong>${formatearMoneda(valorPromedio)}</strong></td>
            <td><strong>${fcValor}</strong></td>
            ${esEsquina ? `<td><strong>${coefValvano > 0 ? coefValvano.toFixed(2) : '-'}</strong></td>` : ''}
            <td><input type="number" class="coef-ubicacion-input" data-index="lote" value="${coefUbicacionLote.toFixed(2)}" step="0.01" min="0"></td>
            <td><input type="number" class="coef-actualizacion-input" data-index="lote" value="${coefActualizacionLote.toFixed(2)}" step="0.01" min="0"></td>
            ${coeficientesLote.map(coef => {
                return `<td><input type="number" class="coef-personalizado-input" data-index="lote" data-coef-id="${coef.id}" value="${coef.valor.toFixed(2)}" step="0.01" min="0"></td>`;
            }).join('')}
            <td><strong>${formatearMoneda(valorTotalLote)}</strong></td>
            <td><strong>${formatearMoneda(valorM2Lote)}</strong></td>
            <td>
                <button type="button" class="btn-opciones-comparable" data-index="lote">
                    •••
                </button>
            </td>
        </tr>
    `;

    const filasComp = (r.comparables || [])
        .map((c, index) => {
            // Use stored coefficient values if available, otherwise default to 1.00
            const coefUbicacion = c.coef_ubicacion || 1;
            const coefActualizacion = c.coef_actualizacion || 1;
            
            // Generate cells for all custom coefficients
            const celdasCoefPersonalizados = todosCoeficientesComparables.map(coef => {
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
            <td><input type="number" class="coef-actualizacion-input" data-index="${index}" value="${coefActualizacion.toFixed(2)}" step="0.01" min="0"></td>
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

    const d = "div";

    console.log("Generando HTML de pantalla de resultado...");
    
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
                                <th>F&C</th>
                                <th>Ubicacion</th>
                                <th>Actualización</th>
                                ${todosCoeficientesComparables.map(coef => `<th><button type="button" class="coef-eliminar-btn" data-coef-id="${coef.id}" title="Eliminar coeficiente">-</button><br><span class="coef-title">${coef.nombre}</span></th>`).join('')}
                                <th>Valor por m² homogeneizado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${filasComp}</tbody>
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
                                ${todosCoeficientesComparables.map(() => `<td></td>`).join('')}
                                <td><strong>${formatearMoneda(valorPromedio)}</strong></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </${d}>

            </${d}>

            ${!esEsquinaLarga && !esSalidaDosCalles ? `
            <${d} class="resultado-tabla-wrap">

                <h3>Detalle ${tipo === 'lote' ? 'del lote' : tipo === 'casa' ? 'de la casa' : 'del departamento/ph'} objetivo</h3>

                <${d} class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        <thead>
                            <tr>
                                <th>Dirección</th>
                                <th>Frente</th>
                                <th>${fondoLabel}</th>
                                <th>FOS</th>
                                <th>FOT</th>
                                <th>Valor promedio de comp.</th>
                                <th>F&C</th>
                                ${esEsquina ? '<th>Valvano</th>' : ''}
                                <th>Ubicacion</th>
                                <th>Actualización</th>
                                ${coeficientesLote.map(coef => `<th><button type="button" class="coef-eliminar-btn" data-coef-id="${coef.id}" data-tipo="lote" title="Eliminar coeficiente">-</button><br><span class="coef-title">${coef.nombre}</span></th>`).join('')}
                                <th>Valor del lote</th>
                                <th>Valor por m²</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${filaLoteTasar}</tbody>
                    </table>
                </${d}>

            </${d}>
            ` : ''}

            ${esEsquinaLarga && r.resultado_esquina && r.resultado_medial ? `
            ${generarCuadroDetalleLote(r.resultado_esquina, 'esquina', datosTasacion, car, true, d)}
            ${generarCuadroDetalleLote(r.resultado_medial, 'medial', datosTasacion, car, false, d)}
            ` : ''}

            ${esSalidaDosCalles ? `
            ${generarCuadroDetalleLote(r, 'lote', datosTasacion, car, false, d, esIrregular)}
            ` : ''}

            <button type="button" class="btn-recalcular" id="btnRecalcular" disabled>
                Recalcular
            </button>

        </${d}>
    `;
    
    console.log("Contenido de pantalla de resultado actualizado, pasoActual:", pasoActual);
    console.log("Longitud del contenido HTML:", contenido.innerHTML.length);
    console.log("Contenido actual del elemento:", contenido.innerHTML.substring(0, 200) + "...");

    // Function to check coefficient threshold and apply yellow background
    function actualizarColorFondoCoeficiente(input) {
        const valor = parseFloat(input.value) || 1;
        if (valor >= 1.30 || valor <= 0.70) {
            input.classList.add('coeficiente-umbral-excedido');
        } else {
            input.classList.remove('coeficiente-umbral-excedido');
        }
    }

    // Add event listeners for coeficiente inputs
    document.querySelectorAll(".coef-ubicacion-input, .coef-actualizacion-input, .coef-personalizado-input").forEach(input => {
        // Check initial value
        actualizarColorFondoCoeficiente(input);

        input.addEventListener("input", () => {
            const btnRecalcular = document.getElementById("btnRecalcular");
            if (btnRecalcular) {
                btnRecalcular.disabled = false;
            }
            // Update background color based on value
            actualizarColorFondoCoeficiente(input);
        });

        // Add blur listener for coef-personalizado-input to save changes
        if (input.classList.contains('coef-personalizado-input')) {
            input.addEventListener("blur", () => {
                const index = input.dataset.index;
                const coefId = input.dataset.coefId;
                const valor = parseFloat(input.value) || 1;

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
                    const coefDef = todosCoeficientes.find(c => c.id === coefId);
                    coeficientesPersonalizados[index].push({
                        id: coefId,
                        nombre: coefDef ? coefDef.nombre : 'Coeficiente',
                        valor: valor
                    });
                }
            });
        }
    });

    // Add event listeners for '+' buttons (custom coefficient)
    document.querySelectorAll(".coef-mas-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            const coefId = e.target.dataset.coefId;
            const cell = e.target.parentElement;

            // Find the coefficient definition to get the name
            const coefDef = todosCoeficientesComparables.find(c => c.id === coefId);

            // Replace the button with an input field
            cell.innerHTML = `<input type="number" class="coef-personalizado-input" data-index="${index}" data-coef-id="${coefId}" value="1.00" step="0.01" min="0">`;

            // Add event listener to the new input
            const newInput = cell.querySelector('.coef-personalizado-input');

            // Check initial value
            actualizarColorFondoCoeficiente(newInput);

            newInput.addEventListener("input", () => {
                const btnRecalcular = document.getElementById("btnRecalcular");
                if (btnRecalcular) {
                    btnRecalcular.disabled = false;
                }
                // Update background color based on value
                actualizarColorFondoCoeficiente(newInput);
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
            const index = e.target.dataset.index;
            // Handle both numeric indices (comparables) and 'lote' (lot to be appraised)
            const indexNum = index === 'lote' ? 'lote' : parseInt(index);
            mostrarMenuOpcionesComparable(indexNum, e.target);
        });
    });

    // Add event listeners for eliminar coefficient buttons (unified for comparables and lot/esquina/medial)
    document.querySelectorAll(".coef-eliminar-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const coefId = e.target.dataset.coefId;
            const tipo = e.target.dataset.tipo;

            if (tipo) {
                // It's a lot/esquina/medial coefficient
                const tipoLabel = tipo === 'lote' ? 'lote objetivo' : tipo;
                if (confirm(`¿Estás seguro de eliminar el coeficiente del ${tipoLabel}?`)) {
                    if (coeficientesPersonalizados[tipo]) {
                        coeficientesPersonalizados[tipo] = coeficientesPersonalizados[tipo].filter(c => c.id !== coefId);
                    }
                    mostrarPantallaResultado();
                }
            } else {
                // It's a comparable coefficient
                if (confirm(`¿Estás seguro de eliminar el coeficiente "${coefId}" de todos los comparables?`)) {
                    Object.keys(coeficientesPersonalizados).forEach(index => {
                        if (index !== 'lote' && index !== 'esquina' && index !== 'medial') {
                            const indexNum = parseInt(index);
                            coeficientesPersonalizados[indexNum] = coeficientesPersonalizados[indexNum].filter(c => c.id !== coefId);
                        }
                    });
                    mostrarPantallaResultado();
                }
            }
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

    // Re-initialize buttons to ensure proper event handling
    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}
