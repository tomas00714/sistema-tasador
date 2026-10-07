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
    const mobileHamburger = document.getElementById('mobileHamburger');
    const mobileProfile = document.getElementById('mobileProfile');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const mobileBackdrop = document.getElementById('mobileBackdrop');

    if (!sidebar || !mainLayout) {
        return;
    }

    // Toggle desktop (colapsar/expandir)
    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainLayout.classList.toggle('with-sidebar-collapsed');

            // Guardar estado en localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        });
    }

    // Restaurar estado desde localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        mainLayout.classList.add('with-sidebar-collapsed');
    }

    // Limpiar la clase inicial después de cargar
    document.documentElement.classList.remove('sidebar-collapsed-initial');

    // Funcionalidad móvil - generar drawer dinámicamente
    generarMobileDrawer();

    // Funcionalidad móvil - hamburguesa
    if (mobileHamburger) {
        mobileHamburger.addEventListener('click', () => {
            mobileDrawer.classList.add('open');
            mobileBackdrop.classList.add('visible');
            document.body.classList.add('modal-open');
        });
    }

    // Funcionalidad móvil - perfil
    if (mobileProfile) {
        mobileProfile.addEventListener('click', () => {
            window.location.href = 'perfil.html';
        });
    }

    // Funcionalidad móvil - backdrop
    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', () => {
            mobileDrawer.classList.remove('open');
            mobileBackdrop.classList.remove('visible');
            document.body.classList.remove('modal-open');
        });
    }
}

function generarMobileDrawer() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    const mobileDrawerNav = document.getElementById('mobileDrawerNav');
    const appearanceBtn = document.getElementById('appearanceBtn');
    const mobileProfileAvatar = document.querySelector('.mobile-profile-avatar');

    if (!sidebarNav || !mobileDrawerNav) {
        return;
    }

    // Clonar todos los items de navegación del sidebar
    const navItems = sidebarNav.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
        const clone = item.cloneNode(true);
        // Mantener la misma clase y atributos
        clone.classList.remove('active');
        mobileDrawerNav.appendChild(clone);
    });

    // Agregar botón de apariencia si existe
    if (appearanceBtn) {
        const appearanceClone = appearanceBtn.cloneNode(true);
        appearanceClone.id = 'appearanceBtnMobile';
        mobileDrawerNav.appendChild(appearanceClone);
        
        // Agregar listener para el botón de apariencia móvil
        appearanceClone.addEventListener('click', () => {
            if (appearanceBtn) {
                appearanceBtn.click();
            }
        });
    }

    // Actualizar estado activo del drawer móvil
    const path = window.location.pathname;
    let paginaActual = 'inicio';

    if (path.includes('app/historial.html')) {
        paginaActual = 'historial';
    } else if (path.includes('app/solicitudes.html')) {
        paginaActual = 'solicitudes';
    } else if (path.includes('app/tasacion.html')) {
        paginaActual = 'tasacion';
    } else if (path.includes('app/perfil.html')) {
        paginaActual = 'perfil';
    } else if (path.includes('app/admin.html')) {
        paginaActual = 'admin';
    }

    const mobileNavItems = mobileDrawerNav.querySelectorAll('.sidebar-nav-item');
    mobileNavItems.forEach(item => {
        const page = item.getAttribute('data-page');
        if (page === paginaActual) {
            item.classList.add('active');
        }
    });

    // Copiar la imagen del avatar del sidebar al header móvil
    const sidebarAvatar = document.querySelector('.sidebar-profile-avatar');
    if (sidebarAvatar && mobileProfileAvatar) {
        // Copiar el background-image si está usando URL
        const bgImage = window.getComputedStyle(sidebarAvatar).backgroundImage;
        if (bgImage && bgImage !== 'none') {
            mobileProfileAvatar.style.backgroundImage = bgImage;
            mobileProfileAvatar.style.backgroundSize = 'cover';
            mobileProfileAvatar.style.backgroundPosition = 'center';
        }
    }
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

function inyectarSubmenuSolicitudes(paginaActual) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    if (!sidebarNav) return;

    // Solicitudes es un ítem permanente e independiente del menú principal:
    // nunca se quita; solo se inyecta si la página no lo trae en el HTML.
    if (sidebarNav.querySelector('[data-page="solicitudes"]')) return;

    const historialLink = sidebarNav.querySelector('[data-page="historial"]');
    if (historialLink) {
        historialLink.insertAdjacentHTML('afterend', `
            <a href="solicitudes.html" class="sidebar-nav-item" data-page="solicitudes">
                <span class="sidebar-nav-item-icon">
                    <i class="fa-solid fa-file-lines"></i>
                </span>
                <span class="sidebar-nav-item-text">Solicitudes</span>
            </a>
        `);
    }
}

// Detectar automáticamente la página actual e inyectar el sidebar
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let paginaActual = 'inicio';

    if (path.includes('app/historial.html')) {
        paginaActual = 'historial';
    } else if (path.includes('app/solicitudes.html')) {
        paginaActual = 'solicitudes';
    } else if (path.includes('app/tasacion.html')) {
        paginaActual = 'tasacion';
    } else if (path.includes('app/perfil.html')) {
        paginaActual = 'perfil';
    } else if (path.includes('app/admin.html')) {
        paginaActual = 'admin';
    }

    inyectarSubmenuSolicitudes(paginaActual);
    inyectarSidebar(paginaActual);
    inicializarLogout();
    actualizarNombreUsuario();
});
