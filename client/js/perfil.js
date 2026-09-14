/* =========================
   PERFIL DE USUARIO
   Carga y edición del perfil del usuario
========================= */

let datosProfesionales = null;
let datosOriginales = {};
let archivoFotoPendiente = null;
let archivoLogoPendiente = null;

const card = () => document.getElementById('perfilCard');

function inicializarPerfil() {
    cargarDatosUsuario();
    cargarDatosProfesionales();
    inicializarEventos();
}

function urlArchivo(filename) {
    if (!filename) return '';
    return `${API_BASE_URL}/uploads/${filename}`;
}

function mostrarMensaje(texto) {
    const mensaje = document.getElementById('mensajeProfesional');
    const error = document.getElementById('errorProfesional');
    if (error) error.style.display = 'none';
    if (mensaje) {
        mensaje.textContent = texto;
        mensaje.style.display = 'block';
    }
}

function mostrarError(texto) {
    const mensaje = document.getElementById('mensajeProfesional');
    const error = document.getElementById('errorProfesional');
    if (mensaje) mensaje.style.display = 'none';
    if (error) {
        error.textContent = texto;
        error.style.display = 'block';
    }
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

    document.getElementById('verNombre').textContent = userData.nombre || '—';
    document.getElementById('verApellido').textContent = userData.apellido || '—';
    document.getElementById('verEmail').textContent = email;

    const planBadge = document.getElementById('perfilPlanBadge');
    if (userData.is_admin) {
        planBadge.textContent = 'Admin';
        planBadge.classList.add('perfil-badge-admin');
    } else {
        planBadge.textContent = 'Free';
        planBadge.classList.remove('perfil-badge-admin');
    }
}

function actualizarAvatar(fotoPerfil) {
    const avatar = document.getElementById('perfilAvatar');
    const img = document.getElementById('perfilAvatarImg');

    if (!avatar || !img) return;

    img.onerror = () => {
        img.removeAttribute('src');
        avatar.classList.remove('con-foto');
    };

    if (fotoPerfil) {
        img.src = urlArchivo(fotoPerfil);
        avatar.classList.add('con-foto');
    } else {
        img.removeAttribute('src');
        avatar.classList.remove('con-foto');
    }
}

function actualizarLogo(logoInmobiliaria) {
    const img = document.getElementById('logoInmobiliariaImg');
    const icon = document.getElementById('logoInmobiliariaIcon');

    img.onerror = () => {
        img.style.display = 'none';
        if (icon) icon.style.display = 'block';
    };

    if (logoInmobiliaria) {
        img.src = urlArchivo(logoInmobiliaria);
        img.style.display = 'block';
        if (icon) icon.style.display = 'none';
    } else {
        img.src = '';
        img.style.display = 'none';
        if (icon) icon.style.display = 'block';
    }
}

function actualizarEstadoGoogle(googleVinculado) {
    const verEstadoGoogle = document.getElementById('verEstadoGoogle');
    const btnVincular = document.getElementById('btnVincularGoogle');
    const btnDesvincular = document.getElementById('btnDesvincularGoogle');

    if (!verEstadoGoogle || !btnVincular || !btnDesvincular) return;

    if (googleVinculado) {
        verEstadoGoogle.textContent = 'Cuenta de Google vinculada';
        btnVincular.style.display = 'none';
        btnDesvincular.style.display = 'inline-flex';
    } else {
        verEstadoGoogle.textContent = 'No vinculada';
        btnVincular.style.display = 'inline-flex';
        btnDesvincular.style.display = 'none';
    }
}

async function cargarDatosProfesionales() {
    try {
        const data = await obtenerProfesionalAPI();
        datosProfesionales = data && data.profesional ? data.profesional : null;
        const usuario = data && data.usuario ? data.usuario : null;

        const matricula = datosProfesionales?.matricula || '';
        const telefono = datosProfesionales?.telefono || '';
        const inmobiliaria = datosProfesionales?.nombre_inmobiliaria || '';
        const fotoPerfil = datosProfesionales?.foto_perfil || null;
        const logoInmobiliaria = datosProfesionales?.logo_inmobiliaria || null;

        document.getElementById('verMatricula').textContent = matricula || '—';
        document.getElementById('verTelefono').textContent = telefono || '—';
        document.getElementById('verNombreInmobiliaria').textContent = inmobiliaria || '—';

        document.getElementById('inputMatricula').value = matricula;
        document.getElementById('inputTelefono').value = telefono;
        document.getElementById('inputNombreInmobiliaria').value = inmobiliaria;

        if (usuario) {
            document.getElementById('verEmailCuenta').textContent = usuario.email || '—';
            actualizarEstadoGoogle(usuario.google_vinculado);
        }

        actualizarAvatar(fotoPerfil);
        actualizarLogo(logoInmobiliaria);
    } catch (error) {
        console.warn('No se pudieron cargar los datos profesionales:', error.message);
    }
}

function mostrarVistaPrevia(file, imgId, iconId) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById(imgId);
        const icon = document.getElementById(iconId);
        if (img) {
            img.src = e.target.result;
            img.style.display = 'block';

            // El avatar de perfil usa una clase de estado para alternar foto/fallback
            const avatar = img.closest('.perfil-avatar');
            if (avatar) avatar.classList.add('con-foto');
        }
        if (icon) icon.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function restaurarValoresOriginales() {
    document.getElementById('inputMatricula').value = datosOriginales.matricula || '';
    document.getElementById('inputTelefono').value = datosOriginales.telefono || '';
    document.getElementById('inputNombreInmobiliaria').value = datosOriginales.nombre_inmobiliaria || '';

    document.getElementById('inputFotoPerfil').value = '';
    document.getElementById('inputLogoInmobiliaria').value = '';

    archivoFotoPendiente = null;
    archivoLogoPendiente = null;

    actualizarAvatar(datosOriginales.foto_perfil);
    actualizarLogo(datosOriginales.logo_inmobiliaria);
}

function entrarModoEdicion() {
    datosOriginales = {
        matricula: datosProfesionales?.matricula || '',
        telefono: datosProfesionales?.telefono || '',
        nombre_inmobiliaria: datosProfesionales?.nombre_inmobiliaria || '',
        foto_perfil: datosProfesionales?.foto_perfil || null,
        logo_inmobiliaria: datosProfesionales?.logo_inmobiliaria || null
    };

    archivoFotoPendiente = null;
    archivoLogoPendiente = null;

    card().classList.add('modo-edicion');

    const mensaje = document.getElementById('mensajeProfesional');
    const error = document.getElementById('errorProfesional');
    if (mensaje) mensaje.style.display = 'none';
    if (error) error.style.display = 'none';

    document.getElementById('inputMatricula').focus();
}

function salirModoEdicion() {
    card().classList.remove('modo-edicion');
}

function cancelarEdicion() {
    restaurarValoresOriginales();
    salirModoEdicion();
}

async function guardarCambios() {
    const mensaje = document.getElementById('mensajeProfesional');
    const error = document.getElementById('errorProfesional');
    if (mensaje) mensaje.style.display = 'none';
    if (error) error.style.display = 'none';

    const matricula = document.getElementById('inputMatricula').value.trim();
    const telefono = document.getElementById('inputTelefono').value.trim();
    const inmobiliaria = document.getElementById('inputNombreInmobiliaria').value.trim();

    try {
        if (archivoFotoPendiente) {
            await subirFotoPerfilAPI(archivoFotoPendiente);
            archivoFotoPendiente = null;
        }

        if (archivoLogoPendiente) {
            await subirLogoInmobiliariaAPI(archivoLogoPendiente);
            archivoLogoPendiente = null;
        }

        const payload = {
            matricula: matricula || null,
            telefono: telefono || null,
            nombre_inmobiliaria: inmobiliaria || null
        };

        const hayCambiosTexto = Object.values(payload).some(v => v !== null);
        if (hayCambiosTexto || datosProfesionales) {
            await actualizarProfesionalAPI(payload);
        }

        await cargarDatosProfesionales();
        salirModoEdicion();

        if (mensaje) {
            mensaje.textContent = 'Cambios guardados correctamente';
            mensaje.style.display = 'block';
        }
    } catch (e) {
        console.error('Error al guardar el perfil:', e);
        if (error) {
            error.textContent = e.message || 'Error al guardar los cambios';
            error.style.display = 'block';
        }
    }
}

function inicializarEventos() {
    const btnEditar = document.getElementById('btnEditarPerfil');
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    const btnGuardar = document.getElementById('btnGuardarCambios');
    const perfilAvatar = document.getElementById('perfilAvatar');
    const avatarOverlay = document.getElementById('avatarOverlay');
    const logoInmobiliaria = document.getElementById('logoInmobiliaria');
    const logoOverlay = document.getElementById('logoOverlay');
    const inputFoto = document.getElementById('inputFotoPerfil');
    const inputLogo = document.getElementById('inputLogoInmobiliaria');

    if (btnEditar) btnEditar.addEventListener('click', entrarModoEdicion);
    if (btnCancelar) btnCancelar.addEventListener('click', cancelarEdicion);
    if (btnGuardar) btnGuardar.addEventListener('click', guardarCambios);

    const abrirSelectorFoto = () => inputFoto && inputFoto.click();
    if (perfilAvatar) perfilAvatar.addEventListener('click', () => {
        if (card().classList.contains('modo-edicion')) abrirSelectorFoto();
    });
    if (avatarOverlay) avatarOverlay.addEventListener('click', abrirSelectorFoto);

    const abrirSelectorLogo = () => inputLogo && inputLogo.click();
    if (logoInmobiliaria) logoInmobiliaria.addEventListener('click', () => {
        if (card().classList.contains('modo-edicion')) abrirSelectorLogo();
    });
    if (logoOverlay) logoOverlay.addEventListener('click', abrirSelectorLogo);

    if (inputFoto) {
        inputFoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                archivoFotoPendiente = file;
                mostrarVistaPrevia(file, 'perfilAvatarImg', 'perfilAvatarIcon');
            }
        });
    }

    if (inputLogo) {
        inputLogo.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                archivoLogoPendiente = file;
                mostrarVistaPrevia(file, 'logoInmobiliariaImg', 'logoInmobiliariaIcon');
            }
        });
    }

    ['inputMatricula', 'inputTelefono', 'inputNombreInmobiliaria'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    guardarCambios();
                }
            });
        }
    });

    const btnVincularGoogle = document.getElementById('btnVincularGoogle');
    const btnDesvincularGoogle = document.getElementById('btnDesvincularGoogle');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            mostrarModalConfirmacion(
                '¿Querés cerrar sesión?',
                'Si cerrás sesión vas a tener que volver a ingresar.',
                () => {
                    logout();
                }
            );
        });
    }

    if (btnVincularGoogle) {
        btnVincularGoogle.addEventListener('click', async () => {
            try {
                const resp = await iniciarVinculacionGoogleAPI();
                if (resp && resp.auth_url) {
                    const popup = window.open(resp.auth_url, 'google_vincular_popup', 'width=500,height=600,resizable,scrollbars=yes');
                    if (!popup || popup.closed) {
                        mostrarError('No se pudo abrir la ventana de Google. Permití los popups para este sitio.');
                    }
                } else {
                    mostrarError('No se pudo iniciar la vinculación con Google');
                }
            } catch (e) {
                console.error('Error vinculando Google:', e);
                mostrarError(e.message || 'Error al vincular con Google');
            }
        });
    }

    if (btnDesvincularGoogle) {
        btnDesvincularGoogle.addEventListener('click', async () => {
            try {
                await desvincularGoogleAPI();
                await cargarDatosProfesionales();
                mostrarMensaje('Cuenta de Google desvinculada correctamente');
            } catch (e) {
                console.error('Error desvinculando Google:', e);
                mostrarError(e.message || 'Error al desvincular Google');
            }
        });
    }
}

function handleGoogleLinkMessage(event) {
    if (!event.data || typeof event.data !== 'object') return;
    const data = event.data;

    if (data.type === 'google-link-success') {
        cargarDatosProfesionales().then(() => {
            mostrarMensaje('Cuenta de Google vinculada correctamente');
        });
    } else if (data.type === 'google-link-error') {
        mostrarError(data.message || 'Error al vincular con Google');
    }
}

window.addEventListener('message', handleGoogleLinkMessage);

document.addEventListener('DOMContentLoaded', () => {
    inicializarPerfil();
});
