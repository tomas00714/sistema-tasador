/**
 * Vista Previa de Informe - Lógica principal
 */

// Obtener ID de tasación de la URL
function getTasacionIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

const reportConfig = {
    showLogo: true,
    showPhotos: true,
    showComparables: true,
    showMethodology: true,
    title: "Informe de Tasación",
    introduction: "El presente informe tiene como objetivo determinar el valor de mercado del inmueble objeto de tasación, mediante el método de comparación de mercado.",
    observations: "El valor estimado refleja las condiciones actuales del mercado y las características específicas del inmueble.",
    conclusion: "Se concluye que el valor de mercado del inmueble es el resultado de la homogeneización de los comparables seleccionados.",
    // Nuevos campos
    consideracionesPrevias: "No se consignan consideraciones previas.",
    finalidadTasacion: "Determinar el valor venal de mercado del inmueble para su venta.",
    descripcionEntorno: "",
    puntosInteres: "",
    textoMetodologia: "Para la determinación del valor se aplica el método comparativo de mercado, tomando como referencia inmuebles de características similares y realizando los ajustes correspondientes mediante los coeficientes de homogeneización.",
    // Datos profesionales (vienen del perfil del usuario, no de reportConfig)
    showProfessionalData: true,
    // Condiciones de trabajo
    showWorkConditions: true,
    comision: "",
    exclusividad: "",
    plazoTrabajo: "",
    condicionesAdicionales: "",
    // Presentación del valor
    valorModalidad: "tasacion",
    valorPublicacion: "",
    valorCierre: "",
    valorRangoMin: "",
    valorRangoMax: "",
    // Propiedades en competencia
    showCompetition: false,
    // Análisis FODA
    showFODA: false,
    fodaFortalezas: "",
    fodaOportunidades: "",
    fodaDebilidades: "",
    fodaAmenazas: ""
};

let tasacionCargada = null;
let comparablesResueltos = [];
let fotosTasacion = [];
let selectedComparableIds = new Set();
let usuarioActual = null;
let profesionalActual = null;

async function initVistaPreviaInforme() {
    try {
        const perfil = await obtenerProfesionalAPI();
        usuarioActual = perfil?.usuario || null;
        profesionalActual = perfil?.profesional || null;
    } catch (e) {
        console.warn('No se pudieron cargar los datos profesionales:', e.message);
        usuarioActual = null;
        profesionalActual = null;
    }

    tasacionCargada = await obtenerTasacionParaInforme();

    if (tasacionCargada) {
        comparablesResueltos = resolverComparablesDeTasacion(tasacionCargada);
        fotosTasacion = obtenerFotosDeTasacion(tasacionCargada);
        selectedComparableIds = new Set(comparablesResueltos.map(c => c.id));
        setupPhotosState();
        setupComparablesState();
        
        // Inicializar valores de rango según el valor de tasación
        const valorTasacion = tasacionCargada.resultado?.valor_final || tasacionCargada.datosCompletos?.resultado?.valor_final || 0;
        if (valorTasacion > 0) {
            reportConfig.valorRangoMin = Math.round(valorTasacion * 0.9);
            reportConfig.valorRangoMax = Math.round(valorTasacion * 1.1);
        }
        
        // Sincronizar inputs con los valores iniciales
        sincronizarInputsConConfig();
        
        mostrarEstadoVacio(false);
    } else {
        mostrarEstadoVacio(true);
    }

    setupConfigListeners();
    setupExpandablePanels();
    renderPhotosPanel();
    renderComparablesPanel();
    actualizarOpcionesSegunTipo();
    await renderReportPreview();
    setupActionButtons();
    setupDirectEditing();
    mostrarAyudaEdicion();
}

// =========================
// EDICIÓN DIRECTA DEL INFORME
// =========================
// Capa de interacción sobre los elementos marcados con data-editable.
// Fuente de verdad única: reportConfig. El panel izquierdo ya no contiene
// campos de texto: todos los textos se editan exclusivamente aquí.

let editingElement = null;
let editingOriginalText = '';
let editingOriginalRaw = '';
let editRenderPending = false;
let pendingEditKey = null;

function setupDirectEditing() {
    const reportViewer = document.getElementById('reportViewer');
    if (!reportViewer) return;

    reportViewer.addEventListener('click', (e) => {
        const el = e.target.closest('[data-editable]');
        if (!el || el === editingElement) return;
        // Si hay un re-render en curso por el commit anterior, recordar a qué
        // campo quiso entrar el usuario y re-ingresar sobre el DOM nuevo
        if (editRenderPending) {
            pendingEditKey = el.dataset.editable;
            return;
        }
        // Si hay una edición activa, confirmarla primero y re-ingresar
        // al nuevo campo sobre el DOM regenerado
        if (editingElement) {
            pendingEditKey = el.dataset.editable;
            commitDirectEdit(editingElement);
            return;
        }
        startDirectEdit(el);
    });

    reportViewer.addEventListener('keydown', (e) => {
        if (!editingElement) return;
        const multiline = editingElement.hasAttribute('data-editable-multiline');
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            editingElement.blur(); // dispara commit
        } else if (e.key === 'Escape') {
            e.preventDefault();
            editingElement.textContent = editingOriginalText;
            editingElement.classList.toggle('is-empty', editingOriginalText.trim() === '');
            editingElement.dataset.cancelled = '1';
            editingElement.blur();
        }
    });

    // Pegar como texto plano (sin formato HTML)
    reportViewer.addEventListener('paste', (e) => {
        if (!editingElement) return;
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });

    reportViewer.addEventListener('focusout', (e) => {
        if (editingElement && e.target === editingElement) {
            const nextEl = e.relatedTarget && e.relatedTarget.closest
                ? e.relatedTarget.closest('[data-editable]')
                : null;
            const nextKey = nextEl && reportViewer.contains(nextEl)
                ? nextEl.dataset.editable
                : null;
            commitDirectEdit(editingElement, nextKey);
        }
    });
}

function startDirectEdit(el) {
    if (!el.isConnected) return;
    if (editingElement === el) return;

    editingElement = el;
    editingOriginalText = el.textContent;
    editingOriginalRaw = el.dataset.raw || '';
    delete el.dataset.cancelled;

    // Campos numéricos: editar el valor crudo, no el formato "$90.000"
    if (el.hasAttribute('data-editable-number')) {
        el.textContent = el.dataset.raw || '';
    }

    el.classList.remove('is-empty');
    el.classList.add('is-editing');
    el.contentEditable = 'true';
    el.spellcheck = true;
    el.focus();
}

function commitDirectEdit(el, nextKey = null) {
    const key = el.dataset.editable;
    el.contentEditable = 'false';
    el.classList.remove('is-editing');
    editingElement = null;

    if (el.dataset.cancelled) {
        delete el.dataset.cancelled;
        return;
    }

    let value = el.innerText.trim();
    const isNumber = el.hasAttribute('data-editable-number');
    if (isNumber) {
        value = value.replace(/[^\d]/g, '');
    }

    // Persistir en la única fuente de verdad ("" si quedó vacío: el
    // placeholder nunca se guarda, solo existe en el DOM de pantalla)
    const original = isNumber ? editingOriginalRaw.trim() : editingOriginalText.trim();
    if (value !== original) {
        reportConfig[key] = value;
    }

    // El pipeline normal siempre se ejecuta al salir de la edición:
    // reconstruye el DOM (restaura el placeholder si el campo quedó vacío)
    // y re-pagina si el contenido cambió de longitud.
    if (nextKey) pendingEditKey = nextKey;
    editRenderPending = true;
    renderReportPreview().then(() => {
        editRenderPending = false;
        if (pendingEditKey) {
            const next = document.querySelector(`#reportViewer [data-editable="${pendingEditKey}"]`);
            pendingEditKey = null;
            if (next) startDirectEdit(next);
        }
    });
}

// =========================
// AYUDA INICIAL DE EDICIÓN
// =========================
function mostrarAyudaEdicion() {
    if (localStorage.getItem('vpiEditHintDismissed') === '1') return;
    const panel = document.querySelector('.preview-panel');
    if (!panel || document.getElementById('editHintBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'editHintBanner';
    banner.className = 'edit-hint-banner';
    banner.innerHTML = `
        <span class="edit-hint-text">✎ Los textos marcados pueden editarse directamente. Hacé clic para modificarlos.</span>
        <button type="button" class="edit-hint-btn" id="editHintDismiss">Entendido</button>
    `;
    panel.appendChild(banner);

    document.getElementById('editHintDismiss').addEventListener('click', () => {
        localStorage.setItem('vpiEditHintDismissed', '1');
        banner.remove();
    });
}

function mostrarEstadoVacio(mostrar) {    const emptyState = document.getElementById('reportEmptyState');
    const reportViewer = document.getElementById('reportViewer');
    if (emptyState) {
        emptyState.hidden = !mostrar;
        emptyState.style.display = mostrar ? 'flex' : 'none';
    }
    if (reportViewer) {
        reportViewer.style.display = mostrar ? 'none' : '';
    }
}

function setupPhotosState() {
    const showPhotosCheckbox = document.getElementById('showPhotos');
    if (!showPhotosCheckbox) return;

    const tieneFotos = fotosTasacion.length > 0;
    showPhotosCheckbox.disabled = !tieneFotos;

    const toggleLabel = showPhotosCheckbox.closest('.config-toggle');
    if (toggleLabel) toggleLabel.classList.toggle('config-toggle-disabled', !tieneFotos);

    if (!tieneFotos) {
        showPhotosCheckbox.checked = false;
        reportConfig.showPhotos = false;
    } else {
        showPhotosCheckbox.checked = reportConfig.showPhotos;
    }
}

function setupComparablesState() {
    const showComparablesCheckbox = document.getElementById('showComparables');
    if (!showComparablesCheckbox) return;

    const tieneComparables = comparablesResueltos.length > 0;
    showComparablesCheckbox.disabled = !tieneComparables;

    const toggleLabel = showComparablesCheckbox.closest('.config-toggle');
    if (toggleLabel) toggleLabel.classList.toggle('config-toggle-disabled', !tieneComparables);

    if (!tieneComparables) {
        showComparablesCheckbox.checked = false;
        reportConfig.showComparables = false;
    }
}

function setupExpandablePanels() {
    setupExpandPanel('btnExpandPhotos', 'photosExpandPanel');
    setupExpandPanel('btnExpandComparables', 'comparablesExpandPanel');
}

function setupExpandPanel(btnId, panelId) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        panel.hidden = expanded;
    });
}

function renderPhotosPanel() {
    const carousel = document.getElementById('photosCarousel');
    if (!carousel) return;

    if (!fotosTasacion.length) {
        carousel.innerHTML = '<p class="config-photos-empty">No hay fotos cargadas</p>';
        return;
    }

    carousel.innerHTML = fotosTasacion.map((foto, i) => {
        const url = foto.url || foto.src;
        if (url) {
            return `<div class="config-photo-thumb"><img src="${url}" alt="${foto.description || foto.descripcion || 'Foto ' + (i + 1)}"></div>`;
        }
        return `<div class="config-photo-thumb"><span class="config-photo-thumb-placeholder">${foto.description || foto.descripcion || 'Foto ' + (i + 1)}</span></div>`;
    }).join('');
}

function renderComparablesPanel() {
    const list = document.getElementById('comparablesList');
    if (!list) return;

    if (!comparablesResueltos.length) {
        list.innerHTML = '<p class="config-comparables-empty">No hay comparables en esta tasación</p>';
        return;
    }

    list.innerHTML = comparablesResueltos.map(comp => {
        const dir = comp.ubicacion?.direccion || comp.direccion || 'Sin dirección';
        const selected = selectedComparableIds.has(comp.id);
        return `
            <button type="button" class="config-comparable-item${selected ? ' selected' : ''}" data-id="${comp.id}">
                <span class="config-comparable-dot"></span>
                <span class="config-comparable-address">${dir}</span>
            </button>
        `;
    }).join('');

    list.querySelectorAll('.config-comparable-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (selectedComparableIds.has(id)) {
                selectedComparableIds.delete(id);
                btn.classList.remove('selected');
            } else {
                selectedComparableIds.add(id);
                btn.classList.add('selected');
            }
            renderReportPreview();
        });
    });
}

async function obtenerReportData() {
    if (!tasacionCargada) return null;

    return await tasacionToReportData(tasacionCargada, {
        comparablesResueltos,
        selectedComparableIds: [...selectedComparableIds],
        config: reportConfig,
        usuario: usuarioActual,
        profesional: profesionalActual
    });
}

function sincronizarInputsConConfig() {
    // Solo quedan controles no textuales en el panel: el selector de modalidad
    const valorModalidadSelect = document.getElementById('valorModalidad');
    if (valorModalidadSelect) {
        valorModalidadSelect.value = reportConfig.valorModalidad;
    }
}

function setupConfigListeners() {
    const showLogoCheckbox = document.getElementById('showLogo');
    if (showLogoCheckbox) {
        showLogoCheckbox.addEventListener('change', (e) => {
            reportConfig.showLogo = e.target.checked;
            renderReportPreview();
        });
    }

    const showPhotosCheckbox = document.getElementById('showPhotos');
    if (showPhotosCheckbox) {
        showPhotosCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showPhotos = e.target.checked;
            renderReportPreview();
        });
    }

    const showComparablesCheckbox = document.getElementById('showComparables');
    if (showComparablesCheckbox) {
        showComparablesCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showComparables = e.target.checked;
            renderReportPreview();
        });
    }

    const showMethodologyCheckbox = document.getElementById('showMethodology');
    if (showMethodologyCheckbox) {
        showMethodologyCheckbox.addEventListener('change', (e) => {
            reportConfig.showMethodology = e.target.checked;
            renderReportPreview();
        });
    }

    // Propiedades en competencia
    const showCompetitionCheckbox = document.getElementById('showCompetition');
    if (showCompetitionCheckbox) {
        showCompetitionCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showCompetition = e.target.checked;
            renderReportPreview();
        });
    }

    // Análisis FODA
    const showFODACheckbox = document.getElementById('showFODA');
    if (showFODACheckbox) {
        showFODACheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showFODA = e.target.checked;
            renderReportPreview();
        });
    }

    // Datos profesionales
    const showProfessionalDataCheckbox = document.getElementById('showProfessionalData');
    if (showProfessionalDataCheckbox) {
        showProfessionalDataCheckbox.addEventListener('change', (e) => {
            reportConfig.showProfessionalData = e.target.checked;
            renderReportPreview();
        });
    }

    // Condiciones de trabajo
    const showWorkConditionsCheckbox = document.getElementById('showWorkConditions');
    if (showWorkConditionsCheckbox) {
        showWorkConditionsCheckbox.addEventListener('change', (e) => {
            reportConfig.showWorkConditions = e.target.checked;
            renderReportPreview();
        });
    }

    // Presentación del valor
    const valorModalidadSelect = document.getElementById('valorModalidad');
    if (valorModalidadSelect) {
        valorModalidadSelect.addEventListener('change', (e) => {
            reportConfig.valorModalidad = e.target.value;
            renderReportPreview();
        });
    }
}

async function renderReportPreview() {
    const reportViewer = document.getElementById('reportViewer');
    if (!reportViewer) return;

    if (!tasacionCargada) {
        mostrarEstadoVacio(true);
        reportViewer.innerHTML = '';
        return;
    }

    const reportData = await obtenerReportData();
    if (!reportData) {
        mostrarEstadoVacio(true);
        reportViewer.innerHTML = '';
        return;
    }

    const showComparables = reportConfig.showComparables && selectedComparableIds.size > 0;

    reportViewer.innerHTML = await ReportViewerProfessional({
        reportData,
        config: {
            ...reportConfig,
            showComparables
        }
    });
    
    // Verificar overflow después de renderizar
    const paginator = getReportPaginator();
    await paginator.verifyPageOverflow();
    
    // Asegurar que el estado vacío esté oculto después de renderizar exitosamente
    mostrarEstadoVacio(false);
}

function actualizarOpcionesSegunTipo() {
    if (!tasacionCargada) return;
    
    const tipo = tasacionCargada.tipo || 'lote';
    
    // FODA: solo para casas y departamentos
    const showFODACheckbox = document.getElementById('showFODA');
    const fodaSection = showFODACheckbox?.closest('.config-section');
    if (showFODACheckbox && fodaSection) {
        if (tipo === 'lote') {
            showFODACheckbox.disabled = true;
            showFODACheckbox.checked = false;
            reportConfig.showFODA = false;
            fodaSection.style.opacity = '0.5';
        } else {
            showFODACheckbox.disabled = false;
            fodaSection.style.opacity = '1';
        }
    }
    
    // Propiedades en competencia: más relevante para casas y departamentos
    const showCompetitionCheckbox = document.getElementById('showCompetition');
    const competitionSection = showCompetitionCheckbox?.closest('.config-section');
    if (showCompetitionCheckbox && competitionSection) {
        if (tipo === 'lote') {
            showCompetitionCheckbox.disabled = true;
            showCompetitionCheckbox.checked = false;
            reportConfig.showCompetition = false;
            competitionSection.style.opacity = '0.5';
        } else {
            showCompetitionCheckbox.disabled = false;
            competitionSection.style.opacity = '1';
        }
    }
    
    // Documentación: disponible para todos los tipos, pero principalmente para casas y departamentos
    // Se mantiene disponible para todos por ahora
}

function setupActionButtons() {
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            if (!tasacionCargada) {
                alert('No hay tasación cargada para imprimir.');
                return;
            }
            printReport();
        });
    }

    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', () => {
            alert('La exportación a PDF estará disponible en futuras versiones.');
        });
    }
}

function printReport() {
    const reportViewer = document.getElementById('reportViewer');
    if (!reportViewer) return;

    // Imprimir en la misma ventana: el PDF usa exactamente el mismo DOM,
    // los mismos .report-page del paginador y las mismas hojas de estilo
    // (fuentes, variables CSS, tarjetas, tablas) que la Vista Previa.
    // Las reglas @media print ocultan solo la interfaz de edición.
    window.print();
}

function updateReportConfig(newConfig) {
    Object.assign(reportConfig, newConfig);
    syncConfigInputs();
    renderReportPreview();
}

function syncConfigInputs() {
    // El panel solo contiene controles de visibilidad y selectores.
    // Los textos se editan exclusivamente desde el Preview (edición directa).
    if (document.getElementById('showLogo')) document.getElementById('showLogo').checked = reportConfig.showLogo;
    if (document.getElementById('showPhotos')) document.getElementById('showPhotos').checked = reportConfig.showPhotos;
    if (document.getElementById('showComparables')) document.getElementById('showComparables').checked = reportConfig.showComparables;
    if (document.getElementById('showMethodology')) document.getElementById('showMethodology').checked = reportConfig.showMethodology;
    
    // Propiedades en competencia
    if (document.getElementById('showCompetition')) document.getElementById('showCompetition').checked = reportConfig.showCompetition;
    
    // Análisis FODA
    if (document.getElementById('showFODA')) document.getElementById('showFODA').checked = reportConfig.showFODA;
    
    // Datos profesionales
    if (document.getElementById('showProfessionalData')) document.getElementById('showProfessionalData').checked = reportConfig.showProfessionalData;
    
    // Condiciones de trabajo
    if (document.getElementById('showWorkConditions')) document.getElementById('showWorkConditions').checked = reportConfig.showWorkConditions;
    
    // Presentación del valor
    if (document.getElementById('valorModalidad')) document.getElementById('valorModalidad').value = reportConfig.valorModalidad;
}

function getReportConfig() {
    return { ...reportConfig };
}

document.addEventListener('DOMContentLoaded', initVistaPreviaInforme);
