/**
 * Sistema de Paginación para Informes
 * Renderiza primero, mide después, distribuye en páginas A4
 */

// =========================
// CONSTANTES DE PAGINACIÓN
// =========================
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 20;
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - (PAGE_PADDING_MM * 2); // 257mm útiles
const PX_TO_MM = 0.264583;

// =========================
// SISTEMA DE PAGINACIÓN SIMPLIFICADO
// =========================

class ReportPaginator {
    constructor() {
        this.sections = [];
        this.pages = [];
    }

    // Renderizar todas las secciones en un contenedor temporal visible
    async renderSections(sections) {
        const container = document.createElement('div');
        container.className = 'report-temp-container';
        container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: ${A4_WIDTH_MM}mm;
            padding: ${PAGE_PADDING_MM}mm;
            box-sizing: border-box;
            background: white;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: -1000;
            opacity: 0;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
        
        // Renderizar todas las secciones
        for (const section of sections) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'report-section-wrapper';
            sectionDiv.innerHTML = section.html;
            sectionDiv.dataset.sectionType = section.type;
            sectionDiv.dataset.sectionTitle = section.title || '';
            container.appendChild(sectionDiv);
        }
        
        // Esperar renderizado completo
        await document.fonts.ready;
        await this.waitForImages(container);
        container.offsetHeight; // Forzar reflow
        
        return container;
    }

    // Medir todas las secciones renderizadas
    async measureSections(container) {
        const sectionElements = container.querySelectorAll('.report-section-wrapper');
        const measurements = [];

        console.log('=== MEDICIÓN REAL DE SECCIONES ===');

        for (const element of sectionElements) {
            const height = await this.measureRealHeight(element);
            const exceeds = height > CONTENT_HEIGHT_MM;

            console.log(`${element.dataset.sectionTitle || element.dataset.sectionType}: ${height.toFixed(1)}mm${exceeds ? ' ❌ EXCEDE ÁREA ÚTIL' : ''}`);

            if (element.dataset.sectionTitle === '' && height === 0) {
                console.warn(`[Paginator] Sección sin título midió 0mm — posible error de medición`);
            }

            measurements.push({
                element,
                height,
                type: element.dataset.sectionType,
                title: element.dataset.sectionTitle,
                html: element.innerHTML
            });
        }

        return measurements;
    }

    // Medir altura real de un elemento renderizado (incluye margin-bottom del wrapper)
    async measureRealHeight(element) {
        // Esperar a que todo esté renderizado
        await document.fonts.ready;
        await this.waitForImages(element);

        // Forzar reflow
        element.offsetHeight;

        const style = window.getComputedStyle(element);
        const marginBottom = parseFloat(style.marginBottom) || 0;
        const heightPx = element.offsetHeight + marginBottom;
        const heightMm = heightPx * PX_TO_MM;

        return heightMm;
    }

    // Esperar a que las imágenes se carguen
    async waitForImages(container) {
        const images = container.querySelectorAll('img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });
        await Promise.all(promises);
    }

    // Distribuir secciones medidas en páginas
    distributeIntoPages(measurements) {
        const pages = [];
        let currentPage = [];
        let currentHeight = 0;
        let pageNum = 1;

        console.log('=== DISTRIBUYENDO EN PÁGINAS ===');
        console.log(`Área útil: ${CONTENT_HEIGHT_MM}mm`);
        console.log(`Total secciones: ${measurements.length}`);

        for (const measurement of measurements) {
            const { height, title, type, html } = measurement;
            const remainingSpace = CONTENT_HEIGHT_MM - currentHeight;

            console.log(`Sección "${title}": ${height.toFixed(1)}mm (disponible: ${remainingSpace.toFixed(1)}mm)`);

            // Si la sección cabe completa
            if (height <= remainingSpace) {
                currentPage.push(measurement);
                currentHeight += height;
                console.log(`  ✅ Agregada a página ${pageNum} (total: ${currentHeight.toFixed(1)}mm)`);
                continue;
            }

            // Si la sección es muy grande para una página sola
            if (height > CONTENT_HEIGHT_MM) {
                console.log(`  ⚠️  Sección "${title}" (${height.toFixed(1)}mm) excede área útil, debe dividirse`);
                
                // Guardar página actual si tiene contenido
                if (currentPage.length > 0) {
                    pages.push([...currentPage]);
                    console.log(`  📄 Página ${pageNum} completada (${currentHeight.toFixed(1)}mm)`);
                    pageNum++;
                    currentPage = [];
                    currentHeight = 0;
                }
                
                // Dividir la sección grande en partes que quepan
                const dividedParts = this.divideSectionToFit(measurement, CONTENT_HEIGHT_MM);
                
                for (const part of dividedParts) {
                    if (part.height <= CONTENT_HEIGHT_MM) {
                        pages.push([part]);
                        console.log(`  📄 Página ${pageNum} con parte de "${title}" (${part.height.toFixed(1)}mm)`);
                        pageNum++;
                    } else {
                        console.error(`  ❌ Parte de "${title}" sigue excediendo: ${part.height.toFixed(1)}mm`);
                        // Agregar como página individual aunque exceda (para debugging)
                        pages.push([part]);
                        pageNum++;
                    }
                }
                continue;
            }

            // Sección no cabe en página actual pero cabe en página nueva
            if (currentPage.length > 0) {
                pages.push([...currentPage]);
                console.log(`  📄 Página ${pageNum} completada (${currentHeight.toFixed(1)}mm)`);
                pageNum++;
                console.log(`  📄 Nueva página ${pageNum} para "${title}"`);
            }
            
            currentPage = [measurement];
            currentHeight = height;
        }

        // Agregar última página
        if (currentPage.length > 0) {
            pages.push(currentPage);
            console.log(`📄 Página final ${pageNum} (${currentHeight.toFixed(1)}mm)`);
        }

        console.log(`=== ${pages.length} páginas generadas ===`);
        return pages;
    }

    // Dividir sección para que quepa en el espacio disponible
    divideSectionToFit(measurement, availableHeight) {
        const { html, title, type } = measurement;
        
        console.log(`Intentando dividir "${title}" (${measurement.height.toFixed(1)}mm) en partes de ${availableHeight}mm`);
        
        // Para tablas, dividir por filas
        if (type === 'table') {
            return this.divideTableToFit(measurement, availableHeight);
        }
        
        // Para textos y secciones, intentar dividir por contenido interno
        if (type === 'text' || type === 'section') {
            // Primero intentar dividir por elementos de bloque
            const blockElements = this.extractBlockElements(html);
            if (blockElements.length > 1) {
                return this.divideByBlocks(measurement, blockElements, availableHeight);
            }
            
            // Si no se pudo dividir por bloques, intentar por párrafos
            const paragraphParts = this.divideByParagraphs(measurement, availableHeight);
            if (paragraphParts.length > 1) {
                return paragraphParts;
            }
            
            // Si no se puede dividir, dividir por líneas de texto aproximadas
            return this.divideByApproximateLines(measurement, availableHeight);
        }
        
        // Para otros tipos, intentar dividir por hijos directos
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const children = Array.from(tempDiv.children);
        
        if (children.length > 1) {
            return this.divideByChildren(measurement, children, availableHeight);
        }
        
        // Si no se puede dividir de ninguna manera, devolver como está
        console.warn(`No se pudo dividir "${title}" - devolviendo como está`);
        return [measurement];
    }

    // Dividir por elementos hijos directos
    divideByChildren(measurement, children, availableHeight) {
        const parts = [];
        let currentPart = [];
        let currentHeight = 0;
        
        for (const child of children) {
            const childHtml = child.outerHTML;
            const childHeight = this.measureElementSync(childHtml);
            
            if (currentHeight + childHeight <= availableHeight) {
                currentPart.push(childHtml);
                currentHeight += childHeight;
            } else {
                if (currentPart.length > 0) {
                    parts.push({
                        ...measurement,
                        html: currentPart.join(''),
                        height: currentHeight,
                        title: `${measurement.title} (parte ${parts.length + 1})`
                    });
                }
                currentPart = [childHtml];
                currentHeight = childHeight;
            }
        }
        
        if (currentPart.length > 0) {
            parts.push({
                ...measurement,
                html: currentPart.join(''),
                height: currentHeight,
                title: `${measurement.title} (parte ${parts.length + 1})`
            });
        }
        
        return parts;
    }

    // Extraer elementos de bloque del HTML
    extractBlockElements(html) {
        return html.match(/<(div|section|article|p|table|ul|ol)[^>]*>.*?<\/\1>/gs) || [];
    }

    // Dividir por bloques de contenido
    divideByBlocks(measurement, blockElements, availableHeight) {
        const { title } = measurement;
        
        if (blockElements.length <= 1) {
            return [measurement];
        }
        
        const parts = [];
        let currentPart = [];
        let currentHeight = 0;
        
        for (const block of blockElements) {
            const blockHeight = this.measureElementSync(block);
            
            if (currentHeight + blockHeight <= availableHeight) {
                currentPart.push(block);
                currentHeight += blockHeight;
            } else {
                if (currentPart.length > 0) {
                    parts.push({
                        ...measurement,
                        html: currentPart.join(''),
                        height: currentHeight,
                        title: `${title} (parte ${parts.length + 1})`
                    });
                }
                currentPart = [block];
                currentHeight = blockHeight;
            }
        }
        
        if (currentPart.length > 0) {
            parts.push({
                ...measurement,
                html: currentPart.join(''),
                height: currentHeight,
                title: `${title} (parte ${parts.length + 1})`
            });
        }
        
        return parts;
    }

    // Dividir por párrafos
    divideByParagraphs(measurement, availableHeight) {
        const { html, title } = measurement;
        
        // Dividir por párrafos <p>
        const paragraphs = html.split(/<\/p>/).filter(p => p.trim()).map(p => p + '</p>');
        
        if (paragraphs.length <= 1) {
            return [measurement];
        }
        
        const parts = [];
        let currentPart = [];
        let currentHeight = 0;
        
        for (const p of paragraphs) {
            const pHeight = this.measureElementSync(p);
            
            if (currentHeight + pHeight <= availableHeight) {
                currentPart.push(p);
                currentHeight += pHeight;
            } else {
                if (currentPart.length > 0) {
                    parts.push({
                        ...measurement,
                        html: currentPart.join(''),
                        height: currentHeight,
                        title: `${title} (continuación)`
                    });
                }
                currentPart = [p];
                currentHeight = pHeight;
            }
        }
        
        if (currentPart.length > 0) {
            parts.push({
                ...measurement,
                html: currentPart.join(''),
                height: currentHeight,
                title: `${title} (continuación)`
            });
        }
        
        return parts;
    }

    // Dividir por líneas aproximadas cuando no hay estructura clara
    divideByApproximateLines(measurement, availableHeight) {
        const { html, title, height } = measurement;
        
        console.log(`Dividiendo "${title}" por líneas aproximadas`);
        
        // Calcular cuántas partes necesitamos
        const numParts = Math.ceil(height / availableHeight);
        const targetHeight = height / numParts;
        
        // Dividir el HTML aproximadamente
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Si es un solo elemento grande, intentar dividirlo internamente
        if (tempDiv.children.length === 1) {
            const singleChild = tempDiv.children[0];
            const textContent = singleChild.textContent || '';
            
            if (textContent.length > 100) {
                // Dividir el texto en partes aproximadas
                const words = textContent.split(' ');
                const wordsPerPart = Math.ceil(words.length / numParts);
                
                const parts = [];
                for (let i = 0; i < numParts; i++) {
                    const start = i * wordsPerPart;
                    const end = Math.min(start + wordsPerPart, words.length);
                    const partText = words.slice(start, end).join(' ');
                    
                    // Crear HTML para esta parte
                    const partHtml = `<div>${partText}</div>`;
                    
                    parts.push({
                        ...measurement,
                        html: partHtml,
                        height: targetHeight,
                        title: `${title} (parte ${i + 1})`
                    });
                }
                
                return parts;
            }
        }
        
        // Si no se puede dividir de otra manera, devolver como está
        console.warn(`No se pudo dividir "${title}" - contenido demasiado compacto`);
        return [measurement];
    }

    // Dividir por párrafos
    divideByParagraphs(measurement, paragraphs, availableHeight) {
        const parts = [];
        let currentPart = [];
        let currentHeight = 0;
        
        for (const p of paragraphs) {
            const pHeight = this.measureElementSync(p);
            
            if (currentHeight + pHeight <= availableHeight) {
                currentPart.push(p);
                currentHeight += pHeight;
            } else {
                if (currentPart.length > 0) {
                    parts.push({
                        ...measurement,
                        html: currentPart.join(''),
                        height: currentHeight,
                        title: `${measurement.title} (continuación)`
                    });
                }
                currentPart = [p];
                currentHeight = pHeight;
            }
        }
        
        if (currentPart.length > 0) {
            parts.push({
                ...measurement,
                html: currentPart.join(''),
                height: currentHeight,
                title: `${measurement.title} (continuación)`
            });
        }
        
        return parts.length > 0 ? parts : [measurement];
    }

    // Dividir por bloques div
    divideByBlocks(measurement, blocks, availableHeight) {
        const parts = [];
        let currentPart = [];
        let currentHeight = 0;
        
        for (const block of blocks) {
            const blockHeight = this.measureElementSync(block);
            
            if (currentHeight + blockHeight <= availableHeight) {
                currentPart.push(block);
                currentHeight += blockHeight;
            } else {
                if (currentPart.length > 0) {
                    parts.push({
                        ...measurement,
                        html: currentPart.join(''),
                        height: currentHeight,
                        title: `${measurement.title} (continuación)`
                    });
                }
                currentPart = [block];
                currentHeight = blockHeight;
            }
        }
        
        if (currentPart.length > 0) {
            parts.push({
                ...measurement,
                html: currentPart.join(''),
                height: currentHeight,
                title: `${measurement.title} (continuación)`
            });
        }
        
        return parts.length > 0 ? parts : [measurement];
    }

    // Medición síncrona para uso en división
    measureElementSync(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.cssText = 'position: absolute; visibility: hidden;';
        document.body.appendChild(tempDiv);
        const height = tempDiv.offsetHeight * PX_TO_MM;
        document.body.removeChild(tempDiv);
        return height;
    }

    // Dividir tabla por filas para que quepa
    divideTableToFit(measurement, availableHeight) {
        const { html, title } = measurement;
        const tbodyMatch = html.match(/<tbody[^>]*>(.*?)<\/tbody>/s);
        if (!tbodyMatch) return [measurement];
        
        const rows = tbodyMatch[1].match(/<tr[^>]*>.*?<\/tr>/gs) || [];
        if (rows.length <= 1) return [measurement];
        
        // Calcular altura del encabezado
        const headerMatch = html.match(/<thead[^>]*>.*?<\/thead>/s);
        const header = headerMatch ? headerMatch[0] : '';
        const tempHeader = document.createElement('div');
        tempHeader.innerHTML = header;
        tempHeader.style.cssText = 'position: absolute; visibility: hidden;';
        document.body.appendChild(tempHeader);
        const headerHeight = tempHeader.offsetHeight * PX_TO_MM;
        document.body.removeChild(tempHeader);
        
        // Dividir filas en grupos que quepan
        const parts = [];
        let currentRows = [];
        let currentHeight = headerHeight;
        
        for (const row of rows) {
            const tempRow = document.createElement('div');
            tempRow.innerHTML = row;
            tempRow.style.cssText = 'position: absolute; visibility: hidden;';
            document.body.appendChild(tempRow);
            const rowHeight = tempRow.offsetHeight * PX_TO_MM;
            document.body.removeChild(tempRow);
            
            if (currentHeight + rowHeight <= availableHeight) {
                currentRows.push(row);
                currentHeight += rowHeight;
            } else {
                // Guardar parte actual y empezar nueva
                if (currentRows.length > 0) {
                    const partHtml = html.replace(/<tbody[^>]*>.*?<\/tbody>/s, `<tbody>${currentRows.join('')}</tbody>`);
                    parts.push({
                        ...measurement,
                        html: partHtml,
                        height: currentHeight,
                        title: `${title} (continuación)`
                    });
                }
                currentRows = [row];
                currentHeight = headerHeight + rowHeight;
            }
        }
        
        // Agregar última parte
        if (currentRows.length > 0) {
            const partHtml = html.replace(/<tbody[^>]*>.*?<\/tbody>/s, `<tbody>${currentRows.join('')}</tbody>`);
            parts.push({
                ...measurement,
                html: partHtml,
                height: currentHeight,
                title: `${title} (continuación)`
            });
        }
        
        return parts.length > 0 ? parts : [measurement];
    }

    // Generar páginas físicas HTML
    generatePhysicalPages(pages) {
        console.log('=== GENERANDO PÁGINAS FÍSICAS ===');
        return pages.map((pageContent, index) => {
            const contentHtml = pageContent.map(section => section.html).join('');
            const titles = pageContent.map(s => s.title || s.type).join(' | ');
            const expected = pageContent.reduce((sum, s) => sum + s.height, 0);
            console.log(`Página calculada ${index + 1} → .report-page #${index + 1} → ${pageContent.length} secciones (${expected.toFixed(1)}mm): ${titles}`);
            return `
                <div class="report-page" style="height: ${A4_HEIGHT_MM}mm; overflow: hidden;">
                    <div class="report-page-content">
                        ${contentHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Verificar resultado final: mide contenido real de cada página (bounding box de hijos)
    async verifyPageOverflow() {
        const pages = document.querySelectorAll('.report-page');
        const results = [];
        let hasAnyOverflow = false;

        console.log('=== VERIFICACIÓN PÁGINAS FINALES ===');
        console.log(`Total páginas: ${pages.length}`);

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const contentElement = page.querySelector('.report-page-content');

            // Medir contenido real: bounding box del conjunto de hijos dentro del área útil
            let contentHeightPx = 0;
            if (contentElement) {
                const contentTop = contentElement.getBoundingClientRect().top;
                for (const child of contentElement.children) {
                    const rect = child.getBoundingClientRect();
                    contentHeightPx = Math.max(contentHeightPx, rect.bottom - contentTop);
                }
                // Fallback si no tiene hijos
                if (contentElement.children.length === 0) {
                    contentHeightPx = contentElement.scrollHeight;
                }
            }

            const contentHeight = contentHeightPx * PX_TO_MM;
            const exceeds = contentHeight > CONTENT_HEIGHT_MM;

            // Listar qué contiene realmente esta página DOM
            const titles = contentElement
                ? Array.from(contentElement.querySelectorAll('.report-section-title, .report-technical-subtitle, .report-cover-title'))
                    .map(el => el.textContent.trim()).filter(Boolean).join(' | ')
                : '(sin contenido)';
            console.log(`Página ${i+1}: ${contentHeight.toFixed(1)}mm ${exceeds ? '❌ EXCEDE' : '✅'}`);
            console.log(`  Contenido: ${titles || '(vacío)'}`);

            results.push({ index: i + 1, heightMm: contentHeight, exceeds });
            if (exceeds) hasAnyOverflow = true;
        }

        // Verificar que no haya páginas anidadas
        const nested = document.querySelectorAll('.report-page-content .report-page').length;
        console.log(`Páginas anidadas: ${nested} ${nested === 0 ? '✅' : '❌ ERROR ESTRUCTURAL'}`);

        if (hasAnyOverflow) {
            console.error('❌ SE DETECTÓ OVERFLOW EN LAS PÁGINAS');
        } else {
            console.log('✅ Todas las páginas están dentro del área útil');
        }

        return results;
    }
}

// Instancia global
let reportPaginator = null;

function getReportPaginator() {
    if (!reportPaginator) {
        reportPaginator = new ReportPaginator();
    }
    return reportPaginator;
}
