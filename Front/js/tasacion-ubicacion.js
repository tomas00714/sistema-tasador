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

    inputLocalidad.disabled = true;
    inputLocalidad.placeholder = "Cargando localidades...";

    await cargarLocalidades(provincia);

    inputLocalidad.disabled = false;
    inputLocalidad.placeholder = "Escribí una localidad";
    inputLocalidad.value = "";

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

function inicializarMapa() {
    const contenedorMapa = document.getElementById("mapaTasacion");
    if (!contenedorMapa) return;

    // Limpiar mapa existente si hay uno
    limpiarMapa();

    const latGuardado = datosTasacion.ubicacion.lat || -34.6037;
    const lonGuardado = datosTasacion.ubicacion.lon || -58.3816;

    mapa = L.map(contenedorMapa).setView([latGuardado, lonGuardado], 13);

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

    tilesLayer = L.tileLayer(tileUrl, {
        attribution: '© CartoDB, © OpenStreetMap'
    }).addTo(mapa);

    marcador = L.marker([latGuardado, lonGuardado], {
        draggable: true
    }).addTo(mapa);

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
    const direccion = document.querySelector('.form-left input[type="text"]').value;
    const provincia = document.getElementById("provinciaInput").value;
    const localidad = document.getElementById("localidadInput").value;

    if (!direccion || !provincia || !localidad) return;

    const textoBusqueda = `${direccion}, ${localidad}, ${provincia}, Argentina`;

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(textoBusqueda)}`
    );

    const data = await res.json();

    if (!data.length) return;

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    mapa.setView([lat, lon], 17);
    marcador.setLatLng([lat, lon]);
}
