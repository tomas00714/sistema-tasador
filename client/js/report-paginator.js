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
            sectionDiv.dataset.keepWithNext = section.keepWithNext ? '1' : '';
            sectionDiv.dataset.minContentHeight = section.minContentHeight || '';
            container.appendChild(sectionDiv);
        }
        
        // Esperar renderizado completo
        await document.fonts.ready;
        await this.waitForImages(container);

        // Autofit de tablas (data-autofit): reduce la fuente hasta que la
        // tabla entra en el ancho útil y congela el ancho de cada columna
        // en su <th>, para que la división por filas conserve el layout.
        // Debe correr antes de medir: la fuente elegida cambia alturas.
        if (typeof window.ajustarTablasAutofit === 'function') {
            window.ajustarTablasAutofit(container);
        }

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
            // Espacio trailing invisible: padding-bottom de la sección raíz
            // + margin-bottom del wrapper. Si el bloque es el último de la
            // página, ese espacio no se ve — no debe impedir que entre.
            const root = element.firstElementChild;
            const trailingPx = (root ? parseFloat(getComputedStyle(root).paddingBottom) || 0 : 0)
                + (parseFloat(getComputedStyle(element).marginBottom) || 0);
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
                html: element.innerHTML,
                keepWithNext: element.dataset.keepWithNext === '1',
                minContentHeight: parseFloat(element.dataset.minContentHeight) || 0,
                trailingSpace: trailingPx * PX_TO_MM
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

        for (let i = 0; i < measurements.length; i++) {
            const measurement = measurements[i];
            const { height, title, type, html } = measurement;
            let remainingSpace = CONTENT_HEIGHT_MM - currentHeight;

            console.log(`Sección "${title}": ${height.toFixed(1)}mm (disponible: ${remainingSpace.toFixed(1)}mm)`);

            // keepWithNext: un encabezado nunca debe quedar como último
            // elemento de una página sin contenido a continuación.
            if (measurement.keepWithNext && height <= remainingSpace && currentPage.length > 0) {
                const nextMeasurement = measurements[i + 1];
                const roomAfter = remainingSpace - height;
                const minContent = measurement.minContentHeight || 20;
                // El contenido acompaña al encabezado en esta página si la
                // siguiente sección cabe aquí (total o parcialmente) o si es
                // grande y se dividirá dejando al menos minContent de la
                // primera parte junto al encabezado. Su espacio trailing
                // puede recortarse contra el borde sin efecto visual.
                const nextStartsHere = nextMeasurement && (
                    nextMeasurement.height - (nextMeasurement.trailingSpace || 0) <= roomAfter ||
                    (nextMeasurement.height > CONTENT_HEIGHT_MM && roomAfter >= minContent)
                );
                if (!nextStartsHere) {
                    pages.push([...currentPage]);
                    console.log(`  📄 Página ${pageNum} completada (${currentHeight.toFixed(1)}mm)`);
                    pageNum++;
                    currentPage = [];
                    currentHeight = 0;
                    remainingSpace = CONTENT_HEIGHT_MM;
                    console.log(`  ⤵️ "${title}" movido a página ${pageNum} (keepWithNext)`);
                }
            }

            // Si la sección cabe completa. Si solo entra su contenido (sin el
            // espacio trailing), también cabe: ese padding/margin final se
            // recorta contra el borde de la página sin efecto visual, pero la
            // página se considera llena para que nada más se apile después.
            if (height <= remainingSpace) {
                currentPage.push(measurement);
                currentHeight += height;
                console.log(`  ✅ Agregada a página ${pageNum} (total: ${currentHeight.toFixed(1)}mm)`);
                continue;
            }
            if (height <= CONTENT_HEIGHT_MM && height - (measurement.trailingSpace || 0) <= remainingSpace) {
                currentPage.push(measurement);
                currentHeight = CONTENT_HEIGHT_MM;
                console.log(`  ✅ Agregada a página ${pageNum} (contenido entra; trailing absorbido por el borde)`);
                continue;
            }

            // Si la sección es muy grande para una página sola
            if (height > CONTENT_HEIGHT_MM) {
                console.log(`  ⚠️  Sección "${title}" (${height.toFixed(1)}mm) excede área útil, debe dividirse`);

                // La primera parte se dimensiona para el espacio restante de
                // la página actual (puede compartirla con un encabezado
                // keepWithNext); las siguientes usan la página completa.
                const dividedParts = this.divideSectionToFit(measurement, CONTENT_HEIGHT_MM, remainingSpace);

                for (const part of dividedParts) {
                    if (part.height > CONTENT_HEIGHT_MM) {
                        console.error(`  ❌ Parte de "${title}" sigue excediendo: ${part.height.toFixed(1)}mm`);
                    }
                    const rem = CONTENT_HEIGHT_MM - currentHeight;
                    if (part.height <= rem || currentPage.length === 0) {
                        currentPage.push(part);
                        currentHeight += part.height;
                        console.log(`  ✅ Parte de "${title}" en página ${pageNum} (total: ${currentHeight.toFixed(1)}mm)`);
                    } else {
                        pages.push(currentPage);
                        console.log(`  📄 Página ${pageNum} completada (${currentHeight.toFixed(1)}mm)`);
                        pageNum++;
                        currentPage = [part];
                        currentHeight = part.height;
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

    // Dividir sección para que quepa en el espacio disponible.
    // firstAvailableHeight permite que la primera parte sea más chica
    // (cuando comparte página con contenido previo, ej. un encabezado).
    divideSectionToFit(measurement, availableHeight, firstAvailableHeight = availableHeight) {
        const { html, title, type } = measurement;

        console.log(`Intentando dividir "${title}" (${measurement.height.toFixed(1)}mm) en partes de ${availableHeight}mm`);

        // Para tablas, dividir por filas
        if (type === 'table') {
            return this.divideTableToFit(measurement, availableHeight, firstAvailableHeight);
        }

        // Para el resto de tipos (section/text/item/etc.), dividir
        // respetando la estructura DOM: agrupa el encabezado con su
        // primer contenido y desciende recursivamente a contenedores
        // internos (grids de cards, fotos, bloques de texto).
        return this.divideByDom(measurement, availableHeight, firstAvailableHeight);
    }

    // Detecta si un fragmento HTML es un encabezado de sección/subsección.
    // Inspecciona únicamente el elemento raíz del fragmento: no depende
    // del orden ni de la posición de las clases dentro del atributo.
    isHeaderElement(html) {
        if (!html || typeof html !== 'string') return false;
        const temp = document.createElement('div');
        temp.innerHTML = html;
        if (temp.children.length !== 1) return false;
        const el = temp.firstElementChild;
        const cls = typeof el.className === 'string' ? el.className : '';
        return /(^|\s)report-(section-title|section-header|subtitle|technical-subtitle|closing-subtitle|foda-title|reference-subtitle|ambiente-title|section-subtitle)(\s|$)/.test(cls);
    }

    // Tags de apertura/cierre del elemento para envolver partes divididas
    // conservando tag y clases originales (ej: <section class="report-section">).
    elementWrapperTags(element) {
        const tag = element.tagName.toLowerCase();
        const cls = element.getAttribute('class');
        return {
            open: `<${tag}${cls ? ` class="${cls}"` : ''}>`,
            close: `</${tag}>`
        };
    }

    // Divide una sección respetando su estructura DOM.
    // Devuelve partes envueltas en el tag/clase del elemento raíz.
    divideByDom(measurement, availableHeight, firstAvailableHeight = availableHeight) {
        const { html, title } = measurement;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const root = tempDiv.firstElementChild;
        if (!root) {
            console.warn(`No se pudo dividir "${title}" - devolviendo como está`);
            return [measurement];
        }

        const wrap = this.elementWrapperTags(root);
        const innerParts = this.splitChildren(root, availableHeight, firstAvailableHeight);
        if (innerParts.length <= 1) {
            console.warn(`No se pudo dividir "${title}" - devolviendo como está`);
            return [measurement];
        }

        return innerParts.map(part => {
            const partHtml = `${wrap.open}${part.html}${wrap.close}`;
            return {
                ...measurement,
                html: partHtml,
                // Altura re-medida del HTML final: incluye padding/bordes
                // del wrapper de sección para coincidir con el render.
                height: this.measureElementSync(partHtml),
                title: `${title} (continuación)`
            };
        });
    }

    // Divide los hijos de element en partes que entren en availableHeight.
    // La primera parte usa firstAvailableHeight como presupuesto.
    // Devuelve [{ html, height }] donde html son los hijos concatenados.
    splitChildren(element, availableHeight, firstAvailableHeight = availableHeight) {
        const children = Array.from(element.children);
        if (children.length === 0) {
            return [{
                html: element.innerHTML,
                height: this.measureElementSync(element.outerHTML)
            }];
        }

        // Convertir cada hijo en una unidad; si un hijo solo excede la
        // página, dividirlo recursivamente conservando su tag/clase.
        // Los hijos se miden DENTRO del contexto del padre (misma tag/clase)
        // para que grills/flex asignen el ancho de columna real.
        const parentWrap = this.elementWrapperTags(element);
        let units = [];
        children.forEach((child, index) => {
            const childHeight = this.measureElementSync(`${parentWrap.open}${child.outerHTML}${parentWrap.close}`);
            if (childHeight > availableHeight && child.children.length > 0) {
                const wrap = this.elementWrapperTags(child);
                const subParts = this.splitChildren(child, availableHeight,
                    index === 0 ? firstAvailableHeight : availableHeight);
                for (const sp of subParts) {
                    units.push({ html: `${wrap.open}${sp.html}${wrap.close}`, height: sp.height });
                }
            } else {
                units.push({ html: child.outerHTML, height: childHeight });
            }
        });

        // Agrupar encabezado + primer contenido como unidad lógica para
        // evitar que un título quede solo al final de una página.
        if (units.length > 1 && this.isHeaderElement(units[0].html)) {
            const combinedHtml = units[0].html + units[1].html;
            const combinedHeight = this.measureElementSync(`${parentWrap.open}${combinedHtml}${parentWrap.close}`);
            units = [{ html: combinedHtml, height: combinedHeight }, ...units.slice(2)];
        }

        // Empaquetado greedy: la primera parte respeta firstAvailableHeight
        const parts = [];
        let currentPart = [];
        let currentHeight = 0;
        let budget = firstAvailableHeight;
        for (const unit of units) {
            if (currentHeight + unit.height <= budget || currentPart.length === 0) {
                currentPart.push(unit.html);
                currentHeight += unit.height;
            } else {
                parts.push({ html: currentPart.join(''), height: currentHeight });
                currentPart = [unit.html];
                currentHeight = unit.height;
                budget = availableHeight;
            }
        }
        if (currentPart.length > 0) {
            parts.push({ html: currentPart.join(''), height: currentHeight });
        }
        return parts;
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

    // Medición síncrona para uso en división.
    // El contenedor usa el ancho útil real de la página para que las
    // alturas medidas coincidan con el renderizado final.
    measureElementSync(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.cssText = `position: absolute; visibility: hidden; width: ${A4_WIDTH_MM - (PAGE_PADDING_MM * 2)}mm; box-sizing: border-box;`;
        document.body.appendChild(tempDiv);
        const height = tempDiv.offsetHeight * PX_TO_MM;
        document.body.removeChild(tempDiv);
        return height;
    }

    // Dividir tabla por filas para que quepa.
    // El contenido previo a la tabla (título, intro) solo va en la
    // primera parte; el contenido posterior y el tfoot solo en la última.
    divideTableToFit(measurement, availableHeight, firstAvailableHeight = availableHeight) {
        const { html, title } = measurement;
        const tableMatch = html.match(/<table[\s\S]*?<\/table>/);
        if (!tableMatch) return this.divideByDom(measurement, availableHeight);

        const tableHtml = tableMatch[0];
        const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
        if (!tbodyMatch) return this.divideByDom(measurement, availableHeight);

        const rows = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
        if (rows.length <= 1) return this.divideByDom(measurement, availableHeight);

        const tableIndex = html.indexOf(tableHtml);
        const prefix = html.slice(0, tableIndex);
        const suffix = html.slice(tableIndex + tableHtml.length);
        const theadMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/);
        const thead = theadMatch ? theadMatch[0] : '';
        const tfootMatch = tableHtml.match(/<tfoot[\s\S]*?<\/tfoot>/);
        const tfoot = tfootMatch ? tfootMatch[0] : '';
        const tableOpen = tableHtml.slice(0, tableHtml.indexOf('>') + 1);

        const prefixHeight = this.measureElementSync(`<div>${prefix}</div>`);
        const theadHeight = this.measureElementSync(`${tableOpen}${thead}<tbody></tbody></table>`);

        const rowGroups = [];
        let currentRows = [];
        let currentHeight = prefixHeight + theadHeight;
        let budget = firstAvailableHeight;

        for (const row of rows) {
            // La fila se mide con el thead presente para que el layout de
            // columnas (y por tanto la altura real de la fila) coincida
            // con la tabla completa.
            const rowHeight = this.measureElementSync(`${tableOpen}${thead}<tbody>${row}</tbody></table>`) - theadHeight;
            if (currentHeight + rowHeight <= budget || currentRows.length === 0) {
                currentRows.push(row);
                currentHeight += rowHeight;
            } else {
                rowGroups.push(currentRows);
                currentRows = [row];
                currentHeight = theadHeight + rowHeight;
                budget = availableHeight;
            }
        }
        if (currentRows.length > 0) {
            rowGroups.push(currentRows);
        }
        if (rowGroups.length <= 1) return [measurement];

        const buildPartHtml = (groupRows, isFirst, isLast) => {
            const partTable = `${tableOpen}${thead}<tbody>${groupRows.join('')}</tbody>${isLast ? tfoot : ''}</table>`;
            return `${isFirst ? prefix : ''}${partTable}${isLast ? suffix : ''}`;
        };

        // Verificación de seguridad: re-medir cada parte con su HTML final;
        // si excede su presupuesto, mover la última fila al grupo siguiente.
        let guard = 0;
        for (let i = 0; i < rowGroups.length && guard < 60; i++) {
            const partBudget = i === 0 ? firstAvailableHeight : availableHeight;
            while (rowGroups[i].length > 1 && guard < 60) {
                const isLast = i === rowGroups.length - 1;
                const h = this.measureElementSync(buildPartHtml(rowGroups[i], i === 0, isLast));
                if (h <= partBudget) break;
                const moved = rowGroups[i].pop();
                if (isLast) rowGroups.push([moved]);
                else rowGroups[i + 1].unshift(moved);
                guard++;
            }
        }

        return rowGroups.map((groupRows, index) => {
            const isLast = index === rowGroups.length - 1;
            const partHtml = buildPartHtml(groupRows, index === 0, isLast);
            return {
                ...measurement,
                html: partHtml,
                height: this.measureElementSync(partHtml),
                title: `${title} (continuación)`
            };
        });
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
