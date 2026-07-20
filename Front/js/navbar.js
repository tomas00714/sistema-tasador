/* =========================
   NAVBAR COMPONENT
   Componente reutilizable de navegación
========================= */

function inyectarNavbar(paginaActual) {
    // Verificar si ya existe la navbar
    if (document.querySelector('.top-nav-bar')) {
        return;
    }

    const navbarHTML = `
        <nav class="top-nav-bar" aria-label="Menú principal">
            <div class="nav-section-left">
                <div class="logo-placeholder">
                    <!-- Logo placeholder -->
                </div>
                <button
                    type="button"
                    class="nav-btn dark-mode-toggle"
                    id="darkModeToggle"
                    aria-label="Cambiar modo oscuro"
                    title="Cambiar modo oscuro">
                    <i class="fa-solid fa-sun"></i>
                </button>
            </div>

            <div class="nav-section-middle" id="progressSection">
                <!-- Progress indicators will be added here dynamically -->
            </div>

            <div class="nav-section-right">
                <button
                    type="button"
                    class="nav-btn ${paginaActual === 'inicio' ? 'active' : ''}"
                    onclick="window.location.href='index.html'"
                    title="Inicio">
                    <i class="fa-solid fa-house"></i>
                </button>

                <button
                    type="button"
                    class="nav-btn ${paginaActual === 'historial' ? 'active' : ''}"
                    onclick="window.location.href='historial.html'"
                    title="Historial">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </button>

                <button
                    type="button"
                    class="nav-btn ${paginaActual === 'tasacion' ? 'active' : ''}"
                    onclick="window.location.href='tasacion.html'"
                    title="Nueva tasación">
                    <i class="fa-solid fa-plus"></i>
                </button>

                <button
                    type="button"
                    class="profile-btn"
                    aria-label="Perfil de usuario"
                    title="Perfil">
                    <span class="profile-avatar" aria-hidden="true">
                        <i class="fa-solid fa-user"></i>
                    </span>
                </button>
            </div>
        </nav>
    `;

    // Insertar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // Inicializar el toggle de modo oscuro si existe la función
    if (typeof inicializarModoOscuro === 'function') {
        inicializarModoOscuro();
    }
}

// Detectar automáticamente la página actual e inyectar la navbar
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let paginaActual = 'inicio';

    if (path.includes('historial.html')) {
        paginaActual = 'historial';
    } else if (path.includes('tasacion.html')) {
        paginaActual = 'tasacion';
    }

    inyectarNavbar(paginaActual);
});
