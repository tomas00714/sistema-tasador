/* =========================
   PERFIL DE USUARIO
   Carga y renderizado de datos del perfil
========================= */

function inicializarPerfil() {
    cargarDatosUsuario();
    inicializarBotonesPerfil();
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
    document.getElementById('infoInmobiliaria').textContent = 'No configurado';

    const planBadge = document.getElementById('perfilPlanBadge');
    if (userData.is_admin) {
        planBadge.textContent = 'Admin';
        planBadge.classList.add('perfil-badge-admin');
    } else {
        planBadge.textContent = 'Free';
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

    const configItems = document.querySelectorAll('.perfil-config-item');
    configItems.forEach(item => {
        item.addEventListener('click', () => {
            alert('Configuración próximamente');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarPerfil();
});
