/* =========================
   HOME - Panel de inicio
   Métricas del mes, borradores y tasaciones recientes.
   Reutiliza el estado global `tasaciones` y el modal de
   perfil definidos en historial.js.
========================= */

function homeFormatearFecha(fecha) {
    if (!fecha) return "—";
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
    });
}

function homeTipoLabel(tasacion) {
    const tipo = String(tasacion?.tipo || "").trim();
    return tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : "—";
}

function renderHomePanel() {
    const lista = document.getElementById("homeRecientesLista");
    const numMes = document.getElementById("homeTasacionesMes");
    const numBorradores = document.getElementById("homeBorradores");

    if (!lista || !numMes || !numBorradores) {
        return;
    }

    const items = (typeof tasaciones !== "undefined" && Array.isArray(tasaciones))
        ? tasaciones
        : [];

    const ahora = new Date();
    numMes.textContent = items.filter(t => {
        const f = new Date(t.fechaCreacion);
        return !Number.isNaN(f.getTime())
            && f.getMonth() === ahora.getMonth()
            && f.getFullYear() === ahora.getFullYear();
    }).length;

    numBorradores.textContent = items.filter(t => t.estado === "borrador").length;

    const recientes = [...items].sort((a, b) => {
        const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : new Date(0);
        const fechaB = b.fechaCreacion ? new Date(b.fechaCreacion) : new Date(0);
        return fechaB - fechaA;
    }).slice(0, 3);

    if (!recientes.length) {
        lista.innerHTML = `<p class="home-recientes-vacio">No hay tasaciones recientes.</p>`;
        return;
    }

    const filas = recientes.map(t => {
        const direccion = escapeHtml(t.ubicacion?.direccion || "—");
        const tipo = escapeHtml(homeTipoLabel(t));
        const fecha = homeFormatearFecha(t.fechaCreacion);
        const esBorrador = t.estado === "borrador";
        const estadoLabel = esBorrador ? "Borrador" : "Completada";
        const badgeClass = esBorrador
            ? "card-minimizada-badge-borrador"
            : "card-minimizada-badge-completada";

        return `
            <button type="button" class="home-recientes-fila" data-id="${escapeHtml(t.id)}">
                <span class="home-recientes-cell">${direccion}</span>
                <span class="home-recientes-cell">${tipo}</span>
                <span class="home-recientes-cell">${fecha}</span>
                <span class="home-recientes-cell">
                    <span class="card-minimizada-badge ${badgeClass}">${estadoLabel}</span>
                </span>
            </button>`;
    }).join("");

    lista.innerHTML = `
        <div class="home-recientes-header">
            <span>Dirección</span>
            <span>Tipo</span>
            <span>Fecha</span>
            <span>Estado</span>
        </div>
        ${filas}`;

    lista.querySelectorAll(".home-recientes-fila").forEach(fila => {
        fila.addEventListener("click", () => {
            if (typeof window.abrirPerfilTasacion === "function") {
                window.abrirPerfilTasacion(fila.dataset.id);
            }
        });
    });
}

async function initHomePanel() {
    if (!document.getElementById("homeRecientesLista")) {
        return;
    }

    try {
        if (typeof cargarHistorialDesdeAPI === "function") {
            await cargarHistorialDesdeAPI();
        }
    } catch (e) {
        console.error("Error al cargar tasaciones para el home:", e);
    }

    renderHomePanel();

    // Refrescar métricas y recientes al cerrar el modal de perfil
    // (la tasación pudo haber sido eliminada desde el modal).
    const cerrarPerfilPrevio = window.cerrarPerfil;
    window.cerrarPerfil = function () {
        if (typeof cerrarPerfilPrevio === "function") {
            cerrarPerfilPrevio.apply(this, arguments);
        }
        renderHomePanel();
    };
}

window.renderHomePanel = renderHomePanel;

document.addEventListener("DOMContentLoaded", initHomePanel);
