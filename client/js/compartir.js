let compartirTokenActual = null;
let compartirLinkActual = null;
let tasacionCompartirActual = null;

function abrirModalCompartir(tasacionId) {
    const modal = document.getElementById('modalCompartir');
    if (!modal) return;

    const mensaje = document.getElementById('compartirMensaje');
    const contenido = document.getElementById('compartirContenido');
    const input = document.getElementById('compartirLink');
    const botonesInicio = document.getElementById('compartirBotonesInicio');
    const btnGenerar = document.getElementById('btnGenerarLink');

    if (mensaje) mensaje.textContent = 'Compartí esta tasación mediante un enlace.';
    if (contenido) contenido.style.display = 'none';
    if (input) input.value = '';
    if (botonesInicio) botonesInicio.style.display = 'flex';
    if (btnGenerar) {
        btnGenerar.style.display = '';
        btnGenerar.disabled = false;
        btnGenerar.textContent = 'Generar enlace';
    }

    tasacionCompartirActual = tasacionId;
    compartirTokenActual = null;
    compartirLinkActual = null;

    modal.classList.add('active');
}

function cerrarModalCompartir() {
    const modal = document.getElementById('modalCompartir');
    if (modal) modal.classList.remove('active');
}

async function generarEnlaceCompartir() {
    if (!tasacionCompartirActual) return;

    const btnGenerar = document.getElementById('btnGenerarLink');
    if (btnGenerar) {
        btnGenerar.disabled = true;
        btnGenerar.textContent = 'Generando...';
    }

    try {
        const respuesta = await compartirTasacionAPI(tasacionCompartirActual);
        compartirTokenActual = respuesta.token;
        compartirLinkActual = respuesta.link;

        const input = document.getElementById('compartirLink');
        const contenido = document.getElementById('compartirContenido');
        const botonesInicio = document.getElementById('compartirBotonesInicio');

        if (input) input.value = compartirLinkActual;
        if (contenido) contenido.style.display = 'block';
        if (botonesInicio) botonesInicio.style.display = 'none';

        const mensaje = `Te compartí una tasación. Podés verla acá: ${compartirLinkActual}`;
        const whatsappBtn = document.getElementById('btnCompartirWhatsapp');
        const emailBtn = document.getElementById('btnCompartirEmail');

        if (whatsappBtn) whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        if (emailBtn) emailBtn.href = `mailto:?subject=${encodeURIComponent('Te compartí una tasación')}&body=${encodeURIComponent(mensaje)}`;
    } catch (e) {
        alert(e.message || 'No se pudo generar el enlace');
    } finally {
        if (btnGenerar) {
            btnGenerar.disabled = false;
            btnGenerar.textContent = 'Generar enlace';
        }
    }
}

function copiarEnlaceCompartir() {
    if (!compartirLinkActual) return;
    navigator.clipboard.writeText(compartirLinkActual)
        .then(() => alert('Enlace copiado'))
        .catch(() => alert('No se pudo copiar el enlace'));
}

async function revocarEnlaceCompartir() {
    if (!compartirTokenActual) return;
    if (!confirm('¿Estás seguro de que querés revocar este enlace?')) return;

    try {
        await revocarTasacionCompartidaAPI(compartirTokenActual);
        const contenido = document.getElementById('compartirContenido');
        const mensaje = document.getElementById('compartirMensaje');
        if (contenido) contenido.style.display = 'none';
        if (mensaje) mensaje.textContent = 'El enlace fue revocado.';
        compartirTokenActual = null;
        compartirLinkActual = null;
    } catch (e) {
        alert(e.message || 'No se pudo revocar el enlace');
    }
}

function obtenerTokenCompartir() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) return token;

    const partes = window.location.pathname.split('/').filter(Boolean);
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.length > 16 && !ultima.includes('.')) return ultima;

    return null;
}

function formatearValorCompartir(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    try {
        return `USD ${Number(valor).toLocaleString('es-AR')}`;
    } catch (e) {
        return '—';
    }
}

async function initCompartirPublico() {
    const contenedor = document.getElementById('compartirPublico');
    if (!contenedor) return;

    const token = obtenerTokenCompartir();
    if (!token) {
        contenedor.innerHTML = '<p class="compartir-mensaje-error">Enlace no válido.</p>';
        return;
    }

    const redirectPath = window.location.pathname.slice(1) || 'compartir.html';

    try {
        const preview = await obtenerVistaPreviaCompartirAPI(token);
        if (!preview) {
            contenedor.innerHTML = '<p class="compartir-mensaje-error">Este enlace no está disponible o ya expiró.</p>';
            return;
        }

        const remitente = [preview.remitente_nombre, preview.remitente_apellido].filter(Boolean).join(' ');

        const acciones = typeof isAuthenticated === 'function' && isAuthenticated()
            ? `<button type="button" class="compartir-btn-principal" id="btnGuardarTasacionCompartida">Guardar tasación</button>`
            : `<a class="compartir-btn-principal" href="login.html?redirect=${encodeURIComponent(redirectPath)}&share_token=${encodeURIComponent(token)}">Iniciar sesión</a>
               <a class="compartir-btn-secundario" href="registro.html?redirect=${encodeURIComponent(redirectPath)}&share_token=${encodeURIComponent(token)}">Crear cuenta</a>`;

        const html = `
            <div class="compartir-card">
                <h1>Te compartieron una tasación</h1>
                <p class="compartir-remitente">${remitente ? `${remitente} te compartió una tasación` : 'Te compartieron una tasación'}</p>

                <div class="compartir-datos">
                    <div class="compartir-dato"><span>Tipo de inmueble</span><span>${preview.tipo_inmueble || '—'}</span></div>
                    <div class="compartir-dato"><span>Dirección</span><span>${preview.direccion || '—'}</span></div>
                    <div class="compartir-dato"><span>Localidad</span><span>${preview.localidad || '—'}</span></div>
                    <div class="compartir-dato"><span>Provincia</span><span>${preview.provincia || '—'}</span></div>
                    <div class="compartir-dato"><span>Valor estimado</span><span>${formatearValorCompartir(preview.valor_final)}</span></div>
                    <div class="compartir-dato"><span>Fecha</span><span>${preview.fecha_creacion ? new Date(preview.fecha_creacion).toLocaleDateString('es-AR') : '—'}</span></div>
                </div>

                <div class="compartir-acciones-publico" id="compartirAccionesPublico">
                    ${acciones}
                </div>
            </div>
        `;

        contenedor.innerHTML = html;

        const btnGuardar = document.getElementById('btnGuardarTasacionCompartida');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => guardarTasacionPublica(token));
        }
    } catch (e) {
        contenedor.innerHTML = '<p class="compartir-mensaje-error">Este enlace no está disponible.</p>';
    }
}

async function guardarTasacionPublica(token) {
    const btn = document.getElementById('btnGuardarTasacionCompartida');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }

    const redirectPath = window.location.pathname.slice(1) || 'compartir.html';

    try {
        await guardarTasacionCompartidaAPI(token);
        window.location.href = 'app/historial.html';
    } catch (e) {
        if (e.message === 'Sesión expirada') {
            window.location.href = `login.html?redirect=${encodeURIComponent(redirectPath)}&share_token=${encodeURIComponent(token)}`;
        } else {
            alert(e.message || 'No se pudo guardar la tasación');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Guardar tasación';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalCompartir');
    if (modal) {
        document.getElementById('btnCerrarCompartir')?.addEventListener('click', cerrarModalCompartir);
        document.getElementById('btnGenerarLink')?.addEventListener('click', generarEnlaceCompartir);
        document.getElementById('btnCopiarLink')?.addEventListener('click', copiarEnlaceCompartir);
        document.getElementById('btnRevocarLink')?.addEventListener('click', revocarEnlaceCompartir);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModalCompartir();
        });
    }

    window.abrirModalCompartir = abrirModalCompartir;

    initCompartirPublico();
});
