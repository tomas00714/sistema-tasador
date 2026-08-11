/* =========================
   TASACION UBICACION
   Autocomplete de provincias/localidades y mapa
========================= */

async function cargarProvincias() {
    try {
        await asegurarDatasetProvincias();
        inicializarAutocompleteProvincia();
    } catch(error) {
        console.error("Error cargando provincias:", error);
    }
}

async function cargarLocalidadesUI(provincia) {
    const inputLocalidad = document.getElementById("localidadInput");
    const listLocalidad = document.getElementById("localidadList");

    // Preservar el valor existente si hay uno
    const valorExistente = inputLocalidad.value || "";

    inputLocalidad.disabled = true;
    inputLocalidad.placeholder = "Cargando localidades...";

    await cargarLocalidades(provincia);

    inputLocalidad.disabled = false;
    inputLocalidad.placeholder = "Escribí una localidad";

    // Solo limpiar si no había un valor previo válido
    if (!valorExistente) {
        inputLocalidad.value = "";
    } else {
        inputLocalidad.value = valorExistente;
    }

    inicializarAutocompleteLocalidad();
}

async function inicializarMapa() {
    const contenedorMapa = document.getElementById("mapaTasacion");
    if (!contenedorMapa) return;

    await MapaCore.inicializarEdicion('mapaTasacion', {
        lat: datosTasacion.ubicacion.lat || null,
        lon: datosTasacion.ubicacion.lon || null,
        draggable: true
    });
}

function configurarBusquedaMapa() {
    const direccionInput = document.querySelector('.form-left input[type="text"]');
    const provinciaInput = document.getElementById("provinciaInput");
    const localidadInput = document.getElementById("localidadInput");

    const buscarConDelay = debounce(() => {
        actualizarMapa();
    }, 1200);

    direccionInput.addEventListener("input", buscarConDelay);
    provinciaInput.addEventListener("change", buscarConDelay);
    localidadInput.addEventListener("change", buscarConDelay);
}

async function actualizarMapa() {
    const direccionInput = document.querySelector('.form-left input[type="text"]');
    const provinciaInput = document.getElementById("provinciaInput");
    const localidadInput = document.getElementById("localidadInput");
    const contenedorMapa = document.getElementById("mapaTasacion");

    // Verificar que los elementos existan antes de leer sus valores
    if (!direccionInput || !provinciaInput || !localidadInput) return;

    const direccion = direccionInput.value;
    const provincia = provinciaInput.value;
    const localidad = localidadInput.value;

    if (!direccion || !provincia || !localidad) return;

    const resultado = await geocodificarConFallback(direccion, localidad, provincia, 'Argentina');

    if (!resultado) {
        mostrarMensajeMapa(contenedorMapa, 'No se pudo ubicar la dirección en el mapa.');
        return;
    }

    const { lat, lon, exacto, query } = resultado;

    if (!exacto) {
        mostrarMensajeMapa(contenedorMapa, `No se encontró la dirección exacta. Mostrando: ${query}`);
    }

    MapaCore.actualizarMarcador('mapaTasacion', { lat, lon, zoom: exacto ? 17 : 12 });
}
