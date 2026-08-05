function abrirTasacionHome(opciones = {}) {

    const stage = document.getElementById("homeStage");

    const tarjeta = document.getElementById("tarjetaNuevaTasacion");

    if (!stage || !tarjeta) {

        return;
    }

    if (opciones.instant) {

        stage.classList.add("home-stage--sin-animacion");
    }

    stage.classList.add("home-stage--expandida");

    tarjeta.setAttribute("aria-expanded", "true");

    const panel = tarjeta.querySelector(".tarjeta-home-panel");

    if (panel) {

        panel.setAttribute("aria-hidden", "false");
    }

    requestAnimationFrame(() => {

        stage.classList.remove("home-stage--sin-animacion");
    });

    history.replaceState(
        { vista: "inicio", tasacion: true },
        "",
        "index.html?tasacion=1"
    );
}

function cerrarTasacionHome(opciones = {}) {

    const stage = document.getElementById("homeStage");

    const tarjeta = document.getElementById("tarjetaNuevaTasacion");

    if (!stage || !tarjeta) {

        return;
    }

    if (!stage.classList.contains("home-stage--expandida")) {

        return;
    }

    if (opciones.instant) {

        stage.classList.add("home-stage--sin-animacion");
    }

    stage.classList.remove("home-stage--expandida");

    tarjeta.setAttribute("aria-expanded", "false");

    const panel = tarjeta.querySelector(".tarjeta-home-panel");

    if (panel) {

        panel.setAttribute("aria-hidden", "true");
    }

    requestAnimationFrame(() => {

        stage.classList.remove("home-stage--sin-animacion");
    });

    if (document.body.dataset.vista === "inicio") {

        history.replaceState(
            { vista: "inicio" },
            "",
            "index.html"
        );
    }
}

function tasacionHomeEstaAbierta() {

    const stage = document.getElementById("homeStage");

    return Boolean(
        stage &&
        stage.classList.contains("home-stage--expandida")
    );
}

function actualizarSaludoInicioFecha() {

    const el = document.getElementById(
        "homeInicioFecha"
    );

    if (!el) {

        return;
    }

    const fecha = new Date();

    el.textContent = fecha.toLocaleDateString(
        "es-AR",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}

function initHomeTasacion() {

    actualizarSaludoInicioFecha();

    const tarjeta = document.getElementById("tarjetaNuevaTasacion");

    const resumen = document.getElementById("tarjetaHomeResumen");

    if (!tarjeta || !resumen) {

        return;
    }

    resumen.addEventListener("click", (event) => {

        if (tasacionHomeEstaAbierta()) {

            return;
        }

        event.stopPropagation();

        abrirTasacionHome();
    });

    resumen.addEventListener("keydown", (event) => {

        if (
            tasacionHomeEstaAbierta() ||
            (event.key !== "Enter" && event.key !== " ")
        ) {

            return;
        }

        event.preventDefault();

        abrirTasacionHome();
    });

    const params = new URLSearchParams(window.location.search);

    const view = params.get("view");

    if (
        params.get("tasacion") === "1" &&
        (!view || view === "inicio")
    ) {

        abrirTasacionHome({ instant: true });
    }
}

window.abrirTasacionHome = abrirTasacionHome;
window.cerrarTasacionHome = cerrarTasacionHome;
window.tasacionHomeEstaAbierta = tasacionHomeEstaAbierta;

document.addEventListener("DOMContentLoaded", initHomeTasacion);
