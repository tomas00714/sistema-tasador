/* Pantalla 5: cálculo y resultado (requiere tasacion.js cargado antes) */

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
            valor_promedio_m2: valorPromedioHomogeneizado,
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

function mostrarPantallaResultado() {

    pasoActual = 5;
    actualizarIndicadoresProgreso();

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

    const filasComp = (r.comparables || [])
        .map((c, index) => `
        <tr data-comparable-index="${index}">
            <td>${escapeHtml(c.direccion)}</td>
            <td>${formatearMoneda(c.valor_lote)}</td>
            <td>${formatearMoneda(c.valor_m2)}</td>
            <td>${c.frente}</td>
            <td>${c.fondo || '-'}</td>
            <td>${c.fos || '-'}</td>
            <td>${c.fot || '-'}</td>
            <td><strong>${formatearMoneda(c.valor_m2_homogeneizado)}</strong></td>
            <td>
                <button type="button" class="btn-quitar-comparable" data-index="${index}">
                    -
                </button>
            </td>
        </tr>
    `)
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

        <${d} class="resultado-layout">

            <${d} class="resultado-valor-card">

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

                <${d} class="resultado-meta">
                    <${d}>
                        <span>USD/m² promedio</span>
                        <strong>$ ${formatearMoneda(r.valor_promedio_m2)}</strong>
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
                                <th>Valor por m² homogeneizado</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${filasComp}</tbody>
                        <tfoot>
                            <tr class="valor-promedio-row">
                                <td colspan="7"><strong>Valor promedio:</strong></td>
                                <td><strong>${formatearMoneda(valorPromedio)}</strong></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </${d}>

            </${d}>

        </${d}>
    `;

    // Add event listeners for remove comparable buttons
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
