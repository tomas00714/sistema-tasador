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
    
    // For lot, departamento, casa, esquina, and medial (target rows), only show "Agregar coeficiente"
    if (index === 'lote' || index === 'esquina' || index === 'medial' || index === 'departamento' || index === 'casa') {
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
            // Handle numeric indices (comparables) and target indices (lote, esquina, medial, departamento, casa)
            const esObjetivo = indexStr === 'lote' || indexStr === 'esquina' || indexStr === 'medial' || indexStr === 'departamento' || indexStr === 'casa';
            const indexNum = esObjetivo ? indexStr : parseInt(indexStr);
            
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

        // Re-calculate and re-render according to property type
        const tipo = datosTasacion?.tipo;
        if (tipo === 'departamento') {
            if (typeof recalcularConCoeficientesDepartamento === 'function') recalcularConCoeficientesDepartamento();
            if (typeof mostrarPantallaResultado === 'function') mostrarPantallaResultado(false);
        } else if (tipo === 'casa') {
            if (typeof recalcularConCoeficientesCasa === 'function') recalcularConCoeficientesCasa();
            if (typeof mostrarPantallaResultado === 'function') mostrarPantallaResultado(false);
        } else {
            recalcularConCoeficientes();
        }
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
    // Collect all coefficient values from the unified structure
    const coeficientes = {};

    // Get all coefficients (ubicacion, actualizacion, and custom) from the unified structure
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
            const coefAct = coef.actualizacion || 1;

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
        });

        // Recalculate average
        const valorPromedio = r.comparables.reduce((sum, c) => sum + c.valor_m2_homogeneizado, 0) / r.comparables.length;

        // ESQUINA LARGA: recalcular cada bloque con sus propios coeficientes
        if (r.resultado_esquina && r.resultado_medial) {
            // Sincronizar los comparables de cada bloque con el top-level para reflejar coeficientes editados
            r.resultado_esquina.comparables = r.comparables;
            r.resultado_esquina.valor_promedio_m2 = valorPromedio;
            r.resultado_medial.comparables = r.comparables;
            r.resultado_medial.valor_promedio_m2 = valorPromedio;
            const productoCoeficientes = (coefObj) => {
                let total = 1;
                if (coefObj && coefObj.personalizados) {
                    Object.values(coefObj.personalizados).forEach(val => {
                        const num = parseFloat(val);
                        if (!isNaN(num) && isFinite(num)) {
                            total *= num;
                        }
                    });
                }
                return total;
            };

            const valvanoTotal = (res) => {
                const v = parseFloat(res?.extras?.coef_valvano);
                if (isNaN(v) || v === 0) return 1;
                // Backend: coef_valvano ya viene como multiplicador (>=1)
                // Frontend demo: viene como porcentaje (0.15 => multiplicador 1.15)
                return v >= 1 ? v : (1 + v);
            };

            const recalcularBloque = (bloque, key) => {
                const coefBloque = coeficientes[key] || {};
                const totalCoef = productoCoeficientes(coefBloque);
                const fitto = bloque.coeficiente_fitto_lote || 1;
                const valvano = key === 'esquina' ? valvanoTotal(bloque) : 1;
                const superficie = parseFloat(bloque.superficie) || 0;
                const valorFinal = valorPromedio * superficie * fitto * valvano * totalCoef;
                bloque.valor_final = valorFinal;
                bloque.valor_m2 = superficie > 0 ? valorFinal / superficie : 0;
                bloque.valor_m2_homogeneizado = bloque.valor_m2;
            };

            recalcularBloque(r.resultado_esquina, 'esquina');
            recalcularBloque(r.resultado_medial, 'medial');

            const totalFinal = r.resultado_esquina.valor_final + r.resultado_medial.valor_final;
            const totalSuperficie = (parseFloat(r.resultado_esquina.superficie) || 0) + (parseFloat(r.resultado_medial.superficie) || 0);

            r.valor_final = totalFinal;
            r.valor_m2 = totalSuperficie > 0 ? totalFinal / totalSuperficie : 0;
            r.valor_promedio_homogeneizado = valorPromedio;
        } else {
            // Get lot coefficients from DOM (index 'lote')
            const coefLote = coeficientes['lote'] || {};
            const coefUbicacionLote = coefLote.ubicacion || 1;
            const coefActualizacionLote = coefLote.actualizacion || 1;

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
            const valorM2Lote = superficie > 0 ? valorFinalLote / superficie : 0;

            r.valor_m2 = valorM2Lote;
            r.valor_final = valorFinalLote;
            r.coeficiente_valvano = coeficienteValvano;
            r.coeficiente_ubicacion = coefUbicacionLote;
            r.coeficiente_actualizacion = coefActualizacionLote;
            r.valor_promedio_homogeneizado = valorPromedio;
        }

        // Update the display without recalculating (to avoid infinite loop)
        mostrarPantallaResultado(false);
    }
}

function recalcularConCoeficientesDepartamento() {
    const r = resultadoTasacion;
    if (!r || !r.comparables || r.comparables.length === 0) return;

    // Recopilar coeficientes de comparables y del objetivo
    const coeficientes = {};
    Object.keys(coeficientesPersonalizados).forEach(index => {
        coeficientes[index] = coeficientes[index] || {};
        coeficientes[index].personalizados = {};
        coeficientesPersonalizados[index].forEach(coef => {
            if (coef.id === 'ubicacion') {
                coeficientes[index].ubicacion = parseFloat(coef.valor) || 1;
            } else if (coef.id === 'actividad') {
                coeficientes[index].actividad = parseFloat(coef.valor) || 1;
            } else {
                coeficientes[index].personalizados[coef.id] = parseFloat(coef.valor) || 1;
            }
        });
    });

    // Recalcular valores homogeneizados de comparables
    r.comparables.forEach((c, index) => {
        const indexStr = index.toString();
        const coef = coeficientes[indexStr] || {};

        let coefPersonalizadoTotal = 1;
        if (coef.personalizados) {
            Object.values(coef.personalizados).forEach(val => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                    coefPersonalizadoTotal *= num;
                }
            });
        }

        // Incluir coeficientes específicos de departamento (coerción numérica)
        const coefUbicacionPlanta = parseFloat(c.ubicacionPlanta) || 1;
        const coefUbicacionPiso = parseFloat(c.ubicacionPiso) || 1;
        const coefCaracteristicaConstructiva = parseFloat(c.caracteristicaConstructiva) || 1;
        const coefSuperficieCubierta = parseFloat(c.superficieCubierta) || 1;

        // Incluir coeficientes fijos editables
        const coefUbicacion = parseFloat(coef.ubicacion) || 1;
        const coefActividad = parseFloat(coef.actividad) || 1;

        // Fórmula completa: valor_m2 / (todos los coeficientes)
        const valorM2Original = (Number(c.valor) || 0) / (Number(c.superficie) || 1);
        const coeficienteTotal = coefUbicacionPlanta * coefUbicacionPiso * coefCaracteristicaConstructiva * coefSuperficieCubierta * coefUbicacion * coefActividad * coefPersonalizadoTotal;
        c.valor_m2_homogeneizado = valorM2Original / (coeficienteTotal || 1);
    });

    // Recalcular valor promedio
    const valorPromedio = r.comparables.reduce((sum, c) => sum + (Number(c.valor_m2_homogeneizado) || 0), 0) / r.comparables.length;

    // Coeficientes del objetivo (departamento a tasar)
    const depto = datosTasacion.departamento || {};
    const coefObjetivo = coeficientes['departamento'] || {};

    const targetUbicacion = parseFloat(coefObjetivo.ubicacion) || 1;
    const targetActividad = parseFloat(coefObjetivo.actividad) || 1;
    let targetPersonalizadoTotal = 1;
    if (coefObjetivo.personalizados) {
        Object.values(coefObjetivo.personalizados).forEach(val => {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
                targetPersonalizadoTotal *= num;
            }
        });
    }

    const targetUbicacionPlanta = parseFloat(depto.ubicacionPlantaCoef) || parseFloat(depto.ubicacionPlanta) || 1;
    const targetUbicacionPiso = parseFloat(depto.ubicacionPisoCoef) || parseFloat(depto.ubicacionPiso) || 1;
    const targetCaracteristicaConstructiva = parseFloat(depto.caracteristicaConstructivaCoef) || parseFloat(depto.caracteristicaConstructiva) || 1;
    const targetSuperficieCubierta = parseFloat(depto.superficieCubiertaCoef) || parseFloat(depto.superficieCubierta) || 1;

    const k = parseFloat(r.rossHeidecke || depto.rossHeidecke || 0);
    const targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;

    const targetCoefTotal = targetUbicacionPlanta * targetUbicacionPiso * targetCaracteristicaConstructiva * targetSuperficieCubierta * targetUbicacion * targetActividad * targetPersonalizadoTotal * targetRossHeidecke;

    // Recalcular valor final
    const hom = depto.homogeneizacion || {};
    const superficieHomogeneizada = parseFloat(hom.totalHomogeneizada) || 0;

    r.valor_m2 = valorPromedio * targetCoefTotal;
    r.valor_final = r.valor_m2 * superficieHomogeneizada;
    r.valor_promedio_homogeneizado = valorPromedio;

    // El renderizado queda a cargo del llamador (mostrarPantallaResultado o reactive-coefficients)
}

function recalcularConCoeficientesCasa() {
    const r = resultadoTasacion;
    if (!r || !r.comparables) return;

    // Similar a departamento, adaptado a casa
    const coeficientes = {};
    Object.keys(coeficientesPersonalizados).forEach(index => {
        if (index === 'lote' || index === 'esquina' || index === 'medial') return;
        coeficientes[index] = coeficientes[index] || {};
        coeficientes[index].personalizados = {};
        coeficientes[index].ubicacion = 1;
        coeficientes[index].actualizacion = 1;
        coeficientesPersonalizados[index].forEach(coef => {
            const val = parseFloat(coef.valor) || 1;
            if (coef.id === 'ubicacion') {
                coeficientes[index].ubicacion = val;
            } else if (coef.id === 'actualizacion') {
                coeficientes[index].actualizacion = val;
            } else {
                coeficientes[index].personalizados[coef.id] = val;
            }
        });
    });

    // Recalcular valores homogeneizados de comparables
    r.comparables.forEach((c, index) => {
        const indexStr = index.toString();
        const coef = coeficientes[indexStr] || {};
        
        let coefPersonalizadoTotal = 1;
        if (coef.personalizados) {
            Object.values(coef.personalizados).forEach(val => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                    coefPersonalizadoTotal *= num;
                }
            });
        }
        
        // Incluir coeficientes fijos de casa
        const coefUbicacion = parseFloat(coef.ubicacion) || 1;
        const coefActualizacion = parseFloat(coef.actualizacion) || 1;

        // Coeficientes propios de la casa
        const compSuperficieCubierta = parseFloat(c.superficieCubiertaCoef) || 1;
        const compSuperficieTotal = parseFloat(c.superficieTotalCoef) || 1;
        const compCalidadConstruccion = parseFloat(c.calidadConstruccionCoef) || 1;
        const compEstadoConservacion = parseFloat(c.estadoConservacionCoef) || _coeficienteEstadoCasa(c.estadoConservacion, c.antiguedad);
        
        // Fórmula completa: valor_m2 / (todos los coeficientes)
        const valorM2Original = (Number(c.valor) || 0) / (Number(c.superficie) || 1);
        const coeficienteTotal = compSuperficieCubierta * compSuperficieTotal * compCalidadConstruccion * compEstadoConservacion * coefUbicacion * coefActualizacion * coefPersonalizadoTotal;
        c.valor_m2_homogeneizado = valorM2Original / (coeficienteTotal || 1);
    });

    // Recalcular valor promedio
    const valorPromedio = r.comparables.reduce((sum, c) => sum + (Number(c.valor_m2_homogeneizado) || 0), 0) / r.comparables.length;
    
    // Coeficientes y superficie del objetivo (casa a tasar)
    const casa = datosTasacion.casa || {};
    const hom = casa.homogeneizacion || {};
    const totalHomo = parseFloat(hom.totalHomogeneizada) || 0;

    let superficieHomogeneizada = 0;
    let incluirSuperficieCubiertaEnCoef = false;
    if (totalHomo > 0) {
        superficieHomogeneizada = totalHomo;
        incluirSuperficieCubiertaEnCoef = true;
    } else {
        const rango = (casa.superficieCubierta || "").match(/\d+/g);
        const coef = parseFloat(casa.superficieCubiertaCoef) || 1;
        if (rango) {
            superficieHomogeneizada = rango.reduce((sum, val) => sum + parseInt(val), 0) / rango.length * coef;
        }
    }

    const coefObjetivo = coeficientes['casa'] || {};
    const targetUbicacion = parseFloat(coefObjetivo.ubicacion) || 1;
    const targetActualizacion = parseFloat(coefObjetivo.actualizacion) || 1;
    let targetPersonalizadoTotal = 1;
    if (coefObjetivo.personalizados) {
        Object.values(coefObjetivo.personalizados).forEach(val => {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
                targetPersonalizadoTotal *= num;
            }
        });
    }

    const targetSuperficieCubierta = incluirSuperficieCubiertaEnCoef ? (parseFloat(casa.superficieCubiertaCoef) || 1) : 1;
    const targetSuperficieTotal = parseFloat(casa.superficieTotalCoef) || 1;
    const targetCalidadConstruccion = parseFloat(casa.calidadConstruccionCoef) || 1;
    const targetRossHeidecke = _coeficienteEstadoCasa(casa.estadoConservacion, casa.antiguedad);

    const targetCoefTotal = targetSuperficieCubierta * targetSuperficieTotal * targetCalidadConstruccion * targetRossHeidecke * targetUbicacion * targetActualizacion * targetPersonalizadoTotal;

    r.valor_m2 = valorPromedio * targetCoefTotal;
    r.valor_final = r.valor_m2 * superficieHomogeneizada;
    r.valor_promedio_homogeneizado = valorPromedio;

    // El renderizado lo realiza el llamador
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
    // c ya es un objeto completo (de memoria), no necesitamos obtener por ID
    const comparable = c;
    if (!comparable) return null;

    if (comparable.fuente === "manual" || comparable.fuente === "de_tasacion" || comparable.fuente === "deTasacion" || comparable.fuente === "compartido") {
        // Evitar que frente llegue null al endpoint (TasacionLoteRequest lo requiere como float)
        const frente = comparable.frente ?? comparable.lote?.caracteristicas?.frente ?? 0;
        const superficie = comparable.superficie ?? comparable.lote?.caracteristicas?.superficie ?? null;
        const fondo = comparable.fondo ?? comparable.lote?.caracteristicas?.fondo ?? null;
        const tipoLote = comparable.tipoLote || comparable.lote?.tipoLote || '';

        return {
            direccion: comparable.ubicacion?.direccion || comparable.direccion || "Sin dirección",
            valor_total: comparable.valor,
            tipo_valor: comparable.tipoValor,
            frente: frente,
            fondo: fondo,
            superficie: superficie,
            tipologia: normalizarTipologiaApi(tipoLote),
            ajuste_manual_porcentaje: 0
        };
    }

    // Para compatibilidad con datos antiguos que tengan snapshot
    const snap = comparable.snapshot || {};
    const car = snap.lote?.caracteristicas || {};
    const frente = parseFloat(car.frente) || 0;
    const fondo = car.fondo ? parseFloat(car.fondo) : null;
    let superficie = parseFloat(car.superficie) || 0;

    if (!superficie && frente && fondo) {
        superficie = frente * fondo;
    }

    const valorTotal =
        comparable.valor ||
        snap.resultado?.valor_final ||
        0;

    // Get direccion from snapshot - the snapshot contains the full tasacion object
    // which has ubicacion.direccion at the top level
    const direccion = snap.ubicacion?.direccion || "Sin dirección";

    return {
        direccion: direccion,
        valor_total: valorTotal,
        tipo_valor: comparable.tipoValor || "venta",
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
            datosTasacion.comparables
                .filter(c => c !== null)
                .map(mapearComparableApi)
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

    // Initialize fixed coefficients for this type
    inicializarCoeficientesFijos(tipo);

    // Get custom coefficients for this specific type (esquina or medial), excluding ubicacion and actualizacion
    const coeficientesTipo = (coeficientesPersonalizados[tipo] || []).filter(c => c.id !== 'ubicacion' && c.id !== 'actualizacion');

    // Get ubicacion and actualizacion from unified structure
    const coefUbicacion = coeficientesPersonalizados[tipo]?.find(c => c.id === 'ubicacion')?.valor || 1.0;
    const coefActualizacion = coeficientesPersonalizados[tipo]?.find(c => c.id === 'actualizacion')?.valor || 1.0;

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
                                <td><input type="number" class="coef-ubicacion-input" data-index="${tipo}" value="${truncarDosDecimales(coefUbicacion).toFixed(2)}" step="0.01" min="0"></td>
                                <td><input type="number" class="coef-actualizacion-input" data-index="${tipo}" value="${truncarDosDecimales(coefActualizacion).toFixed(2)}" step="0.01" min="0"></td>
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
        // Usar comparables directamente de memoria (ya son objetos completos)
        const comparablesObjetos = datosTasacion.comparables.filter(c => c !== null);
        
        const comparablesHomogeneizados = comparablesObjetos.map(c => {
            const sup = c.superficie || superficie;
            const frenteComp = c.frente || 0;
            const fondoComp = c.fondo || (sup / frenteComp) || 0;

            // Calcular valor m2 del comparable
            const valorM2 = c.valor / sup;

            // Simular coeficiente Fitto-Cervini (en modo demo usamos null para indicar que no hay valor real)
            // En producción esto vendría del backend
            const coefFittoComp = null;
            const coefFittoObj = null;

            // Calcular valor base y homogeneizado (sin coeficientes en modo demo)
            const valorBase = valorM2;
            const valorHomogeneizado = valorBase;

            // Simular coeficiente de tipología (en modo demo usamos null)
            const coefTipologia = null;
            const valorFinal = valorHomogeneizado;

            return {
                direccion: c.ubicacion?.direccion || c.direccion || "Sin dirección",
                valor_lote: c.valor,
                valor_m2: valorM2,
                frente: frenteComp,
                fondo: fondoComp,
                fos: null,
                fot: null,
                coef_fitto_relacion: coefFittoComp,
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
// Ubicacion and actualizacion are treated as fixed coefficients with IDs "ubicacion" and "actualizacion"
let coeficientesPersonalizados = {};
let coeficienteIdCounter = 0;

// Ensure ubicacion and actualizacion coefficients exist for a given index
function inicializarCoeficientesFijos(index) {
    if (!coeficientesPersonalizados[index]) {
        coeficientesPersonalizados[index] = [];
    }

    // Ensure ubicacion coefficient exists
    if (!coeficientesPersonalizados[index].find(c => c.id === 'ubicacion')) {
        coeficientesPersonalizados[index].push({
            id: 'ubicacion',
            nombre: 'Ubicación',
            valor: 1.0
        });
    }

    // Ensure actualizacion coefficient exists
    if (!coeficientesPersonalizados[index].find(c => c.id === 'actualizacion')) {
        coeficientesPersonalizados[index].push({
            id: 'actualizacion',
            nombre: 'Actualización',
            valor: 1.0
        });
    }
}

async function mostrarPantallaResultado(recalcular = true) {
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
    
    if (!contenido) {
        console.error("No se encontró el contenido de tasación");
        return;
    }

    const r = resultadoTasacion;
    if (!r) {
        console.error("resultadoTasacion es null o undefined, no se puede mostrar la pantalla de resultado");
        return;
    }

    // DIAGNOSTICO: datos reales que recibe la pantalla de resultados
    console.log('=== DIAGNOSTICO mostrarPantallaResultado ===');
    console.log('TIPO:', tipo);
    console.log('RESULTADO TASACION (completo):', diagnosticStringify(r));
    console.log('DATOS TASACION (completo):', diagnosticStringify(datosTasacion));
    console.log('COMPARABLES SIN NORMALIZAR:', diagnosticStringify(r.comparables));
    console.log('COEFICIENTES PERSONALIZADOS:', diagnosticStringify(coeficientesPersonalizados));

    // Usar ResultadosRenderer para normalizar comparables antes de cualquier recalculo
    const renderer = new ResultadosRenderer(contenido, r, tipo);

    // Recalcular si se solicita. Para departamento y casa se recalcula siempre en la carga inicial
    // para evitar mostrar NaN proveniente del backend y aplicar los coeficientes configurados.
    if (recalcular) {
        const tieneCoeficientes = coeficientesPersonalizados && Object.keys(coeficientesPersonalizados).length > 0;
        if (tipo === 'lote' && tieneCoeficientes && typeof recalcularConCoeficientes === 'function') {
            await recalcularConCoeficientes();
        } else if (tipo === 'departamento' && typeof recalcularConCoeficientesDepartamento === 'function') {
            await recalcularConCoeficientesDepartamento();
        } else if (tipo === 'casa' && typeof recalcularConCoeficientesCasa === 'function') {
            await recalcularConCoeficientesCasa();
        }
    }

    renderer.renderizar();
}

function _calcularSuperficieHomogeneizadaCasa() {
    const hom = datosTasacion.casa?.homogeneizacion;
    if (hom && hom.totalHomogeneizada > 0) {
        return hom.totalHomogeneizada;
    }

    const superficieCubierta = datosTasacion.casa?.superficieCubierta || "";
    const coeficiente = datosTasacion.casa?.superficieCubiertaCoef || 1;
    const rango = superficieCubierta.match(/\d+/g);
    if (!rango) return 0;
    const valorMedio = rango.reduce((sum, val) => sum + parseInt(val), 0) / rango.length;
    return valorMedio * coeficiente;
}

function armarPayloadTasacion(tipo) {
    const inmueble = JSON.parse(JSON.stringify(datosTasacion[tipo] || {}));

    // Para casa, asegurar una superficie homogeneizada numérica
    if (tipo === 'casa') {
        const homoNum = parseFloat(inmueble.superficieHomogeneizada);
        if (!isNaN(homoNum) && homoNum > 0) {
            inmueble.superficieHomogeneizada = homoNum;
        } else {
            const calculada = _calcularSuperficieHomogeneizadaCasa();
            if (calculada > 0) {
                inmueble.superficieHomogeneizada = calculada;
            }
        }
    }

    return {
        tipo: tipo,
        ubicacion: datosTasacion.ubicacion,
        inmueble: inmueble,
        comparables: datosTasacion.comparables || [],
        ajuste_final_porcentaje: 0,
        valor_final_manual: null
    };
}

async function calcularYMostrarResultado() {
    const tipo = datosTasacion?.tipo;
    if (!tipo) {
        alert("No se detectó el tipo de inmueble");
        return;
    }

    const payload = armarPayloadTasacion(tipo);
    console.log(`Payload enviado al backend (${tipo}):`, payload);

    const btnSiguiente = getBtnSiguiente();
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (btnSiguiente) {
        btnSiguiente.disabled = true;
        btnSiguiente.classList.remove("activo");
    }

    if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
    }

    try {
        const resultado = await tasarAPI(payload);
        resultadoTasacion = resultado;
        datosTasacion.resultado = resultadoTasacion;

        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }

        mostrarPantallaResultado();
    } catch (e) {
        console.error(`Error en la llamada al backend (${tipo}):`, e);

        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }

        alert("Error al calcular la tasación: " + e.message);

        if (btnSiguiente) {
            btnSiguiente.disabled = false;
            btnSiguiente.classList.add("activo");
        }
    }
}

// Populate centralized flow configuration with render and save functions
// Done here after all flow files are loaded to ensure functions exist
Object.assign(configuracionFlujos, {
    'lote': {
        pasos: [
            { 
                nombre: 'datos', 
                render: mostrarFormularioLote, 
                guardar: guardarDatosPantalla1 
            },
            { 
                nombre: 'caracteristicas', 
                render: mostrarCaracteristicasLote, 
                guardar: guardarDatosPantalla3 
            },
            { 
                nombre: 'comparables', 
                render: mostrarPantallaComparables, 
                guardar: null 
            },
            { 
                nombre: 'resultado', 
                render: calcularYMostrarResultado, 
                guardar: null 
            }
        ]
    },
    'departamento': {
        pasos: [
            { 
                nombre: 'datos', 
                render: mostrarFormularioDepartamento, 
                guardar: guardarDatosPantallaDepartamento 
            },
            { 
                nombre: 'caracteristicas', 
                render: mostrarCaracteristicasDepartamento, 
                guardar: guardarDatosCaracteristicasDepartamento 
            },
            { 
                nombre: 'superficie', 
                render: mostrarHomogeneizacionSuperficie, 
                guardar: guardarDatosHomogeneizacion 
            },
            { 
                nombre: 'comparables', 
                render: mostrarPantallaComparables, 
                guardar: null 
            },
            { 
                nombre: 'resultado', 
                render: calcularYMostrarResultado, 
                guardar: null 
            }
        ]
    },
    'casa': {
        pasos: [
            { 
                nombre: 'datos', 
                render: mostrarFormularioCasa, 
                guardar: guardarDatosPantallaCasa 
            },
            { 
                nombre: 'caracteristicas', 
                render: mostrarCaracteristicasCasa, 
                guardar: guardarDatosCaracteristicasCasa 
            },
            { 
                nombre: 'superficie', 
                render: mostrarHomogeneizacionSuperficieCasa, 
                guardar: guardarDatosHomogeneizacionCasa 
            },
            { 
                nombre: 'comparables', 
                render: mostrarComparablesCasa, 
                guardar: null 
            },
            { 
                nombre: 'resultado', 
                render: calcularYMostrarResultado, 
                guardar: null 
            }
        ]
    }
});

// Add validators to the configuration (if the function exists from flujo-config.js)
if (typeof agregarValidadoresAConfiguracion === 'function') {
    agregarValidadoresAConfiguracion();
}
