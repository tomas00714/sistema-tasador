/* =========================
   SIDEBAR COMPONENT
   Componente de menú lateral izquierdo minimizable
========================= */

function inyectarSidebar(paginaActual) {
    // El sidebar ya está en el HTML, solo inicializar la funcionalidad
    // Verificar si existe el sidebar
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        return;
    }

    // Actualizar la clase activa según la página actual
    const navItems = sidebar.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === paginaActual) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Inicializar funcionalidad del toggle
    inicializarSidebarToggle();
}

function inicializarSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mainLayout = document.getElementById('mainLayout');

    if (!sidebar || !toggle || !mainLayout) {
        return;
    }

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainLayout.classList.toggle('with-sidebar-collapsed');

        // Guardar estado en localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });

    // Restaurar estado desde localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        mainLayout.classList.add('with-sidebar-collapsed');
    }

    // Limpiar la clase inicial después de cargar
    document.documentElement.classList.remove('sidebar-collapsed-initial');
}

// Detectar automáticamente la página actual e inyectar el sidebar
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let paginaActual = 'inicio';

    if (path.includes('historial.html')) {
        paginaActual = 'historial';
    } else if (path.includes('tasacion.html')) {
        paginaActual = 'tasacion';
    }

    inyectarSidebar(paginaActual);
});
