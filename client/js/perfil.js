/* =========================
   PERFIL DE USUARIO
   Carga y edición del perfil del usuario
========================= */

let datosProfesionales = null;
let datosOriginales = {};
let archivoFotoPendiente = null;
let archivoLogoPendiente = null;
let eliminarFotoPendiente = false;
let eliminarLogoPendiente = false;

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
    eliminarFotoPendiente = false;
    eliminarLogoPendiente = false;

    actualizarAvatar(datosOriginales.foto_perfil);
    actualizarLogo(datosOriginales.logo_inmobiliaria);
}

function cerrarPopoversMedia() {
    const avatarPopover = document.getElementById('avatarPopover');
    const logoPopover = document.getElementById('logoPopover');
    if (avatarPopover) avatarPopover.classList.remove('abierto');
    if (logoPopover) logoPopover.classList.remove('abierto');
}

function togglePopoverFoto() {
    const popover = document.getElementById('avatarPopover');
    if (!popover) return;

    const logoPopover = document.getElementById('logoPopover');
    if (logoPopover) logoPopover.classList.remove('abierto');

    // "Eliminar" solo tiene sentido si hay una foto visible (guardada o preview)
    const tieneFoto = document.getElementById('perfilAvatar').classList.contains('con-foto');
    document.getElementById('btnEliminarFoto').style.display = tieneFoto ? 'flex' : 'none';

    popover.classList.toggle('abierto');
}

function togglePopoverLogo() {
    const popover = document.getElementById('logoPopover');
    if (!popover) return;

    const avatarPopover = document.getElementById('avatarPopover');
    if (avatarPopover) avatarPopover.classList.remove('abierto');

    const img = document.getElementById('logoInmobiliariaImg');
    const tieneLogo = img && img.style.display !== 'none' && img.getAttribute('src');
    document.getElementById('btnEliminarLogo').style.display = tieneLogo ? 'flex' : 'none';

    popover.classList.toggle('abierto');
}

function marcarEliminarFoto() {
    eliminarFotoPendiente = true;
    archivoFotoPendiente = null;
    document.getElementById('inputFotoPerfil').value = '';
    actualizarAvatar(null);
    cerrarPopoversMedia();
}

function marcarEliminarLogo() {
    eliminarLogoPendiente = true;
    archivoLogoPendiente = null;
    document.getElementById('inputLogoInmobiliaria').value = '';
    actualizarLogo(null);
    cerrarPopoversMedia();
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
    eliminarFotoPendiente = false;
    eliminarLogoPendiente = false;

    card().classList.add('modo-edicion');

    const mensaje = document.getElementById('mensajeProfesional');
    const error = document.getElementById('errorProfesional');
    if (mensaje) mensaje.style.display = 'none';
    if (error) error.style.display = 'none';

    document.getElementById('inputMatricula').focus();
}

function salirModoEdicion() {
    cerrarPopoversMedia();
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
        } else if (eliminarFotoPendiente) {
            await eliminarFotoPerfilAPI();
            eliminarFotoPendiente = false;
        }

        if (archivoLogoPendiente) {
            await subirLogoInmobiliariaAPI(archivoLogoPendiente);
            archivoLogoPendiente = null;
        } else if (eliminarLogoPendiente) {
            await eliminarLogoInmobiliariaAPI();
            eliminarLogoPendiente = false;
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
    const logoInmobiliaria = document.getElementById('logoInmobiliaria');
    const inputFoto = document.getElementById('inputFotoPerfil');
    const inputLogo = document.getElementById('inputLogoInmobiliaria');

    if (btnEditar) btnEditar.addEventListener('click', entrarModoEdicion);
    if (btnCancelar) btnCancelar.addEventListener('click', cancelarEdicion);
    if (btnGuardar) btnGuardar.addEventListener('click', guardarCambios);

    // El click en el avatar/logo (o su overlay) despliega el popover de
    // opciones en modo edición; los overlays son hijos, así que el click
    // burbujea una sola vez al contenedor.
    if (perfilAvatar) perfilAvatar.addEventListener('click', () => {
        if (card().classList.contains('modo-edicion')) togglePopoverFoto();
    });
    if (logoInmobiliaria) logoInmobiliaria.addEventListener('click', () => {
        if (card().classList.contains('modo-edicion')) togglePopoverLogo();
    });

    const btnCambiarFoto = document.getElementById('btnCambiarFoto');
    const btnEliminarFoto = document.getElementById('btnEliminarFoto');
    const btnCambiarLogo = document.getElementById('btnCambiarLogo');
    const btnEliminarLogo = document.getElementById('btnEliminarLogo');

    if (btnCambiarFoto) btnCambiarFoto.addEventListener('click', () => {
        cerrarPopoversMedia();
        if (inputFoto) inputFoto.click();
    });
    if (btnEliminarFoto) btnEliminarFoto.addEventListener('click', marcarEliminarFoto);
    if (btnCambiarLogo) btnCambiarLogo.addEventListener('click', () => {
        cerrarPopoversMedia();
        if (inputLogo) inputLogo.click();
    });
    if (btnEliminarLogo) btnEliminarLogo.addEventListener('click', marcarEliminarLogo);

    // Cerrar popovers al clickear fuera de los contenedores o con Escape
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.perfil-avatar-container') &&
            !e.target.closest('.perfil-inmobiliaria-card')) {
            cerrarPopoversMedia();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarPopoversMedia();
    });

    if (inputFoto) {
        inputFoto.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            const blob = await recortarImagen(file, {
                aspectRatio: 1,
                maxWidth: 800,
                outputFormat: 'preserve',
                quality: 0.9,
                titulo: 'Recortar foto de perfil'
            });
            if (!blob) return;
            archivoFotoPendiente = new File([blob], nombreArchivoRecortado(file, blob), { type: blob.type });
            eliminarFotoPendiente = false;
            mostrarVistaPrevia(blob, 'perfilAvatarImg', 'perfilAvatarIcon');
        });
    }

    if (inputLogo) {
        inputLogo.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            const blob = await recortarImagen(file, {
                aspectRatio: 1,
                maxWidth: 800,
                outputFormat: 'preserve',
                quality: 0.9,
                titulo: 'Recortar logo'
            });
            if (!blob) return;
            archivoLogoPendiente = new File([blob], nombreArchivoRecortado(file, blob), { type: blob.type });
            eliminarLogoPendiente = false;
            mostrarVistaPrevia(blob, 'logoInmobiliariaImg', 'logoInmobiliariaIcon');
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
