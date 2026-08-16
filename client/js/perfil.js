/* =========================
   PERFIL DE USUARIO
   Carga y renderizado de datos del perfil
========================= */

function inicializarPerfil() {
    cargarDatosUsuario();
    inicializarBotonesPerfil();
    inicializarCerrarSesion();
}

function cargarDatosUsuario() {
    const userData = getUserData();
    if (!userData) {
        console.warn('No hay datos de usuario en localStorage');
        return;
    }

    const nombreCompleto = `${userData.nombre || ''} ${userData.apellido || ''}`.trim() || 'Usuario';
    const email = userData.email || 'No configurado';

    document.getElementById('perfilNombre').textContent = nombreCompleto;
    document.getElementById('perfilEmail').textContent = email;
    document.getElementById('infoNombre').textContent = userData.nombre || '—';
    document.getElementById('infoApellido').textContent = userData.apellido || '—';
    document.getElementById('infoEmail').textContent = email;

    const planBadge = document.getElementById('perfilPlanBadge');
    const cuentaPlan = document.getElementById('cuentaPlan');
    if (userData.is_admin) {
        planBadge.textContent = 'Admin';
        planBadge.classList.add('perfil-badge-admin');
        cuentaPlan.textContent = 'Admin';
    } else {
        planBadge.textContent = 'Free';
        cuentaPlan.textContent = 'Free';
    }

    const fechaRegistro = userData.fecha_creacion;
    if (fechaRegistro) {
        const fecha = new Date(fechaRegistro);
        const fechaFormateada = fecha.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
        document.getElementById('infoFechaRegistro').textContent = fechaFormateada;
        document.getElementById('cuentaFechaRegistro').textContent = fechaFormateada;
    }
}

function inicializarBotonesPerfil() {
    const btnCambiarFoto = document.getElementById('btnCambiarFoto');
    if (btnCambiarFoto) {
        btnCambiarFoto.addEventListener('click', () => {
            alert('Funcionalidad de subida de foto próximamente');
        });
    }

    const btnEditarDatos = document.getElementById('btnEditarDatos');
    if (btnEditarDatos) {
        btnEditarDatos.addEventListener('click', () => {
            alert('Edición de datos personales próximamente');
        });
    }

    const btnSubirLogo = document.getElementById('btnSubirLogo');
    if (btnSubirLogo) {
        btnSubirLogo.addEventListener('click', () => {
            alert('Funcionalidad de subida de logo próximamente');
        });
    }

    const configItems = document.querySelectorAll('.perfil-config-item');
    configItems.forEach(item => {
        item.addEventListener('click', () => {
            alert('Configuración próximamente');
        });
    });
}

function inicializarCerrarSesion() {
    const btnCerrarSesion = document.querySelector('.sidebar-profile');
    if (!btnCerrarSesion) return;

    btnCerrarSesion.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '../login.html';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarPerfil();
});
