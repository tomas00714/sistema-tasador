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

// Configuración Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

let mapa;
let marcador;
let tilesLayer;

const TILE_URLS = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

function limpiarMapa() {
    if (mapa) {
        if (marcador) {
            mapa.removeLayer(marcador);
            marcador = null;
        }
        if (tilesLayer) {
            mapa.removeLayer(tilesLayer);
            tilesLayer = null;
        }
        mapa.remove();
        mapa = null;
    }
}

async function inicializarMapa() {
    const contenedorMapa = document.getElementById("mapaTasacion");
    if (!contenedorMapa) return;

    // Limpiar mapa existente si hay uno
    limpiarMapa();

    let latInicial = datosTasacion.ubicacion.lat || -34.6037;
    let lonInicial = datosTasacion.ubicacion.lon || -58.3816;
    let desdeUsuario = false;

    if (!datosTasacion.ubicacion.lat || !datosTasacion.ubicacion.lon) {
        const ubicacionUsuario = await obtenerUbicacionUsuario();
        if (ubicacionUsuario) {
            latInicial = ubicacionUsuario.lat;
            lonInicial = ubicacionUsuario.lon;
            desdeUsuario = true;
        }
    }

    mapa = L.map(contenedorMapa).setView([latInicial, lonInicial], desdeUsuario ? 12 : 13);

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

    tilesLayer = L.tileLayer(tileUrl, {
        attribution: '© CartoDB, © OpenStreetMap'
    }).addTo(mapa);

    marcador = L.marker([latInicial, lonInicial], {
        draggable: true
    }).addTo(mapa);

    mapa.on('click', (e) => {
        marcador.setLatLng(e.latlng);
    });

    setTimeout(() => {
        mapa.invalidateSize();
    }, 100);
}

function cambiarTelosMapa() {
    if (!mapa || !tilesLayer) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

    mapa.removeLayer(tilesLayer);
    tilesLayer = L.tileLayer(tileUrl, { attribution: '© CartoDB, © OpenStreetMap' }).addTo(mapa);
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

    mapa.setView([lat, lon], exacto ? 17 : 12);
    marcador.setLatLng([lat, lon]);
}
