/* =========================
   AUTOCOMPLETE MANAGER
   Sistema centralizado de autocompletes
========================= */

/* =========================
   AUTOCOMPLETES SIMPLES
========================= */

/**
 * Inicializa autocomplete de orientación
 */
function inicializarOrientacion() {
    inicializarAutocomplete("orientacionInput", "orientacionList", {
        onSelect: (item, input) => {
            datosTasacion.ubicacion.orientacion = item.textContent;
        }
    });
}

/**
 * Inicializa autocomplete de orientación para lote
 */
function inicializarOrientacionLote() {
    inicializarAutocomplete("orientacionLoteInput", "orientacionLoteList", {
        onSelect: (item, input) => {
            datosTasacion.ubicacion.orientacion = item.textContent;
        }
    });
}

/**
 * Inicializa autocomplete de ambientes
 * @param {string} tipo - 'departamento' o 'casa'
 */
function inicializarAmbientes(tipo = 'departamento') {
    const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
    
    inicializarAutocomplete("ambientesInput", "ambientesList", {
        onSelect: (item, input) => {
            datos.ambientes = item.textContent;

            const dormitoriosInput = document.getElementById("dormitoriosInput");
            if (dormitoriosInput) {
                if (item.textContent === "Monoambiente") {
                    if (tipo === 'casa') {
                        dormitoriosInput.value = "1";
                    } else {
                        dormitoriosInput.value = "";
                        datos.dormitorios = "";
                    }
                    dormitoriosInput.disabled = true;
                } else {
                    dormitoriosInput.disabled = false;
                }
            }
        }
    });
}

/**
 * Inicializa autocomplete de dormitorios
 * @param {string} tipo - 'departamento' o 'casa'
 */
function inicializarDormitorios(tipo = 'departamento') {
    const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
    
    inicializarAutocomplete("dormitoriosInput", "dormitoriosList", {
        onSelect: (item, input) => {
            datos.dormitorios = item.textContent;
        }
    });
}

/**
 * Inicializa autocomplete de baños
 * @param {string} tipo - 'departamento' o 'casa'
 */
function inicializarBanos(tipo = 'departamento') {
    const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
    
    inicializarAutocomplete("banosInput", "banosList", {
        onSelect: (item, input) => {
            datos.banos = item.textContent;
        }
    });
}

/* =========================
   AUTOCOMPLETES CON COEFICIENTES
========================= */

/**
 * Inicializa autocomplete de ubicación en planta (departamento)
 */
function inicializarUbicacionPlanta() {
    const input = document.getElementById("ubicacionPlantaInput");
    const coefInput = document.getElementById("ubicacionPlantaCoef");
    const list = document.getElementById("ubicacionPlantaList");

    if (!input || !list) return;

    let coeficienteSeleccionado = datosTasacion.departamento.ubicacionPlantaCoef || 1;

    inicializarAutocomplete("ubicacionPlantaInput", "ubicacionPlantaList", {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');
            
            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput && coefSpan) {
                coefInput.value = coefSpan.textContent;
            }
            
            datosTasacion.departamento.ubicacionPlanta = textSpan ? textSpan.textContent : item.textContent;
            datosTasacion.departamento.ubicacionPlantaCoef = parseFloat(item.dataset.coef);
            coeficienteSeleccionado = parseFloat(item.dataset.coef);
        }
    });

    // Validación de coeficiente
    if (coefInput) {
        coefInput.addEventListener("input", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                datosTasacion.departamento.ubicacionPlantaCoef = valor;
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado);
            }
        });

        coefInput.addEventListener("focus", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado);
            }
        });

        coefInput.addEventListener("blur", () => {
            coefInput.classList.remove("fuera-de-rango");
        });
    }
}

/**
 * Inicializa autocomplete de ubicación en piso (departamento)
 */
function inicializarUbicacionPiso() {
    const input = document.getElementById("ubicacionPisoInput");
    const coefInput = document.getElementById("ubicacionPisoCoef");
    const list = document.getElementById("ubicacionPisoList");

    if (!input || !list) return;

    let coeficienteSeleccionado = datosTasacion.departamento.ubicacionPisoCoef || 1;

    inicializarAutocomplete("ubicacionPisoInput", "ubicacionPisoList", {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');

            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput) {
                coefInput.value = item.dataset.coef;
            }

            datosTasacion.departamento.ubicacionPiso = textSpan ? textSpan.textContent : item.textContent;
            datosTasacion.departamento.ubicacionPisoCoef = parseFloat(item.dataset.coef);
            coeficienteSeleccionado = parseFloat(item.dataset.coef);
        }
    });

    // Validación de coeficiente
    if (coefInput) {
        coefInput.addEventListener("input", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                datosTasacion.departamento.ubicacionPisoCoef = valor;
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado);
            }
        });

        coefInput.addEventListener("focus", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado);
            }
        });

        coefInput.addEventListener("blur", () => {
            coefInput.classList.remove("fuera-de-rango");
        });
    }
}

/**
 * Inicializa autocomplete de superficie cubierta
 * @param {string} tipo - 'departamento' o 'casa'
 */
function inicializarSuperficieCubierta(tipo = 'departamento') {
    const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
    const coefKey = tipo === 'casa' ? 'superficieCubiertaCoef' : 'superficieCubiertaCoef';
    const input = document.getElementById("superficieCubiertaInput");
    const coefInput = document.getElementById("superficieCubiertaCoef");
    const list = document.getElementById("superficieCubiertaList");

    if (!input || !list) return;

    let coeficienteSeleccionado = datos[coefKey] || 1;
    let rangoSeleccionado = null;

    inicializarAutocomplete("superficieCubiertaInput", "superficieCubiertaList", {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');

            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput && coefSpan) {
                coefInput.value = item.dataset.coef;
            }

            datos.superficieCubierta = textSpan ? textSpan.textContent : item.textContent;
            datos[coefKey] = parseFloat(item.dataset.coef);
            coeficienteSeleccionado = parseFloat(item.dataset.coef);
            rangoSeleccionado = item.dataset.rango;
        }
    });

    // Validación de coeficiente
    if (coefInput) {
        coefInput.addEventListener("input", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                datos[coefKey] = valor;
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("focus", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("blur", () => {
            coefInput.classList.remove("fuera-de-rango");
        });
    }
}

/**
 * Inicializa autocomplete de superficie total (casa)
 */
function inicializarSuperficieTotal() {
    const input = document.getElementById("superficieTotalInput");
    const coefInput = document.getElementById("superficieTotalCoef");
    const list = document.getElementById("superficieTotalList");

    if (!input || !list) return;

    let coeficienteSeleccionado = datosTasacion.casa.superficieTotalCoef || 1;
    let rangoSeleccionado = null;

    inicializarAutocomplete("superficieTotalInput", "superficieTotalList", {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');

            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput && coefSpan) {
                coefInput.value = item.dataset.coef;
            }

            datosTasacion.casa.superficieTotal = textSpan ? textSpan.textContent : item.textContent;
            datosTasacion.casa.superficieTotalCoef = parseFloat(item.dataset.coef);
            coeficienteSeleccionado = parseFloat(item.dataset.coef);
            rangoSeleccionado = item.dataset.rango;
        }
    });

    // Validación de coeficiente
    if (coefInput) {
        coefInput.addEventListener("input", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                datosTasacion.casa.superficieTotalCoef = valor;
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("focus", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("blur", () => {
            coefInput.classList.remove("fuera-de-rango");
        });
    }
}

/**
 * Inicializa autocomplete de estado de conservación
 * @param {string} tipo - 'departamento' o 'casa'
 */
function inicializarEstadoConservacion(tipo = 'departamento') {
    const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
    
    inicializarAutocomplete("estadoConservacionInput", "estadoConservacionList", {
        onSelect: (item, input) => {
            datos.estadoConservacion = item.textContent;
            if (tipo === 'departamento') {
                datos.estadoConservacionCoef = parseInt(item.dataset.valor);
                calcularCoeficienteAntiguedad();
            }
        }
    });
}

/**
 * Inicializa autocomplete de antigüedad
 * @param {string} tipo - 'departamento' o 'casa'
 */
function inicializarAntiguedad(tipo = 'departamento') {
    const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
    
    inicializarAutocomplete("antiguedadInput", "antiguedadList", {
        onSelect: (item, input) => {
            datos.antiguedad = item.textContent;
        }
    });
}

/**
 * Inicializa autocomplete de característica constructiva (departamento)
 */
function inicializarCaracteristicaConstructiva() {
    const input = document.getElementById("caracteristicaConstructivaInput");
    const coefInput = document.getElementById("caracteristicaConstructivaCoef");
    const list = document.getElementById("caracteristicaConstructivaList");

    if (!input || !list) return;

    let coeficienteSeleccionado = datosTasacion.departamento.caracteristicaConstructivaCoef || 1;
    let rangoSeleccionado = null;

    inicializarAutocomplete("caracteristicaConstructivaInput", "caracteristicaConstructivaList", {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');

            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput) {
                coefInput.value = item.dataset.coef;
            }

            datosTasacion.departamento.caracteristicaConstructiva = textSpan ? textSpan.textContent : item.textContent;
            datosTasacion.departamento.caracteristicaConstructivaCoef = parseFloat(item.dataset.coef);
            coeficienteSeleccionado = parseFloat(item.dataset.coef);
            rangoSeleccionado = item.dataset.rango;
        }
    });

    // Validación de coeficiente
    if (coefInput) {
        coefInput.addEventListener("input", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                datosTasacion.departamento.caracteristicaConstructivaCoef = valor;
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("focus", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("blur", () => {
            coefInput.classList.remove("fuera-de-rango");
        });
    }
}

/**
 * Inicializa autocomplete de calidad de construcción (casa)
 */
function inicializarCalidadConstruccion() {
    const input = document.getElementById("calidadConstruccionInput");
    const coefInput = document.getElementById("calidadConstruccionCoef");
    const list = document.getElementById("calidadConstruccionList");

    if (!input || !list) return;

    let coeficienteSeleccionado = datosTasacion.casa.calidadConstruccionCoef || 1;
    let rangoSeleccionado = null;

    inicializarAutocomplete("calidadConstruccionInput", "calidadConstruccionList", {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');

            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput && coefSpan) {
                coefInput.value = item.dataset.coef;
            }

            datosTasacion.casa.calidadConstruccion = textSpan ? textSpan.textContent : item.textContent;
            datosTasacion.casa.calidadConstruccionCoef = parseFloat(item.dataset.coef);
            coeficienteSeleccionado = parseFloat(item.dataset.coef);
            rangoSeleccionado = item.dataset.rango;
        }
    });

    // Validación de coeficiente
    if (coefInput) {
        coefInput.addEventListener("input", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                datosTasacion.casa.calidadConstruccionCoef = valor;
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("focus", () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor)) {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });

        coefInput.addEventListener("blur", () => {
            coefInput.classList.remove("fuera-de-rango");
        });
    }
}

/* =========================
   AUTOCOMPLETES ESPECÍFICOS
========================= */

/**
 * Inicializa autocomplete de tipo de lote
 */
function inicializarTipoLote() {
    const input = document.getElementById("tipoLoteInput");
    const list = document.getElementById("tipoLoteList");
    const items = list.querySelectorAll(".autocomplete-item");

    input.addEventListener("click", () => {
        list.style.display = "block";
    });

    items.forEach(item => {
        item.addEventListener("click", () => {
            const nuevoTipo = item.textContent.trim();

            if (datosTasacion.lote.tipoLote && datosTasacion.lote.tipoLote !== nuevoTipo) {
                datosTasacion.lote.caracteristicas = {};
            }

            input.value = nuevoTipo;
            datosTasacion.lote.tipoLote = nuevoTipo;
            list.style.display = "none";

            if (typeof actualizarEstadoBotonSiguiente === 'function') {
                actualizarEstadoBotonSiguiente();
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

/**
 * Inicializa autocomplete de provincia (versión simplificada)
 */
function inicializarAutocompleteProvincia() {
    const input = document.getElementById("provinciaInput");
    const list = document.getElementById("provinciaList");

    function renderLista(filtro = "") {
        list.innerHTML = "";
        const filtradas = filtrarProvincias(filtro);

        if (!filtradas.length) {
            list.style.display = "none";
            return;
        }

        filtradas.forEach(provincia => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = provincia.nombre;
            item.addEventListener("click", () => {
                input.value = provincia.nombre;
                list.style.display = "none";
                cargarLocalidadesUI(provincia.nombre);
                actualizarMapa();
            });
            list.appendChild(item);
        });

        list.style.display = "block";
    }

    input.addEventListener("click", () => {
        renderLista();
    });

    input.addEventListener("input", () => {
        renderLista(input.value);
        const valorInput = input.value.trim();
        if (valorInput) {
            const match = buscarProvincia(valorInput);
            if (match) {
                input.value = match.nombre;
                list.style.display = "none";
                cargarLocalidadesUI(match.nombre);
                actualizarMapa();
            }
        }
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

/**
 * Inicializa autocomplete de localidad (versión simplificada)
 */
function inicializarAutocompleteLocalidad() {
    const input = document.getElementById("localidadInput");
    const list = document.getElementById("localidadList");

    function renderLista(filtro = "") {
        list.innerHTML = "";
        const filtradas = filtrarLocalidades(filtro);

        if (!filtradas.length) {
            list.style.display = "none";
            return;
        }

        filtradas.forEach(localidad => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = localidad.nombre;
            item.addEventListener("click", () => {
                input.value = localidad.nombre;
                list.style.display = "none";
                actualizarMapa();
            });
            list.appendChild(item);
        });

        list.style.display = "block";
    }

    input.addEventListener("click", () => {
        renderLista();
    });

    input.addEventListener("input", () => {
        renderLista(input.value);
        const valorInput = input.value.trim();
        if (valorInput) {
            const match = buscarLocalidad(valorInput);
            if (match) {
                input.value = match.nombre;
                list.style.display = "none";
                actualizarMapa();
            }
        }
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}
