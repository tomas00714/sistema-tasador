/**
 * Vista Previa de Informe - Lógica principal
 */

const reportConfig = {
    showLogo: true,
    showPhotos: true,
    showComparables: true,
    showMethodology: true,
    title: "Informe de Tasación",
    introduction: "El presente informe tiene como objetivo determinar el valor de mercado del inmueble objeto de tasación, mediante el método de comparación de mercado.",
    observations: "El valor estimado refleja las condiciones actuales del mercado y las características específicas del inmueble.",
    conclusion: "Se concluye que el valor de mercado del inmueble es el resultado de la homogeneización de los comparables seleccionados."
};

let tasacionCargada = null;
let comparablesResueltos = [];
let fotosTasacion = [];
let selectedComparableIds = new Set();

function initVistaPreviaInforme() {
    tasacionCargada = obtenerTasacionParaInforme();

    if (tasacionCargada) {
        comparablesResueltos = resolverComparablesDeTasacion(tasacionCargada);
        fotosTasacion = obtenerFotosDeTasacion(tasacionCargada);
        selectedComparableIds = new Set(comparablesResueltos.map(c => c.id));
        setupPhotosState();
        setupComparablesState();
    } else {
        mostrarEstadoVacio(true);
    }

    setupConfigListeners();
    setupExpandablePanels();
    renderPhotosPanel();
    renderComparablesPanel();
    renderReportPreview();
    setupActionButtons();
}

function mostrarEstadoVacio(mostrar) {
    const emptyState = document.getElementById('reportEmptyState');
    const reportViewer = document.getElementById('reportViewer');
    if (emptyState) emptyState.hidden = !mostrar;
    if (reportViewer) reportViewer.style.display = mostrar ? 'none' : '';
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

function obtenerReportData() {
    if (!tasacionCargada) return null;

    return tasacionToReportData(tasacionCargada, {
        comparablesResueltos,
        selectedComparableIds: [...selectedComparableIds]
    });
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

    const titleInput = document.getElementById('reportTitle');
    if (titleInput) {
        titleInput.addEventListener('input', (e) => {
            reportConfig.title = e.target.value;
            renderReportPreview();
        });
    }

    const introductionTextarea = document.getElementById('reportIntroduction');
    if (introductionTextarea) {
        introductionTextarea.addEventListener('input', (e) => {
            reportConfig.introduction = e.target.value;
            renderReportPreview();
        });
    }

    const observationsTextarea = document.getElementById('reportObservations');
    if (observationsTextarea) {
        observationsTextarea.addEventListener('input', (e) => {
            reportConfig.observations = e.target.value;
            renderReportPreview();
        });
    }

    const conclusionTextarea = document.getElementById('reportConclusion');
    if (conclusionTextarea) {
        conclusionTextarea.addEventListener('input', (e) => {
            reportConfig.conclusion = e.target.value;
            renderReportPreview();
        });
    }
}

function renderReportPreview() {
    const reportViewer = document.getElementById('reportViewer');
    if (!reportViewer) return;

    if (!tasacionCargada) {
        mostrarEstadoVacio(true);
        reportViewer.innerHTML = '';
        return;
    }

    mostrarEstadoVacio(false);

    const reportData = obtenerReportData();
    if (!reportData) return;

    const showComparables = reportConfig.showComparables && selectedComparableIds.size > 0;

    reportViewer.innerHTML = ReportViewer({
        reportData,
        config: {
            ...reportConfig,
            showComparables
        }
    });
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

    const printContent = reportViewer.innerHTML;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Informe de Tasación</title>
            <style>
                @page { size: A4; margin: 20mm; }
                body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
                .report-page { width: 210mm; min-height: 297mm; background: white; padding: 20mm; box-sizing: border-box; }
            </style>
        </head>
        <body>${printContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.onload = function() { printWindow.print(); };
}

function updateReportConfig(newConfig) {
    Object.assign(reportConfig, newConfig);
    syncConfigInputs();
    renderReportPreview();
}

function syncConfigInputs() {
    if (document.getElementById('showLogo')) document.getElementById('showLogo').checked = reportConfig.showLogo;
    if (document.getElementById('showPhotos')) document.getElementById('showPhotos').checked = reportConfig.showPhotos;
    if (document.getElementById('showComparables')) document.getElementById('showComparables').checked = reportConfig.showComparables;
    if (document.getElementById('showMethodology')) document.getElementById('showMethodology').checked = reportConfig.showMethodology;
    if (document.getElementById('reportTitle')) document.getElementById('reportTitle').value = reportConfig.title;
    if (document.getElementById('reportIntroduction')) document.getElementById('reportIntroduction').value = reportConfig.introduction;
    if (document.getElementById('reportObservations')) document.getElementById('reportObservations').value = reportConfig.observations;
    if (document.getElementById('reportConclusion')) document.getElementById('reportConclusion').value = reportConfig.conclusion;
}

function getReportConfig() {
    return { ...reportConfig };
}

document.addEventListener('DOMContentLoaded', initVistaPreviaInforme);
