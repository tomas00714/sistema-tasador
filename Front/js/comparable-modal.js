/* =========================
   COMPARABLE MODAL
   Modal para formulario de cargar comparables
========================= */

let comparableModalAbierto = false;
let comparableModalTipoInmueble = null;
let comparableModalOnGuardar = null;
let comparableModalOnSeleccion = null; // Callback para modo 'seleccionar' con contexto externo
let comparableModalModo = null; // 'formulario' o 'seleccionar'
let comparableModalCategoriaSeleccionada = 'tasaciones'; // 'tasaciones' o 'comparables'
let comparableModalSelecciones = new Set(); // IDs de items seleccionados
let comparableModalBtnGuardarListener = null; // Listener actual del botón guardar

/**
 * Abre el modal de formulario de comparable
 * @param {string} tipoInmueble - 'lote', 'departamento', 'casa'
 * @param {Function} onGuardar - Callback cuando se guarda el comparable
 * @param {string} modo - 'formulario' (default) o 'seleccionar'
 * @param {Function} onSeleccion - Callback para el modo seleccionar (items, categoria)
 */
function abrirModalComparable(tipoInmueble, onGuardar, modo = 'formulario', onSeleccion = null) {
    comparableModalTipoInmueble = tipoInmueble;
    comparableModalOnGuardar = onGuardar;
    comparableModalOnSeleccion = onSeleccion;
    comparableModalModo = modo;
    comparableModalCategoriaSeleccionada = 'tasaciones'; // Reset a tasaciones
    
    // Crear el modal si no existe
    if (!document.getElementById('comparableModalOverlay')) {
        crearModalComparable();
    }
    
    const contenido = document.getElementById('comparableModalContent');
    const titulo = document.getElementById('comparableModalTitle');
    const btnGuardar = document.getElementById('comparableModalBtnGuardar');
    
    // Remover listener anterior si existe
    if (comparableModalBtnGuardarListener) {
        btnGuardar.removeEventListener('click', comparableModalBtnGuardarListener);
    }
    
    if (modo === 'seleccionar') {
        // Modo seleccionar existente
        contenido.innerHTML = generarContenidoSeleccionarExistente(tipoInmueble);
        titulo.textContent = 'Usar Tasación/Comparable Existente';
        btnGuardar.textContent = 'Agregar';
        btnGuardar.style.display = 'none'; // Ocultar botón guardar en modo seleccionar
        inicializarListenersSeleccionarExistente();
        
        // Asignar listener para modo seleccionar
        comparableModalBtnGuardarListener = async () => await agregarSeleccionados();
        btnGuardar.addEventListener('click', comparableModalBtnGuardarListener);
    } else {
        // Modo formulario manual
        contenido.innerHTML = generarFormularioComparable(tipoInmueble);
        titulo.textContent = `Agregar Comparable - ${tipoInmueble.charAt(0).toUpperCase() + tipoInmueble.slice(1)}`;
        btnGuardar.textContent = 'Guardar Comparable';
        btnGuardar.style.display = 'block';
        btnGuardar.disabled = true; // Comenzar deshabilitado
        inicializarFormularioComparable(tipoInmueble);
        
        // Asignar listener para modo formulario
        comparableModalBtnGuardarListener = () => {
            if (!btnGuardar.disabled) {
                guardarComparableDesdeModal();
            }
        };
        btnGuardar.addEventListener('click', comparableModalBtnGuardarListener);
        
        // Agregar listeners para validación en tiempo real
        agregarListenersValidacionFormulario(tipoInmueble, btnGuardar);
        
        // Invalidar el mapa después de un delay para que se renderice correctamente
        setTimeout(() => {
            const mapa = document.getElementById('compFormMapa');
            if (mapa && mapa._mapa) {
                mapa._mapa.invalidateSize();
            }
        }, 100);
    }
    
    // Mostrar el modal
    const overlay = document.getElementById('comparableModalOverlay');
    overlay.classList.add('active');
    comparableModalAbierto = true;
}

/**
 * Agrega listeners para validación en tiempo real del formulario
 * @param {string} tipoInmueble - Tipo de inmueble
 * @param {HTMLElement} btnGuardar - Botón de guardar
 */
function agregarListenersValidacionFormulario(tipoInmueble, btnGuardar) {
    // IDs de los inputs a validar
    const inputIds = [
        'compFormDireccionInput',
        'compFormProvinciaInput',
        'compFormLocalidadInput',
        'compFormValorInput'
    ];
    
    if (tipoInmueble === 'lote') {
        inputIds.push(
            'compFormTipoLoteInput',
            'compFormFrenteInput',
            'compFormSuperficieInput'
        );
    } else if (tipoInmueble === 'departamento' || tipoInmueble === 'casa') {
        inputIds.push(
            'compFormSuperficieInput',
            'compFormAntiguedadInput'
        );
    }
    
    // Función para validar el formulario
    const validarFormulario = () => {
        let valido = true;
        
        inputIds.forEach(id => {
            const input = document.getElementById(id);
            if (!input || !input.value.trim()) {
                valido = false;
            }
        });
        
        btnGuardar.disabled = !valido;
    };
    
    // Agregar listeners a los inputs
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', validarFormulario);
            input.addEventListener('change', validarFormulario);
        }
    });
    
    // Validar inicialmente
    validarFormulario();
}

/**
 * Cierra el modal de formulario de comparable
 */
function cerrarModalComparable() {
    const overlay = document.getElementById('comparableModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Limpiar valores de inputs en lugar de borrar todo el contenido
        const inputs = overlay.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }
    comparableModalAbierto = false;
    comparableModalTipoInmueble = null;
    comparableModalOnGuardar = null;
    comparableModalOnSeleccion = null;
    comparableModalModo = null;
    comparableModalCategoriaSeleccionada = 'tasaciones';
    comparableModalSelecciones.clear();

    // Remover listener del botón guardar
    const btnGuardar = document.getElementById('comparableModalBtnGuardar');
    if (btnGuardar && comparableModalBtnGuardarListener) {
        btnGuardar.removeEventListener('click', comparableModalBtnGuardarListener);
        comparableModalBtnGuardarListener = null;
    }
}

/**
 * Crea la estructura HTML del modal
 */
function crearModalComparable() {
    const overlay = document.createElement('div');
    overlay.id = 'comparableModalOverlay';
    overlay.className = 'comparable-modal-overlay';
    
    overlay.innerHTML = `
        <div class="panel-card-container">
            <div class="panel-barra-superior edicion">
                <button type="button" class="panel-btn-volver" id="comparableModalBtnVolver">
                    ← Volver
                </button>
                <h2 id="comparableModalTitle">Agregar Comparable</h2>
            </div>
            <div class="panel-card edicion">
                <div class="panel-contenido-scroll" id="comparableModalContent">
                    <!-- El formulario se generará dinámicamente -->
                </div>
            </div>
            <div class="panel-barra-inferior edicion">
                <div class="panel-barra-inferior-derecha">
                    <button type="button" class="panel-btn-accion" id="comparableModalBtnGuardar">
                        Guardar Comparable
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Agregar event listeners
    inicializarListenersModalComparable();
}

/**
 * Inicializa los event listeners del modal
 */
function inicializarListenersModalComparable() {
    const overlay = document.getElementById('comparableModalOverlay');
    const btnVolver = document.getElementById('comparableModalBtnVolver');
    const btnGuardar = document.getElementById('comparableModalBtnGuardar');
    
    // Cerrar al hacer click en el overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cerrarModalComparable();
        }
    });
    
    // Botón volver
    btnVolver.addEventListener('click', () => {
        cerrarModalComparable();
    });
    
    // Botón guardar - se asignará dinámicamente según el modo
    // No se asigna aquí para evitar conflictos
    
    // Cerrar con ESC (usando sistema seguro)
    agregarListenerSeguro(document, 'keydown', (e) => {
        if (e.key === 'Escape' && comparableModalAbierto) {
            cerrarModalComparable();
        }
    });

    // Enter para guardar cuando el modal está abierto (usando sistema seguro)
    agregarListenerSeguro(document, 'keydown', (e) => {
        if (e.key === 'Enter' && comparableModalAbierto) {
            const btnGuardar = document.getElementById('comparableModalBtnGuardar');
            if (btnGuardar && !btnGuardar.disabled && btnGuardar.style.display !== 'none') {
                e.preventDefault();
                btnGuardar.click();
            }
        }
    });
}

/**
 * Guarda el comparable desde el modal
 */
async function guardarComparableDesdeModal() {
    if (!comparableModalTipoInmueble) return;

    // Validar formulario
    const validacion = validarFormularioComparable(comparableModalTipoInmueble);

    if (!validacion.valido) {
        alert('Por favor, corregí los siguientes errores:\n\n' + validacion.errores.join('\n'));
        return;
    }

    // Obtener datos
    const datos = obtenerDatosFormularioComparable(comparableModalTipoInmueble);

    // Llamar al callback y esperar antes de cerrar
    if (comparableModalOnGuardar) {
        try {
            await comparableModalOnGuardar(datos);
        } catch (e) {
            console.error('Error al guardar comparable:', e);
            alert('No se pudo guardar el comparable. Revisá la consola o el servidor.');
            return;
        }
    }

    // Cerrar el modal
    cerrarModalComparable();
}

/**
 * Genera el contenido HTML para el modo seleccionar existente
 * @param {string} tipoInmueble - 'lote', 'departamento', 'casa'
 * @returns {string} HTML del contenido
 */
function generarContenidoSeleccionarExistente(tipoInmueble) {
    return `
        <div class="seleccionar-existente-container">
            <!-- Selector de categoría -->
            <div class="tabs-container">
                <button type="button" class="btn-tab active" data-categoria="tasaciones">Tasaciones</button>
                <button type="button" class="btn-tab" data-categoria="comparables">Comparables</button>
            </div>
            
            <!-- Subpanel gris que contiene la grilla -->
            <div class="lista-items-container">
                <div id="listaItems" class="lista-items-grid">
                    <!-- Se llena dinámicamente -->
                </div>
            </div>
        </div>
    `;
}

/**
 * Inicializa los listeners para el modo seleccionar existente
 */
function inicializarListenersSeleccionarExistente() {
    // Listener para selector de categoría
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoria = e.target.dataset.categoria;
            comparableModalCategoriaSeleccionada = categoria;
            
            // Actualizar UI de botones
            document.querySelectorAll('.btn-tab').forEach(b => {
                b.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Renderizar lista correspondiente
            renderizarListaItems(categoria);
        });
    });
    
    // Mostrar botón Agregar en la barra inferior
    const btnGuardar = document.getElementById('comparableModalBtnGuardar');
    if (btnGuardar) {
        btnGuardar.textContent = 'Agregar';
        btnGuardar.style.display = 'block';
        btnGuardar.disabled = true; // Deshabilitado inicialmente
    }
    
    // Renderizar lista inicial (tasaciones)
    renderizarListaItems('tasaciones');
}

/**
 * Verifica si un item ya fue seleccionado como comparable
 * @param {string} id - ID del item (tasación o comparable)
 * @param {string} tipo - 'tasacion' o 'comparable'
 * @returns {boolean} True si ya fue seleccionado
 */
function verificarSiYaSeleccionado(id, tipo) {
    if (typeof datosTasacion === 'undefined' || !datosTasacion || !datosTasacion.comparables) {
        return false;
    }
    if (tipo === 'tasacion') {
        // Para tasaciones: buscar si existe un comparable creado desde esta tasación en memoria
        const comparableDesdeTasacion = datosTasacion.comparables.find(c => c.tasacionOrigenId === id);
        return !!comparableDesdeTasacion;
    } else if (tipo === 'comparable') {
        // Para comparables: verificar directamente si está en la lista (ahora son objetos)
        return datosTasacion.comparables.some(c => c.id === id);
    }
    return false;
}

/**
 * Renderiza la lista de items (tasaciones o comparables)
 * @param {string} categoria - 'tasaciones' o 'comparables'
 */
async function renderizarListaItems(categoria) {
    const listaContainer = document.getElementById('listaItems');
    if (!listaContainer) return;
    
    const tipoInmueble = comparableModalTipoInmueble;
    
    // Limpiar selecciones al cambiar de categoría
    comparableModalSelecciones.clear();
    actualizarEstadoBotonAgregar();
    
    if (categoria === 'tasaciones') {
        // Obtener tasaciones desde la API
        const tasaciones = await leerTasaciones();
        
        // Filtrar por tipo de inmueble y excluir la tasación actual si estamos en modo edición
        const idAExcluirTasaciones = (typeof tasacionId !== 'undefined' && tasacionId === 1 && typeof tasacionIdReal !== 'undefined' && tasacionIdReal)
            ? tasacionIdReal
            : (typeof tasacionId !== 'undefined' ? tasacionId : undefined);
        const tasacionesFiltradas = tasaciones.filter(t => {
            if (t.tipo !== tipoInmueble) return false;
            // Excluir la tasación actual si estamos editando
            if (typeof idAExcluirTasaciones !== 'undefined' && idAExcluirTasaciones && String(t.id) === String(idAExcluirTasaciones)) {
                return false;
            }
            return true;
        });
        
        // Ordenar por fecha (más reciente al más antiguo)
        tasacionesFiltradas.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        
        if (tasacionesFiltradas.length === 0) {
            listaContainer.innerHTML = `
                <div class="lista-vacia">
                    <p>No hay tasaciones de tipo ${tipoInmueble} en el historial.</p>
                </div>
            `;
            return;
        }
        
        // Renderizar cards
        listaContainer.innerHTML = tasacionesFiltradas.map(t => generarCardHistorial(t, 'tasacion')).join('');
        
        // Agregar listeners a las cards para selección
        listaContainer.querySelectorAll('.card-minimizada').forEach(card => {
            const id = card.dataset.id;
            const yaSeleccionado = verificarSiYaSeleccionado(id, 'tasacion');
            
            if (yaSeleccionado) {
                card.classList.add('card-minimizada-opacidad');
                card.style.pointerEvents = 'none';
            }
            
            card.addEventListener('click', () => {
                toggleSeleccion(id, card);
            });
        });
        
    } else if (categoria === 'comparables') {
        // Obtener todas las tasaciones visibles para detectar duplicados
        const tasaciones = await leerTasaciones();
        const idAExcluirComparables = (typeof tasacionId !== 'undefined' && tasacionId === 1 && typeof tasacionIdReal !== 'undefined' && tasacionIdReal)
            ? tasacionIdReal
            : (typeof tasacionId !== 'undefined' ? tasacionId : undefined);
        const tasacionesIds = new Set(
            tasaciones
                .filter(t => t.tipo === tipoInmueble && (typeof idAExcluirComparables === 'undefined' || !idAExcluirComparables || String(t.id) !== String(idAExcluirComparables)))
                .map(t => t.id)
        );

        // Obtener todos los comparables de la API
        const comparables = await leerComparables();
        
        // Filtrar por tipo de inmueble y excluir comparables cuya tasación origen ya se muestra en la pestaña Tasaciones
        const comparablesFiltrados = comparables.filter(c => {
            if (c.tipoInmueble !== tipoInmueble) return false;
            if (c.tasacionOrigenId && tasacionesIds.has(c.tasacionOrigenId)) return false;
            return true;
        });
        
        // Ordenar por fecha (más reciente al más antiguo)
        comparablesFiltrados.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        
        if (comparablesFiltrados.length === 0) {
            listaContainer.innerHTML = `
                <div class="lista-vacia">
                    <p>No hay comparables de tipo ${tipoInmueble} disponibles.</p>
                </div>
            `;
            return;
        }
        
        // Renderizar cards
        listaContainer.innerHTML = comparablesFiltrados.map(c => generarCardHistorial(c, 'comparable')).join('');
        
        // Agregar listeners a las cards para selección
        listaContainer.querySelectorAll('.card-minimizada').forEach(card => {
            const id = card.dataset.id;
            const yaSeleccionado = verificarSiYaSeleccionado(id, 'comparable');
            
            if (yaSeleccionado) {
                card.classList.add('card-minimizada-opacidad');
                card.style.pointerEvents = 'none';
            }
            
            card.addEventListener('click', () => {
                toggleSeleccion(id, card);
            });
        });
    }
}

/**
 * Genera el HTML de una card de historial (reutiliza el formato del historial)
 * @param {Object} item - Tasación o comparable
 * @param {string} tipo - 'tasacion' o 'comparable'
 * @returns {string} HTML de la card
 */
function generarCardHistorial(item, tipo) {
    let precio = '—';
    if (tipo === 'tasacion') {
        // Para tasaciones, el valor está en resultado.valor_final o datosCompletos.resultado.valor_final
        if (item.resultado?.valor_final) {
            precio = `USD ${item.resultado.valor_final.toLocaleString('es-AR')}`;
        } else if (item.datosCompletos?.resultado?.valor_final) {
            precio = `USD ${item.datosCompletos.resultado.valor_final.toLocaleString('es-AR')}`;
        }
    } else {
        // Para comparables, el valor está en item.valor
        if (item.valor) {
            precio = `USD ${item.valor.toLocaleString('es-AR')}`;
        }
    }
    
    const fecha = formatearFecha(item.fechaCreacion);
    const direccion = item.ubicacion?.direccion || 'Sin dirección';
    const localidad = item.ubicacion?.localidad || '';
    const provincia = item.ubicacion?.provincia || '';
    
    return construirCardMinimizada({
        item,
        precio,
        fecha,
        tipoLabel: tipo === 'tasacion' ? 'Tasación' : 'Comparable',
        estadoLabel: item.estado === 'borrador' ? 'Borrador' : item.estado === 'completada' ? 'Completada' : '',
        estadoBadgeClass: item.estado === 'borrador'
            ? 'card-minimizada-badge-borrador'
            : 'card-minimizada-badge-completada',
        dataAttributes: {
            'data-id': item.id,
            'data-tipo': tipo
        }
    });
}

/**
 * Alterna la selección de una card
 * @param {string} id - ID del item
 * @param {HTMLElement} card - Elemento de la card
 */
function toggleSeleccion(id, card) {
    if (comparableModalSelecciones.has(id)) {
        comparableModalSelecciones.delete(id);
        card.classList.remove('card-minimizada-seleccionado');
    } else {
        comparableModalSelecciones.add(id);
        card.classList.add('card-minimizada-seleccionado');
    }
    actualizarEstadoBotonAgregar();
}

/**
 * Actualiza el estado del botón Agregar según las selecciones
 */
function actualizarEstadoBotonAgregar() {
    const btnAgregar = document.getElementById('comparableModalBtnGuardar');
    if (btnAgregar) {
        btnAgregar.disabled = comparableModalSelecciones.size === 0;
    }
}

/**
 * Agrega todos los items seleccionados como comparables
 */
async function agregarSeleccionados() {
    if (comparableModalSelecciones.size === 0) return;

    const categoria = comparableModalCategoriaSeleccionada;

    // Si hay un callback externo de selección, delegar la responsabilidad
    if (typeof comparableModalOnSeleccion === 'function') {
        let items = [];
        if (categoria === 'tasaciones') {
            const tasaciones = await leerTasaciones();
            items = tasaciones.filter(t => comparableModalSelecciones.has(t.id));
        } else if (categoria === 'comparables') {
            const comparables = await leerComparables();
            items = comparables.filter(c => comparableModalSelecciones.has(c.id));
        }
        comparableModalOnSeleccion(items, categoria);
        comparableModalSelecciones.clear();
        cerrarModalComparable();
        return;
    }

    let agregados = 0;

    if (categoria === 'tasaciones') {
        // Agregar tasaciones seleccionadas
        const tasaciones = await leerTasaciones();
        for (const id of comparableModalSelecciones) {
            const tasacion = tasaciones.find(t => t.id === id);
            if (tasacion && !datosTasacion.comparables.some(c => c.id === tasacion.id || c.tasacionOrigenId === tasacion.id)) {
                if (await agregarTasacionComoComparable(tasacion.id, false)) {
                    agregados++;
                }
            }
        }
    } else if (categoria === 'comparables') {
        // Agregar comparables seleccionados
        const comparables = await leerComparables();
        for (const id of comparableModalSelecciones) {
            const comparable = comparables.find(c => c.id === id);
            if (comparable && !datosTasacion.comparables.some(c => c.id === comparable.id)) {
                if (await agregarComparableExistente(comparable.id, false)) {
                    agregados++;
                }
            }
        }
    }

    if (agregados === 0) {
        alert('Todos los items seleccionados ya están en los comparables.');
        return;
    }

    // Limpiar selecciones y cerrar modal
    comparableModalSelecciones.clear();
    cerrarModalComparable();
    renderComparablesDerecha();
}

/**
 * Agrega una tasación del historial como comparable
 * @param {string} tasacionId - ID de la tasación
 * @param {boolean} cerrarModal - Si debe cerrar el modal después de agregar (default: true)
 */
async function agregarTasacionComoComparable(tasacionId, cerrarModal = true) {
    const tasaciones = await leerTasaciones();
    const tasacion = tasaciones.find(t => t.id === tasacionId);
    
    if (!tasacion) {
        console.error('No se encontró la tasación:', tasacionId);
        return false;
    }
    
    // Verificar si ya está agregada (ahora verificamos por tasacionOrigenId en memoria)
    const yaExiste = datosTasacion.comparables.some(c => c.tasacionOrigenId === tasacionId);
    if (yaExiste) {
        return false;
    }
    
    // Preparar datos específicos según el tipo de inmueble
    const datosComparable = {
        fuente: 'de_tasacion',
        tipoInmueble: tasacion.tipo,
        ubicacion: {
            direccion: tasacion.ubicacion.direccion,
            provincia: tasacion.ubicacion.provincia,
            localidad: tasacion.ubicacion.localidad,
            lat: tasacion.ubicacion.lat ?? null,
            lon: tasacion.ubicacion.lon ?? null
        },
        valor: tasacion.resultado?.valor_final || tasacion.datosCompletos?.resultado?.valor_final || 0,
        tipoValor: 'venta',
        tasacionOrigenId: tasacionId
    };

    if (tasacion.tipo === 'lote') {
        const caracteristicas = tasacion.lote?.caracteristicas || {};
        datosComparable.tipoLote = tasacion.lote?.tipoLote || '';
        datosComparable.frente = caracteristicas.frente ?? 0;
        datosComparable.fondo = caracteristicas.fondo ?? 0;
        datosComparable.superficie = caracteristicas.superficie ?? 0;
        datosComparable.lote = tasacion.lote;
    }

    // Crear comparable desde la tasación
    const comparable = await crearComparable(datosComparable);
    
    // NO guardar en storage, solo agregar a memoria
    datosTasacion.comparables.push(comparable);
    
    resultadoCalculado = false;
    actualizarIndicadoresProgreso();
    actualizarEstadoBotonSiguiente();
    
    if (cerrarModal) {
        cerrarModalComparable();
        renderComparablesDerecha();
    }
    
    return true;
}

/**
 * Agrega un comparable existente del storage
 * @param {string} comparableId - ID del comparable
 * @param {boolean} cerrarModal - Si debe cerrar el modal después de agregar (default: true)
 */
async function agregarComparableExistente(comparableId, cerrarModal = true) {
    const btn = document.querySelector(`[data-comparable-id="${comparableId}"]`);
    if (btn) btn.disabled = true;

    try {
        const comparables = await leerComparables();
        const comparable = comparables.find(c => c.id === comparableId);

        if (!comparable) {
            console.error('No se encontró el comparable:', comparableId);
            return false;
        }

        // Verificar si ya está agregada (ahora verificamos por ID en memoria)
        const yaExiste = datosTasacion.comparables.some(c => c.id === comparableId);
        if (yaExiste) {
            return false;
        }

        // Agregar el objeto completo a memoria (clonado para evitar referencias)
        datosTasacion.comparables.push({ ...comparable });

        resultadoCalculado = false;
        actualizarIndicadoresProgreso();
        actualizarEstadoBotonSiguiente();

        if (cerrarModal) {
            cerrarModalComparable();
            renderComparablesDerecha();
        }

        return true;
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Formatea una fecha para mostrarla
 * @param {string} fechaStr - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}
