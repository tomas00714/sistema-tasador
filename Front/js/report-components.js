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
    const logoHtml = showLogo 
        ? `<div class="report-logo">
                <img src="ImagenInicio.png" alt="Logo" style="max-width: 100%; max-height: 100%;">
           </div>`
        : '';

    return `
        <header class="report-header">
            ${logoHtml}
            <h1 class="report-title">${reportInfo.title}</h1>
            <p class="report-date">Fecha: ${reportInfo.date} | N°: ${reportInfo.reportNumber}</p>
            <p class="report-date">Tasador: ${reportInfo.tasador} | Matricula: ${reportInfo.matricula}</p>
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
                    <span class="report-info-value">${property.surfaceTotal} m²</span>
                </div>
                <div class="report-info-item">
                    <span class="report-info-label">Superficie Cubierta</span>
                    <span class="report-info-value">${property.surfaceCovered} m²</span>
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
                    <div class="report-characteristics-label">Calidad de construcción</div>
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
// COMPONENTE: ReportComparables
// Tabla de propiedades comparables
// =========================
function ReportComparables({ comparables, valuation }) {
    const formatearPrecio = (n) => {
        const num = parseFloat(n);
        return Number.isFinite(num) ? num.toLocaleString('es-AR') : '—';
    };

    const comparablesRows = comparables.map(comp => `
        <tr>
            <td>${comp.address}</td>
            <td>${comp.surfaceTotal}${typeof comp.surfaceTotal === 'number' ? ' m²' : comp.surfaceTotal !== '—' ? ' m²' : ''}</td>
            <td>${comp.rooms}</td>
            <td>${comp.age}${typeof comp.age === 'number' ? ' años' : comp.age !== '—' ? '' : ''}</td>
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
                        <th>Precio/m²</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparablesRows}
                </tbody>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: var(--color-primary-light); border-radius: 8px;">
                <strong>Valor de tasación estimado:</strong> 
                $${valuation.estimatedValue.toLocaleString('es-AR')} ${valuation.currency}
                ($${valuation.valuePerM2.toLocaleString('es-AR')} ${valuation.currency}/m²)
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportPhotos
// Grid de fotografías de la propiedad
// =========================
function ReportPhotos({ photos }) {
    const photosHtml = photos.map(photo => `
        <div class="report-photo">
            ${photo.url 
                ? `<img src="${photo.url}" alt="${photo.description}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
                : `<span>${photo.description}</span>`
            }
        </div>
    `).join('');

    return `
        <section class="report-section">
            <h2 class="report-section-title">Fotografías</h2>
            <div class="report-photos-grid">
                ${photosHtml}
            </div>
        </section>
    `;
}

// =========================
// COMPONENTE: ReportMethodology
// Descripción de la metodología aplicada
// =========================
function ReportMethodology({ methodology, introduction }) {
    const factorsHtml = methodology.factors.map(factor => 
        `<li>${factor}</li>`
    ).join('');

    const adjustmentsHtml = methodology.adjustments.map(adjustment => 
        `<li>${adjustment}</li>`
    ).join('');

    return `
        <section class="report-section">
            <h2 class="report-section-title">Introducción</h2>
            <p class="report-methodology-text">${introduction}</p>
            
            <h2 class="report-section-title" style="margin-top: 24px;">Metodología de Tasación</h2>
            <p class="report-methodology-text">${methodology.description}</p>
            
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
function ReportConclusion({ conclusion, observations, valuation }) {
    return `
        <section class="report-section">
            <h2 class="report-section-title">Observaciones Finales</h2>
            <p class="report-methodology-text">${observations}</p>
            
            <div class="report-conclusion" style="margin-top: 24px;">
                <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 12px;">Conclusión</h3>
                <p class="report-conclusion-text">${conclusion}</p>
                <p class="report-conclusion-text" style="margin-top: 12px;">
                    <strong>Valor final estimado:</strong> 
                    $${valuation.estimatedValue.toLocaleString('es-AR')} ${valuation.currency}
                    (Rango: $${valuation.minValue.toLocaleString('es-AR')} - $${valuation.maxValue.toLocaleString('es-AR')} ${valuation.currency})
                </p>
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
            <p>Informe N° ${reportInfo.reportNumber} | Generado el ${reportInfo.date}</p>
            <p>Solicitado por: ${client.name} | ${client.purpose}</p>
            <p>Este informe tiene carácter confidencial y es para uso exclusivo del solicitante.</p>
        </footer>
    `;
}

// =========================
// COMPONENTE: ReportViewer
// Componente principal que orquesta todos los demás
// =========================
function ReportViewer({ reportData, config }) {
    const {
        showLogo = true,
        showPhotos = true,
        showComparables = true,
        showMethodology = true,
        title = "Informe de Tasación",
        introduction = "",
        observations = "",
        conclusion = ""
    } = config;

    // Actualizar el título en los datos
    const updatedReportInfo = {
        ...reportData.reportInfo,
        title: title
    };

    return ReportPage({
        children: `
            ${ReportHeader({ reportInfo: updatedReportInfo, showLogo })}
            ${ReportPropertyInfo({ property: reportData.property })}
            ${ReportCharacteristics({ 
                characteristics: reportData.characteristics, 
                property: reportData.property 
            })}
            ${showComparables ? ReportComparables({ 
                comparables: reportData.comparables, 
                valuation: reportData.valuation 
            }) : ''}
            ${showPhotos ? ReportPhotos({ photos: reportData.photos }) : ''}
            ${showMethodology ? ReportMethodology({ 
                methodology: reportData.methodology, 
                introduction 
            }) : ''}
            ${ReportConclusion({ 
                conclusion, 
                observations, 
                valuation: reportData.valuation 
            })}
            ${ReportFooter({ 
                reportInfo: updatedReportInfo, 
                client: reportData.client 
            })}
        `
    });
}
