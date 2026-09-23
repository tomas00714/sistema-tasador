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
    // Forma del logo en el informe y en el encabezado de páginas
    logoForma: "cuadrada",
    logoHeader: false,
    // Tema de acento del informe (verde|azul|celeste|rojo|naranja|violeta|negro)
    accentTheme: "verde",
    showPhotos: true,
    // Detalle de ambientes (cuadros editables en el Informe Técnico)
    showAmbientes: true,
    showComparables: true,
    // IDs de comparables desmarcados en el panel (persisten con el config)
    comparablesOcultos: [],
    showMethodology: true,
    title: "Informe de Tasación",
    introduction: "El presente informe tiene como objetivo determinar el valor de mercado del inmueble objeto de tasación, mediante el método de comparación de mercado.",
    observations: "El valor estimado refleja las condiciones actuales del mercado y las características específicas del inmueble.",
    conclusion: "Se concluye que el valor de mercado del inmueble es el resultado de la homogeneización de los comparables seleccionados.",
    // Nuevos campos
    consideracionesPrevias: "No se consignan consideraciones previas.",
    finalidadTasacion: "La finalidad de la tasación es determinar el valor de mercado del inmueble con fines de venta.",
    // Datos del solicitante (fallback editable cuando la tasación no los trae)
    clienteNombre: "",
    nomenclaturaCatastral: "",
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
    valorTasacion: "",
    valorTasacionOculto: false,
    valorPublicacion: "",
    valorCierre: "",
    valorRangoMin: "",
    valorRangoMax: "",
    rangoEstimado: "",
    // Propiedades en competencia
    showCompetition: true,
    // Análisis FODA
    showFODA: true,
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
        // Restaurar la configuración del informe persistida en la tasación
        // (datos.reportConfig). Es la misma fuente de verdad: reportConfig.
        const configGuardada = tasacionCargada.datosCompletos?.reportConfig;
        if (configGuardada && typeof configGuardada === 'object') {
            Object.assign(reportConfig, configGuardada);
        }

        // "Mostrar logo": sin logo en el perfil el checkbox arranca
        // desmarcado siempre (un true persistido puede ser un default
        // viejo; sin logo no hay nada que mostrar). Con logo, se respeta
        // la preferencia persistida y el default es mostrarlo.
        if (!profesionalActual?.logo_inmobiliaria) {
            reportConfig.showLogo = false;
        } else if (!configGuardada || configGuardada.showLogo === undefined) {
            reportConfig.showLogo = true;
        }

        comparablesResueltos = resolverComparablesDeTasacion(tasacionCargada);
        fotosTasacion = obtenerFotosDeTasacion(tasacionCargada);
        // Restaurar la selección persistida: todos salvo los que el
        // usuario desmarcó (comparablesOcultos). Los comparables nuevos
        // que no estaban al guardar quedan seleccionados por defecto.
        const ocultos = new Set((reportConfig.comparablesOcultos || []).map(String));
        selectedComparableIds = new Set(
            comparablesResueltos.map(c => c.id).filter(id => !ocultos.has(String(id)))
        );
        setupPhotosState();
        setupComparablesState();
        
        // Inicializar valores de rango según el valor de tasación
        // (solo como default: no pisar valores ya persistidos)
        const valorTasacion = tasacionCargada.resultado?.valor_final || tasacionCargada.datosCompletos?.resultado?.valor_final || 0;
        if (valorTasacion > 0) {
            if (reportConfig.valorRangoMin === '' || reportConfig.valorRangoMin == null) {
                reportConfig.valorRangoMin = Math.round(valorTasacion * 0.9);
            }
            if (reportConfig.valorRangoMax === '' || reportConfig.valorRangoMax == null) {
                reportConfig.valorRangoMax = Math.round(valorTasacion * 1.1);
            }
        }
        
        // Sincronizar inputs con los valores iniciales
        syncConfigInputs();
        
        mostrarEstadoVacio(false);
    } else {
        mostrarEstadoVacio(true);
    }

    setupConfigListeners();
    setupExpandablePanels();
    setupPhotosUpload();
    setupValorModalidadDropdown();
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
    // placeholder nunca se guarda, solo existe en el DOM de pantalla).
    // Excepción: los captions de fotos del inmueble (fotoCaptionN) no son
    // claves de reportConfig — escriben description del objeto de foto y
    // persisten por persistirFotosInmueble (mismo mecanismo que las fotos).
    const original = isNumber ? editingOriginalRaw.trim() : editingOriginalText.trim();
    if (value !== original) {
        const matchCaption = /^fotoCaption(\d+)$/.exec(key);
        if (matchCaption) {
            const idx = parseInt(matchCaption[1], 10);
            if (fotosTasacion[idx] && typeof fotosTasacion[idx] === 'object') {
                fotosTasacion[idx].description = value;
                persistirFotosInmueble();
            }
        } else {
            reportConfig[key] = value;
            persistirConfigInforme();
        }
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

    // Siempre habilitado: aunque la tasación no tenga fotos todavía, el
    // panel desplegable permite adjuntarlas ("Adjuntar fotografías").
    showPhotosCheckbox.disabled = false;
    const toggleLabel = showPhotosCheckbox.closest('.config-toggle');
    if (toggleLabel) toggleLabel.classList.remove('config-toggle-disabled');
    showPhotosCheckbox.checked = reportConfig.showPhotos;
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
    setupExpandPanel('btnExpandLogo', 'logoExpandPanel');
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
        carousel.innerHTML = '<p class="config-photos-empty">No hay fotos cargadas. Adjuntá fotografías del inmueble tasado.</p>';
        return;
    }

    carousel.innerHTML = fotosTasacion.map((foto, i) => {
        const url = foto.url || foto.src;
        const desc = foto.description || foto.descripcion || 'Foto ' + (i + 1);
        const inner = url
            ? `<img src="${url}" alt="${desc}">`
            : `<span class="config-photo-thumb-placeholder">${desc}</span>`;
        return `<div class="config-photo-thumb">${inner}
            <button type="button" class="config-photo-remove" data-index="${i}" title="Quitar fotografía">&times;</button>
        </div>`;
    }).join('');

    carousel.querySelectorAll('.config-photo-remove').forEach(btn => {
        btn.addEventListener('click', () => quitarFotoInmueble(parseInt(btn.dataset.index, 10)));
    });
}

function renderComparablesPanel() {
    const list = document.getElementById('comparablesList');
    if (!list) return;

    if (!comparablesResueltos.length) {
        list.innerHTML = '<p class="config-comparables-empty">No hay comparables en esta tasación</p>';
        return;
    }

    const esLote = tasacionCargada?.tipo === 'lote';
    list.innerHTML = comparablesResueltos.map(comp => {
        const dir = comp.ubicacion?.direccion || comp.direccion || 'Sin dirección';
        const selected = selectedComparableIds.has(comp.id);
        const fotos = comp.fotos || comp.photos || [];
        const thumbsHtml = fotos.length ? `
            <div class="config-comparable-photos">
                ${fotos.map((f, i) => {
                    const url = f.url || f.src;
                    return `<div class="config-photo-thumb config-photo-thumb-sm">
                        ${url ? `<img src="${url}" alt="">` : `<span class="config-photo-thumb-placeholder">Foto ${i + 1}</span>`}
                        <button type="button" class="config-photo-remove" data-comp="${comp.id}" data-index="${i}" title="Quitar fotografía">&times;</button>
                    </div>`;
                }).join('')}
            </div>` : '';
        return `
            <div class="config-comparable-row">
                <div class="config-comparable-main">
                    <button type="button" class="config-comparable-item${selected ? ' selected' : ''}" data-id="${comp.id}">
                        <span class="config-comparable-dot"></span>
                        <span class="config-comparable-address">${dir}</span>
                    </button>
                    ${esLote ? '' : `<button type="button" class="config-comparable-photo-btn" data-id="${comp.id}" title="Adjuntar fotografías del comparable (máx. ${FOTOS_COMPARABLE_MAX})">
                        <i class="fa-solid fa-camera"></i>${fotos.length ? ` ${fotos.length}/${FOTOS_COMPARABLE_MAX}` : ''}
                    </button>`}
                </div>
                ${thumbsHtml}
            </div>
        `;
    }).join('');

    list.querySelectorAll('.config-comparable-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const ocultos = new Set((reportConfig.comparablesOcultos || []).map(String));
            if (selectedComparableIds.has(id)) {
                selectedComparableIds.delete(id);
                ocultos.add(id);
                btn.classList.remove('selected');
            } else {
                selectedComparableIds.add(id);
                ocultos.delete(id);
                btn.classList.add('selected');
            }
            reportConfig.comparablesOcultos = [...ocultos];
            persistirConfigInforme();
            renderReportPreview();
        });
    });

    list.querySelectorAll('.config-comparable-photo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const comp = comparablesResueltos.find(c => c.id === btn.dataset.id);
            const actuales = comp ? (comp.fotos || comp.photos || []).length : 0;
            if (actuales >= FOTOS_COMPARABLE_MAX) {
                alert(`Este comparable ya tiene el máximo de ${FOTOS_COMPARABLE_MAX} fotografías. Quitá alguna para agregar otra.`);
                return;
            }
            const input = document.getElementById('comparablePhotoUpload');
            if (!input) return;
            input.dataset.compId = btn.dataset.id;
            input.click();
        });
    });

    list.querySelectorAll('.config-comparable-photos .config-photo-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            quitarFotoComparable(btn.dataset.comp, parseInt(btn.dataset.index, 10));
        });
    });
}

// =========================
// FOTOGRAFÍAS: carga y asociación
// =========================
// Pipeline: input file → dataURL redimensionado → estado (fotosTasacion /
// comp.fotos) → persistencia (PUT tasación / PUT snapshot) → re-render.
// Las fotos del inmueble viven en tasacion.datos.fotos; las de cada
// comparable viven dentro de su snapshot (comp.fotos).

const FOTO_MAX_DIM = 1400;
const FOTO_JPEG_QUALITY = 0.78;
const FOTOS_COMPARABLE_MAX = 4;

function procesarArchivoFoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
            img.onload = () => {
                const escala = Math.min(1, FOTO_MAX_DIM / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // JPEG no soporta alpha: si el recorte dejó zonas fuera de la
                // imagen (transparencia), exportar PNG para no volverlas negras.
                const datos = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let tieneAlpha = false;
                for (let i = 3; i < datos.length; i += 4) {
                    if (datos[i] < 255) { tieneAlpha = true; break; }
                }
                resolve({
                    url: canvas.toDataURL(tieneAlpha ? 'image/png' : 'image/jpeg', FOTO_JPEG_QUALITY),
                    description: file.name
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// Persistir la configuración del informe dentro de la tasación
// (datos.reportConfig se mergea en el JSONB existente, sin pisar
// el resto). Cliente/nomenclatura además actualizan sus columnas
// cuando el valor fue completado desde el informe (la tasación no
// lo traía), para que sea el mismo dato que usa el formulario.
async function persistirConfigInforme() {
    if (!tasacionCargada?.id) return;
    const payload = { datos: { reportConfig: { ...reportConfig } } };
    if (!tasacionCargada.clienteNombre && reportConfig.clienteNombre !== undefined) {
        payload.cliente_nombre = reportConfig.clienteNombre || '';
    }
    if (!tasacionCargada.nomenclaturaCatastral && reportConfig.nomenclaturaCatastral !== undefined) {
        payload.nomenclatura_catastral = reportConfig.nomenclaturaCatastral || '';
    }
    try {
        await actualizarTasacionAPI(tasacionCargada.id, payload);
    } catch (e) {
        console.error('No se pudo guardar la configuración del informe:', e);
    }
}

async function persistirFotosInmueble() {
    tasacionCargada.fotos = fotosTasacion;
    if (tasacionCargada.datosCompletos) {
        tasacionCargada.datosCompletos.fotos = fotosTasacion;
    }
    try {
        await actualizarTasacionAPI(tasacionCargada.id, { datos: { fotos: fotosTasacion } });
    } catch (e) {
        console.error('No se pudieron guardar las fotografías del inmueble:', e);
    }
}

async function agregarFotosInmueble(fileList) {
    if (!tasacionCargada) return;
    const archivos = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!archivos.length) return;
    // Recorte previo obligatorio: el informe muestra estas fotos en 4:3
    // (.report-photo-image). Solo lo confirmado por el usuario se guarda.
    const recortes = await recortarImagenes(archivos, {
        aspectRatio: 4 / 3,
        maxWidth: FOTO_MAX_DIM,
        outputFormat: 'image/jpeg',
        quality: FOTO_JPEG_QUALITY,
        titulo: 'Recortar fotografía'
    });
    if (!recortes.length) return;
    try {
        const nuevas = await Promise.all(recortes.map(({ file, blob }) =>
            procesarArchivoFoto(new File([blob], nombreArchivoRecortado(file, blob), { type: blob.type }))
        ));
        fotosTasacion = fotosTasacion.concat(nuevas);
        await persistirFotosInmueble();
    } catch (e) {
        console.error('No se pudieron procesar las fotografías:', e);
        return;
    }
    reportConfig.showPhotos = true;
    setupPhotosState();
    renderPhotosPanel();
    await renderReportPreview();
}

async function quitarFotoInmueble(index) {
    if (!tasacionCargada || index < 0 || index >= fotosTasacion.length) return;
    fotosTasacion.splice(index, 1);
    await persistirFotosInmueble();
    setupPhotosState();
    renderPhotosPanel();
    await renderReportPreview();
}

// Persistir un comparable: primero el PUT de snapshot por relación
// tasacion_comparable. Si la relación usa comparable_id NULL (comparable
// eliminado de la biblioteca → el endpoint devuelve 404), se usa el canal
// canónico comparables_ids + comparables_snapshots del PUT de tasación,
// preservando el prefijo "deleted_" para mantener la relación NULL.
async function persistirComparable(comp) {
    try {
        await actualizarSnapshotComparableTasacion(tasacionCargada.id, comp.id, comp);
    } catch (e) {
        try {
            const compId = String(comp.id || '');
            await actualizarTasacionAPI(tasacionCargada.id, {
                comparables_ids: tasacionCargada.comparables.map(c =>
                    c === comp && !compId.startsWith('deleted_')
                        ? `deleted_${compId}` : c.id
                ),
                comparables_snapshots: tasacionCargada.comparables
            });
        } catch (e2) {
            console.error('No se pudo persistir el comparable:', e2);
        }
    }
}

async function agregarFotosComparable(comparableId, fileList) {
    const comp = comparablesResueltos.find(c => c.id === comparableId);
    if (!comp || !tasacionCargada) return;
    const archivos = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!archivos.length) return;
    // Máximo de fotos por comparable: se valida antes de mutar el estado,
    // así una quinta foto nunca se acepta y las existentes quedan intactas.
    const actuales = (comp.fotos || comp.photos || []).length;
    const disponibles = FOTOS_COMPARABLE_MAX - actuales;
    if (disponibles <= 0) {
        alert(`Este comparable ya tiene el máximo de ${FOTOS_COMPARABLE_MAX} fotografías. Quitá alguna para agregar otra.`);
        return;
    }
    if (archivos.length > disponibles) {
        alert(`Máximo ${FOTOS_COMPARABLE_MAX} fotografías por comparable. Ya tiene ${actuales}: podés agregar ${disponibles} más (seleccionaste ${archivos.length}).`);
        return;
    }
    // Recorte 4:5: la celda dominante de la composición de la tarjeta
    // (1, 3 y 4 fotos). La celda aplica object-fit:cover, sin deformación.
    const recortes = await recortarImagenes(archivos, {
        aspectRatio: 4 / 5,
        maxWidth: FOTO_MAX_DIM,
        outputFormat: 'image/jpeg',
        quality: FOTO_JPEG_QUALITY,
        titulo: 'Recortar fotografía del comparable'
    });
    if (!recortes.length) return;
    try {
        const nuevas = await Promise.all(recortes.map(({ file, blob }) =>
            procesarArchivoFoto(new File([blob], nombreArchivoRecortado(file, blob), { type: blob.type }))
        ));
        const existentes = Array.isArray(comp.fotos) ? comp.fotos
            : (Array.isArray(comp.photos) ? comp.photos : []);
        comp.fotos = existentes.concat(nuevas);
    } catch (e) {
        console.error('No se pudieron procesar las fotografías:', e);
        return;
    }
    await persistirComparable(comp);
    reportConfig.showPhotos = true;
    setupPhotosState();
    renderComparablesPanel();
    await renderReportPreview();
}

async function quitarFotoComparable(comparableId, index) {
    const comp = comparablesResueltos.find(c => c.id === comparableId);
    if (!comp || !tasacionCargada || !Array.isArray(comp.fotos)) return;
    if (index < 0 || index >= comp.fotos.length) return;
    comp.fotos.splice(index, 1);
    await persistirComparable(comp);
    setupPhotosState();
    renderComparablesPanel();
    await renderReportPreview();
}

function setupPhotosUpload() {
    const input = document.getElementById('photosUpload');
    const btn = document.getElementById('btnAddPhotos');
    if (btn && input) {
        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files.length) agregarFotosInmueble(input.files);
            input.value = '';
        });
    }

    const compInput = document.getElementById('comparablePhotoUpload');
    if (compInput) {
        compInput.addEventListener('change', () => {
            const compId = compInput.dataset.compId;
            if (compId && compInput.files.length) {
                agregarFotosComparable(compId, compInput.files);
            }
            compInput.value = '';
            delete compInput.dataset.compId;
        });
    }
}

// =========================
// SELECTOR DE MODALIDAD DE VALOR
// =========================
// Dropdown con el lenguaje visual de la app. El <select> nativo queda
// oculto como fuente de verdad: las opciones se generan desde él y el
// flujo existente (change → reportConfig → re-render) no cambia.
function setupValorModalidadDropdown() {
    const select = document.getElementById('valorModalidad');
    const btn = document.getElementById('valorModalidadBtn');
    const menu = document.getElementById('valorModalidadMenu');
    const label = document.getElementById('valorModalidadLabel');
    if (!select || !btn || !menu || !label) return;

    // La modalidad "cierre" queda oculta como opción seleccionable, pero el
    // <option> y toda su lógica interna (ReportValuation, valorCierre) se mantienen.
    menu.innerHTML = [...select.options]
        .filter(o => o.value !== 'cierre')
        .map(o => `<li class="config-dropdown-option" role="option" data-value="${o.value}">${o.textContent}</li>`)
        .join('');

    const syncLabel = () => {
        const opt = select.options[select.selectedIndex];
        label.textContent = opt ? opt.textContent : '';
        menu.querySelectorAll('.config-dropdown-option').forEach(li => {
            li.classList.toggle('selected', li.dataset.value === select.value);
            li.setAttribute('aria-selected', li.dataset.value === select.value ? 'true' : 'false');
        });
    };

    const cerrarMenu = () => {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    };

    // La lista es absolute dentro del contenedor scrolleable: queda
    // pegada al botón y el panel la recorta en sus bordes. Solo hay que
    // decidir si abre hacia abajo o hacia arriba según el espacio que
    // queda dentro del área visible del panel.
    const evaluarDireccion = () => {
        const r = btn.getBoundingClientRect();
        const panel = document.querySelector('.config-panel-content');
        const pr = panel ? panel.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        const h = menu.offsetHeight;
        const espacioAbajo = pr.bottom - r.bottom - 4;
        const espacioArriba = r.top - pr.top - 4;
        const arriba = espacioAbajo < h && espacioArriba > espacioAbajo;
        menu.classList.toggle('config-dropdown-menu-up', arriba);
    };

    btn.addEventListener('click', () => {
        const abrir = menu.hidden;
        if (abrir) {
            menu.hidden = false; // visible para poder medir su alto
            evaluarDireccion();
            btn.setAttribute('aria-expanded', 'true');
        } else {
            cerrarMenu();
        }
    });

    window.addEventListener('scroll', () => {
        if (!menu.hidden) evaluarDireccion();
    }, true);
    window.addEventListener('resize', () => {
        if (!menu.hidden) evaluarDireccion();
    });

    menu.addEventListener('click', (e) => {
        const li = e.target.closest('.config-dropdown-option');
        if (!li) return;
        select.value = li.dataset.value;
        select.dispatchEvent(new Event('change'));
        cerrarMenu();
    });

    select.addEventListener('change', syncLabel);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#valorModalidadDropdown')) cerrarMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarMenu();
    });

    syncLabel();
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

// =========================
// AVISO "SIN LOGO" EN EL PREVIEW
// =========================
// Si el usuario activa "Mostrar logo" sin tener logo en su perfil, se
// muestra un aviso flotante al pie del panel de preview. "Agregar"
// abre el selector de archivo → recorte 1:1 → se persiste por el
// endpoint existente del perfil. "Cancelar" revierte el checkbox.
function ocultarAvisoSinLogo() {
    document.getElementById('reportLogoNotice')?.remove();
}

function mostrarAvisoSinLogo() {
    ocultarAvisoSinLogo();
    const host = document.querySelector('.preview-panel-content');
    if (!host) return;

    const aviso = document.createElement('div');
    aviso.id = 'reportLogoNotice';
    // report-preview-only: nunca aparece en impresión/PDF.
    aviso.className = 'report-logo-notice report-preview-only';
    aviso.innerHTML = `
        <p>No tenés un logo cargado en tu perfil.</p>
        <div class="report-logo-notice-actions">
            <button type="button" class="report-logo-notice-btn report-logo-notice-agregar">Agregar</button>
            <button type="button" class="report-logo-notice-btn report-logo-notice-cancelar">Cancelar</button>
        </div>
    `;
    host.appendChild(aviso);

    aviso.querySelector('.report-logo-notice-cancelar').addEventListener('click', () => {
        ocultarAvisoSinLogo();
        reportConfig.showLogo = false;
        const cb = document.getElementById('showLogo');
        if (cb) cb.checked = false;
        persistirConfigInforme();
        renderReportPreview();
    });

    aviso.querySelector('.report-logo-notice-agregar').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            const blob = await recortarImagen(file, {
                aspectRatio: 1,
                maxWidth: 800,
                outputFormat: 'preserve',
                quality: 0.9,
                titulo: 'Recortar logo'
            });
            if (!blob) return;
            try {
                await subirLogoInmobiliariaAPI(new File([blob], nombreArchivoRecortado(file, blob), { type: blob.type }));
                const perfil = await obtenerProfesionalAPI().catch(() => null);
                if (perfil?.profesional) profesionalActual = perfil.profesional;
                ocultarAvisoSinLogo();
                reportConfig.showLogo = true;
                persistirConfigInforme();
                await renderReportPreview();
            } catch (err) {
                alert('No se pudo guardar el logo: ' + (err.message || err));
            }
        });
        input.click();
    });
}

function setupConfigListeners() {
    const showLogoCheckbox = document.getElementById('showLogo');
    if (showLogoCheckbox) {
        showLogoCheckbox.addEventListener('change', (e) => {
            reportConfig.showLogo = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
            // Activado sin logo en el perfil → aviso dentro del preview
            // con opción de cargarlo o revertir el checkbox.
            if (e.target.checked && !profesionalActual?.logo_inmobiliaria) {
                mostrarAvisoSinLogo();
            } else {
                ocultarAvisoSinLogo();
            }
        });
    }

    // Opciones del logo: forma (circular/cuadrada) y logo en encabezado.
    // Se persisten en reportConfig como el resto de la configuración.
    document.querySelectorAll('[data-logo-forma]').forEach(btn => {
        btn.addEventListener('click', () => {
            reportConfig.logoForma = btn.dataset.logoForma;
            persistirConfigInforme();
            syncLogoOptionButtons();
            renderReportPreview();
        });
    });
    document.querySelectorAll('[data-logo-header]').forEach(btn => {
        btn.addEventListener('click', () => {
            reportConfig.logoHeader = btn.dataset.logoHeader === '1';
            persistirConfigInforme();
            syncLogoOptionButtons();
            renderReportPreview();
        });
    });

    // Tema de acento del informe: cambia solo variables CSS
    // (data-report-theme en #reportViewer) — no requiere re-render.
    document.querySelectorAll('[data-accent]').forEach(btn => {
        btn.addEventListener('click', () => {
            reportConfig.accentTheme = btn.dataset.accent;
            persistirConfigInforme();
            aplicarTemaAcento();
        });
    });

    const showPhotosCheckbox = document.getElementById('showPhotos');
    if (showPhotosCheckbox) {
        showPhotosCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showPhotos = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    const showComparablesCheckbox = document.getElementById('showComparables');
    if (showComparablesCheckbox) {
        showComparablesCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showComparables = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    const showMethodologyCheckbox = document.getElementById('showMethodology');
    if (showMethodologyCheckbox) {
        showMethodologyCheckbox.addEventListener('change', (e) => {
            reportConfig.showMethodology = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    // Detalle de ambientes
    const showAmbientesCheckbox = document.getElementById('showAmbientes');
    if (showAmbientesCheckbox) {
        showAmbientesCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showAmbientes = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    // Propiedades en competencia
    const showCompetitionCheckbox = document.getElementById('showCompetition');
    if (showCompetitionCheckbox) {
        showCompetitionCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showCompetition = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    // Análisis FODA
    const showFODACheckbox = document.getElementById('showFODA');
    if (showFODACheckbox) {
        showFODACheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            reportConfig.showFODA = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    // Datos profesionales
    const showProfessionalDataCheckbox = document.getElementById('showProfessionalData');
    if (showProfessionalDataCheckbox) {
        showProfessionalDataCheckbox.addEventListener('change', (e) => {
            reportConfig.showProfessionalData = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    // Condiciones de trabajo
    const showWorkConditionsCheckbox = document.getElementById('showWorkConditions');
    if (showWorkConditionsCheckbox) {
        showWorkConditionsCheckbox.addEventListener('change', (e) => {
            reportConfig.showWorkConditions = e.target.checked;
            persistirConfigInforme();
            renderReportPreview();
        });
    }

    // Presentación del valor
    const valorModalidadSelect = document.getElementById('valorModalidad');
    if (valorModalidadSelect) {
        valorModalidadSelect.addEventListener('change', (e) => {
            reportConfig.valorModalidad = e.target.value;
            persistirConfigInforme();
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

    // La tasación sí está cargada: un fallo de render no debe mostrar
    // "No hay tasación cargada", sino un error explícito.
    const mostrarErrorRender = (err) => {
        console.error('Error al renderizar el informe:', err);
        mostrarEstadoVacio(false);
        reportViewer.innerHTML = `
            <div class="report-render-error" style="padding: 40px; text-align: center; color: var(--color-text-secondary, #666);">
                <p><strong>No se pudo generar la vista previa del informe.</strong></p>
                <p>La tasación está cargada pero ocurrió un error al armar el documento.</p>
            </div>
        `;
    };

    let reportData;
    try {
        reportData = await obtenerReportData();
    } catch (err) {
        mostrarErrorRender(err);
        return;
    }
    if (!reportData) {
        mostrarErrorRender(new Error('obtenerReportData devolvió vacío'));
        return;
    }

    const showComparables = reportConfig.showComparables && selectedComparableIds.size > 0;

    try {
        reportViewer.innerHTML = await ReportViewerProfessional({
            reportData,
            config: {
                ...reportConfig,
                showComparables
            }
        });

        // Numeración "x de y" en el pie de cada hoja + encabezado en
        // todas menos la portada. Se agregan después del paginado (no
        // forman parte del contenido medido).
        const hojas = reportViewer.querySelectorAll('.report-page');
        const logoHeaderUrl = reportData?.reportInfo?.logo_inmobiliaria_url;
        const refNumero = reportData?.reportInfo?.reportNumber || '';
        const logoCircular = reportConfig.logoForma === 'circular';
        hojas.forEach((page, i) => {
            if (!page.classList.contains('report-page-cover')) {
                const header = document.createElement('div');
                header.className = 'report-page-header';
                const logoImg = (reportConfig.showLogo !== false && reportConfig.logoHeader && logoHeaderUrl)
                    ? `<img class="report-page-header-logo${logoCircular ? ' circular' : ''}" src="${logoHeaderUrl}" alt="" onerror="this.style.display='none'">`
                    : '';
                header.innerHTML = `
                    <div class="report-page-header-left">${logoImg}</div>
                    <div class="report-page-header-right">Informe de Tasación Inmobiliaria | Ref: ${refNumero}</div>`;
                page.appendChild(header);
            }
            const num = document.createElement('div');
            num.className = 'report-page-number';
            num.textContent = `${i + 1} de ${hojas.length}`;
            page.appendChild(num);
        });

        // Verificar overflow después de renderizar
        const paginator = getReportPaginator();
        await paginator.verifyPageOverflow();
    } catch (err) {
        mostrarErrorRender(err);
        return;
    }

    // Asegurar que el estado vacío esté oculto después de renderizar exitosamente
    mostrarEstadoVacio(false);
}

function actualizarOpcionesSegunTipo() {
    if (!tasacionCargada) return;
    
    const tipo = tasacionCargada.tipo || 'lote';
    
    // FODA y propiedades en competencia: no aplican a lotes — se oculta
    // solo su propio renglón (las demás opciones del grupo quedan visibles).
    const esLote = tipo === 'lote';
    const ocultarOpcion = (checkboxId, configKey) => {
        const checkbox = document.getElementById(checkboxId);
        const fila = checkbox?.closest('label.config-toggle') || checkbox?.closest('.config-section');
        if (!fila) return;
        fila.style.display = esLote ? 'none' : '';
        if (esLote) {
            checkbox.checked = false;
            reportConfig[configKey] = false;
        }
    };
    ocultarOpcion('showFODA', 'showFODA');
    ocultarOpcion('showCompetition', 'showCompetition');
    ocultarOpcion('showAmbientes', 'showAmbientes');
    
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
    persistirConfigInforme();
    renderReportPreview();
}

function syncConfigInputs() {
    // El panel solo contiene controles de visibilidad y selectores.
    // Los textos se editan exclusivamente desde el Preview (edición directa).
    if (document.getElementById('showLogo')) document.getElementById('showLogo').checked = reportConfig.showLogo;
    if (document.getElementById('showPhotos')) document.getElementById('showPhotos').checked = reportConfig.showPhotos;
    if (document.getElementById('showAmbientes')) document.getElementById('showAmbientes').checked = reportConfig.showAmbientes;
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

    syncLogoOptionButtons();
    aplicarTemaAcento();
}

function syncLogoOptionButtons() {
    document.querySelectorAll('[data-logo-forma]').forEach(b =>
        b.classList.toggle('is-selected', b.dataset.logoForma === reportConfig.logoForma));
    document.querySelectorAll('[data-logo-header]').forEach(b =>
        b.classList.toggle('is-selected', (b.dataset.logoHeader === '1') === !!reportConfig.logoHeader));
}

// Tema de acento: aplica data-report-theme sobre el contenedor del
// informe (las variables --report-* del tema viven en report-pdf.css)
// y marca el punto seleccionado en el panel.
function aplicarTemaAcento() {
    const viewer = document.getElementById('reportViewer');
    if (viewer) viewer.dataset.reportTheme = reportConfig.accentTheme || 'verde';
    document.querySelectorAll('[data-accent]').forEach(b =>
        b.classList.toggle('is-selected', b.dataset.accent === reportConfig.accentTheme));
}

function getReportConfig() {
    return { ...reportConfig };
}

document.addEventListener('DOMContentLoaded', initVistaPreviaInforme);
