function setVista(vista) {

    const permitidas = [
        "inicio",
        "historial",
        "ajustes"
    ];

    if (!permitidas.includes(vista)) {

        vista = "inicio";
    }

    if (
        vista !== "inicio" &&
        typeof window.cerrarTasacionHome === "function" &&
        typeof window.tasacionHomeEstaAbierta === "function" &&
        window.tasacionHomeEstaAbierta()
    ) {

        window.cerrarTasacionHome({ instant: true });
    }

    if (
        vista === "inicio" &&
        typeof window.tasacionHomeEstaAbierta === "function" &&
        typeof window.cerrarTasacionHome === "function" &&
        window.tasacionHomeEstaAbierta()
    ) {

        window.cerrarTasacionHome();

        document.body.dataset.vista = vista;

        // Update nav buttons
        document
            .querySelectorAll(".nav-btn[data-vista]")
            .forEach(btn => {

                btn.classList.toggle(
                    "active",
                    btn.dataset.vista === vista
                );
            });

        // Show/hide sections
        const panelHistorial = document.getElementById("panelHistorial");
        const panelAjustes = document.getElementById("panelAjustes");
        const homeStage = document.getElementById("homeStage");
        
        if (panelHistorial) panelHistorial.style.display = "none";
        if (panelAjustes) panelAjustes.style.display = "none";
        if (homeStage) homeStage.style.display = "flex";

        return;
    }

    document.body.dataset.vista = vista;

    // Update nav buttons
    document
        .querySelectorAll(".nav-btn[data-vista]")
        .forEach(btn => {

            btn.classList.toggle(
                "active",
                btn.dataset.vista === vista
            );
        });

    // Show/hide sections
    if (vista === "historial") {
        const panelHistorial = document.getElementById("panelHistorial");
        const panelAjustes = document.getElementById("panelAjustes");
        const homeStage = document.getElementById("homeStage");
        
        if (panelHistorial) panelHistorial.style.display = "block";
        if (panelAjustes) panelAjustes.style.display = "none";
        if (homeStage) homeStage.style.display = "none";

        if (
            typeof window.inicializarHistorial ===
            "function"
        ) {

            window.inicializarHistorial();
        }
    } else if (vista === "ajustes") {
        const panelHistorial = document.getElementById("panelHistorial");
        const panelAjustes = document.getElementById("panelAjustes");
        const homeStage = document.getElementById("homeStage");
        
        if (panelHistorial) panelHistorial.style.display = "none";
        if (panelAjustes) panelAjustes.style.display = "block";
        if (homeStage) homeStage.style.display = "none";
    } else {
        const panelHistorial = document.getElementById("panelHistorial");
        const panelAjustes = document.getElementById("panelAjustes");
        const homeStage = document.getElementById("homeStage");
        
        if (panelHistorial) panelHistorial.style.display = "none";
        if (panelAjustes) panelAjustes.style.display = "none";
        if (homeStage) homeStage.style.display = "flex";
    }
}

function initAppShell() {

    // Handle nav buttons
    document
        .querySelectorAll(".nav-btn[data-vista]")
        .forEach(btn => {

            btn.addEventListener("click", () => {

                const vista = btn.dataset.vista;

                // Handle "nueva-tasacion" specially
                if (vista === "nueva-tasacion") {
                    window.location.href = "tasacion.html";
                    return;
                }

                setVista(vista);

                const url =
                    vista === "inicio"
                        ? "index.html"
                        : `index.html?view=${vista}`;

                history.replaceState(
                    { vista },
                    "",
                    url
                );
            });
        });

    const params = new URLSearchParams(
        window.location.search
    );

    const view = params.get("view");

    if (
        view === "historial" ||
        view === "ajustes"
    ) {

        setVista(view);
    }

    else {

        setVista("inicio");
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initAppShell
);
