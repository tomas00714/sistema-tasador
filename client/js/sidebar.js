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

    // Inyectar link de admin antes de calcular el activo
    inyectarAdminLink();

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

    // Actualizar estado activo del botón de perfil
    const profileButton = sidebar.querySelector('.sidebar-profile');
    if (profileButton) {
        const profilePage = profileButton.getAttribute('data-page');
        if (profilePage === paginaActual) {
            profileButton.classList.add('active');
        } else {
            profileButton.classList.remove('active');
        }
    }

    // Actualizar nombre del usuario
    actualizarNombreUsuario();

    // Inicializar funcionalidad del toggle
    inicializarSidebarToggle();

    // Inicializar click en logo para volver a landing
    inicializarLogoClick();

    // Inicializar click en perfil para navegar
    inicializarLogout();
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

function inicializarLogoClick() {
    const sidebarLogo = document.querySelector('.sidebar-logo');
    if (!sidebarLogo) return;

    sidebarLogo.addEventListener('click', () => {
        // Usar ruta relativa desde app/ a client/
        window.location.href = '../index.html';
    });

    // Agregar cursor pointer para indicar que es clickeable
    sidebarLogo.style.cursor = 'pointer';
}

function inyectarAdminLink() {
    const userData = localStorage.getItem('auth_user');
    if (!userData) return;

    const user = JSON.parse(userData);
    if (!user.is_admin) return;

    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;

    if (sidebarNav.querySelector('[data-page="admin"]')) return;

    sidebarNav.insertAdjacentHTML('beforeend', `
        <a href="admin.html" class="sidebar-nav-item" data-page="admin">
            <span class="sidebar-nav-item-icon">
                <i class="fa-solid fa-chart-line"></i>
            </span>
            <span class="sidebar-nav-item-text">Admin</span>
        </a>
    `);
}

function inicializarLogout() {
    const profileButton = document.querySelector('.sidebar-profile');
    if (!profileButton) return;

    profileButton.addEventListener('click', () => {
        window.location.href = 'perfil.html';
    });
}

function actualizarNombreUsuario() {
    const userData = localStorage.getItem('auth_user');
    const profileName = document.querySelector('.sidebar-profile-name');
    if (userData && profileName) {
        const user = JSON.parse(userData);
        profileName.textContent = `${user.nombre} ${user.apellido}`;
    }
}

// Detectar automáticamente la página actual e inyectar el sidebar
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let paginaActual = 'inicio';

    if (path.includes('app/historial.html')) {
        paginaActual = 'historial';
    } else if (path.includes('app/tasacion.html')) {
        paginaActual = 'tasacion';
    } else if (path.includes('app/perfil.html')) {
        paginaActual = 'perfil';
    } else if (path.includes('app/admin.html')) {
        paginaActual = 'admin';
    }

    inyectarSidebar(paginaActual);
    inicializarLogout();
    actualizarNombreUsuario();
});
