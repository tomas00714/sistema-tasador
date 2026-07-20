/* =========================
   COMPARABLE EDITOR
   Vista reutilizable para crear/editar/visualizar comparables
========================= */

if (typeof TILE_URLS === 'undefined') {
    var TILE_URLS = {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    };
}

class ComparableEditor {
    constructor(config = {}) {
        this.modo = config.modo || 'crear';
        this.tipo = config.tipo || null;
        this.datos = config.datos || null;
        this.onGuardar = config.onGuardar || null;
        this.onCancelar = config.onCancelar || null;
        this.embedded = false;
        this.mostrarFooter = true;

        this.container = document.getElementById('comparableEditorContainer') || null;
        this.editor = document.getElementById('comparableEditor') || null;

        this.mapa = null;
        this.marcador = null;
        this.tilesLayer = null;
    }

    abrir(config = {}) {
        this.embedded = false;
        if (config.modo) this.modo = config.modo;
        if (config.tipo) this.tipo = config.tipo;
        if (config.datos) this.datos = config.datos;
        if (config.onGuardar) this.onGuardar = config.onGuardar;
        if (config.onCancelar) this.onCancelar = config.onCancelar;

        this.renderizar();
        this.container.style.display = 'flex';
        // Force reflow
        void this.container.offsetWidth;
        this.container.classList.add('active');

        if (this.modo === 'crear' || this.modo === 'solicitud') {
            this.inicializarMapa();
        }

        if (this.datos && (this.modo === 'editar' || this.modo === 'visualizar')) {
            this.cargarDatosEnFormulario();
        }
    }

    abrirEn(contenedor, config = {}) {
        this.embedded = true;
        this.mostrarFooter = config.footer !== false;
        this.container = null;
        this.editor = contenedor;

        if (config.modo) this.modo = config.modo;
        if (config.tipo) this.tipo = config.tipo;
        if (config.datos) this.datos = config.datos;
        if (config.onGuardar) this.onGuardar = config.onGuardar;
        if (config.onCancelar) this.onCancelar = config.onCancelar;

        this.renderizar();

        if (this.modo === 'crear' || this.modo === 'solicitud' || this.modo === 'editar') {
            this.inicializarMapa();
        }

        if (this.datos && (this.modo === 'editar' || this.modo === 'visualizar')) {
            this.cargarDatosEnFormulario();
        }
    }

    cargarDatosEnFormulario() {
        if (!this.datos) return;

        if (this.datos.tipo) {
            this.tipo = this.datos.tipo;
        }

        const u = this.datos.ubicacion || {};
        const direccionInput = document.getElementById('compDireccion');
        const provinciaInput = document.getElementById('compProvincia');
        const localidadInput = document.getElementById('compLocalidad');
        if (direccionInput) direccionInput.value = u.direccion || '';
        if (provinciaInput) provinciaInput.value = u.provincia || '';
        if (localidadInput) {
            localidadInput.value = u.localidad || '';
            localidadInput.disabled = !u.provincia;
        }

        const valorMontoInput = document.getElementById('compValor');
        if (valorMontoInput) {
            const monto = this.datos.valor?.monto ?? this.datos.valor;
            valorMontoInput.value = monto != null ? monto : '';
        }
        const tipoValor = this.datos.valor?.tipo || this.datos.tipoValor || 'venta';
        const radioTipoValor = document.querySelector(`input[name="compTipoValor"][value="${tipoValor}"]`);
        if (radioTipoValor) radioTipoValor.checked = true;

        if (this.tipo === 'lote') {
            const lote = this.datos.lote || {};
            const frente = document.getElementById('compFrente');
            const fondo = document.getElementById('compFondo');
            const superficie = document.getElementById('compSuperficie');
            const tipoLote = document.getElementById('compTipoLote');
            if (frente) frente.value = lote.frente != null ? lote.frente : '';
            if (fondo) fondo.value = lote.fondo != null ? lote.fondo : '';
            if (superficie) superficie.value = lote.superficie != null ? lote.superficie : (this.datos.superficie ?? '');
            if (tipoLote) tipoLote.value = lote.tipoLote || '';
        } else if (this.tipo === 'casa') {
            const casa = this.datos.casa || {};
            const cubierta = document.getElementById('compSuperficieCubierta');
            const terreno = document.getElementById('compSuperficieTerreno');
            const antiguedad = document.getElementById('compAntiguedad');
            if (cubierta) cubierta.value = casa.superficieCubierta != null ? casa.superficieCubierta : '';
            if (terreno) terreno.value = casa.superficieTerreno != null ? casa.superficieTerreno : '';
            if (antiguedad) antiguedad.value = casa.antiguedad != null ? casa.antiguedad : '';
        } else if (this.tipo === 'departamento') {
            const depto = this.datos.departamento || {};
            const superficieTotal = document.getElementById('compSuperficieTotal');
            const antiguedad = document.getElementById('compAntiguedad');
            const ascensor = document.getElementById('compTieneAscensor');
            if (superficieTotal) superficieTotal.value = depto.superficieTotal != null ? depto.superficieTotal : (this.datos.superficie ?? '');
            if (antiguedad) antiguedad.value = depto.antiguedad != null ? depto.antiguedad : '';
            if (ascensor) ascensor.checked = depto.tieneAscensor === true || depto.tieneAscensor === 'true' || depto.tieneAscensor === 'si';
        }

        // Inicializar mapa centrado en la ubicación si existen coordenadas
        if (u.lat && u.lon) {
            this.inicializarMapa(parseFloat(u.lat), parseFloat(u.lon));
        } else if (u.latitud && u.longitud) {
            this.inicializarMapa(parseFloat(u.latitud), parseFloat(u.longitud));
        } else {
            this.inicializarMapa();
        }
    }
    
    cerrar() {
        if (this.embedded) {
            this.limpiarMapa();
            if (this.onCancelar) this.onCancelar();
            this.editor = null;
            this.embedded = false;
            return;
        }

        if (this.container) {
            this.container.classList.remove('active');
            this.container.style.display = 'none';
        }
        this.limpiarMapa();
        if (this.editor) this.editor.innerHTML = '';
        if (this.onCancelar) this.onCancelar();
    }
    
    renderizar() {
        const titulo = this.obtenerTitulo();
        const contenido = this.obtenerContenido();
        const footer = this.mostrarFooter ? this.obtenerFooter() : '';

        this.editor.innerHTML = `
            <div class="comparable-editor-header">
                <div class="comparable-editor-title">
                    <h2>${titulo}</h2>
                    <p>${this.obtenerSubtitulo()}</p>
                </div>
                <button class="comparable-editor-close" onclick="window.comparableEditor.cerrar()">✕</button>
            </div>
            <div class="comparable-editor-content">
                ${contenido}
            </div>
            ${footer ? `<div class="comparable-editor-footer">${footer}</div>` : ''}
        `;

        this.inicializarEventListeners();
    }
    
    obtenerTitulo() {
        const titulos = {
            crear: 'Nuevo comparable',
            editar: 'Editar comparable',
            visualizar: 'Ver comparable',
            solicitud: 'Solicitud de comparable'
        };
        return titulos[this.modo] || 'Comparable';
    }
    
    obtenerSubtitulo() {
        const subtitulos = {
            crear: 'Completá los datos de la propiedad comparable.',
            editar: 'Modificá los datos del comparable.',
            visualizar: 'Información del comparable.',
            solicitud: 'Completá los datos para solicitar el comparable.'
        };
        return subtitulos[this.modo] || '';
    }
    
    obtenerContenido() {
        return `
            ${this.renderizarSeccion('Ubicación', this.renderizarUbicacion())}
            ${this.renderizarDatosEspecificos()}
            ${this.renderizarSeccion('Valor', this.renderizarValor())}
        `;
    }
    
    renderizarSeccion(titulo, contenido) {
        return `
            <div class="comparable-editor-section">
                <h3>${titulo}</h3>
                ${contenido}
            </div>
        `;
    }
    
    renderizarDatosEspecificos() {
        switch (this.tipo) {
            case 'lote':
                return this.renderizarDatosLote();
            case 'casa':
                return this.renderizarDatosCasa();
            case 'departamento':
                return this.renderizarDatosDepartamento();
            default:
                return '';
        }
    }
    
    renderizarUbicacion() {
        return `
            <div class="comparable-ubicacion-grid">
                <div class="comparable-ubicacion-inputs">
                    <div class="input-group">
                        <label>Dirección</label>
                        <input type="text" id="compDireccion" autocomplete="off" ${this.modo === 'visualizar' ? 'readonly' : ''}>
                    </div>
                    <div class="input-group">
                        <label>Provincia</label>
                        <div class="autocomplete-container">
                            <input type="text" id="compProvincia" placeholder="Escribí una provincia" autocomplete="off" ${this.modo === 'visualizar' ? 'readonly' : ''}>
                            <div class="autocomplete-list" id="compProvinciaList"></div>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Localidad</label>
                        <div class="autocomplete-container">
                            <input type="text" id="compLocalidad" placeholder="Seleccioná provincia primero" autocomplete="off" disabled ${this.modo === 'visualizar' ? 'readonly' : ''}>
                            <div class="autocomplete-list" id="compLocalidadList"></div>
                        </div>
                    </div>
                </div>
                <div class="comparable-ubicacion-mapa">
                    <div id="compMap" class="comparable-map"></div>
                </div>
            </div>
        `;
    }
    
    renderizarDatosLote() {
        return this.renderizarSeccion('Medidas del lote', `
            <div class="input-group">
                <label>Frente (m)</label>
                <input type="number" id="compFrente" min="0" step="any" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Fondo (m)</label>
                <input type="number" id="compFondo" min="0" step="any" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Superficie (m²)</label>
                <input type="number" id="compSuperficie" min="0" step="any" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Tipo de lote</label>
                <div class="autocomplete-container">
                    <input type="text" id="compTipoLote" placeholder="Seleccionar tipo" autocomplete="off" readonly ${this.modo === 'visualizar' ? 'readonly' : ''}>
                    <div class="autocomplete-list" id="compTipoLoteList" style="display:none">
                        <div class="autocomplete-item">Medial</div>
                        <div class="autocomplete-item">Esquina</div>
                        <div class="autocomplete-item">Esquina larga (+30m)</div>
                        <div class="autocomplete-item">Salida a dos calles</div>
                        <div class="autocomplete-item">Irregular</div>
                    </div>
                </div>
            </div>
        `);
    }
    
    renderizarDatosCasa() {
        return this.renderizarSeccion('Características de la casa', `
            <div class="input-group">
                <label>Superficie cubierta (m²)</label>
                <input type="number" id="compSuperficieCubierta" min="0" step="any" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Superficie terreno (m²)</label>
                <input type="number" id="compSuperficieTerreno" min="0" step="any" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Antigüedad (años)</label>
                <input type="number" id="compAntiguedad" min="0" step="1" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
        `);
    }
    
    renderizarDatosDepartamento() {
        return this.renderizarSeccion('Características del departamento', `
            <div class="input-group">
                <label>Superficie total (m²)</label>
                <input type="number" id="compSuperficieTotal" min="0" step="any" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Antigüedad (años)</label>
                <input type="number" id="compAntiguedad" min="0" step="1" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Tiene ascensor</label>
                <div class="switch-container">
                    <label class="switch">
                        <input type="checkbox" id="compTieneAscensor" checked ${this.modo === 'visualizar' ? 'disabled' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `);
    }
    
    renderizarValor() {
        return `
            <div class="input-group">
                <label>Valor (USD)</label>
                <input type="number" id="compValor" placeholder="Ej: 150000" min="0" ${this.modo === 'visualizar' ? 'readonly' : ''}>
            </div>
            <div class="input-group">
                <label>Tipo de valor</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="compTipoValor" value="venta" checked ${this.modo === 'visualizar' ? 'disabled' : ''}>
                        Valor de venta
                    </label>
                    <label>
                        <input type="radio" name="compTipoValor" value="oferta" ${this.modo === 'visualizar' ? 'disabled' : ''}>
                        Valor de oferta
                    </label>
                </div>
            </div>
        `;
    }
    
    obtenerFooter() {
        if (this.modo === 'visualizar') {
            return `
                <div class="comparable-editor-buttons">
                    <button class="comparable-editor-button secondary" onclick="window.comparableEditor.cerrar()">Cerrar</button>
                </div>
            `;
        }
        
        return `
            <div class="comparable-editor-buttons">
                <button class="comparable-editor-button secondary" onclick="window.comparableEditor.cerrar()">Cancelar</button>
                <button class="comparable-editor-button primary" onclick="window.comparableEditor.guardar()">Guardar</button>
            </div>
        `;
    }
    
    inicializarEventListeners() {
        this.inicializarAutocompleteProvincia();
        
        if (this.tipo === 'lote') {
            this.inicializarAutocompleteTipoLote();
        }
    }
    
    inicializarAutocompleteProvincia() {
        const input = document.getElementById('compProvincia');
        const list = document.getElementById('compProvinciaList');
        
        if (!input || !list) return;
        
        if (typeof provinciasData === 'undefined') {
            console.warn('provinciasData no está definido');
            return;
        }
        
        input.addEventListener('focus', () => {
            this.renderizarAutocomplete(list, provinciasData, input);
        });
        
        input.addEventListener('input', (e) => {
            this.renderizarAutocomplete(list, provinciasData, input, e.target.value);
        });
    }
    
    inicializarAutocompleteTipoLote() {
        const input = document.getElementById('compTipoLote');
        const list = document.getElementById('compTipoLoteList');
        
        if (!input || !list) return;
        
        input.addEventListener('click', () => {
            list.style.display = 'block';
        });
        
        list.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.textContent;
                list.style.display = 'none';
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!input.parentElement.contains(e.target)) {
                list.style.display = 'none';
            }
        });
    }
    
    renderizarAutocomplete(list, datos, input, filtro = '') {
        list.innerHTML = '';
        
        const filtradas = datos.filter(item =>
            item.nombre.toLowerCase().includes(filtro.toLowerCase())
        );
        
        if (!filtradas.length) {
            list.style.display = 'none';
            return;
        }
        
        filtradas.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = item.nombre;
            div.addEventListener('click', () => {
                input.value = item.nombre;
                list.style.display = 'none';
            });
            list.appendChild(div);
        });
        
        list.style.display = 'block';
    }
    
    inicializarMapa(lat = -34.6037, lng = -58.3816) {
        const mapContainer = document.getElementById('compMap');
        if (!mapContainer) return;

        if (this.mapa) {
            this.mapa.remove();
            this.mapa = null;
        }

        this.mapa = L.map('compMap').setView([lat, lng], 13);

        const isDarkMode = document.body.classList.contains('dark-mode');
        const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

        this.tilesLayer = L.tileLayer(tileUrl, {
            attribution: '© CartoDB, © OpenStreetMap'
        }).addTo(this.mapa);

        this.marcador = L.marker([lat, lng], {
            draggable: true
        }).addTo(this.mapa);

        this.marcador.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            console.log('Marcador movido a:', lat, lng);
        });

        this.mapa.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.marcador.setLatLng([lat, lng]);
        });

        setTimeout(() => {
            this.mapa.invalidateSize();
        }, 100);
    }
    
    limpiarMapa() {
        if (this.marcador) {
            this.mapa.removeLayer(this.marcador);
            this.marcador = null;
        }
        
        if (this.tilesLayer) {
            this.mapa.removeLayer(this.tilesLayer);
            this.tilesLayer = null;
        }
        
        if (this.mapa) {
            this.mapa.remove();
            this.mapa = null;
        }
    }
    
    guardar() {
        const datos = this.obtenerDatosFormulario();
        
        if (!this.validarDatos(datos)) {
            return;
        }
        
        if (this.onGuardar) {
            this.onGuardar(datos);
        }
        
        this.cerrar();
    }
    
    obtenerDatosFormulario() {
        let lat = null;
        let lon = null;
        if (this.marcador && this.mapa) {
            const pos = this.marcador.getLatLng();
            lat = pos.lat;
            lon = pos.lng;
        }

        const datos = {
            tipo: this.tipo,
            ubicacion: {
                direccion: document.getElementById('compDireccion')?.value?.trim() || '',
                provincia: document.getElementById('compProvincia')?.value?.trim() || '',
                localidad: document.getElementById('compLocalidad')?.value?.trim() || ''
            },
            valor: {
                monto: parseFloat(document.getElementById('compValor')?.value) || 0,
                tipo: document.querySelector('input[name="compTipoValor"]:checked')?.value || 'venta'
            }
        };

        if (lat != null && lon != null) {
            datos.ubicacion.lat = lat;
            datos.ubicacion.lon = lon;
        }
        
        if (this.tipo === 'lote') {
            datos.lote = {
                frente: parseFloat(document.getElementById('compFrente')?.value) || 0,
                fondo: parseFloat(document.getElementById('compFondo')?.value) || 0,
                superficie: parseFloat(document.getElementById('compSuperficie')?.value) || 0,
                tipoLote: document.getElementById('compTipoLote')?.value?.trim() || ''
            };
        } else if (this.tipo === 'casa') {
            datos.casa = {
                superficieCubierta: parseFloat(document.getElementById('compSuperficieCubierta')?.value) || 0,
                superficieTerreno: parseFloat(document.getElementById('compSuperficieTerreno')?.value) || 0,
                antiguedad: parseInt(document.getElementById('compAntiguedad')?.value) || 0
            };
        } else if (this.tipo === 'departamento') {
            datos.departamento = {
                superficieTotal: parseFloat(document.getElementById('compSuperficieTotal')?.value) || 0,
                antiguedad: parseInt(document.getElementById('compAntiguedad')?.value) || 0,
                tieneAscensor: document.getElementById('compTieneAscensor')?.checked || false
            };
        }
        
        return datos;
    }
    
    validarDatos(datos) {
        if (!datos.ubicacion.direccion || !datos.ubicacion.provincia || !datos.ubicacion.localidad) {
            alert('Completá dirección, provincia y localidad.');
            return false;
        }
        
        if (!datos.valor.monto || datos.valor.monto <= 0) {
            alert('Ingresá un valor válido.');
            return false;
        }
        
        if (this.tipo === 'lote') {
            if (!datos.lote.frente || datos.lote.frente <= 0) {
                alert('Completá el frente del lote.');
                return false;
            }
            if (!datos.lote.superficie || datos.lote.superficie <= 0) {
                alert('Completá la superficie del lote.');
                return false;
            }
        }
        
        return true;
    }
}

window.comparableEditor = new ComparableEditor();
