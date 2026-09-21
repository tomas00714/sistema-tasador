/* =========================
   API CLIENT
   Cliente para comunicarse con el backend
========================= */

const API_BASE_URL = (() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('api_base_url');
        if (fromQuery) return fromQuery;
        if (window.API_BASE_URL_OVERRIDE) return window.API_BASE_URL_OVERRIDE;

        const host = window.location.hostname;
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
        if (isLocal) return 'http://127.0.0.1:8080';
    }
    return 'https://sistema-tasador.onrender.com';
})();

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function urlArchivo(filename) {
    if (!filename) return '';
    return `${API_BASE_URL}/uploads/${filename}`;
}

function handleAuthError(response) {
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        const currentPath = window.location.pathname;
        if (currentPath.includes('/app/')) {
            window.location.href = '../login.html';
        } else {
            window.location.href = 'login.html';
        }
        return true;
    }
    return false;
}

// =========================
//   TASACIONES
// =========================

async function crearTasacionAPI(tasacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(tasacion)
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al crear tasación: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en crearTasacionAPI:', error);
        throw error;
    }
}

async function obtenerTasacionAPI(tasacionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${tasacionId}`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            // 404: Tasación no existe
            // 403: Usuario no tiene permiso (no es el propietario)
            if (response.status === 404 || response.status === 403) {
                return null;
            }
            throw new Error(`Error al obtener tasación: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerTasacionAPI:', error);
        throw error;
    }
}

async function listarTasacionesAPI(estado = null) {
    try {
        let url = `${API_BASE_URL}/api/tasaciones`;
        if (estado) {
            url += `?estado=${estado}`;
        }
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al listar tasaciones: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en listarTasacionesAPI:', error);
        throw error;
    }
}

async function actualizarTasacionAPI(tasacionId, datosActualizacion) {
    try {
        console.log('[DEBUG api-client] actualizarTasacionAPI - tasacionId:', tasacionId);
        console.log('[DEBUG api-client] actualizarTasacionAPI - datosActualizacion:', JSON.stringify(datosActualizacion, null, 2));
        console.log('[API PUT] Payload completo enviado:', JSON.stringify(datosActualizacion, null, 2));
        
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${tasacionId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(datosActualizacion)
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[DEBUG api-client] actualizarTasacionAPI - Response NOT OK:', response.status, response.statusText);
            console.error('[DEBUG api-client] actualizarTasacionAPI - Error body:', errorText);
            throw new Error(`Error al actualizar tasación: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en actualizarTasacionAPI:', error);
        throw error;
    }
}

async function eliminarTasacionAPI(tasacionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${tasacionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al eliminar tasación: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en eliminarTasacionAPI:', error);
        throw error;
    }
}

// =========================
//   COMPARABLES
// =========================

async function crearComparableAPI(comparable) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparables`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(comparable)
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Respuesta del servidor al crear comparable (${response.status}):`, errorText);
            throw new Error(`Error al crear comparable: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en crearComparableAPI:', error);
        throw error;
    }
}

async function obtenerComparableAPI(comparableId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparables/${comparableId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Error al obtener comparable: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerComparableAPI:', error);
        throw error;
    }
}

async function listarComparablesAPI(tipoInmueble = null, fuente = null) {
    try {
        let url = `${API_BASE_URL}/api/comparables`;
        const params = [];
        if (tipoInmueble) {
            params.push(`tipo_inmueble=${tipoInmueble}`);
        }
        if (fuente) {
            params.push(`fuente=${fuente}`);
        }
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al listar comparables: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en listarComparablesAPI:', error);
        throw error;
    }
}

async function actualizarComparableAPI(comparableId, datosActualizacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparables/${comparableId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ datos: datosActualizacion })
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al actualizar comparable: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en actualizarComparableAPI:', error);
        throw error;
    }
}

async function actualizarSnapshotComparableTasacion(tasacionId, comparableId, snapshot) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${tasacionId}/comparables/${comparableId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(snapshot)
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al actualizar snapshot: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en actualizarSnapshotComparableTasacion:', error);
        throw error;
    }
}

async function eliminarComparableAPI(comparableId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparables/${comparableId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al eliminar comparable: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en eliminarComparableAPI:', error);
        throw error;
    }
}

// =========================
//   SOLICITUDES
// =========================

async function crearSolicitudAPI(solicitud) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(solicitud)
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al crear solicitud: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en crearSolicitudAPI:', error);
        throw error;
    }
}

async function obtenerSolicitudAPI(solicitudId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}`, {
            headers: getAuthHeaders()
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Error al obtener solicitud: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerSolicitudAPI:', error);
        throw error;
    }
}

async function listarSolicitudesAPI(estado = null) {
    try {
        let url = `${API_BASE_URL}/api/solicitudes`;
        if (estado) {
            url += `?estado=${estado}`;
        }

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al listar solicitudes: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en listarSolicitudesAPI:', error);
        throw error;
    }
}

async function obtenerSolicitudesAPI(queryParams = '') {
    try {
        let url = `${API_BASE_URL}/api/solicitudes`;
        if (queryParams) {
            url += queryParams.startsWith('?') ? queryParams : `?${queryParams}`;
        }

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al obtener solicitudes: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerSolicitudesAPI:', error);
        throw error;
    }
}

async function obtenerSolicitudPorLinkAPI(linkPublico) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/link/${encodeURIComponent(linkPublico)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Error al obtener solicitud por link: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerSolicitudPorLinkAPI:', error);
        throw error;
    }
}

async function actualizarSolicitudAPI(solicitudId, datosActualizacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(datosActualizacion)
        });
        
        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }
        
        if (!response.ok) {
            throw new Error(`Error al actualizar solicitud: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en actualizarSolicitudAPI:', error);
        throw error;
    }
}

async function eliminarSolicitudAPI(solicitudId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al eliminar solicitud: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en eliminarSolicitudAPI:', error);
        throw error;
    }
}

async function contribuirSolicitudAPI(linkPublico, payload) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/link/${encodeURIComponent(linkPublico)}/contribuir`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al contribuir a la solicitud: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en contribuirSolicitudAPI:', error);
        throw error;
    }
}

async function obtenerComparablesDeSolicitudAPI(linkPublico) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/link/${encodeURIComponent(linkPublico)}/comparables`);

        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error(`Error al obtener comparables de la solicitud: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerComparablesDeSolicitudAPI:', error);
        throw error;
    }
}

async function obtenerComparablesDeSolicitudPorIdAPI(solicitudId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}/comparables`, {
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error(`Error al obtener comparables de la solicitud: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerComparablesDeSolicitudPorIdAPI:', error);
        throw error;
    }
}

async function aceptarComparableSolicitudAPI(solicitudId, comparableId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}/comparables/${comparableId}/aceptar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Error al aceptar comparable: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en aceptarComparableSolicitudAPI:', error);
        throw error;
    }
}

async function rechazarComparableSolicitudAPI(solicitudId, comparableId, observaciones = null) {
    try {
        const body = {};
        if (observaciones) {
            body.observaciones = observaciones;
        }

        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}/comparables/${comparableId}/rechazar`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Error al rechazar comparable: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en rechazarComparableSolicitudAPI:', error);
        throw error;
    }
}

// =========================
//   TASAR
// =========================

async function tasarAPI(payload) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasar`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al calcular tasación: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en tasarAPI:', error);
        throw error;
    }
}

// =========================
//   COMPARTIR
// =========================

async function compartirTasacionAPI(tasacionId, opciones = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${encodeURIComponent(tasacionId)}/compartir`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                usos_maximos: opciones.usos_maximos,
                dias_expiracion: opciones.dias_expiracion
            })
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al generar enlace');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en compartirTasacionAPI:', error);
        throw error;
    }
}

async function revocarTasacionCompartidaAPI(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/compartir/${encodeURIComponent(token)}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error('Error al revocar enlace');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en revocarTasacionCompartidaAPI:', error);
        throw error;
    }
}

async function obtenerVistaPreviaCompartirAPI(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/compartir/${encodeURIComponent(token)}`);

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Error al obtener vista previa: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerVistaPreviaCompartirAPI:', error);
        throw error;
    }
}

// =========================
//   PERFIL PROFESIONAL
// =========================

async function obtenerProfesionalAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/profesionales/me`, {
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error al obtener perfil profesional: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en obtenerProfesionalAPI:', error);
        throw error;
    }
}

async function actualizarProfesionalAPI(datos) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/profesionales/me`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(datos)
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al actualizar perfil profesional: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en actualizarProfesionalAPI:', error);
        throw error;
    }
}

async function subirFotoPerfilAPI(archivo) {
    try {
        const formData = new FormData();
        formData.append('file', archivo);

        const headers = getAuthHeaders();
        delete headers['Content-Type'];

        const response = await fetch(`${API_BASE_URL}/api/profesionales/me/foto-perfil`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al subir foto de perfil: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en subirFotoPerfilAPI:', error);
        throw error;
    }
}

async function subirLogoInmobiliariaAPI(archivo) {
    try {
        const formData = new FormData();
        formData.append('file', archivo);

        const headers = getAuthHeaders();
        delete headers['Content-Type'];

        const response = await fetch(`${API_BASE_URL}/api/profesionales/me/logo-inmobiliaria`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al subir logo de inmobiliaria: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en subirLogoInmobiliariaAPI:', error);
        throw error;
    }
}

async function eliminarFotoPerfilAPI() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/profesionales/me/foto-perfil`, {
            method: 'DELETE',
            headers: headers
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al eliminar foto de perfil: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en eliminarFotoPerfilAPI:', error);
        throw error;
    }
}

async function eliminarLogoInmobiliariaAPI() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/profesionales/me/logo-inmobiliaria`, {
            method: 'DELETE',
            headers: headers
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al eliminar logo de inmobiliaria: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en eliminarLogoInmobiliariaAPI:', error);
        throw error;
    }
}

async function guardarTasacionCompartidaAPI(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/compartir/${encodeURIComponent(token)}/guardar`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al guardar tasación');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en guardarTasacionCompartidaAPI:', error);
        throw error;
    }
}

// =========================
// AVATAR DEL USUARIO
// Sincroniza la foto de perfil real en todos los avatares de la app
// =========================

function crearAvatarImg(container) {
    const img = document.createElement('img');
    img.alt = 'Foto de perfil';
    img.className = 'avatar-img avatar-img-hidden';
    img.onerror = function() {
        img.classList.add('avatar-img-hidden');
        const icon = container.querySelector('i');
        if (icon) icon.style.display = '';
    };
    img.onload = function() {
        img.classList.remove('avatar-img-hidden');
        const icon = container.querySelector('i');
        if (icon) icon.style.display = 'none';
    };
    container.appendChild(img);
    return img;
}

async function actualizarAvatares() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    let fotoPerfil = null;
    try {
        const data = await obtenerProfesionalAPI();
        fotoPerfil = data?.profesional?.foto_perfil || null;
    } catch (error) {
        console.warn('No se pudo cargar foto de perfil para avatares:', error.message);
        return;
    }

    if (!fotoPerfil) return;

    const url = urlArchivo(fotoPerfil);
    const avatares = document.querySelectorAll('.sidebar-profile-avatar, .nav-user-avatar, .profile-avatar');
    avatares.forEach(container => {
        let img = container.querySelector('img.avatar-img');
        if (!img) img = crearAvatarImg(container);
        img.src = url;
    });
}

async function iniciarVinculacionGoogleAPI() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/usuarios/me/google`, {
            method: 'POST',
            headers: headers
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al iniciar vinculación con Google: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en iniciarVinculacionGoogleAPI:', error);
        throw error;
    }
}

async function desvincularGoogleAPI() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/usuarios/me/google`, {
            method: 'DELETE',
            headers: headers
        });

        if (handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al desvincular Google: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en desvincularGoogleAPI:', error);
        throw error;
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', actualizarAvatares);
}
