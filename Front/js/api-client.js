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

// =========================
//   TASACIONES
// =========================

async function crearTasacionAPI(tasacion) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasaciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tasacion)
        });
        
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
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${tasacionId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
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

async function listarTasacionesAPI(usuarioId = 1, estado = null) {
    try {
        let url = `${API_BASE_URL}/api/tasaciones?usuario_id=${usuarioId}`;
        if (estado) {
            url += `&estado=${estado}`;
        }
        
        const response = await fetch(url);
        
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
        const response = await fetch(`${API_BASE_URL}/api/tasaciones/${tasacionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizacion)
        });
        
        if (!response.ok) {
            throw new Error(`Error al actualizar tasación: ${response.status}`);
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
            method: 'DELETE'
        });
        
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(comparable)
        });
        
        if (!response.ok) {
            throw new Error(`Error al crear comparable: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en crearComparableAPI:', error);
        throw error;
    }
}

async function obtenerComparableAPI(comparableId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparables/${comparableId}`);
        
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

async function obtenerComparablesBatchAPI(ids) {
    try {
        if (!ids || ids.length === 0) return [];
        
        const response = await fetch(`${API_BASE_URL}/api/comparables/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids })
        });
        
        if (!response.ok) {
            throw new Error(`Error al obtener comparables batch: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerComparablesBatchAPI:', error);
        throw error;
    }
}

async function listarComparablesAPI(usuarioId = 1, tipoInmueble = null, fuente = null) {
    try {
        let url = `${API_BASE_URL}/api/comparables?usuario_id=${usuarioId}`;
        if (tipoInmueble) {
            url += `&tipo_inmueble=${tipoInmueble}`;
        }
        if (fuente) {
            url += `&fuente=${fuente}`;
        }
        
        const response = await fetch(url);
        
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizacion)
        });
        
        if (!response.ok) {
            throw new Error(`Error al actualizar comparable: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en actualizarComparableAPI:', error);
        throw error;
    }
}

async function eliminarComparableAPI(comparableId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comparables/${comparableId}`, {
            method: 'DELETE'
        });
        
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(solicitud)
        });
        
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
        const response = await fetch(`${API_BASE_URL}/api/solicitudes/${solicitudId}`);
        
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

async function listarSolicitudesAPI(usuarioId = 1, estado = null) {
    try {
        let url = `${API_BASE_URL}/api/solicitudes?usuario_id=${usuarioId}`;
        if (estado) {
            url += `&estado=${estado}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al listar solicitudes: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error en listarSolicitudesAPI:', error);
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizacion)
        });
        
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
            method: 'DELETE'
        });

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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

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

// =========================
//   TASAR
// =========================

async function tasarAPI(payload) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
