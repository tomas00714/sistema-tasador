/* =========================
   HOMOGENEIZACION SUPERFICIE
   Componente reutilizable de homogeneización de superficies.
   Única implementación para flujo de tasación y modal de comparables.
========================= */

const HOMOGENEIZACION_SUPERFICIE_CONFIG = {
    departamento: {
        filas: [
            { tipo: 'cubierto', idSuperficie: 'superficieCubierto', idCoef: 'coefCubierto', idHomogeneizada: 'homogeneizadaCubierto', label: 'Cubierto', defaultCoef: 1, placeholder: 'Ej: 60', rango: 'rang.: 1' },
            { tipo: 'balconDescubierto', idSuperficie: 'superficieBalconDescubierto', idCoef: 'coefBalconDescubierto', idHomogeneizada: 'homogeneizadaBalconDescubierto', label: 'Balcón descubierto', defaultCoef: 0.30, placeholder: 'Ej: 8', rango: 'rang.: 0.30' },
            { tipo: 'semicubierto', idSuperficie: 'superficieSemicubierto', idCoef: 'coefSemicubierto', idHomogeneizada: 'homogeneizadaSemicubierto', label: 'Galería y balcón semi cubierto (m² semi cubiertos)', defaultCoef: 0.50, placeholder: 'Ej: 8', rango: 'rang.: 0.50' },
            { tipo: 'baulera', idSuperficie: 'superficieBaulera', idCoef: 'coefBaulera', idHomogeneizada: 'homogeneizadaBaulera', label: 'Bauleras o depósito (según superficie)', defaultCoef: 0.25, placeholder: 'Ej: 5', rango: 'rang.: 0.25 - 0.90' },
            { tipo: 'balconTerraza', idSuperficie: 'superficieBalconTerraza', idCoef: 'coefBalconTerraza', idHomogeneizada: 'homogeneizadaBalconTerraza', label: 'Balcón terraza', defaultCoef: 0.50, placeholder: 'Ej: 10', rango: 'rang.: 0.50 - 0.80' },
            { tipo: 'descubierto', idSuperficie: 'superficieDescubierta', idCoef: 'coefDescubierta', idHomogeneizada: 'homogeneizadaDescubierta', label: 'Descubierta', defaultCoef: 0.20, placeholder: 'Ej: 10', rango: 'rang.: 0.20' }
        ],
        separador: 3
    },
    casa: {
        filas: [
            { tipo: 'cubierto', idSuperficie: 'superficieCubierto', idCoef: 'coefCubierto', idHomogeneizada: 'homogeneizadaCubierto', label: 'Cubierto', defaultCoef: 1, placeholder: 'Ej: 60', rango: 'rang.: 1' },
            { tipo: 'semicubierto', idSuperficie: 'superficieSemicubierto', idCoef: 'coefSemicubierto', idHomogeneizada: 'homogeneizadaSemicubierto', label: 'Galerías y balcón semi cubierto (m² semi cubiertos)', defaultCoef: 0.50, placeholder: 'Ej: 8', rango: 'rang.: 0.50' },
            { tipo: 'patio', idSuperficie: 'superficiePatio', idCoef: 'coefPatio', idHomogeneizada: 'homogeneizadaPatio', label: 'Patio y terrazas', defaultCoef: 0.10, placeholder: 'Ej: 10', rango: 'rang.: 0.10 - 0.25' },
            { tipo: 'dependencias', idSuperficie: 'superficieDependencias', idCoef: 'coefDependencias', idHomogeneizada: 'homogeneizadaDependencias', label: 'Dependencias (separadas del cuerpo principal)', defaultCoef: 0.40, placeholder: 'Ej: 15', rango: 'rang.: 0.40 - 0.70' },
            { tipo: 'balcon', idSuperficie: 'superficieBalcon', idCoef: 'coefBalcon', idHomogeneizada: 'homogeneizadaBalcon', label: 'Balcón', defaultCoef: 0.30, placeholder: 'Ej: 8', rango: 'rang.: 0.30' },
            { tipo: 'descubierto', idSuperficie: 'superficieDescubierta', idCoef: 'coefDescubierta', idHomogeneizada: 'homogeneizadaDescubierta', label: 'Descubierta', defaultCoef: 0.20, placeholder: 'Ej: 10', rango: 'rang.: 0.20' }
        ],
        separador: 3
    }
};

function idConPrefijo(prefijo, id) {
    return prefijo ? `${prefijo}${id}` : id;
}

function asegurarEstructuraHomogeneizacion(homData, config) {
    if (!homData) homData = {};
    config.filas.forEach(fila => {
        if (!homData[fila.tipo]) {
            homData[fila.tipo] = { superficie: 0, homogeneizada: 0, coef: fila.defaultCoef };
        } else if (homData[fila.tipo].coeficiente !== undefined && homData[fila.tipo].coef === undefined) {
            homData[fila.tipo].coef = homData[fila.tipo].coeficiente;
        }
    });
    if (homData.totalSuperficie === undefined) homData.totalSuperficie = 0;
    if (homData.totalHomogeneizada === undefined) homData.totalHomogeneizada = 0;
    return homData;
}

function generarTablaHomogeneizacion(tipo, homData, prefijo = '', lectura = false) {
    const config = HOMOGENEIZACION_SUPERFICIE_CONFIG[tipo];
    if (!config) return '';
    asegurarEstructuraHomogeneizacion(homData, config);

    const filasHTML = config.filas.map((fila, idx) => {
        const h = homData[fila.tipo];
        const coef = h?.coef ?? h?.coeficiente ?? fila.defaultCoef;
        const separador = (idx === config.separador) ? `<tr class="fila-separador"><td colspan="4" class="celda-separador">Otras superficies</td></tr>` : '';
        const supId = idConPrefijo(prefijo, fila.idSuperficie);
        const coefId = idConPrefijo(prefijo, fila.idCoef);
        const homId = idConPrefijo(prefijo, fila.idHomogeneizada);
        const celdaSuperficie = lectura
            ? `<td>${parseFloat(h?.superficie) > 0 ? parseFloat(h.superficie).toFixed(2) + ' m²' : '—'}</td>`
            : `<td><input type="number" id="${supId}" class="input-tabla" placeholder="${fila.placeholder}" value="${h.superficie || ''}"></td>`;
        const celdaCoef = lectura
            ? `<td>${coef}</td>`
            : `<td>
                    <input type="number" id="${coefId}" class="input-tabla-coef" step="0.01" value="${coef}">
                    <div class="coef-placeholder">${fila.rango}</div>
               </td>`;
        const celdaHom = lectura
            ? `<td>${parseFloat(h?.homogeneizada) > 0 ? parseFloat(h.homogeneizada).toFixed(2) + ' m²' : '—'}</td>`
            : `<td><input type="number" id="${homId}" class="input-tabla" value="${h.homogeneizada || 0}" disabled></td>`;

        return `
            ${separador}
            <tr>
                <td>${fila.label}</td>
                ${celdaSuperficie}
                ${celdaCoef}
                ${celdaHom}
            </tr>
        `;
    }).join('');

    const totalSupId = idConPrefijo(prefijo, 'totalSuperficie');
    const totalHomId = idConPrefijo(prefijo, 'totalHomogeneizada');
    const celdaTotalSup = lectura
        ? `<td><strong>${parseFloat(homData.totalSuperficie) > 0 ? parseFloat(homData.totalSuperficie).toFixed(2) + ' m²' : '—'}</strong></td>`
        : `<td><input type="number" id="${totalSupId}" class="input-tabla" value="${homData.totalSuperficie || 0}" disabled></td>`;
    const celdaTotalHom = lectura
        ? `<td><strong>${parseFloat(homData.totalHomogeneizada) > 0 ? parseFloat(homData.totalHomogeneizada).toFixed(2) + ' m²' : '—'}</strong></td>`
        : `<td><input type="number" id="${totalHomId}" class="input-tabla" value="${homData.totalHomogeneizada || 0}" disabled></td>`;

    return `
        <table class="tabla-homogeneizacion resultado-tabla">
            <thead>
                <tr>
                    <th>Tipo de Superficie</th>
                    <th>Superficie (m²)</th>
                    <th>Coeficiente</th>
                    <th>Superficie Homogeneizada (m²)</th>
                </tr>
            </thead>
            <tbody>
                ${filasHTML}
                <tr class="fila-total">
                    <td><strong>Total</strong></td>
                    ${celdaTotalSup}
                    <td></td>
                    ${celdaTotalHom}
                </tr>
            </tbody>
        </table>
    `;
}

function generarHTMLHomogeneizacion(tipo, homData, prefijo = '') {
    const tabla = generarTablaHomogeneizacion(tipo, homData, prefijo);
    if (!tabla) return '';
    return `
        <div class="titulo-seccion">
            <h1>Homogeneización de superficie</h1>
        </div>
        <div class="homogeneizacion-container">
            ${tabla}
        </div>
    `;
}

function generarSeccionHomogeneizacionModal(tipo, homData, prefijo = '', titulo = 'Homogeneización de superficie') {
    const tabla = generarTablaHomogeneizacion(tipo, homData, prefijo);
    if (!tabla) return '';
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>${titulo}</h3>
            </div>
            <div class="homogeneizacion-container">
                ${tabla}
            </div>
        </div>
    `;
}

function calcularTotalesHomogeneizacion(tipo, homData, prefijo = '') {
    const config = HOMOGENEIZACION_SUPERFICIE_CONFIG[tipo];
    if (!config || !homData) return;

    let totalSuperficie = 0;
    let totalHomogeneizada = 0;
    config.filas.forEach(fila => {
        totalSuperficie += (homData[fila.tipo]?.superficie || 0);
        totalHomogeneizada += (homData[fila.tipo]?.homogeneizada || 0);
    });
    homData.totalSuperficie = totalSuperficie;
    homData.totalHomogeneizada = totalHomogeneizada;

    const inputTotalSuperficie = document.getElementById(idConPrefijo(prefijo, 'totalSuperficie'));
    const inputTotalHomogeneizada = document.getElementById(idConPrefijo(prefijo, 'totalHomogeneizada'));
    if (inputTotalSuperficie) inputTotalSuperficie.value = totalSuperficie.toFixed(2);
    if (inputTotalHomogeneizada) inputTotalHomogeneizada.value = totalHomogeneizada.toFixed(2);
}

function inicializarHomogeneizacionSuperficie(tipo, homData, prefijo = '') {
    const config = HOMOGENEIZACION_SUPERFICIE_CONFIG[tipo];
    if (!config || !homData) return;
    asegurarEstructuraHomogeneizacion(homData, config);

    config.filas.forEach(fila => {
        const superficieId = idConPrefijo(prefijo, fila.idSuperficie);
        const homogeneizadaId = idConPrefijo(prefijo, fila.idHomogeneizada);
        const coefId = idConPrefijo(prefijo, fila.idCoef);
        const inputSuperficie = document.getElementById(superficieId);
        const inputHomogeneizada = document.getElementById(homogeneizadaId);
        const inputCoef = document.getElementById(coefId);

        if (!inputSuperficie || !inputHomogeneizada) return;

        const actualizar = () => {
            const valor = parseFloat(inputSuperficie.value) || 0;
            const coef = parseFloat(inputCoef?.value) || fila.defaultCoef;
            homData[fila.tipo].superficie = valor;
            homData[fila.tipo].coef = coef;
            homData[fila.tipo].homogeneizada = valor * coef;
            inputHomogeneizada.value = homData[fila.tipo].homogeneizada.toFixed(2);
            calcularTotalesHomogeneizacion(tipo, homData, prefijo);
        };

        inputSuperficie.addEventListener('input', actualizar);
        if (inputCoef) {
            inputCoef.addEventListener('input', actualizar);
        }
    });

    calcularTotalesHomogeneizacion(tipo, homData, prefijo);
}

function guardarHomogeneizacionSuperficie(tipo, homData, prefijo = '') {
    const config = HOMOGENEIZACION_SUPERFICIE_CONFIG[tipo];
    if (!config || !homData) return 0;
    asegurarEstructuraHomogeneizacion(homData, config);

    config.filas.forEach(fila => {
        const superficieId = idConPrefijo(prefijo, fila.idSuperficie);
        const coefId = idConPrefijo(prefijo, fila.idCoef);
        const inputSuperficie = document.getElementById(superficieId);
        const inputCoef = document.getElementById(coefId);
        const superficie = parseFloat(inputSuperficie?.value) || 0;
        const coef = parseFloat(inputCoef?.value) || fila.defaultCoef;
        homData[fila.tipo].superficie = superficie;
        homData[fila.tipo].coef = coef;
        homData[fila.tipo].homogeneizada = superficie * coef;
    });

    calcularTotalesHomogeneizacion(tipo, homData, prefijo);
    return homData.totalHomogeneizada;
}
