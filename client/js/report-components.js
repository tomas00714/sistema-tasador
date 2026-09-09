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

    const formatearPrecio = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toLocaleString('es-AR') : '-';
    };

    const comparablesCards = comparables.map(comp => {
        const superficie = comp.surfaceTotal || '-';
        const ambientes = comp.rooms || '-';
        const precio = comp.price ? '$' + formatearPrecio(comp.price) : '-';
        const valorM2 = comp.pricePerM2 ? '$' + formatearPrecio(comp.pricePerM2) + '/m2' : '-';
        
        return `
            <div class="report-comparable-card">
                <div class="report-comparable-card-header">
                    <h4 class="report-comparable-card-title">${comp.address || 'Dirección no disponible'}</h4>
                </div>
                <div class="report-comparable-card-body">
                    <div class="report-comparable-card-info">
                        <div class="report-comparable-card-item">
                            <span class="report-comparable-card-label">Superficie:</span>
                            <span class="report-comparable-card-value">${superficie}${typeof superficie === 'number' ? ' m2' : ''}</span>
                        </div>
                        <div class="report-comparable-card-item">
                            <span class="report-comparable-card-label">Ambientes:</span>
                            <span class="report-comparable-card-value">${ambientes}</span>
                        </div>
                        <div class="report-comparable-card-item">
                            <span class="report-comparable-card-label">Precio:</span>
                            <span class="report-comparable-card-value">${precio}</span>
                        </div>
                        <div class="report-comparable-card-item">
                            <span class="report-comparable-card-label">Valor/m2:</span>
                            <span class="report-comparable-card-value">${valorM2}</span>
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
    const formatearPrecio = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toLocaleString('es-AR') : '-';
    };

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
                $${valuation.estimatedValue.toLocaleString('es-AR')} ${valuation.currency}
                ($${valuation.valuePerM2.toLocaleString('es-AR')} ${valuation.currency}/m2)
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
        const descripcion = photo.description || photo.descripcion || `Fotografía ${index + 1}`;
        const url = photo.url || photo.src || null;
        
        return `
            <div class="report-photo-item">
                ${url 
                    ? `<img src="${url}" alt="${descripcion}" class="report-photo-image">`
                    : `<div class="report-photo-placeholder">${descripcion}</div>`
                }
                <div class="report-photo-caption">${descripcion}</div>
            </div>
        `;
    }).join('');

    return `
        <section class="report-section report-photos-section">
            <h2 class="report-section-title">Fotografías del Inmueble</h2>
            <div class="report-photos-grid">
                ${photosHtml}
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportComparablePhotos
// Fotografías de comparables individuales
// =========================
function ReportComparablePhotos({ comparables }) {
    if (!comparables || comparables.length === 0) {
        return '';
    }

    const comparablesWithPhotos = comparables.filter(c => c.photos && c.photos.length > 0);
    
    if (comparablesWithPhotos.length === 0) {
        return '';
    }

    const comparablesHtml = comparablesWithPhotos.map(comp => {
        const firstPhoto = comp.photos[0];
        const url = firstPhoto.url || firstPhoto.src || null;
        const descripcion = firstPhoto.description || firstPhoto.descripcion || `Comparable - ${comp.address}`;
        
        return `
            <div class="report-comparable-photo-item">
                <div class="report-comparable-photo-info">
                    <span class="report-comparable-photo-address">${comp.address}</span>
                </div>
                ${url 
                    ? `<img src="${url}" alt="${descripcion}" class="report-comparable-photo-image">`
                    : `<div class="report-photo-placeholder">${descripcion}</div>`
                }
            </div>
        `;
    }).join('');

    return `
        <section class="report-section report-comparables-photos-section">
            <h2 class="report-section-title">Fotografías de Comparables</h2>
            <div class="report-comparables-photos-grid">
                ${comparablesHtml}
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

    const formatearPrecio = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toLocaleString('es-AR') : '-';
    };

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
                ${fodaBlock('fodaFortalezas', fortalezas, 'Fortalezas', 'Hacé clic aquí para agregar las fortalezas del inmueble')}
                ${fodaBlock('fodaOportunidades', oportunidades, 'Oportunidades', 'Hacé clic aquí para agregar las oportunidades del mercado')}
                ${fodaBlock('fodaDebilidades', debilidades, 'Debilidades', 'Hacé clic aquí para agregar las debilidades del inmueble')}
                ${fodaBlock('fodaAmenazas', amenazas, 'Amenazas', 'Hacé clic aquí para agregar las amenazas del mercado')}
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
        ? `<img class="report-cover-logo" src="${reportInfo.logo_inmobiliaria_url}" alt="Logo" onerror="this.style.display='none'" />`
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
                        <span class="report-cover-label">Ndeg Informe:</span>
                        <span class="report-cover-value">${reportInfo.reportNumber}</span>
                    </div>
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
    
    if (selector.tipo === 'lote') {
        const tipoLote = selector.getTipoLote() || '-';
        const superficie = selector.getSuperficieTotal() || '-';
        const antiguedad = selector.getAntiguedad() || '-';
        caracteristicasInmueble = `
            <div class="report-reference-item">
                <span class="report-reference-label">Tipo de lote:</span>
                <span class="report-reference-value">${tipoLote}</span>
            </div>
            <div class="report-reference-item">
                <span class="report-reference-label">Superficie:</span>
                <span class="report-reference-value">${superficie} m2</span>
            </div>
            <div class="report-reference-item">
                <span class="report-reference-label">Antigüedad:</span>
                <span class="report-reference-value">${antiguedad !== '-' ? antiguedad + ' años' : '-'}</span>
            </div>
        `;
    } else if (selector.mostrarAmbientes()) {
        const ambientes = selector.getAmbientes() || '-';
        const superficie = selector.getSuperficieCubierta() || '-';
        const antiguedad = selector.getAntiguedad() || '-';
        caracteristicasInmueble = `
            <div class="report-reference-item">
                <span class="report-reference-label">Ambientes:</span>
                <span class="report-reference-value">${ambientes}</span>
            </div>
            <div class="report-reference-item">
                <span class="report-reference-label">Superficie cubierta:</span>
                <span class="report-reference-value">${superficie} m2</span>
            </div>
            <div class="report-reference-item">
                <span class="report-reference-label">Antigüedad:</span>
                <span class="report-reference-value">${antiguedad !== '-' ? antiguedad + ' años' : '-'}</span>
            </div>
        `;
    }

    const consideracionesPrevias = config?.consideracionesPrevias || '';
    const consideracionesVacias = isEmptyEditable(consideracionesPrevias);
    // Usar finalidad de la tasación persistida, fallback a config
    const finalidadTasacion = selector.tasacion.finalidad || config?.finalidadTasacion || 'Tasación comercial';
    // La finalidad solo es editable directamente si el valor mostrado proviene
    // de config (si la tasación ya trae finalidad persistida, es dato estructural)
    const finalidadEditable = !selector.tasacion.finalidad;
    
    // Nuevos campos de referencia
    const clienteNombre = selector.tasacion.clienteNombre || null;
    const nomenclaturaCatastral = selector.tasacion.nomenclaturaCatastral || null;
    
    let camposAdicionales = '';
    
    if (clienteNombre) {
        camposAdicionales += `
            <div class="report-reference-item">
                <span class="report-reference-label">Cliente / Solicitante:</span>
                <span class="report-reference-value">${clienteNombre}</span>
            </div>
        `;
    }
    
    if (nomenclaturaCatastral) {
        camposAdicionales += `
            <div class="report-reference-item">
                <span class="report-reference-label">Nomenclatura catastral:</span>
                <span class="report-reference-value">${nomenclaturaCatastral}</span>
            </div>
        `;
    }
    
    camposAdicionales += `
        <div class="report-reference-item">
            <span class="report-reference-label">Finalidad:</span>
            <span class="report-reference-value${finalidadEditable ? ' ' + editableClass(finalidadTasacion) : ''}"${finalidadEditable ? ' ' + editableAttrs('finalidadTasacion', finalidadTasacion, { ph: 'Finalidad de la tasación' }) : ''}>${finalidadTasacion}</span>
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
                    <div class="report-reference-item">
                        <span class="report-reference-label">Dirección:</span>
                        <span class="report-reference-value">${ubicacion.direccion || '-'}</span>
                    </div>
                    <div class="report-reference-item">
                        <span class="report-reference-label">Localidad:</span>
                        <span class="report-reference-value">${ubicacion.localidad || '-'}</span>
                    </div>
                    <div class="report-reference-item">
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
    const introduction = config?.introduction || '';
    
    // Nuevos datos de entorno persistidos
    const entorno = selector.tasacion.entorno || {};
    const ambientesDetalle = selector.tasacion.ambientes || [];
    
    // Crear array de subsecciones estructuradas
    const subsecciones = [];
    
    // 1. Título e introducción
    const introduccionHTML = ReportIntroduction({ introduction });
    if (introduccionHTML && introduccionHTML.trim()) {
        subsecciones.push({
            id: 'technical-intro',
            title: 'Introducción',
            html: `
                <div class="report-technical-block">
                    <h3 class="report-technical-subtitle">Introducción</h3>
                    ${introduccionHTML}
                </div>
            `,
            type: 'section',
            divisible: false
        });
    }
    
    // 2. Características Extrínsecas
    let extrinsecasHTML = '';
    if (selector.tipo === 'lote') {
        const tipoLote = selector.getTipoLote() || '-';
        const zonificacion = selector.getZonificacion() || '-';
        const fot = selector.getFOT() || '-';
        const fos = selector.getFOS() || '-';
        
        extrinsecasHTML = `
            <div class="report-technical-grid">
                <div class="report-technical-item">
                    <span class="report-technical-label">Tipo de lote:</span>
                    <span class="report-technical-value">${tipoLote}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">Zonificación:</span>
                    <span class="report-technical-value">${zonificacion}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">FOT:</span>
                    <span class="report-technical-value">${fot}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">FOS:</span>
                    <span class="report-technical-value">${fos}</span>
                </div>
            </div>
            ${generarHTMLDatosEntorno(entorno, descripcionEntorno, puntosInteres)}
        `;
    } else {
        const orientacion = ubicacion.orientacion || '-';
        const zonificacion = selector.getZonificacion() || '-';
        const fot = selector.getFOT() || '-';
        const fos = selector.getFOS() || '-';
        
        extrinsecasHTML = `
            <div class="report-technical-grid">
                <div class="report-technical-item">
                    <span class="report-technical-label">Orientación:</span>
                    <span class="report-technical-value">${orientacion}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">Zonificación:</span>
                    <span class="report-technical-value">${zonificacion}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">FOT:</span>
                    <span class="report-technical-value">${fot}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">FOS:</span>
                    <span class="report-technical-value">${fos}</span>
                </div>
            </div>
            ${generarHTMLDatosEntorno(entorno, descripcionEntorno, puntosInteres)}
        `;
    }
    
    if (extrinsecasHTML && extrinsecasHTML.trim()) {
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
        const caracteristicaConstructiva = selector.getCaracteristicaConstructiva() || '-';
        const estadoConservacion = selector.getEstadoConservacion() || '-';
        const antiguedad = selector.getAntiguedad() || '-';
        const vidaUtil = selector.getVidaUtil() || '-';
        
        const intrinsecasHTML = `
            <div class="report-technical-grid">
                <div class="report-technical-item">
                    <span class="report-technical-label">Característica constructiva:</span>
                    <span class="report-technical-value">${caracteristicaConstructiva}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">Estado de conservación:</span>
                    <span class="report-technical-value">${estadoConservacion}</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">Antigüedad:</span>
                    <span class="report-technical-value">${antiguedad} años</span>
                </div>
                <div class="report-technical-item">
                    <span class="report-technical-label">Vida útil:</span>
                    <span class="report-technical-value">${vidaUtil} años</span>
                </div>
            </div>
        `;
        
        subsecciones.push({
            id: 'technical-intrinsic',
            title: 'Características Intrínsecas',
            html: `
                <div class="report-technical-block">
                    <h3 class="report-technical-subtitle">Características Intrínsecas</h3>
                    ${intrinsecasHTML}
                </div>
            `,
            type: 'section',
            divisible: false
        });
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
        
        if (frente || fondo || fondoFicticio || segundaCalle || zona || mejoras || observaciones || servicios.length > 0) {
            constructivasHTML = `
                <div class="report-technical-grid">
                    ${frente ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Frente:</span>
                        <span class="report-technical-value">${frente} m</span>
                    </div>
                    ` : ''}
                    ${fondo ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Fondo:</span>
                        <span class="report-technical-value">${fondo} m</span>
                    </div>
                    ` : ''}
                    ${fondoFicticio !== '-' ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Fondo ficticio:</span>
                        <span class="report-technical-value">${fondoFicticio} m</span>
                    </div>
                    ` : ''}
                    ${segundaCalle !== '-' ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Segunda calle:</span>
                        <span class="report-technical-value">${segundaCalle}</span>
                    </div>
                    ` : ''}
                    ${zona !== '-' ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Zona:</span>
                        <span class="report-technical-value">${zona}</span>
                    </div>
                    ` : ''}
                </div>
                ${servicios.length > 0 ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Servicios:</span>
                    <span class="report-technical-value">${servicios.join(', ')}</span>
                </div>
                ` : ''}
                ${mejoras !== '-' ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Mejoras:</span>
                    <span class="report-technical-value">${mejoras}</span>
                </div>
                ` : ''}
                ${observaciones !== '-' ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Observaciones:</span>
                    <span class="report-technical-value">${observaciones}</span>
                </div>
                ` : ''}
            `;
        }
    } else {
        const ambientes = selector.getAmbientes();
        const dormitorios = selector.getDormitorios();
        const banos = selector.getBanos();
        const cochera = selector.getCochera();
        const baulera = selector.getBaulera();
        const observaciones = selector.getObservaciones();
        
        if (ambientes || dormitorios || banos || cochera || baulera || observaciones || servicios.length > 0 || selector.tieneAmenities() || selector.tieneInfraestructura() || verificarTieneDatosAmbientes(ambientesDetalle)) {
            constructivasHTML = `
                <div class="report-technical-grid">
                    ${ambientes ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Ambientes:</span>
                        <span class="report-technical-value">${ambientes}</span>
                    </div>
                    ` : ''}
                    ${dormitorios ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Dormitorios:</span>
                        <span class="report-technical-value">${dormitorios}</span>
                    </div>
                    ` : ''}
                    ${banos ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Baños:</span>
                        <span class="report-technical-value">${banos}</span>
                    </div>
                    ` : ''}
                    ${cochera !== null ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Cochera:</span>
                        <span class="report-technical-value">${cochera ? 'Sí' : 'No'}</span>
                    </div>
                    ` : ''}
                    ${baulera !== null ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Baulera:</span>
                        <span class="report-technical-value">${baulera ? 'Sí' : 'No'}</span>
                    </div>
                    ` : ''}
                </div>
                ${servicios.length > 0 ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Servicios:</span>
                    <span class="report-technical-value">${servicios.join(', ')}</span>
                </div>
                ` : ''}
                ${selector.tieneAmenities() ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Amenities:</span>
                    <span class="report-technical-value">${selector.getAmenities().join(', ')}</span>
                </div>
                ` : ''}
                ${selector.tieneInfraestructura() ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Infraestructura:</span>
                    <span class="report-technical-value">${selector.getInfraestructura().join(', ')}</span>
                </div>
                ` : ''}
                ${selector.tipo === 'departamento' ? `
                <div class="report-technical-grid">
                    ${selector.getUbicacionPlanta() ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Ubicación en planta:</span>
                        <span class="report-technical-value">${selector.getUbicacionPlanta()}</span>
                    </div>
                    ` : ''}
                    ${selector.getUbicacionPiso() ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Piso:</span>
                        <span class="report-technical-value">${selector.getUbicacionPiso()}</span>
                    </div>
                    ` : ''}
                    ${selector.getTieneAscensor() ? `
                    <div class="report-technical-item">
                        <span class="report-technical-label">Ascensor:</span>
                        <span class="report-technical-value">${selector.getTieneAscensor() === 'si' ? 'Sí' : selector.getTieneAscensor() === 'no' ? 'No' : '-'}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                ${observaciones ? `
                <div class="report-technical-item-full">
                    <span class="report-technical-label">Observaciones:</span>
                    <span class="report-technical-value">${observaciones}</span>
                </div>
                ` : ''}
            `;
        }
    }
    
    if (constructivasHTML && constructivasHTML.trim()) {
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

    const filas = [];

    if (homogeneizacion.cubierto && homogeneizacion.cubierto.superficie > 0) {
        filas.push({
            tipo: 'Cubierto',
            superficie: homogeneizacion.cubierto.superficie,
            coeficiente: homogeneizacion.cubierto.coeficiente,
            homogeneizada: homogeneizacion.cubierto.homogeneizada
        });
    }

    if (homogeneizacion.semicubierto && homogeneizacion.semicubierto.superficie > 0) {
        filas.push({
            tipo: 'Semicubierto',
            superficie: homogeneizacion.semicubierto.superficie,
            coeficiente: homogeneizacion.semicubierto.coeficiente,
            homogeneizada: homogeneizacion.semicubierto.homogeneizada
        });
    }

    if (homogeneizacion.balcon && homogeneizacion.balcon.superficie > 0) {
        filas.push({
            tipo: 'Balcón',
            superficie: homogeneizacion.balcon.superficie,
            coeficiente: homogeneizacion.balcon.coeficiente,
            homogeneizada: homogeneizacion.balcon.homogeneizada
        });
    }

    if (homogeneizacion.descubierto && homogeneizacion.descubierto.superficie > 0) {
        filas.push({
            tipo: 'Descubierto',
            superficie: homogeneizacion.descubierto.superficie,
            coeficiente: homogeneizacion.descubierto.coeficiente,
            homogeneizada: homogeneizacion.descubierto.homogeneizada
        });
    }

    if (filas.length === 0) {
        return '';
    }

    const filasHTML = filas.map(fila => `
        <tr>
            <td>${fila.tipo}</td>
            <td>${fila.superficie} m2</td>
            <td>${fila.coeficiente}</td>
            <td>${typeof fila.homogeneizada === 'number' ? fila.homogeneizada.toFixed(2) : fila.homogeneizada} m2</td>
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
                        <td><strong>${homogeneizacion.totalSuperficie} m2</strong></td>
                        <td>-</td>
                        <td><strong>${typeof homogeneizacion.totalHomogeneizada === 'number' ? homogeneizacion.totalHomogeneizada.toFixed(2) : homogeneizacion.totalHomogeneizada} m2</strong></td>
                    </tr>
                </tfoot>
            </table>
            ${ambientesTableHTML}
        </section>
    `;
}

// =========================
// COMPONENTE: ReportComparableAnalysis
// Tabla técnica de comparables con coeficientes y valores homogeneizados
// =========================
function ReportComparableAnalysis({ comparables, valuation, reportData }) {
    const formatearPrecio = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toLocaleString('es-AR') : '-';
    };

    const formatearCoeficiente = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toFixed(3) : '-';
    };

    const resultado = reportData.resultado;
    const coeficientesPersonalizados = reportData.coeficientesPersonalizados;
    
    // Si tenemos resultado con comparables con valores homogeneizados, usar esos datos
    const comparablesResultado = resultado?.comparables || [];

    const comparablesRows = comparables.map((comp, index) => {
        // Intentar obtener datos homogeneizados del resultado
        const compResultado = comparablesResultado[index] || comp;
        
        const valorM2Original = comp.pricePerM2 || compResultado.valor_m2 || 0;
        const valorM2Homogeneizado = compResultado.valor_m2_homogeneizado || null;
        
        // Obtener coeficientes si están disponibles
        let coefUbicacion = '-';
        let coefActualizacion = '-';
        let coefFitto = '-';
        let coefTotal = '-';
        
        if (compResultado.coef_fitto_comparable) {
            coefFitto = formatearCoeficiente(compResultado.coef_fitto_comparable);
        }
        
        if (coeficientesPersonalizados && index !== undefined) {
            const indexStr = index.toString();
            const coefIndex = coeficientesPersonalizados[indexStr] || {};
            
            if (coefIndex.ubicacion) {
                coefUbicacion = formatearCoeficiente(coefIndex.ubicacion);
            }
            if (coefIndex.actualizacion) {
                coefActualizacion = formatearCoeficiente(coefIndex.actualizacion);
            }
            
            // Calcular coeficiente total si hay datos suficientes
            if (compResultado.coef_fitto_comparable && coefIndex.ubicacion && coefIndex.actualizacion) {
                const fitto = compResultado.coef_fitto_comparable;
                const ubic = coefIndex.ubicacion;
                const act = coefIndex.actualizacion;
                let personalizadoTotal = 1;
                
                if (coefIndex.personalizados) {
                    Object.values(coefIndex.personalizados).forEach(val => {
                        personalizadoTotal *= val;
                    });
                }
                
                const total = fitto * ubic * act * personalizadoTotal;
                coefTotal = formatearCoeficiente(total);
            }
        }

        return `
            <tr>
                <td>${comp.address}</td>
                <td>${comp.surfaceTotal}${typeof comp.surfaceTotal === 'number' ? ' m2' : comp.surfaceTotal !== '-' ? ' m2' : ''}</td>
                <td>${comp.rooms}</td>
                <td>${comp.age}${typeof comp.age === 'number' ? ' años' : comp.age !== '-' ? '' : ''}</td>
                <td>${typeof comp.distance === 'number' ? comp.distance + ' m' : comp.distance}</td>
                <td style="text-align: right;">$${formatearPrecio(comp.price)}</td>
                <td style="text-align: right;">$${formatearPrecio(valorM2Original)}</td>
                <td style="text-align: center;">${coefUbicacion}</td>
                <td style="text-align: center;">${coefActualizacion}</td>
                <td style="text-align: center;">${coefFitto}</td>
                <td style="text-align: center;">${coefTotal}</td>
                <td style="text-align: right;">${valorM2Homogeneizado ? '$' + formatearPrecio(valorM2Homogeneizado) : '-'}</td>
            </tr>
        `;
    }).join('');

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

    return `
        <section class="report-section">
            <h2 class="report-section-title">Tabla Técnica de Homogeneización</h2>
            <table class="report-comparables-table report-comparables-technical">
                <thead>
                    <tr>
                        <th>Dirección</th>
                        <th>Sup. Total</th>
                        <th>Amb.</th>
                        <th>Antig.</th>
                        <th>Dist.</th>
                        <th>Precio</th>
                        <th>Precio/m2</th>
                        <th>Coef. Ubic.</th>
                        <th>Coef. Act.</th>
                        <th>Coef. Fitto</th>
                        <th>Coef. Total</th>
                        <th>Valor/m2 Homog.</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparablesRows}
                </tbody>
            </table>
            ${resumenHTML}
        </section>
    `;
}

// =========================
// COMPONENTE: ReportValuation
// Valor final destacado
// =========================
function ReportValuation({ valuation, selector, config }) {
    const formatearPrecio = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toLocaleString('es-AR') : '-';
    };

    const valorModalidad = config?.valorModalidad || 'tasacion';
    const valorPublicacion = config?.valorPublicacion && config.valorPublicacion !== '' ? parseFloat(config.valorPublicacion) : null;
    const valorCierre = config?.valorCierre && config.valorCierre !== '' ? parseFloat(config.valorCierre) : null;
    const valorRangoMin = config?.valorRangoMin && config.valorRangoMin !== '' ? parseFloat(config.valorRangoMin) : null;
    const valorRangoMax = config?.valorRangoMax && config.valorRangoMax !== '' ? parseFloat(config.valorRangoMax) : null;

    let valoresAdicionalesHTML = '';
    let valorPrincipalHTML = '';
    
    // Valor principal según modalidad
    if (valorModalidad === 'tasacion') {
        valorPrincipalHTML = `
            <span class="report-valuation-label">Valor de Tasación</span>
            <span class="report-valuation-value">$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}</span>
        `;
    } else if (valorModalidad === 'rango') {
        const minTxt = valorRangoMin ? formatearPrecio(valorRangoMin) : '';
        const maxTxt = valorRangoMax ? formatearPrecio(valorRangoMax) : '';
        valorPrincipalHTML = `
            <span class="report-valuation-label">Rango de Valor</span>
            <span class="report-valuation-value">$<span class="${editableClass(minTxt)}" ${editableAttrs('valorRangoMin', valorRangoMin ?? '', { ph: 'mínimo' })} data-editable-number="1" data-raw="${valorRangoMin ?? ''}">${minTxt}</span> - $<span class="${editableClass(maxTxt)}" ${editableAttrs('valorRangoMax', valorRangoMax ?? '', { ph: 'máximo' })} data-editable-number="1" data-raw="${valorRangoMax ?? ''}">${maxTxt}</span> ${valuation.currency}</span>
        `;
        valoresAdicionalesHTML = `
            <div class="report-valuation-detail">
                <span class="report-valuation-detail-label">Valor de tasación (base):</span>
                <span class="report-valuation-detail-value">$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}</span>
            </div>
        `;
    } else if (valorModalidad === 'publicacion') {
        const pubTxt = valorPublicacion ? formatearPrecio(valorPublicacion) : '';
        valorPrincipalHTML = `
            <span class="report-valuation-label">Valor de Publicación</span>
            <span class="report-valuation-value">$<span class="${editableClass(pubTxt)}" ${editableAttrs('valorPublicacion', valorPublicacion ?? '', { ph: 'valor de publicación' })} data-editable-number="1" data-raw="${valorPublicacion ?? ''}">${pubTxt}</span> ${valuation.currency}</span>
        `;
        valoresAdicionalesHTML = `
            <div class="report-valuation-detail">
                <span class="report-valuation-detail-label">Valor de tasación (base):</span>
                <span class="report-valuation-detail-value">$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}</span>
            </div>
        `;
    } else if (valorModalidad === 'cierre') {
        const cieTxt = valorCierre ? formatearPrecio(valorCierre) : '';
        valorPrincipalHTML = `
            <span class="report-valuation-label">Valor de Cierre Esperado</span>
            <span class="report-valuation-value">$<span class="${editableClass(cieTxt)}" ${editableAttrs('valorCierre', valorCierre ?? '', { ph: 'valor de cierre' })} data-editable-number="1" data-raw="${valorCierre ?? ''}">${cieTxt}</span> ${valuation.currency}</span>
        `;
        valoresAdicionalesHTML = `
            <div class="report-valuation-detail">
                <span class="report-valuation-detail-label">Valor de tasación (base):</span>
                <span class="report-valuation-detail-value">$${formatearPrecio(valuation.estimatedValue)} ${valuation.currency}</span>
            </div>
            ${valorPublicacion ? `
            <div class="report-valuation-detail">
                <span class="report-valuation-detail-label">Valor de publicación:</span>
                <span class="report-valuation-detail-value">$${formatearPrecio(valorPublicacion)} ${valuation.currency}</span>
            </div>
            ` : ''}
        `;
    }

    return `
        <section class="report-section">
            <h2 class="report-section-title">Valor de Tasación</h2>
            <div class="report-valuation-card">
                <div class="report-valuation-main">
                    ${valorPrincipalHTML}
                </div>
                <div class="report-valuation-details">
                    <div class="report-valuation-detail">
                        <span class="report-valuation-detail-label">Valor por m2:</span>
                        <span class="report-valuation-detail-value">$${formatearPrecio(valuation.valuePerM2)} ${valuation.currency}/m2</span>
                    </div>
                    <div class="report-valuation-detail">
                        <span class="report-valuation-detail-label">Rango estimado:</span>
                        <span class="report-valuation-detail-value">$${formatearPrecio(valuation.minValue)} - $${formatearPrecio(valuation.maxValue)} ${valuation.currency}</span>
                    </div>
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

    return `
        <section class="report-section report-closing-section">
            <h2 class="report-section-title">Condiciones de Trabajo y Cierre</h2>
            <div class="report-closing-grid">
                ${showWorkConditions ? `
                <div class="report-closing-block">
                    <h3 class="report-closing-subtitle">Condiciones de Trabajo</h3>
                    <div class="report-closing-item">
                        <span class="report-closing-label">Condiciones:</span>
                        <span class="report-closing-value ${editableClass(condicionesAdicionales)}" ${editableAttrs('condicionesAdicionales', condicionesAdicionales, { multiline: true, ph: 'Otras condiciones específicas' })}>${condicionesAdicionales}</span>
                    </div>
                    <div class="report-closing-item">
                        <span class="report-closing-label">Comisión:</span>
                        <span class="report-closing-value ${editableClass(isEmptyEditable(comision) ? '' : comision)}" ${editableAttrs('comision', isEmptyEditable(comision) ? '' : comision, { ph: 'Ej: 3% + IVA' })}>${isEmptyEditable(comision) ? '' : comision}</span>
                    </div>
                    <div class="report-closing-item">
                        <span class="report-closing-label">Exclusividad:</span>
                        <span class="report-closing-value ${editableClass(isEmptyEditable(exclusividad) ? '' : exclusividad)}" ${editableAttrs('exclusividad', isEmptyEditable(exclusividad) ? '' : exclusividad, { ph: 'Ej: 90 días' })}>${isEmptyEditable(exclusividad) ? '' : exclusividad}</span>
                    </div>
                    <div class="report-closing-item">
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
                <div class="report-closing-signature-line">
                    <span class="report-closing-signature-label">Firma y Sello</span>
                </div>
                <div class="report-closing-signature-date">
                    Fecha: ${reportInfo.date}
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

    // Análisis técnico de comparables
    if (showComparables) {
        const analysisHtml = ReportComparableAnalysis({ 
            comparables: reportData.comparables, 
            valuation: reportData.valuation,
            reportData
        });
        if (analysisHtml && tieneContenido(analysisHtml)) {
            sections.push({
                html: analysisHtml,
                type: 'table',
                divisible: true,
                dividableBy: 'row',
                title: 'Análisis de Comparables'
            });
        }
    }

    // Fotos de comparables
    if (showComparables && showPhotos) {
        const photosHtml = ReportComparablePhotos({ comparables: reportData.comparables });
        if (photosHtml && tieneContenido(photosHtml)) {
            sections.push({
                html: photosHtml,
                type: 'section',
                divisible: true,
                dividableBy: 'item', // Dividir por fotos individuales
                title: 'Fotos de Comparables'
            });
        }
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
                title: 'Fotografías'
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
        ...standaloneSections.map(s => `<div class="report-page" style="height: ${A4_HEIGHT_MM}mm; overflow: hidden;"><div class="report-page-content">${s.html}</div></div>`),
        physicalPages
    ];

    return allPages.join('');
}
