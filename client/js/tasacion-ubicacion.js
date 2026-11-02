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

    // Contador de petición para prevenir race conditions
    let peticionCounter = 0;

    const buscarConDelay = debounce(() => {
        actualizarMapa(++peticionCounter);
    }, 1200);

    direccionInput.addEventListener("input", buscarConDelay);
    provinciaInput.addEventListener("change", buscarConDelay);
    localidadInput.addEventListener("change", buscarConDelay);
}

async function actualizarMapa(peticionId) {
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

    const resultado = await geocodificarConFallback(direccion, localidad, provincia, 'Argentina', `mapaTasacion-${peticionId}`);

    if (!resultado) {
        mostrarMensajeMapa(contenedorMapa, 'No se pudo verificar esta dirección. Revisá la calle, altura, localidad y provincia.');
        return;
    }

    const { lat, lon, exacto, query, tipo } = resultado;

    if (!exacto) {
        if (tipo === 'calle_aproximada') {
            mostrarMensajeMapa(contenedorMapa, 'Se encontró la calle, pero no la altura exacta. Podés arrastrar el marcador.');
        } else if (tipo === 'localidad_aproximada') {
            mostrarMensajeMapa(contenedorMapa, 'No se encontró la dirección. Mostrando centro de localidad. Podés arrastrar el marcador.');
        } else {
            mostrarMensajeMapa(contenedorMapa, `No se encontró la dirección exacta. Mostrando: ${query}`);
        }
    }

    MapaCore.actualizarMarcador('mapaTasacion', { lat, lon, zoom: exacto ? 17 : 12 });
}
