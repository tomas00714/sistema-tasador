/**
 * Componentes del sistema de informes
 * 
 * Este archivo contiene funciones que generan el HTML de cada sección
 * del informe. Cada componente recibe props (datos) y retorna HTML.
 * 
 * Arquitectura:
 * - Cada componente es una función pura que recibe datos y retorna HTML
 * - Los componentes son reutilizables y pueden componerse
 * - El mismo HTML se usa para vista previa, impresión y exportación PDF
 */

// Importar el selector tipo-aware desde report-data-adapter
// Nota: TasacionDataSelector se definirá en report-data-adapter.js y estará disponible globalmente

// =========================
// EDICIÓN DIRECTA EN VISTA PREVIA
// =========================
// Helper: genera los atributos de un elemento editable inline.
// - data-editable="<configKey>": clave de reportConfig que alimenta el texto.
// - data-editable-multiline: permite saltos de línea (campos de textarea).
// - data-ph: texto de placeholder que se muestra SOLO en pantalla
//   cuando el campo está vacío (vía ::before en @media screen).
// - is-empty: marca campos sin contenido real.
// El placeholder nunca forma parte del contenido real del informe.
function editableAttrs(key, value, { multiline = false, ph = 'Hacé clic para editar' } = {}) {
    const empty = !value || String(value).trim() === '';
    return `data-editable="${key}" data-ph="${ph}"${multiline ? ' data-editable-multiline' : ''}${empty ? ' data-empty="1"' : ''}`;
}

// Clase extra para aplicar junto a editableAttrs()
function editableClass(value) {
    const empty = !value || String(value).trim() === '';
    return `report-editable${empty ? ' is-empty' : ''}`;
}

// Vacío para edición: '', '-', '—' se consideran sin contenido
function isEmptyEditable(value) {
    const v = String(value ?? '').trim();
    return v === '' || v === '-' || v === '—';
}

// Controles de edición del informe (.report-editor-control): elementos de UI
// que nunca se imprimen. El botón "−" de valor oculta el renglón SIN borrar
// el dato: solo marca reportConfig[key + 'Oculto'] (la fila pasa a mostrar
// un control "+" compacto). El botón "+" restaura la fila con su valor.
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.report-editor-control[data-remove-value]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const key = btn.dataset.removeValue;
    if (!key || typeof reportConfig === 'undefined') return;
    reportConfig[`${key}Oculto`] = true;
    if (typeof persistirConfigInforme === 'function') persistirConfigInforme();
    if (typeof renderReportPreview === 'function') {
        renderReportPreview();
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.report-editor-control[data-restore-value]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const key = btn.dataset.restoreValue;
    if (!key || typeof reportConfig === 'undefined') return;
    reportConfig[`${key}Oculto`] = false;
    if (typeof persistirConfigInforme === 'function') persistirConfigInforme();
    if (typeof renderReportPreview === 'function') {
        renderReportPreview();
    }
});

// =========================
// COMPONENTE: ReportPage
// Contenedor principal con dimensiones A4
// =========================
function ReportPage({ children }) {
    return `
        <div class="report-page">
            ${children}
        </div>
    `;
}

// =========================
// COMPONENTE: ReportHeader
// Encabezado del informe con logo, título y fecha
// =========================
function ReportHeader({ reportInfo, showLogo = true }) {
    // Logo no implementado - el archivo ImagenInicio.png no existe en el proyecto
    const logoHtml = '';

    return `
        <header class="report-header">
            ${logoHtml}
            <h1 class="report-title">${reportInfo.title}</h1>
            <p class="report-date">Fecha: ${reportInfo.date} | N: ${reportInfo.reportNumber}</p>
            <p class="report-date">Tasador: ${reportInfo.tasador} | Matrícula: ${reportInfo.matricula}</p>
        </header>
    `;
}

// =========================
// COMPONENTE: ReportPropertyInfo
// Información básica de la propiedad
// =========================
function ReportPropertyInfo({ property }) {
    return `
        <section class="report-section">
            <h2 class="report-section-title">Información de la Propiedad</h2>
            <div class="report-property-info">
                <div class="report-info-item">
                    <span class="report-info-label">Tipo</span>
                    <span class="report-info-value">${property.type}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Dirección</span>
                    <span class="report-info-value">${property.address}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Ciudad</span>
                    <span class="report-info-value">${property.city}, ${property.province}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">País</span>
                    <span class="report-info-value">${property.country}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Superficie Total</span>
                    <span class="report-info-value">${property.surfaceTotal} m2</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Superficie Cubierta</span>
                    <span class="report-info-value">${property.surfaceCovered} m2</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Ambientes</span>
                    <span class="report-info-value">${property.rooms}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Dormitorios</span>
                    <span class="report-info-value">${property.bedrooms}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Baños</span>
                    <span class="report-info-value">${property.bathrooms}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Antigüedad</span>
                    <span class="report-info-value">${property.age} años</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Piso</span>
                    <span class="report-info-value">${property.floor}/${property.totalFloors}</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Orientación</span>
                    <span class="report-info-value">${property.orientation}</span>
                </div>
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportCharacteristics
// Características detalladas de la propiedad
// =========================
function ReportCharacteristics({ characteristics, property }) {
    const extraItems = (characteristics.extra || []).map(item => `
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">${item.label}</div>
                    <div class="report-characteristics-value">${item.value}</div>
                </div>
    `).join('');

    return `
        <section class="report-section">
            <h2 class="report-section-title">Características</h2>
            <div class="report-characteristics">
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Característica constructiva</div>
                    <div class="report-characteristics-value">${characteristics.constructionQuality}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Estado</div>
                    <div class="report-characteristics-value">${characteristics.state}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Calefacción</div>
                    <div class="report-characteristics-value">${characteristics.heating}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Refrigeración</div>
                    <div class="report-characteristics-value">${characteristics.cooling}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Pisos</div>
                    <div class="report-characteristics-value">${characteristics.flooring}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Cocina</div>
                    <div class="report-characteristics-value">${characteristics.kitchen}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Ventanas</div>
                    <div class="report-characteristics-value">${characteristics.windows}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Cochera</div>
                    <div class="report-characteristics-value">${property.parking ? 'Sí' : 'No'}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Baulera</div>
                    <div class="report-characteristics-value">${property.storage ? 'Sí' : 'No'}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Balcón</div>
                    <div class="report-characteristics-value">${property.balcony ? 'Sí' : 'No'}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Terraza</div>
                    <div class="report-characteristics-value">${property.terrace ? 'Sí' : 'No'}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Pileta</div>
                    <div class="report-characteristics-value">${property.pool ? 'Sí' : 'No'}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Gimnasio</div>
                    <div class="report-characteristics-value">${property.gym ? 'Sí' : 'No'}</div>
                </div>
                <div class="report-characteristics-item">
                    <div class="report-characteristics-label">Seguridad</div>
                    <div class="report-characteristics-value">${property.security ? '24hs' : 'No'}</div>
                </div>
                ${extraItems}
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportComparablesVisual
// Sección visual/descriptiva de comparables con metodología
// =========================
function ReportComparablesVisual({ comparables }) {
    if (!comparables || comparables.length === 0) {
        return '';
    }

    const formatearPrecio = (n) => formatearMonto(n);

    const comparablesCards = comparables.map((comp, index) => {
        const superficie = comp.surfaceTotal || '-';
        const ambientes = comp.rooms || '-';
        const precio = comp.price ? '$' + formatearPrecio(comp.price) + ' USD' : '-';
        const valorM2 = comp.pricePerM2 ? '$' + formatearPrecio(comp.pricePerM2) + ' USD/m2' : '-';
        const numero = `COMPARABLE ${String(index + 1).padStart(2, '0')}`;
        // Hasta 4 fotos a la izquierda de la ficha; el layout exacto lo
        // define el modificador -N (1: 4:5 | 2: 3:4 lado a lado |
        // 3: dos arriba + una abajo-izq | 4: 2×2).
        const fotos = (Array.isArray(comp.photos) ? comp.photos : [])
            .map(f => f.url || f.src || null)
            .filter(Boolean)
            .slice(0, 4);
        const fotosHtml = fotos.length ? `
            <div class="report-comparable-card-photos report-comparable-card-photos-${fotos.length}">
                ${fotos.map(src => `<div class="report-comparable-card-photo-cell"><img src="${src}" alt="${numero} - ${comp.address || ''}" class="report-comparable-card-photo" loading="lazy"></div>`).join('')}
            </div>
        ` : '';

        return `
            <div class="report-comparable-card">
                ${fotosHtml}
                <div class="report-comparable-card-main">
                    <div class="report-comparable-card-header">
                        <span class="report-comparable-card-number">${numero}</span>
                        <h4 class="report-comparable-card-title">${comp.address || 'Dirección no disponible'}</h4>
                    </div>
                    <div class="report-comparable-card-body">
                        <div class="report-comparable-card-info">
                            <div class="report-comparable-card-item${isEmptyEditable(superficie) ? ' report-preview-only' : ''}">
                                <span class="report-comparable-card-label">Superficie:</span>
                                <span class="report-comparable-card-value">${superficie}${typeof superficie === 'number' ? ' m2' : ''}</span>
                            </div>
                            <div class="report-comparable-card-item${isEmptyEditable(ambientes) ? ' report-preview-only' : ''}">
                                <span class="report-comparable-card-label">Ambientes:</span>
                                <span class="report-comparable-card-value">${ambientes}</span>
                            </div>
                            <div class="report-comparable-card-item${isEmptyEditable(comp.price) ? ' report-preview-only' : ''}">
                                <span class="report-comparable-card-label">Precio:</span>
                                <span class="report-comparable-card-value">${precio}</span>
                            </div>
                            <div class="report-comparable-card-item${isEmptyEditable(comp.pricePerM2) ? ' report-preview-only' : ''}">
                                <span class="report-comparable-card-label">Valor/m2:</span>
                                <span class="report-comparable-card-value">${valorM2}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <section class="report-section">
            <h2 class="report-section-title">Comparables de Mercado</h2>
            <div class="report-comparables-visual-grid">
                ${comparablesCards}
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportDocumentation
// Sección de documentación adjunta (pendiente de implementación)
// =========================
function ReportDocumentation({ config }) {
    // Actualmente no existe sistema de subida/persistencia de documentos
    // Esta sección queda preparada conceptualmente para implementación futura
    return '';
}

// =========================
// COMPONENTE: ReportComparables
// Tabla de propiedades comparables
// =========================
function ReportComparables({ comparables, valuation }) {
    const formatearPrecio = (n) => formatearMonto(n);

    const comparablesRows = comparables.map(comp => `
        <tr>
            <td>${comp.address}</td>
            <td>${comp.surfaceTotal}${typeof comp.surfaceTotal === 'number' ? ' m2' : comp.surfaceTotal !== '-' ? ' m2' : ''}</td>
            <td>${comp.rooms}</td>
            <td>${comp.age}${typeof comp.age === 'number' ? ' años' : comp.age !== '-' ? '' : ''}</td>
            <td>${typeof comp.distance === 'number' ? comp.distance + ' m' : comp.distance}</td>
            <td>$${formatearPrecio(comp.price)}</td>
            <td>$${formatearPrecio(comp.pricePerM2)}</td>
        </tr>
    `).join('');

    return `
        <section class="report-section">
            <h2 class="report-section-title">Comparables de Mercado</h2>
            <table class="report-comparables-table">
                <thead>
                    <tr>
                        <th>Dirección</th>
                        <th>Sup. Total</th>
                        <th>Ambientes</th>
                        <th>Antigüedad</th>
                        <th>Distancia</th>
                        <th>Precio</th>
                        <th>Precio/m2</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparablesRows}
                </tbody>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: var(--color-primary-light); border-radius: 8px;">
                <strong>Valor de tasación estimado:</strong> 
                $${formatearMonto(valuation.estimatedValue)} ${valuation.currency}
                ($${formatearMonto(valuation.valuePerM2)} ${valuation.currency}/m2)
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportPhotos
// Grid de fotografías de la propiedad
// =========================
function ReportPhotos({ photos }) {
    if (!photos || photos.length === 0) {
        return '';
    }

    const photosHtml = photos.map((photo, index) => {
        // El caption es editable (data-editable="fotoCaptionN" →
        // fotosTasacion[i].description). Vacío → report-preview-only: en
        // pantalla queda el placeholder editable; en PDF no hay caption.
        const descripcion = photo.description ?? photo.descripcion ?? '';
        const url = photo.url || photo.src || null;

        return `
            <div class="report-photo-item">
                ${url
                    ? `<img src="${url}" alt="${descripcion}" class="report-photo-image">`
                    : `<div class="report-photo-placeholder">${descripcion}</div>`
                }
                <div class="report-photo-caption${isEmptyEditable(descripcion) ? ' report-preview-only' : ''}">
                    <span class="${editableClass(descripcion)}" ${editableAttrs('fotoCaption' + index, descripcion, { ph: 'Nombre de la fotografía' })}>${descripcion}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <section class="report-section report-photos-section">
            <h2 class="report-section-title">Documentación Adjunta del Inmueble</h2>
            <div class="report-photos-grid">
                ${photosHtml}
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportCompetition
// Propiedades en competencia
// =========================
function ReportCompetition({ reportData, config }) {
    // Si el toggle está desactivado, no mostrar nada
    if (!config?.showCompetition) {
        return '';
    }

    // Intentar obtener propiedades en competencia de los datos existentes
    const propiedadesCompetencia = reportData?.tasacion?.propiedadesCompetencia || 
                                   reportData?.tasacion?.competencia || 
                                   [];

    // Si no hay datos, no mostrar sección vacía
    if (!propiedadesCompetencia || propiedadesCompetencia.length === 0) {
        return '';
    }

    const formatearPrecio = (n) => formatearMonto(n);

    const propiedadesRows = propiedadesCompetencia.map(prop => {
        const direccion = prop.ubicacion?.direccion || prop.direccion || '-';
        const tipo = prop.tipo || prop.tipoInmueble || '-';
        const superficie = prop.superficie || prop.lote?.caracteristicas?.superficie || '-';
        const ambientes = prop.ambientes || prop.departamento?.ambientes || prop.casa?.ambientes || '-';
        const precio = prop.valor || prop.precio || '-';
        const valorM2 = prop.valorM2 || (superficie && precio ? (precio / superficie).toFixed(0) : '-');
        const estado = prop.estado || prop.observaciones || '-';
        const fuente = prop.fuente || prop.publicacion || '-';

        return `
            <tr>
                <td>${direccion}</td>
                <td>${tipo}</td>
                <td>${superficie}${typeof superficie === 'number' ? ' m2' : ''}</td>
                <td>${ambientes}</td>
                <td style="text-align: right;">$${formatearPrecio(precio)}</td>
                <td style="text-align: right;">$${formatearPrecio(valorM2)}</td>
                <td>${estado}</td>
                <td>${fuente}</td>
            </tr>
        `;
    }).join('');

    return `
        <section class="report-section report-competition-section">
            <h2 class="report-section-title">Propiedades en Competencia</h2>
            <table class="report-competition-table">
                <thead>
                    <tr>
                        <th>Dirección</th>
                        <th>Tipo</th>
                        <th>Superficie</th>
                        <th>Ambientes</th>
                        <th>Precio</th>
                        <th>Precio/m2</th>
                        <th>Estado</th>
                        <th>Fuente</th>
                    </tr>
                </thead>
                <tbody>
                    ${propiedadesRows}
                </tbody>
            </table>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportFODA
// Análisis FODA
// =========================
function ReportFODA({ config }) {
    // Si el toggle está desactivado, no mostrar nada
    if (!config?.showFODA) {
        return '';
    }

    const fortalezas = config?.fodaFortalezas || '';
    const oportunidades = config?.fodaOportunidades || '';
    const debilidades = config?.fodaDebilidades || '';
    const amenazas = config?.fodaAmenazas || '';

    // Sección habilitada: en Preview se muestran los 4 bloques siempre,
    // con placeholders editables en los que están vacíos.
    // Si TODOS están vacíos, la sección es report-preview-only → no se imprime
    // (el PDF conserva el comportamiento anterior: sección ausente).
    const allEmpty = !fortalezas && !oportunidades && !debilidades && !amenazas;

    const fodaBlock = (key, value, title, ph) => {
        const empty = !value || String(value).trim() === '';
        return `
                <div class="report-foda-block${empty ? ' report-preview-only' : ''}">
                    <h3 class="report-foda-title">${title}</h3>
                    <p class="report-foda-content ${editableClass(value)}" ${editableAttrs(key, value, { multiline: true, ph })}>${value}</p>
                </div>
                `;
    };

    return `
        <section class="report-section report-foda-section${allEmpty ? ' report-preview-only' : ''}">
            <h2 class="report-section-title">Análisis FODA</h2>
            <div class="report-foda-grid">
                ${fodaBlock('fodaFortalezas', fortalezas, 'Fortalezas', 'Completar para mostrar este cuadro.')}
                ${fodaBlock('fodaOportunidades', oportunidades, 'Oportunidades', 'Completar para mostrar este cuadro.')}
                ${fodaBlock('fodaDebilidades', debilidades, 'Debilidades', 'Completar para mostrar este cuadro.')}
                ${fodaBlock('fodaAmenazas', amenazas, 'Amenazas', 'Completar para mostrar este cuadro.')}
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportMethodology
// Descripción de la metodología aplicada
// =========================
function ReportMethodology({ methodology, introduction, config }) {
    const textoMetodologia = config?.textoMetodologia || methodology.description;
    const factorsHtml = methodology.factors.map(factor => 
        `<li>${factor}</li>`
    ).join('');

    const adjustmentsHtml = methodology.adjustments.map(adjustment => 
        `<li>${adjustment}</li>`
    ).join('');

    return `
        <section class="report-section">
            <h2 class="report-section-title">Metodología de Tasación</h2>
            <p class="report-methodology-text ${editableClass(textoMetodologia)}" ${editableAttrs('textoMetodologia', textoMetodologia, { multiline: true, ph: 'Describa la metodología de tasación aplicada' })}>${textoMetodologia}</p>
            
            <h3 style="font-size: 1rem; font-weight: 600; margin: 16px 0 8px;">Factores considerados:</h3>
            <ul style="margin: 0; padding-left: 20px; color: var(--color-text-secondary);">
                ${factorsHtml}
            </ul>
            
            <h3 style="font-size: 1rem; font-weight: 600; margin: 16px 0 8px;">Ajustes aplicados:</h3>
            <ul style="margin: 0; padding-left: 20px; color: var(--color-text-secondary);">
                ${adjustmentsHtml}
            </ul>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportConclusion
// Conclusiones y observaciones finales
// =========================
function ReportConclusion({ conclusion, observations, valuation, config }) {
    const conclusionText = config?.conclusion || conclusion;
    const observationsText = config?.observations || observations;

    return `
        <section class="report-section">
            <h2 class="report-section-title">Observaciones Finales</h2>
            <p class="report-methodology-text ${editableClass(observationsText)}" ${editableAttrs('observations', observationsText, { multiline: true, ph: 'Hacé clic para agregar observaciones finales' })}>${observationsText}</p>
            
            <div class="report-conclusion" style="margin-top: 24px;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 12px;">Conclusión</h3>
                <p class="report-conclusion-text ${editableClass(conclusionText)}" ${editableAttrs('conclusion', conclusionText, { multiline: true, ph: 'Hacé clic para agregar la conclusión' })}>${conclusionText}</p>
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportFooter
// Pie de página del informe
// =========================
function ReportFooter({ reportInfo, client }) {
    return `
        <footer class="report-footer">
            <p>Informe Ndeg ${reportInfo.reportNumber} | Generado el ${reportInfo.date}</p>
            <p>Solicitado por: ${client.name} | ${client.purpose}</p>
            <p>Este informe tiene carácter confidencial y es para uso exclusivo del solicitante.</p>
        </footer>
    `;
}

// =========================
// COMPONENTE: ReportViewer (DEPRECATED - Use ReportViewerProfessional)
// Componente principal que orquesta todos los demás
// =========================
// Este componente está obsoleto. Usar ReportViewerProfessional en su lugar.
// function ReportViewer({ reportData, config }) { ... }

// =========================
// NUEVOS COMPONENTES PARA INFORME PROFESIONAL
// =========================

// =========================
// COMPONENTE: ReportCover
// Portada profesional del informe
// =========================
function ReportCover({ reportInfo, selector, showLogo = true, config }) {
    const tipoInmueble = selector.tipo === 'lote' ? 'Lote' :
                          selector.tipo === 'departamento' ? 'Departamento' : 'Casa';

    const showProfessionalData = config?.showProfessionalData !== false;
    const inmobiliaria = reportInfo.inmobiliaria || '';
    const tasador = reportInfo.tasador || '';
    const matricula = reportInfo.matricula || '';
    const tituloInforme = reportInfo.title || 'INFORME DE TASACIÓN';

    const logoHtml = (showLogo && reportInfo.logo_inmobiliaria_url)
        ? `<img class="report-cover-logo${config?.logoForma === 'circular' ? ' circular' : ''}" src="${reportInfo.logo_inmobiliaria_url}" alt="Logo" onerror="this.style.display='none'" />`
        : '';

    return `
        <div class="report-cover">
            ${logoHtml}
            <div class="report-cover-content">
                ${showProfessionalData ? `
                <div class="report-cover-inmobiliaria ${isEmptyEditable(inmobiliaria) ? 'report-preview-only' : ''}">
                    <span class="report-cover-inmobiliaria-label ${editableClass(inmobiliaria)}" ${editableAttrs('inmobiliaria', inmobiliaria, { ph: 'Inmobiliaria' })}>${inmobiliaria}</span>
                </div>
                ` : ''}
                <h1 class="report-cover-title ${editableClass(tituloInforme)}" ${editableAttrs('title', tituloInforme, { ph: 'Título del informe' })}>${tituloInforme}</h1>
                <div class="report-cover-subtitle">${tipoInmueble}</div>

                <div class="report-cover-details">
                    <div class="report-cover-detail">
                        <span class="report-cover-label">Fecha:</span>
                        <span class="report-cover-value">${reportInfo.date}</span>
                    </div>
                    ${showProfessionalData ? `
                    <div class="report-cover-detail ${isEmptyEditable(tasador) ? 'report-preview-only' : ''}">
                        <span class="report-cover-label">Tasador:</span>
                        <span class="report-cover-value ${editableClass(tasador)}" ${editableAttrs('tasador', tasador, { ph: 'Nombre del tasador' })}>${tasador}</span>
                    </div>
                    <div class="report-cover-detail ${isEmptyEditable(matricula) ? 'report-preview-only' : ''}">
                        <span class="report-cover-label">Matrícula:</span>
                        <span class="report-cover-value ${editableClass(matricula)}" ${editableAttrs('matricula', matricula, { ph: 'Matrícula' })}>${matricula}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// =========================
// COMPONENTE: ReportReference
// Índice de referencia de la tasación
// =========================
function ReportReference({ selector, reportInfo, config }) {
    const ubicacion = selector.tasacion.ubicacion || {};
    
    let caracteristicasInmueble = '';
    
    // report-preview-only en la fila: el campo sigue existiendo en pantalla
    // (editable cuando corresponda) pero desaparece por completo al imprimir
    // cuando el dato está vacío.
    const claseSiVacio = (v) => isEmptyEditable(v) ? ' report-preview-only' : '';

    if (selector.tipo === 'lote') {
        const tipoLote = selector.getTipoLote();
        const superficie = selector.getSuperficieTotal();
        const antiguedad = selector.getAntiguedad();
        caracteristicasInmueble = `
            <div class="report-reference-item${claseSiVacio(tipoLote)}">
                <span class="report-reference-label">Tipo de lote:</span>
                <span class="report-reference-value">${tipoLote || '-'}</span>
            </div>
            <div class="report-reference-item${claseSiVacio(superficie)}">
                <span class="report-reference-label">Superficie:</span>
                <span class="report-reference-value">${superficie || '-'}${!isEmptyEditable(superficie) && !/m/i.test(String(superficie)) ? ' m2' : ''}</span>
            </div>
            <div class="report-reference-item${claseSiVacio(antiguedad)}">
                <span class="report-reference-label">Antigüedad:</span>
                <span class="report-reference-value">${!isEmptyEditable(antiguedad) ? antiguedad + ' años' : '-'}</span>
            </div>
        `;
    } else if (selector.mostrarAmbientes()) {
        const ambientes = selector.getAmbientes();
        const superficie = selector.getSuperficieCubierta();
        const antiguedad = selector.getAntiguedad();
        caracteristicasInmueble = `
            <div class="report-reference-item${claseSiVacio(ambientes)}">
                <span class="report-reference-label">Ambientes:</span>
                <span class="report-reference-value">${ambientes || '-'}</span>
            </div>
            <div class="report-reference-item${claseSiVacio(superficie)}">
                <span class="report-reference-label">Superficie cubierta:</span>
                <span class="report-reference-value">${superficie || '-'}${!isEmptyEditable(superficie) && !/m/i.test(String(superficie)) ? ' m2' : ''}</span>
            </div>
            <div class="report-reference-item${claseSiVacio(antiguedad)}">
                <span class="report-reference-label">Antigüedad:</span>
                <span class="report-reference-value">${!isEmptyEditable(antiguedad) ? antiguedad + ' años' : '-'}</span>
            </div>
        `;
    }

    const consideracionesPrevias = config?.consideracionesPrevias || '';
    const consideracionesVacias = isEmptyEditable(consideracionesPrevias);

    // Finalidad: vive en reportConfig y se edita directamente en el
    // informe (bloque de texto bajo "Consideraciones Previas"). Los
    // valores auto-generados heredados (viejo input de tasación / viejo
    // default de config) no cuentan como edición del usuario y pasan al
    // texto predeterminado; una finalidad personalizada persistida en la
    // tasación se conserva.
    const FINALIDAD_DEFAULT = 'La finalidad de la tasación es determinar el valor de mercado del inmueble con fines de venta.';
    const FINALIDAD_AUTO = ['Tasación comercial', 'Determinar el valor venal de mercado del inmueble para su venta.'];
    let finalidadTexto = config?.finalidadTasacion;
    if (finalidadTexto == null || FINALIDAD_AUTO.includes(finalidadTexto)) {
        const heredada = selector.tasacion.finalidad;
        finalidadTexto = (heredada && !FINALIDAD_AUTO.includes(heredada)) ? heredada : FINALIDAD_DEFAULT;
    }
    const finalidadVacia = isEmptyEditable(finalidadTexto);

    // Campos del solicitante: editables directo en el informe. Si el
    // usuario los editó (reportConfig), ese valor tiene prioridad; si no,
    // se muestra el dato de la tasación.
    const clienteNombre = config?.clienteNombre ?? selector.tasacion.clienteNombre ?? '';
    const nomenclaturaCatastral = config?.nomenclaturaCatastral ?? selector.tasacion.nomenclaturaCatastral ?? '';

    let camposAdicionales = `
        <div class="report-reference-item${isEmptyEditable(clienteNombre) ? ' report-preview-only' : ''}">
            <span class="report-reference-label">Cliente / Solicitante:</span>
            <span class="report-reference-value ${editableClass(clienteNombre)}" ${editableAttrs('clienteNombre', clienteNombre, { ph: 'Nombre del solicitante' })}>${clienteNombre}</span>
        </div>
        <div class="report-reference-item${isEmptyEditable(nomenclaturaCatastral) ? ' report-preview-only' : ''}">
            <span class="report-reference-label">Nomenclatura catastral:</span>
            <span class="report-reference-value ${editableClass(nomenclaturaCatastral)}" ${editableAttrs('nomenclaturaCatastral', nomenclaturaCatastral, { ph: 'Nomenclatura catastral' })}>${nomenclaturaCatastral}</span>
        </div>
    `;

    return `
        <section class="report-section">
            <h2 class="report-section-title">Índice de Referencia de la Tasación</h2>
            <div class="report-reference-grid">
                <div class="report-reference-column">
                    <h3 class="report-reference-subtitle">Identificación del Inmueble</h3>
                    <div class="report-reference-item">
                        <span class="report-reference-label">Tipo:</span>
                        <span class="report-reference-value">${selector.tipo.charAt(0).toUpperCase() + selector.tipo.slice(1)}</span>
                    </div>
                    <div class="report-reference-item${isEmptyEditable(ubicacion.direccion) ? ' report-preview-only' : ''}">
                        <span class="report-reference-label">Dirección:</span>
                        <span class="report-reference-value">${ubicacion.direccion || '-'}</span>
                    </div>
                    <div class="report-reference-item${isEmptyEditable(ubicacion.localidad) ? ' report-preview-only' : ''}">
                        <span class="report-reference-label">Localidad:</span>
                        <span class="report-reference-value">${ubicacion.localidad || '-'}</span>
                    </div>
                    <div class="report-reference-item${isEmptyEditable(ubicacion.provincia) ? ' report-preview-only' : ''}">
                        <span class="report-reference-label">Provincia:</span>
                        <span class="report-reference-value">${ubicacion.provincia || '-'}</span>
                    </div>
                    ${caracteristicasInmueble}
                </div>
                
                <div class="report-reference-column">
                    <h3 class="report-reference-subtitle">Datos del Solicitante</h3>
                    ${camposAdicionales}
                </div>
            </div>
            
            <div class="report-consideraciones-previas${consideracionesVacias ? ' report-preview-only' : ''}">
                <h3 class="report-reference-subtitle">Consideraciones Previas</h3>
                <p class="report-consideraciones-text ${editableClass(consideracionesPrevias)}" ${editableAttrs('consideracionesPrevias', consideracionesPrevias, { multiline: true, ph: 'Hacé clic para agregar consideraciones previas' })}>${consideracionesPrevias}</p>
            </div>

            <div class="report-consideraciones-previas${finalidadVacia ? ' report-preview-only' : ''}">
                <h3 class="report-reference-subtitle">Finalidad de la tasación</h3>
                <p class="report-consideraciones-text ${editableClass(finalidadTexto)}" ${editableAttrs('finalidadTasacion', finalidadTexto, { multiline: true, ph: 'Escribí la finalidad de la tasación' })}>${finalidadTexto}</p>
            </div>
        </section>
    `;
}

// =========================
// FUNCIÓN: generarHTMLAmbientesDetalle
// Genera HTML para detalle de ambientes con medidas y descripciones
// =========================
function generarHTMLAmbientesDetalle(ambientes) {
    if (!ambientes || !Array.isArray(ambientes) || ambientes.length === 0) {
        return '';
    }
    
    let ambientesHTML = '';
    
    ambientes.forEach((ambiente, index) => {
        const nombre = ambiente.nombre || '';
        const medidas = ambiente.medidas || '';
        const descripcion = ambiente.descripcion || '';
        
        if (nombre || medidas || descripcion) {
            ambientesHTML += `
                <div class="report-ambiente-item">
                    <h4 class="report-ambiente-title">${nombre || `Ambiente ${index + 1}`}</h4>
                    ${medidas ? `
                    <div class="report-ambiente-medidas">
                        <span class="report-technical-label">Medidas:</span>
                        <span class="report-technical-value">${medidas}</span>
                    </div>
                    ` : ''}
                    ${descripcion ? `
                    <div class="report-ambiente-descripcion">
                        <span class="report-technical-label">Descripción:</span>
                        <span class="report-technical-value">${descripcion}</span>
                    </div>
                    ` : ''}
                </div>
            `;
        }
    });
    
    if (ambientesHTML) {
        return `
            <div class="report-ambientes-detalle">
                <h3 class="report-technical-subtitle">Detalle de Ambientes</h3>
                ${ambientesHTML}
            </div>
        `;
    }
    
    return '';
}

// =========================
// FUNCIÓN: verificarTieneDatosAmbientes
// Verifica si hay datos de ambientes para mostrar
// =========================
function verificarTieneDatosAmbientes(ambientes) {
    if (!ambientes || !Array.isArray(ambientes) || ambientes.length === 0) {
        return false;
    }
    
    return ambientes.some(ambiente => 
        ambiente.nombre || ambiente.medidas || ambiente.descripcion
    );
}

// =========================
// FUNCIÓN: generarHTMLDatosEntorno
// Genera HTML para datos del entorno con nueva estructura
// =========================
function generarHTMLDatosEntorno(entorno, descripcionEntornoLegacy, puntosInteresLegacy) {
    let entornoHTML = '';
    
    // Priorizar datos nuevos persistidos, fallback a legacy
    const descripcion = entorno.descripcion || descripcionEntornoLegacy || '';
    const transporte = entorno.transporte || '';
    const comercios = entorno.comercios || '';
    const universidades = entorno.universidades || '';
    const puntosInteres = entorno.puntosInteres || puntosInteresLegacy || '';
    
    // Solo mostrar si hay algún dato de entorno (las filas editables de
    // descripción y puntos de interés siempre se emiten en Preview: si están
    // vacías muestran placeholder y no se imprimen).
    // Solo son editables directamente cuando el valor mostrado proviene de
    // config; si la tasación ya trae el dato persistido, es dato estructural.
    const descEditable = !entorno.descripcion;
    const puntosEditable = !entorno.puntosInteres;
    {
        // Descripción del entorno: fila siempre presente en Preview;
        // si está vacía muestra placeholder editable y no se imprime
        entornoHTML += `
            <div class="report-technical-item-full${isEmptyEditable(descripcion) ? ' report-preview-only' : ''}">
                <span class="report-technical-label">Descripción del entorno:</span>
                <span class="report-technical-value${descEditable ? ' ' + editableClass(descripcion) : ''}"${descEditable ? ' ' + editableAttrs('descripcionEntorno', descripcion, { multiline: true, ph: 'Describa el barrio, características del entorno, infraestructura urbana' }) : ''}>${descripcion}</span>
            </div>
        `;
        
        if (transporte) {
            entornoHTML += `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Transporte público:</span>
                    <span class="report-technical-value">${transporte}</span>
                </div>
            `;
        }
        
        if (comercios) {
            entornoHTML += `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Comercios y servicios:</span>
                    <span class="report-technical-value">${comercios}</span>
                </div>
            `;
        }
        
        if (universidades) {
            entornoHTML += `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Universidades / Facultades:</span>
                    <span class="report-technical-value">${universidades}</span>
                </div>
            `;
        }
        
        entornoHTML += `
            <div class="report-technical-item-full${isEmptyEditable(puntosInteres) ? ' report-preview-only' : ''}">
                <span class="report-technical-label">Puntos de interés:</span>
                <span class="report-technical-value${puntosEditable ? ' ' + editableClass(puntosInteres) : ''}"${puntosEditable ? ' ' + editableAttrs('puntosInteres', puntosInteres, { multiline: true, ph: 'Ej: Transporte público: 200 m. Comercios: 100 m. Facultad: 500 m.' }) : ''}>${puntosInteres}</span>
            </div>
        `;
    }
    
    return entornoHTML;
}

// =========================
// =========================
// COMPONENTE: ReportIntroduction
// Introducción del informe
// =========================
function ReportIntroduction({ introduction }) {
    // El bloque siempre se genera en Preview: si está vacío muestra un
    // placeholder editable y se marca report-preview-only para que el PDF
    // conserve el comportamiento anterior (bloque ausente).
    const vacio = isEmptyEditable(introduction);

    return `
        <div class="report-introduction-block${vacio ? ' report-preview-only' : ''}">
            <h3 class="report-technical-subtitle">Introducción</h3>
            <p class="report-introduction-text ${editableClass(introduction)}" ${editableAttrs('introduction', introduction, { multiline: true, ph: 'Hacé clic para escribir la introducción del informe' })}>${introduction || ''}</p>
        </div>
    `;
}

// COMPONENTE: ReportTechnical
// Informe técnico con características
// =========================
function ReportTechnical({ selector, config }) {
    const ubicacion = selector.tasacion.ubicacion || {};
    const descripcionEntorno = config?.descripcionEntorno || '';
    const puntosInteres = config?.puntosInteres || '';
    // Nuevos datos de entorno persistidos
    const entorno = selector.tasacion.entorno || {};
    const ambientesDetalle = selector.tasacion.ambientes || [];

    // Crear array de subsecciones estructuradas
    const subsecciones = [];

    // (Sin bloque de Introducción: es redundante con "Finalidad de la
    // tasación" en el Índice de Referencia.)

    // 2. Características Extrínsecas
    // Cada cuadro se emite solo si tiene contenido real (sin filas "—").
    // La distribución en filas la resuelve el layout (flex-wrap), no una
    // lista fija de campos.
    const itemTecnico = (label, value) => `
        <div class="report-technical-item">
            <span class="report-technical-label">${label}</span>
            <span class="report-technical-value">${value}</span>
        </div>
    `;
    const itemTecnicoFull = (label, value) => `
        <div class="report-technical-item-full">
            <span class="report-technical-label">${label}</span>
            <span class="report-technical-value">${value}</span>
        </div>
    `;

    let extrinsecasHTML = '';
    const itemsExtrinsecos = [];
    if (selector.tipo === 'lote') {
        if (!isEmptyEditable(selector.getTipoLote())) itemsExtrinsecos.push(itemTecnico('Tipo de lote:', selector.getTipoLote()));
    } else {
        if (!isEmptyEditable(ubicacion.orientacion)) itemsExtrinsecos.push(itemTecnico('Orientación:', ubicacion.orientacion));
    }
    if (!isEmptyEditable(selector.getZonificacion())) itemsExtrinsecos.push(itemTecnico('Zonificación:', selector.getZonificacion()));
    if (!isEmptyEditable(selector.getFOT())) itemsExtrinsecos.push(itemTecnico('FOT:', selector.getFOT()));
    if (!isEmptyEditable(selector.getFOS())) itemsExtrinsecos.push(itemTecnico('FOS:', selector.getFOS()));

    extrinsecasHTML = `
        ${itemsExtrinsecos.length ? `<div class="report-technical-grid">${itemsExtrinsecos.join('')}</div>` : ''}
        ${generarHTMLDatosEntorno(entorno, descripcionEntorno, puntosInteres)}
    `;
    
    if (extrinsecasHTML && tieneContenido(extrinsecasHTML)) {
        subsecciones.push({
            id: 'technical-extrinsic',
            title: 'Características Extrínsecas',
            html: `
                <div class="report-technical-block">
                    <h3 class="report-technical-subtitle">Características Extrínsecas</h3>
                    ${extrinsecasHTML}
                </div>
            `,
            type: 'section',
            divisible: false
        });
    }
    
    // 3. Características Intrínsecas (solo para casa y departamento)
    if (selector.mostrarCaracteristicasConstructivas()) {
        const itemsIntrinsecos = [];
        const caracteristicaConstructiva = selector.getCaracteristicaConstructiva();
        const estadoConservacion = selector.getEstadoConservacion();
        const antiguedad = selector.getAntiguedad();
        const vidaUtil = selector.getVidaUtil();

        if (!isEmptyEditable(caracteristicaConstructiva)) itemsIntrinsecos.push(itemTecnico('Característica constructiva:', caracteristicaConstructiva));
        if (!isEmptyEditable(estadoConservacion)) itemsIntrinsecos.push(itemTecnico('Estado de conservación:', estadoConservacion));
        if (!isEmptyEditable(antiguedad)) itemsIntrinsecos.push(itemTecnico('Antigüedad:', `${antiguedad} años`));
        if (!isEmptyEditable(vidaUtil)) itemsIntrinsecos.push(itemTecnico('Vida útil:', `${vidaUtil} años`));

        if (itemsIntrinsecos.length) {
            subsecciones.push({
                id: 'technical-intrinsic',
                title: 'Características Intrínsecas',
                html: `
                    <div class="report-technical-block">
                        <h3 class="report-technical-subtitle">Características Intrínsecas</h3>
                        <div class="report-technical-grid">${itemsIntrinsecos.join('')}</div>
                    </div>
                `,
                type: 'section',
                divisible: false
            });
        }
    }
    
    // 4. Características Constructivas (diferente para lote vs casa/depto)
    let constructivasHTML = '';
    const servicios = selector.getServicios() || [];
    
    if (selector.tipo === 'lote') {
        const frente = selector.getFrente();
        const fondo = selector.getFondo();
        const fondoFicticio = selector.getFondoFicticio();
        const segundaCalle = selector.getSegundaCalle();
        const zona = selector.getZona();
        const mejoras = selector.getMejoras();
        const observaciones = selector.getObservaciones();

        const hayAlgo = [frente, fondo, fondoFicticio, segundaCalle, zona, mejoras, observaciones].some(v => !isEmptyEditable(v)) || servicios.length > 0;
        if (hayAlgo) {
            const itemsLote = [];
            if (!isEmptyEditable(frente)) itemsLote.push(itemTecnico('Frente:', `${frente} m`));
            if (!isEmptyEditable(fondo)) itemsLote.push(itemTecnico('Fondo:', `${fondo} m`));
            if (!isEmptyEditable(fondoFicticio)) itemsLote.push(itemTecnico('Fondo ficticio:', `${fondoFicticio} m`));
            if (!isEmptyEditable(segundaCalle)) itemsLote.push(itemTecnico('Segunda calle:', segundaCalle));
            if (!isEmptyEditable(zona)) itemsLote.push(itemTecnico('Zona:', zona));

            constructivasHTML = `
                ${itemsLote.length ? `<div class="report-technical-grid">${itemsLote.join('')}</div>` : ''}
                ${servicios.length > 0 ? itemTecnicoFull('Servicios:', servicios.join(', ')) : ''}
                ${!isEmptyEditable(mejoras) ? itemTecnicoFull('Mejoras:', mejoras) : ''}
                ${!isEmptyEditable(observaciones) ? itemTecnicoFull('Observaciones:', observaciones) : ''}
            `;
        }
    } else {
        const ambientes = selector.getAmbientes();
        const dormitorios = selector.getDormitorios();
        const banos = selector.getBanos();
        const cochera = selector.getCochera();
        const baulera = selector.getBaulera();
        const observaciones = selector.getObservaciones();
        const ubicacionPlanta = selector.getUbicacionPlanta();
        const ubicacionPiso = selector.getUbicacionPiso();
        const tieneAscensor = selector.getTieneAscensor();

        const hayAlgo = [ambientes, dormitorios, banos, observaciones].some(v => !isEmptyEditable(v)) ||
            cochera !== null || baulera !== null || servicios.length > 0 ||
            selector.tieneAmenities() || selector.tieneInfraestructura() ||
            !isEmptyEditable(ubicacionPlanta) || !isEmptyEditable(ubicacionPiso) || !isEmptyEditable(tieneAscensor) ||
            verificarTieneDatosAmbientes(ambientesDetalle);
        if (hayAlgo) {
            const itemsBase = [];
            if (!isEmptyEditable(ambientes)) itemsBase.push(itemTecnico('Ambientes:', ambientes));
            if (!isEmptyEditable(dormitorios)) itemsBase.push(itemTecnico('Dormitorios:', dormitorios));
            if (!isEmptyEditable(banos)) itemsBase.push(itemTecnico('Baños:', banos));
            if (cochera !== null && cochera !== undefined) itemsBase.push(itemTecnico('Cochera:', cochera ? 'Sí' : 'No'));
            if (baulera !== null && baulera !== undefined) itemsBase.push(itemTecnico('Baulera:', baulera ? 'Sí' : 'No'));

            const itemsDepto = [];
            if (selector.tipo === 'departamento') {
                if (!isEmptyEditable(ubicacionPlanta)) itemsDepto.push(itemTecnico('Ubicación en planta:', ubicacionPlanta));
                if (!isEmptyEditable(ubicacionPiso)) itemsDepto.push(itemTecnico('Piso:', ubicacionPiso));
                if (!isEmptyEditable(tieneAscensor)) itemsDepto.push(itemTecnico('Ascensor:', tieneAscensor === 'si' ? 'Sí' : tieneAscensor === 'no' ? 'No' : tieneAscensor));
            }

            constructivasHTML = `
                ${itemsBase.length ? `<div class="report-technical-grid">${itemsBase.join('')}</div>` : ''}
                ${servicios.length > 0 ? itemTecnicoFull('Servicios:', servicios.join(', ')) : ''}
                ${selector.tieneAmenities() ? itemTecnicoFull('Amenities:', selector.getAmenities().join(', ')) : ''}
                ${selector.tieneInfraestructura() ? itemTecnicoFull('Infraestructura:', selector.getInfraestructura().join(', ')) : ''}
                ${itemsDepto.length ? `<div class="report-technical-grid">${itemsDepto.join('')}</div>` : ''}
                ${!isEmptyEditable(observaciones) ? itemTecnicoFull('Observaciones:', observaciones) : ''}
            `;
        }
    }
    
    if (constructivasHTML && tieneContenido(constructivasHTML)) {
        const tituloConstructivas = selector.tipo === 'lote' ? 'Características del Lote' : 'Características Constructivas';
        subsecciones.push({
            id: 'technical-constructive',
            title: tituloConstructivas,
            html: `
                <div class="report-technical-block">
                    <h3 class="report-technical-subtitle">${tituloConstructivas}</h3>
                    ${constructivasHTML}
                </div>
            `,
            type: 'section',
            divisible: false
        });
    }
    
    // 5. Detalle de Ambientes (solo para casa y departamento)
    if (selector.tipo !== 'lote' && verificarTieneDatosAmbientes(ambientesDetalle)) {
        const ambientesHTML = generarHTMLAmbientesDetalle(ambientesDetalle);
        if (ambientesHTML && ambientesHTML.trim()) {
            subsecciones.push({
                id: 'technical-environments',
                title: 'Detalle de Ambientes',
                html: `
                    <div class="report-technical-block">
                        <h3 class="report-technical-subtitle">Detalle de Ambientes</h3>
                        ${ambientesHTML}
                    </div>
                `,
                type: 'section',
                divisible: false
            });
        }
    }
    
    // Retornar array de subsecciones estructuradas
    return subsecciones;
}

// =========================
// COMPONENTE: ReportSurfaces
// Homogeneización de superficies
// =========================
function ReportSurfaces({ selector }) {
    if (!selector.mostrarHomogeneizacion()) {
        return '';
    }

    const homogeneizacion = selector.getHomogeneizacion();
    if (!homogeneizacion) {
        return '';
    }

    // Tipos de superficie: orden canónico del modelo
    // (HOMOGENEIZACION_SUPERFICIE_CONFIG, cargado desde
    // homogeneizacion-superficie.js) + cualquier clave extra presente en
    // los datos. Las filas se construyen dinámicamente: aparece todo tipo
    // con superficie > 0, no una lista fija.
    const SUPERFICIE_LABELS = {
        cubierto: 'Cubierto',
        semicubierto: 'Semicubierto',
        balcon: 'Balcón',
        balconDescubierto: 'Balcón descubierto',
        balconTerraza: 'Balcón terraza',
        baulera: 'Baulera',
        descubierto: 'Descubierto',
        patio: 'Patio / terrazas',
        dependencias: 'Dependencias'
    };
    const configSup = (typeof HOMOGENEIZACION_SUPERFICIE_CONFIG !== 'undefined')
        ? HOMOGENEIZACION_SUPERFICIE_CONFIG[selector.tipo]
        : null;
    const ordenTipos = configSup ? configSup.filas.map(f => f.tipo) : [];
    const claves = [
        ...ordenTipos,
        ...Object.keys(homogeneizacion).filter(k => !ordenTipos.includes(k) && !/^total/i.test(k))
    ];

    const filas = [];
    claves.forEach(k => {
        const h = homogeneizacion[k];
        const superficie = parseFloat(h?.superficie);
        if (!h || !(superficie > 0)) return;
        const filaConfig = configSup?.filas.find(f => f.tipo === k);
        // El coeficiente mostrado es el mismo que se usó en el cálculo:
        // `coef` (valor efectivo del usuario) antes que `coeficiente`
        // (valor predeterminado persistido), como hace homogeneizacion-superficie.js
        const coef = h.coef ?? h.coeficiente ?? filaConfig?.defaultCoef ?? '—';
        filas.push({
            tipo: SUPERFICIE_LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1)),
            superficie,
            coeficiente: coef,
            homogeneizada: h.homogeneizada
        });
    });

    if (filas.length === 0) {
        return '';
    }

    const filasHTML = filas.map(fila => `
        <tr>
            <td>${fila.tipo}</td>
            <td>${formatearNumero(fila.superficie) || fila.superficie} m2</td>
            <td>${formatearNumero(fila.coeficiente) || fila.coeficiente}</td>
            <td>${typeof fila.homogeneizada === 'number' ? formatearNumero(fila.homogeneizada) : fila.homogeneizada} m2</td>
        </tr>
    `).join('');

    // Nueva tabla de medidas de ambientes
    const ambientesDetalle = selector.tasacion.ambientes || [];
    const ambientesConMedidas = ambientesDetalle.filter(a => a.medidas && a.medidas.trim() !== '');
    
    let ambientesTableHTML = '';
    if (ambientesConMedidas.length > 0) {
        const ambientesFilasHTML = ambientesConMedidas.map(ambiente => `
            <tr>
                <td>${ambiente.nombre || '-'}</td>
                <td>${ambiente.medidas || '-'}</td>
            </tr>
        `).join('');
        
        ambientesTableHTML = `
            <div class="report-ambientes-table-section">
                <h3 class="report-section-subtitle">Detalle de Ambientes y Superficies</h3>
                <table class="report-ambientes-table">
                    <thead>
                        <tr>
                            <th>Ambiente</th>
                            <th>Medidas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ambientesFilasHTML}
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <section class="report-section">
            <h2 class="report-section-title">Homogeneización de Superficies</h2>
            <table class="report-surfaces-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Superficie (m2)</th>
                        <th>Coeficiente</th>
                        <th>Homogeneizada (m2)</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>TOTAL</strong></td>
                        <td><strong>${formatearNumero(homogeneizacion.totalSuperficie) || homogeneizacion.totalSuperficie} m2</strong></td>
                        <td>-</td>
                        <td><strong>${typeof homogeneizacion.totalHomogeneizada === 'number' ? formatearNumero(homogeneizacion.totalHomogeneizada) : homogeneizacion.totalHomogeneizada} m2</strong></td>
                    </tr>
                </tfoot>
            </table>
            ${ambientesTableHTML}
        </section>
    `;
}

// =========================
// =========================
// AUTOFIT DE TABLAS (data-autofit)
// =========================
// Ajusta las tablas marcadas con data-autofit al ancho útil real:
// empieza en la fuente máxima y reduce en pasos hasta que la tabla
// entra sin desbordar (mínimo para mantener legibilidad). Después
// congela el ancho calculado de cada columna como width inline en su
// <th>: con table-layout:auto, cuando el paginador divide la tabla por
// filas, cada fragmento conserva las mismas columnas (sin esto, un
// fragmento de una sola fila recalcularía anchos distintos).
// El paginador serializa element.innerHTML tras el render, así estas
// mutaciones quedan en el HTML final que va a pantalla e impresión.
function ajustarTablasAutofit(container) {
    const FUENTE_MAX = 13;
    const FUENTE_MIN = 8;
    const FUENTE_STEP = 0.5;

    container.querySelectorAll('table[data-autofit]').forEach(table => {
        const host = table.parentElement;
        if (!host) return;
        const disponible = host.clientWidth;
        if (!disponible) return;

        let size = FUENTE_MAX;
        table.style.fontSize = size + 'px';
        const desborda = () =>
            table.offsetWidth > disponible + 1 || host.scrollWidth > disponible + 1;
        while (size > FUENTE_MIN && desborda()) {
            size -= FUENTE_STEP;
            table.style.fontSize = size + 'px';
        }

        const headCells = table.tHead && table.tHead.rows[0]
            ? [...table.tHead.rows[0].cells]
            : [];
        const firstRow = table.tBodies[0] && table.tBodies[0].rows[0];
        if (headCells.length && firstRow && firstRow.cells.length === headCells.length) {
            headCells.forEach((th, i) => {
                th.style.width = firstRow.cells[i].offsetWidth + 'px';
            });
        }
    });
}
window.ajustarTablasAutofit = ajustarTablasAutofit;

// =========================
// COMPONENTE: ReportComparableAnalysis
// Tabla técnica de comparables con coeficientes y valores homogeneizados
// =========================
function ReportComparableAnalysis({ comparables, valuation, reportData }) {
    const formatearPrecio = (n) => formatearMonto(n);

    const resultado = reportData.resultado;
    const comparablesResultado = resultado?.comparables || [];

    // Fuente de verdad: el mismo ResultadosRenderer que construye el cuadro
    // "Resultado de la tasación" en tasacion.html (configuracionResultados +
    // columnas condicionales + coeficientes personalizados). Se instancia en
    // modo 'lectura' sobre un contenedor detached: no renderiza inputs, no
    // muta coeficientes ni resultado. El PDF solo cambia la presentación
    // (una tabla unificada con autofit); columnas, valores y formatos
    // salen de los mismos métodos del renderer.
    if (typeof ResultadosRenderer !== 'function' || comparablesResultado.length === 0) {
        return '';
    }

    const tasacion = reportData.tasacion || {};
    const datosTasacion = tasacion.datosCompletos || tasacion;
    const tipo = datosTasacion.tipo || tasacion.tipo || 'lote';
    const renderer = new ResultadosRenderer(
        document.createElement('div'),
        { ...resultado },
        tipo,
        datosTasacion,
        'lectura'
    );

    const compsResultado = renderer.resultado.comparables || [];
    if (!compsResultado.length) return '';

    // Columnas efectivas: config por tipo + condicionales + personalizadas
    // insertadas tras los coeficientes fijos (mismo orden que la pantalla).
    const columnas = renderer.obtenerColumnas('comparables');
    const { columnasAntes, columnasDespues } = renderer.insertarColumnasPersonalizadas(columnas, 'comparables');
    const columnasPersonalizadas = renderer.obtenerColumnasPersonalizadas('comparables');
    const todasLasColumnas = [
        ...columnasAntes.map(def => ({ def, custom: null })),
        ...columnasPersonalizadas.map(coef => ({ def: { id: coef.id, label: coef.nombre, tipo: 'coeficiente' }, custom: coef })),
        ...columnasDespues.map(def => ({ def, custom: null }))
    ];

    // Una sola tabla: todas las columnas efectivas en el mismo orden que
    // "Resultado de la tasación" (Dirección primero). El ancho y la fuente
    // se ajustan por contenido vía data-autofit + ajustarTablasAutofit().

    // Emparejar cada comparable del informe (posiblemente filtrado por el
    // usuario) con su fila del resultado: el índice dentro de
    // resultado.comparables es la clave con la que se persisten los
    // coeficientes personalizados.
    const normalizarDir = s => (s || '').toString().trim().toLowerCase();
    const indicesUsados = new Set();
    const filas = comparables.map((comp, pos) => {
        let idx = comp.id != null
            ? compsResultado.findIndex((r, i) => !indicesUsados.has(i) && (r.id === comp.id || r.comparable_id === comp.id))
            : -1;
        if (idx === -1) {
            idx = compsResultado.findIndex((r, i) => !indicesUsados.has(i) && normalizarDir(r.direccion) === normalizarDir(comp.address));
        }
        if (idx === -1 && comparables.length === compsResultado.length) idx = pos;
        if (idx === -1) return null;
        indicesUsados.add(idx);
        return { compR: compsResultado[idx], idx };
    }).filter(Boolean);
    if (!filas.length) return '';

    // Alineación editorial: texto a la izquierda, números/coeficientes/
    // precios a la derecha (clase .num, misma regla que la tabla técnica).
    const esNumerica = (col) => col.custom
        || col.def.es_fijo
        || col.def.destacado
        || ['numero', 'moneda', 'coeficiente', 'coeficiente_editable',
            'parametro_editable', 'porcentaje'].includes(col.def.tipo);
    // Títulos abreviados solo para el PDF: la pantalla "Resultado de la
    // tasación" conserva los labels completos de configuracionResultados.
    // Se mapea por id de columna fija (los labels varían entre tipos:
    // lote usa "Valor por m² homogeneizado", casa/dto "Valor m² ...").
    const TITULOS_PDF = {
        valor_m2: 'USD/m²',
        superficie_homogeneizada: 'Sup. Homog.',
        ross_heidecke: 'Coef. R-H',
        caracteristica_constructiva: 'Caract. Const.',
        ubicacion: 'Ubic.',
        actividad: 'Act.',
        valor_m2_final: 'Val. m² Homog.',
        valor_m2_homogeneizado: 'Val. m² Homog.'
    };
    // Los coeficientes personalizados usan su nombre: solo se abrevian
    // si coinciden exactamente con un título conocido.
    const TITULOS_PDF_LABEL = {
        'Ubicacion': 'Ubic.',
        'Ubicación': 'Ubic.',
        'Actividad': 'Act.'
    };
    const tituloDe = (col) => col.custom
        ? (TITULOS_PDF_LABEL[col.def.label] || col.def.label)
        : (TITULOS_PDF[col.def.id] || TITULOS_PDF_LABEL[col.def.label] || col.def.label);
    const celdaDe = (compR, col, idx) => {
        const html = col.custom
            ? renderer.renderizarCeldaPersonalizada(compR, col.custom, idx)
            : renderer.renderizarCelda(compR, col.def, idx);
        return esNumerica(col) ? html.replace(/^<td/, '<td class="num"') : html;
    };
    const thDe = (col) => `<th${esNumerica(col) ? ' class="num"' : ''}>${tituloDe(col)}</th>`;

    const rowsComparables = filas.map(({ compR, idx }) => `
        <tr>${todasLasColumnas.map(col => celdaDe(compR, col, idx)).join('')}</tr>
    `).join('');

    // Promedio sobre los comparables efectivamente mostrados, misma fórmula
    // que renderizarTfootPromedio del renderer.
    const valorPromedio = filas.length
        ? filas.reduce((sum, f) => sum + (f.compR.valor_m2_homogeneizado || 0), 0) / filas.length
        : 0;
    const totalColumnas = todasLasColumnas.length;
    const tfootPromedio = `
        <tfoot>
            <tr class="valor-promedio-row">
                <td><strong>Valor promedio:</strong></td>
                ${totalColumnas > 2 ? `<td colspan="${totalColumnas - 2}"></td>` : ''}
                <td><strong>${renderer.formatearMoneda(valorPromedio)}</strong></td>
            </tr>
        </tfoot>
    `;

    // Calcular resumen si hay datos disponibles
    let resumenHTML = '';
    if (resultado && comparablesResultado.length > 0) {
        const cantidadComparables = comparablesResultado.length;
        const valorPromedioOriginal = resultado.valor_promedio_m2 || null;
        const valorPromedioHomogeneizado = resultado.valor_promedio_m2 || null;
        const valorM2Final = valuation.valuePerM2 || null;
        
        resumenHTML = `
            <div class="report-comparables-summary">
                <div class="report-summary-item">
                    <span class="report-summary-label">Comparables utilizados:</span>
                    <span class="report-summary-value">${cantidadComparables}</span>
                </div>
                ${valorPromedioOriginal ? `
                <div class="report-summary-item">
                    <span class="report-summary-label">Promedio valor/m2 original:</span>
                    <span class="report-summary-value">$${formatearPrecio(valorPromedioOriginal)}</span>
                </div>
                ` : ''}
                ${valorPromedioHomogeneizado ? `
                <div class="report-summary-item">
                    <span class="report-summary-label">Promedio valor/m2 homogeneizado:</span>
                    <span class="report-summary-value">$${formatearPrecio(valorPromedioHomogeneizado)}</span>
                </div>
                ` : ''}
                ${valorM2Final ? `
                <div class="report-summary-item">
                    <span class="report-summary-label">Valor/m2 adoptado:</span>
                    <span class="report-summary-value">$${formatearPrecio(valorM2Final)}</span>
                </div>
                ` : ''}
                <div class="report-summary-item">
                    <span class="report-summary-label">Valor final de tasación:</span>
                    <span class="report-summary-value">$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}</span>
                </div>
            </div>
        `;
    }

    // Una sola sección y una sola tabla con todas las columnas. Si la
    // tabla es más alta que una página, el paginador la divide por filas
    // repitiendo el thead; el ancho se resuelve con table-layout:auto +
    // autofit de fuente (data-autofit).
    return [
        `
        <section class="report-section report-comparables-tabla">
            <h2 class="report-section-title">Tabla de Comparables</h2>
            <table class="report-table-tech report-table-autofit" data-autofit>
                <thead>
                    <tr>
                        ${todasLasColumnas.map(thDe).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rowsComparables}
                </tbody>
                ${tfootPromedio}
            </table>
            ${resumenHTML}
        </section>
        `
    ];
}

// =========================
// COMPONENTE: ReportValuation
// Valor final destacado
// =========================
function ReportValuation({ valuation, selector, config }) {
    const formatearPrecio = (n) => formatearMonto(n);

    const valorModalidad = config?.valorModalidad || 'tasacion';
    const valorPublicacion = config?.valorPublicacion && config.valorPublicacion !== '' ? parseFloat(config.valorPublicacion) : null;
    const valorCierre = config?.valorCierre && config.valorCierre !== '' ? parseFloat(config.valorCierre) : null;
    const valorRangoMin = config?.valorRangoMin && config.valorRangoMin !== '' ? parseFloat(config.valorRangoMin) : null;
    const valorRangoMax = config?.valorRangoMax && config.valorRangoMax !== '' ? parseFloat(config.valorRangoMax) : null;

    // Valor de tasación mostrado: reportConfig.valorTasacion es un override
    // manual del usuario; si está vacío se usa el valor calculado. El renglón
    // principal nunca se oculta (no tiene botón −).
    const valorTasacionOverride = config?.valorTasacion !== '' && config?.valorTasacion != null
        ? parseFloat(config.valorTasacion) : null;
    const valorTasacion = valorTasacionOverride ?? valuation.estimatedValue;

    // Superficie de referencia para valor/m²: la misma relación que usa la
    // lógica existente (valor_m2 = valor_final / superficie). Si no puede
    // derivarse, se intenta con la superficie declarada del inmueble.
    const superficieRef = (() => {
        if (valuation.estimatedValue > 0 && valuation.valuePerM2 > 0) {
            return valuation.estimatedValue / valuation.valuePerM2;
        }
        const s = parseFloat(selector?.getSuperficieTotal?.());
        return Number.isFinite(s) && s > 0 ? s : null;
    })();
    const m2Desde = (v) => (v != null && superficieRef ? Math.round(v / superficieRef) : null);

    const btnQuitarValor = (key) => `
        <button type="button" class="report-editor-control report-valuation-remove" data-remove-value="${key}" title="Ocultar renglón">−</button>`;
    const btnRestaurarValor = (key) => `
        <button type="button" class="report-editor-control report-valuation-add" data-restore-value="${key}" title="Restaurar renglón">+</button>`;

    // Renglon opcional: con (−) para ocultar; cuando está oculto queda solo
    // un (+) compacto (toda la fila es report-preview-only → en PDF no existe).
    // `vacio` marca renglones sin dato real: editables en preview, ausentes
    // en impresión.
    const detailRow = (label, valueHTML, key = null, vacio = false) => {
        if (key && config?.[`${key}Oculto`]) {
            return `
        <div class="report-valuation-detail report-valuation-hidden report-preview-only">
            ${btnRestaurarValor(key)}
        </div>`;
        }
        return `
        <div class="report-valuation-detail${vacio ? ' report-preview-only' : ''}">
            <span class="report-valuation-detail-label">${label}</span>
            <span class="report-valuation-detail-value">${valueHTML}${key ? btnQuitarValor(key) : ''}</span>
        </div>`;
    };

    // Rango estimado: editable. El texto manual del usuario (reportConfig
    // .rangoEstimado) prevalece sobre el rango calculado por la tasación.
    const rangoEstimadoDefault = `$${formatearPrecio(valuation.minValue)} - $${formatearPrecio(valuation.maxValue)} ${valuation.currency}`;
    const rangoEstimado = config?.rangoEstimado || '';
    const rangoEstimadoHTML = detailRow('Rango estimado:',
        `<span class="report-editable" data-editable="rangoEstimado" data-ph="${rangoEstimadoDefault}">${rangoEstimado || rangoEstimadoDefault}</span>`,
        'rangoEstimado');

    // Valor monetario editable: "$X USD" con el monto real. Sin valor el
    // span queda vacío con is-empty: en pantalla muestra el placeholder
    // "Escribe el valor" (::before, nunca imprime ni se guarda) y la fila
    // completa está marcada report-preview-only por el caller. Al hacer
    // clic se edita el número crudo (data-raw).
    const valorEditable = (key, numValue) => {
        const vacio = numValue == null;
        const txt = vacio ? '' : `$${formatearPrecio(numValue)} ${valuation.currency}`;
        return `<span class="report-editable${vacio ? ' is-empty' : ''}" data-editable="${key}" data-ph="Escribe el valor" data-editable-number="1" data-raw="${numValue ?? ''}">${txt}</span>`;
    };

    let valoresAdicionalesHTML = '';
    let valorPrincipalHTML = '';
    let valorM2HTML = '';

    if (valorModalidad === 'tasacion') {
        valorPrincipalHTML = `
            <span class="report-valuation-label">Valor de Tasación</span>
            <span class="report-valuation-value">${valorEditable('valorTasacion', valorTasacion)}</span>
        `;
        valorM2HTML = detailRow('Valor por m2:', m2Desde(valorTasacion) != null
            ? `$${formatearPrecio(m2Desde(valorTasacion))} ${valuation.currency}/m2` : '—', 'valorM2', m2Desde(valorTasacion) == null);
        valoresAdicionalesHTML = rangoEstimadoHTML;

    } else if (valorModalidad === 'rango') {
        const m2Min = m2Desde(valorRangoMin);
        const m2Max = m2Desde(valorRangoMax);
        valorPrincipalHTML = `
            <span class="report-valuation-label">Rango de Valor</span>
            <span class="report-valuation-value report-valuation-value-range">
                <span class="report-valuation-range-row">Mínimo: ${valorEditable('valorRangoMin', valorRangoMin)}</span>
                <span class="report-valuation-range-row">Máximo: ${valorEditable('valorRangoMax', valorRangoMax)}</span>
            </span>
        `;
        // Valor/m² como rango: se recalcula solo desde mínimo/máximo, no es editable
        valorM2HTML = detailRow('Valor por m2:', `$${m2Min != null ? formatearPrecio(m2Min) : '—'} — $${m2Max != null ? formatearPrecio(m2Max) : '—'} ${valuation.currency}/m2`, 'valorM2', m2Min == null && m2Max == null);
        valoresAdicionalesHTML = detailRow('Valor de tasación (base):', `$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}`, 'valorTasacionBase');

    } else if (valorModalidad === 'publicacion') {
        valorPrincipalHTML = `
            <span class="report-valuation-label">Valor de Tasación</span>
            <span class="report-valuation-value">${valorEditable('valorTasacion', valorTasacion)}</span>
        `;
        valoresAdicionalesHTML = detailRow('Valor de publicación:', valorEditable('valorPublicacion', valorPublicacion), 'valorPublicacion', valorPublicacion == null)
            + rangoEstimadoHTML
            + detailRow('Valor de cierre esperado:', valorEditable('valorCierre', valorCierre), 'valorCierre', valorCierre == null);
        // m² depende del valor de tasación mostrado; vacío si no hay valor
        valorM2HTML = detailRow('Valor por m2:', m2Desde(valorTasacion) != null
            ? `$${formatearPrecio(m2Desde(valorTasacion))} ${valuation.currency}/m2` : '—', 'valorM2', m2Desde(valorTasacion) == null);

    } else if (valorModalidad === 'cierre') {
        valorPrincipalHTML = `
            <span class="report-valuation-label">Valor de Cierre Esperado</span>
            <span class="report-valuation-value">${valorEditable('valorCierre', valorCierre)}</span>
        `;
        valorM2HTML = detailRow('Valor por m2:', `$${formatearPrecio(Math.round(valuation.valuePerM2))} ${valuation.currency}/m2`, 'valorM2', !valuation.valuePerM2);
        valoresAdicionalesHTML = rangoEstimadoHTML
            + detailRow('Valor de tasación (base):', `$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}`, 'valorTasacionBase')
            + (valorPublicacion || config?.valorPublicacionOculto ? detailRow('Valor de publicación:', `$${formatearPrecio(valorPublicacion)} ${valuation.currency}`, 'valorPublicacion') : '');
    }

    return `
        <section class="report-section">
            <h2 class="report-section-title">Valor de Tasación</h2>
            <div class="report-valuation-card">
                <div class="report-valuation-main">
                    ${valorPrincipalHTML}
                </div>
                <div class="report-valuation-details">
                    ${valorM2HTML}
                    ${valoresAdicionalesHTML}
                </div>
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportClosing
// Página de cierre con datos profesionales
// =========================
function ReportClosing({ reportInfo, selector, config }) {
    const showWorkConditions = config?.showWorkConditions !== false;
    const showProfessionalData = config?.showProfessionalData !== false;

    const inmobiliaria = reportInfo.inmobiliaria || '';
    const tasador = reportInfo.tasador || '';
    const matricula = reportInfo.matricula || '';
    const email = reportInfo.email || '';
    const telefono = reportInfo.telefono || '';

    const hayDatosProfesionales = !isEmptyEditable(inmobiliaria) ||
        !isEmptyEditable(tasador) ||
        !isEmptyEditable(matricula) ||
        !isEmptyEditable(email) ||
        !isEmptyEditable(telefono);

    const comision = config?.comision || '-';
    const exclusividad = config?.exclusividad || '-';
    const plazoTrabajo = config?.plazoTrabajo || '-';
    const condicionesAdicionales = config?.condicionesAdicionales || '';
    // La fecha del cierre es editable: si el usuario la modificó, el valor
    // vive en reportConfig.fechaCierre; si no, se usa la fecha del informe.
    const fechaCierre = config?.fechaCierre || reportInfo.date || '';

    return `
        <section class="report-section report-closing-section">
            <h2 class="report-section-title">Condiciones de Trabajo y Cierre</h2>
            <div class="report-closing-grid">
                ${showWorkConditions ? `
                <div class="report-closing-block${(isEmptyEditable(condicionesAdicionales) && isEmptyEditable(comision) && isEmptyEditable(exclusividad) && isEmptyEditable(plazoTrabajo)) ? ' report-preview-only' : ''}">
                    <h3 class="report-closing-subtitle">Condiciones de Trabajo</h3>
                    <div class="report-closing-item${isEmptyEditable(condicionesAdicionales) ? ' report-preview-only' : ''}">
                        <span class="report-closing-label">Condiciones:</span>
                        <span class="report-closing-value ${editableClass(condicionesAdicionales)}" ${editableAttrs('condicionesAdicionales', condicionesAdicionales, { multiline: true, ph: 'Otras condiciones específicas' })}>${condicionesAdicionales}</span>
                    </div>
                    <div class="report-closing-item${isEmptyEditable(comision) ? ' report-preview-only' : ''}">
                        <span class="report-closing-label">Comisión:</span>
                        <span class="report-closing-value ${editableClass(isEmptyEditable(comision) ? '' : comision)}" ${editableAttrs('comision', isEmptyEditable(comision) ? '' : comision, { ph: 'Ej: 3% + IVA' })}>${isEmptyEditable(comision) ? '' : comision}</span>
                    </div>
                    <div class="report-closing-item${isEmptyEditable(exclusividad) ? ' report-preview-only' : ''}">
                        <span class="report-closing-label">Exclusividad:</span>
                        <span class="report-closing-value ${editableClass(isEmptyEditable(exclusividad) ? '' : exclusividad)}" ${editableAttrs('exclusividad', isEmptyEditable(exclusividad) ? '' : exclusividad, { ph: 'Ej: 90 días' })}>${isEmptyEditable(exclusividad) ? '' : exclusividad}</span>
                    </div>
                    <div class="report-closing-item${isEmptyEditable(plazoTrabajo) ? ' report-preview-only' : ''}">
                        <span class="report-closing-label">Plazo:</span>
                        <span class="report-closing-value ${editableClass(isEmptyEditable(plazoTrabajo) ? '' : plazoTrabajo)}" ${editableAttrs('plazoTrabajo', isEmptyEditable(plazoTrabajo) ? '' : plazoTrabajo, { ph: 'Ej: 30 días' })}>${isEmptyEditable(plazoTrabajo) ? '' : plazoTrabajo}</span>
                    </div>
                </div>
                ` : ''}
                
                ${showProfessionalData ? `
                <div class="report-closing-block ${hayDatosProfesionales ? '' : 'report-preview-only'}">
                    <h3 class="report-closing-subtitle">Datos Profesionales</h3>
                    <div class="report-closing-item ${isEmptyEditable(inmobiliaria) ? 'report-preview-only' : ''}">
                        <span class="report-closing-label">Inmobiliaria:</span>
                        <span class="report-closing-value ${editableClass(inmobiliaria)}" ${editableAttrs('inmobiliaria', inmobiliaria, { ph: 'Inmobiliaria' })}>${inmobiliaria}</span>
                    </div>
                    <div class="report-closing-item ${isEmptyEditable(tasador) ? 'report-preview-only' : ''}">
                        <span class="report-closing-label">Tasador:</span>
                        <span class="report-closing-value ${editableClass(tasador)}" ${editableAttrs('tasador', tasador, { ph: 'Nombre del tasador' })}>${tasador}</span>
                    </div>
                    <div class="report-closing-item ${isEmptyEditable(matricula) ? 'report-preview-only' : ''}">
                        <span class="report-closing-label">Matrícula:</span>
                        <span class="report-closing-value ${editableClass(matricula)}" ${editableAttrs('matricula', matricula, { ph: 'Matrícula' })}>${matricula}</span>
                    </div>
                    <div class="report-closing-item ${isEmptyEditable(email) ? 'report-preview-only' : ''}">
                        <span class="report-closing-label">Email:</span>
                        <span class="report-closing-value ${editableClass(email)}" ${editableAttrs('email', email, { ph: 'Email' })}>${email}</span>
                    </div>
                    <div class="report-closing-item ${isEmptyEditable(telefono) ? 'report-preview-only' : ''}">
                        <span class="report-closing-label">Teléfono:</span>
                        <span class="report-closing-value ${editableClass(telefono)}" ${editableAttrs('telefono', telefono, { ph: 'Teléfono' })}>${telefono}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="report-closing-signature">
                <div class="report-closing-signature-line"></div>
                <div class="report-closing-signature-role">Firma</div>
                ${!isEmptyEditable(tasador) ? `
                <div class="report-closing-signature-name">${tasador}</div>
                ` : ''}
                ${!isEmptyEditable(matricula) ? `
                <div class="report-closing-signature-detail">Matrícula: ${matricula}</div>
                ` : ''}
                <div class="report-closing-signature-date">
                    Fecha: <span class="${editableClass(fechaCierre)}" ${editableAttrs('fechaCierre', fechaCierre, { ph: 'Ej: 12 de septiembre de 2026' })}>${fechaCierre}</span>
                </div>
            </div>
        </section>
    `;
}

// =========================
// FUNCIÓN: tieneContenido
// Verifica si un string HTML tiene contenido real (no solo espacios)
// =========================
function tieneContenido(html) {
    if (!html || typeof html !== 'string') return false;
    // Eliminar espacios en blanco y HTML tags para verificar si hay texto
    const textoLimpio = html.replace(/\s+/g, '').replace(/<[^>]*>/g, '');
    return textoLimpio.length > 0;
}

// COMPONENTE: ReportViewerProfessional
// Nuevo orquestador para informe profesional con paginación por medición
// =========================
async function ReportViewerProfessional({ reportData, config }) {
    const {
        showLogo = true,
        showPhotos = true,
        showComparables = true,
        showMethodology = true
    } = config;

    const selector = new TasacionDataSelector(reportData.tasacion);
    
    // Usar reportData que ya incorpora la configuración
    const updatedReportInfo = reportData.reportInfo;
    
    // Usar los campos de reportData que ya incluyen la configuración
    const title = reportData.reportInfo.title;
    const introduction = reportData.introduction || '';
    const observations = reportData.observations || '';
    const conclusion = reportData.conclusion || '';

    // Obtener paginador
    const paginator = getReportPaginator();

    // Definir todas las secciones del informe con sus metadatos de paginación
    const sections = [];

    // Portada (página especial - siempre sola)
    const coverHtml = ReportCover({ reportInfo: updatedReportInfo, selector, showLogo, config });
    if (coverHtml && coverHtml.trim()) {
        sections.push({
            html: coverHtml, // ReportCover ya devuelve <div class="report-cover">
            type: 'cover',
            divisible: false,
            standalone: true // Siempre en página propia
        });
    }

    // Índice de Referencia
    const referenceHtml = ReportReference({ selector, reportInfo: updatedReportInfo, config });
    if (referenceHtml && tieneContenido(referenceHtml)) {
        sections.push({
            html: referenceHtml,
            type: 'section',
            divisible: false, // Índice de referencia debe estar completo
            title: 'Índice de Referencia'
        });
    }

    // Informe Técnico - ahora devuelve array de subsecciones
    const technicalSections = ReportTechnical({ selector, config });
    if (technicalSections && technicalSections.length > 0) {
        // Agregar título principal de la sección
        sections.push({
            html: `<section class="report-section"><h2 class="report-section-title">Informe Técnico</h2></section>`,
            type: 'section',
            divisible: false,
            keepWithNext: true,
            minContentHeight: 24,
            title: 'Informe Técnico - Título'
        });
        
        // Agregar cada subsección como sección independiente
        technicalSections.forEach(subseccion => {
            if (subseccion.html && tieneContenido(subseccion.html)) {
                sections.push({
                    html: subseccion.html,
                    type: subseccion.type || 'section',
                    divisible: subseccion.divisible !== false,
                    title: subseccion.title
                });
            }
        });
    }

    // Homogeneización y superficies
    const surfacesHtml = ReportSurfaces({ selector });
    if (surfacesHtml && tieneContenido(surfacesHtml)) {
        sections.push({
            html: surfacesHtml,
            type: 'table',
            divisible: true,
            dividableBy: 'row', // Dividir por filas de tabla
            title: 'Homogeneización de Superficies'
        });
    }

    // Comparables visuales
    if (showComparables) {
        const comparablesHtml = ReportComparablesVisual({ comparables: reportData.comparables });
        if (comparablesHtml && tieneContenido(comparablesHtml)) {
            sections.push({
                html: comparablesHtml,
                type: 'section',
                divisible: true,
                dividableBy: 'item', // Dividir por tarjetas de comparables
                title: 'Comparables de Mercado'
            });
        }
    }

    // Metodología
    if (showMethodology) {
        const methodologyHtml = ReportMethodology({ 
            methodology: reportData.methodology, 
            introduction,
            config
        });
        if (methodologyHtml && tieneContenido(methodologyHtml)) {
            sections.push({
                html: methodologyHtml,
                type: 'text',
                divisible: true,
                dividableBy: 'paragraph', // Dividir por párrafos
                title: 'Metodología'
            });
        }
    }

    // Análisis técnico de comparables: una sola tabla unificada con
    // todas las columnas, divisible por filas.
    if (showComparables) {
        const analysisSections = ReportComparableAnalysis({
            comparables: reportData.comparables,
            valuation: reportData.valuation,
            reportData
        });
        const analysisTitles = ['Tabla de Comparables'];
        (Array.isArray(analysisSections) ? analysisSections : [analysisSections]).forEach((analysisHtml, i) => {
            if (analysisHtml && tieneContenido(analysisHtml)) {
                sections.push({
                    html: analysisHtml,
                    type: 'table',
                    divisible: true,
                    dividableBy: 'row',
                    title: analysisTitles[i] || 'Tabla de Comparables'
                });
            }
        });
    }

    // Propiedades en competencia
    const competitionHtml = ReportCompetition({ reportData, config });
    if (competitionHtml && tieneContenido(competitionHtml)) {
        sections.push({
            html: competitionHtml,
            type: 'table',
            divisible: true,
            dividableBy: 'row',
            title: 'Propiedades en Competencia'
        });
    }

    // Análisis FODA
    const fodaHtml = ReportFODA({ config });
    if (fodaHtml && tieneContenido(fodaHtml)) {
        sections.push({
            html: fodaHtml,
            type: 'section',
            divisible: true,
            dividableBy: 'subsection', // Dividir por secciones FODA
            title: 'Análisis FODA'
        });
    }

    // Fotos de la propiedad
    if (showPhotos) {
        const photosHtml = ReportPhotos({ photos: reportData.photos });
        if (photosHtml && tieneContenido(photosHtml)) {
            sections.push({
                html: photosHtml,
                type: 'section',
                divisible: true,
                dividableBy: 'item',
                title: 'Documentación adjunta'
            });
        }
    }

    // Documentación
    const documentationHtml = ReportDocumentation({ config });
    if (documentationHtml && tieneContenido(documentationHtml)) {
        sections.push({
            html: documentationHtml,
            type: 'section',
            divisible: false, // Documentación como bloque completo
            title: 'Documentación'
        });
    }

    // Conclusión y valoración final
    const conclusionHtml = ReportConclusion({ 
        conclusion, 
        observations, 
        valuation: reportData.valuation,
        config
    });
    if (conclusionHtml && tieneContenido(conclusionHtml)) {
        sections.push({
            html: conclusionHtml,
            type: 'text',
            divisible: true,
            dividableBy: 'paragraph',
            title: 'Conclusión'
        });
    }

    // Valoración final
    const valuationHtml = ReportValuation({
        valuation: reportData.valuation,
        selector,
        config: {
            // Campos de reportConfig que no están normalizados en reportData
            // (override del valor de tasación, flag de ocultamiento, rango
            // estimado manual) viajan directos desde config.
            ...config,
            valorModalidad: reportData.valorModalidad,
            valorPublicacion: reportData.valorPublicacion,
            valorCierre: reportData.valorCierre,
            valorRangoMin: reportData.valorRangoMin,
            valorRangoMax: reportData.valorRangoMax
        }
    });
    if (valuationHtml && tieneContenido(valuationHtml)) {
        sections.push({
            html: valuationHtml,
            type: 'section',
            divisible: false, // Valoración como bloque completo
            title: 'Valoración Final'
        });
    }

    // Cierre
    const closingHtml = ReportClosing({ reportInfo: updatedReportInfo, selector, config });
    if (closingHtml && tieneContenido(closingHtml)) {
        sections.push({
            html: closingHtml,
            type: 'section',
            divisible: false,
            title: 'Cierre'
        });
    }

    // Separar secciones standalone (como portada) del contenido paginable
    const standaloneSections = sections.filter(s => s.standalone);
    const contentSections = sections.filter(s => !s.standalone);

    // Generar páginas físicas usando el nuevo sistema
    
    // Renderizar todas las secciones primero
    const tempContainer = await paginator.renderSections(contentSections);
    
    // Medir secciones renderizadas
    const measurements = await paginator.measureSections(tempContainer);
    
    // Distribuir en páginas
    const paginatedPages = paginator.distributeIntoPages(measurements);
    
    // Generar HTML de páginas físicas
    const physicalPages = paginator.generatePhysicalPages(paginatedPages);
    
    // Limpiar contenedor temporal
    document.body.removeChild(tempContainer);
    
    // Combinar portada + páginas de contenido
    const allPages = [
        ...standaloneSections.map(s => `<div class="report-page report-page-cover" style="height: ${A4_HEIGHT_MM}mm; overflow: hidden;"><div class="report-page-content">${s.html}</div></div>`),
        physicalPages
    ];

    return allPages.join('');
}
