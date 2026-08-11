/* =========================
   PANEL DE ADMINISTRACIÓN
   Solo lectura. Métricas, listados y perfil de usuario.
========================= */

(function() {
    const userData = (typeof getUserData === 'function') ? getUserData() : null;
    if (!userData || !userData.is_admin) {
        window.location.href = 'index.html';
        return;
    }

    const loaded = { dashboard: false, tasaciones: false, usuarios: false, comparables: false };

    const tabs = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.admin-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    function switchTab(target) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
        panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));

        if (target === 'dashboard' && !loaded.dashboard) loadDashboard();
        if (target === 'tasaciones' && !loaded.tasaciones) loadTasaciones();
        if (target === 'usuarios' && !loaded.usuarios) loadUsuarios();
        if (target === 'comparables' && !loaded.comparables) loadComparables();
    }

    async function fetchAdmin(path) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            headers: getAuthHeaders()
        });

        if (typeof handleAuthError === 'function' && handleAuthError(response)) {
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }

        return response.json();
    }

    function buildQuery(params) {
        const qs = new URLSearchParams();
        qs.set('limit', '100');
        qs.set('offset', '0');
        for (const [key, value] of Object.entries(params)) {
            if (value) qs.set(key, value);
        }
        const s = qs.toString();
        return s ? `?${s}` : '';
    }

    function formatearFecha(fecha) {
        if (!fecha) return '-';
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function formatearHora(fecha) {
        if (!fecha) return '-';
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function capitalizar(texto) {
        if (!texto) return '-';
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function formatearEstado(estado) {
        const mapa = { borrador: 'Borrador', completada: 'Completada', archivada: 'Archivada' };
        return mapa[estado] || capitalizar(estado);
    }

    function formatearFuente(fuente) {
        const mapa = { manual: 'Manual', de_tasacion: 'De tasación', compartido: 'Compartido' };
        return mapa[fuente] || capitalizar(fuente);
    }

    function formatearValor(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return '-';
        return `$${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }

    function mostrarError(id, mensaje) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = mensaje;
            el.classList.remove('admin-loading');
            el.classList.add('admin-error');
        }
    }

    function renderTipoList(tipos) {
        const tipoList = document.getElementById('adminTipoList');
        tipoList.innerHTML = '';

        if (!tipos || Object.keys(tipos).length === 0) {
            tipoList.innerHTML = '<div class="admin-tipo-item">Sin datos</div>';
            return;
        }

        Object.keys(tipos).forEach(tipo => {
            if (!tipo) return;
            const div = document.createElement('div');
            div.className = 'admin-tipo-item';
            div.innerHTML = `<span class="admin-tipo-count">${tipos[tipo]}</span> ${capitalizar(tipo)}`;
            tipoList.appendChild(div);
        });
    }

    async function loadDashboard() {
        try {
            const stats = await fetchAdmin('/api/admin/stats');

            document.getElementById('totalUsuarios').textContent = stats.total_usuarios || 0;
            document.getElementById('totalUsuarios7Dias').textContent = stats.usuarios_ultimos_7_dias || 0;
            document.getElementById('totalTasaciones').textContent = stats.total_tasaciones || 0;
            document.getElementById('tasaciones7Dias').textContent = stats.tasaciones_ultimos_7_dias || 0;
            document.getElementById('totalComparables').textContent = stats.total_comparables || 0;
            document.getElementById('totalRecibidas').textContent = stats.total_tasaciones_recibidas || 0;
            document.getElementById('totalUsuariosLogin7Dias').textContent = stats.usuarios_login_7_dias || 0;

            renderTipoList(stats.tasaciones_por_tipo || {});

            const recentList = document.getElementById('adminRecentList');
            recentList.innerHTML = '';

            (stats.ultimas_tasaciones || []).forEach(t => {
                const div = document.createElement('div');
                div.className = 'admin-recent-item';
                div.innerHTML = `
                    <div class="admin-recent-info">
                        <div class="admin-recent-email">${escapeHtml(t.usuario_email || '-')}</div>
                        <div class="admin-recent-meta">${capitalizar(t.id || '-')} · ${capitalizar(t.tipo)} · ${formatearEstado(t.estado || 'borrador')}</div>
                    </div>
                    <div class="admin-recent-meta">${formatearFecha(t.fecha_creacion)}</div>
                `;
                recentList.appendChild(div);
            });

            document.getElementById('dashboardLoading').style.display = 'none';
            document.getElementById('adminCards').style.display = 'grid';
            document.getElementById('adminTipoBox').style.display = 'block';
            document.getElementById('adminRecentBox').style.display = 'block';

            loaded.dashboard = true;
        } catch (e) {
            mostrarError('dashboardLoading', 'Error al cargar el dashboard');
            console.error('Error en loadDashboard:', e);
        }
    }

    async function loadTasaciones() {
        const loading = document.getElementById('adminTasacionesLoading');
        const body = document.getElementById('adminTasacionesBody');
        const empty = document.getElementById('adminTasacionesEmpty');

        const params = {
            q: document.getElementById('adminTasacionesEmail').value.trim(),
            tipo: document.getElementById('adminTasacionesTipo').value,
            estado: document.getElementById('adminTasacionesEstado').value
        };

        try {
            const tasaciones = await fetchAdmin(`/api/admin/tasaciones${buildQuery(params)}`);

            body.innerHTML = '';

            if (!tasaciones || tasaciones.length === 0) {
                loading.style.display = 'none';
                empty.style.display = 'block';
            } else {
                tasaciones.forEach(t => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${escapeHtml(t.id || '-')}</td>
                        <td>${escapeHtml(t.usuario_email || '-')}</td>
                        <td>${capitalizar(t.tipo)}</td>
                        <td>${formatearEstado(t.estado)}</td>
                        <td>${formatearFecha(t.fecha_creacion)}</td>
                    `;
                    body.appendChild(tr);
                });

                loading.style.display = 'none';
                empty.style.display = 'none';
            }

            loaded.tasaciones = true;
        } catch (e) {
            loading.textContent = 'Error al cargar tasaciones';
            loading.classList.add('admin-error');
            console.error('Error en loadTasaciones:', e);
        }
    }

    async function loadUsuarios() {
        const loading = document.getElementById('adminUsuariosLoading');
        const body = document.getElementById('adminUsuariosBody');
        const empty = document.getElementById('adminUsuariosEmpty');

        try {
            const usuarios = await fetchAdmin('/api/admin/usuarios');

            body.innerHTML = '';

            if (!usuarios || usuarios.length === 0) {
                loading.style.display = 'none';
                empty.style.display = 'block';
            } else {
                usuarios.forEach(u => {
                    const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ') || '-';
                    const tr = document.createElement('tr');
                    tr.className = 'admin-usuario-row';
                    tr.dataset.id = u.id;
                    const iconoAdmin = u.is_admin ? '<i class="fa-solid fa-check-circle admin-admin-icon" title="Administrador"></i>' : '';
                    tr.innerHTML = `
                        <td>${iconoAdmin}${escapeHtml(u.email || '-')}</td>
                        <td>${escapeHtml(nombre)}</td>
                        <td>${escapeHtml(u.inmobiliaria || '—')}</td>
                        <td>${escapeHtml(u.plan || '-')}</td>
                        <td>${formatearFecha(u.fecha_creacion)}</td>
                        <td>${formatearFecha(u.ultimo_acceso)}</td>
                        <td>${u.cantidad_tasaciones || 0}</td>
                        <td>${u.cantidad_comparables || 0}</td>
                        <td>${u.cantidad_recibidas || 0}</td>
                    `;
                    tr.addEventListener('click', () => abrirPerfilUsuario(u.id));
                    body.appendChild(tr);
                });

                loading.style.display = 'none';
                empty.style.display = 'none';
            }

            loaded.usuarios = true;
        } catch (e) {
            loading.textContent = 'Error al cargar usuarios';
            loading.classList.add('admin-error');
            console.error('Error en loadUsuarios:', e);
        }
    }

    async function loadComparables() {
        const loading = document.getElementById('adminComparablesLoading');
        const body = document.getElementById('adminComparablesBody');
        const empty = document.getElementById('adminComparablesEmpty');

        const params = {
            q: document.getElementById('adminComparablesEmail').value.trim(),
            tipo: document.getElementById('adminComparablesTipo').value,
            fuente: document.getElementById('adminComparablesFuente').value
        };

        try {
            const comparables = await fetchAdmin(`/api/admin/comparables${buildQuery(params)}`);

            body.innerHTML = '';

            if (!comparables || comparables.length === 0) {
                loading.style.display = 'none';
                empty.style.display = 'block';
            } else {
                comparables.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${escapeHtml(c.id || '-')}</td>
                        <td>${escapeHtml(c.usuario_email || '-')}</td>
                        <td>${capitalizar(c.tipo)}</td>
                        <td>${escapeHtml(c.direccion || '-')}</td>
                        <td>${formatearValor(c.valor)}</td>
                        <td>${formatearFuente(c.fuente)}</td>
                        <td>${formatearFecha(c.fecha_creacion)}</td>
                    `;
                    body.appendChild(tr);
                });

                loading.style.display = 'none';
                empty.style.display = 'none';
            }

            loaded.comparables = true;
        } catch (e) {
            loading.textContent = 'Error al cargar comparables';
            loading.classList.add('admin-error');
            console.error('Error en loadComparables:', e);
        }
    }

    async function abrirPerfilUsuario(usuarioId) {
        const modal = document.getElementById('adminUserModal');
        const loading = document.getElementById('adminUserModalLoading');
        const info = document.getElementById('adminUserModalInfo');
        const datosCuenta = document.getElementById('adminUserDatosCuenta');
        const uso = document.getElementById('adminUserUso');
        const tasacionesList = document.getElementById('adminUserTasacionesList');

        modal.style.display = 'flex';
        loading.style.display = 'block';
        info.style.display = 'none';

        try {
            const usuario = await fetchAdmin(`/api/admin/usuarios/${usuarioId}`);

            datosCuenta.innerHTML = `
                <div class="admin-profile-item"><span class="admin-profile-label">Nombre</span><span class="admin-profile-value">${escapeHtml(usuario.nombre || '-')}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Apellido</span><span class="admin-profile-value">${escapeHtml(usuario.apellido || '-')}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Email</span><span class="admin-profile-value">${escapeHtml(usuario.email || '-')}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Fecha de registro</span><span class="admin-profile-value">${formatearFecha(usuario.fecha_creacion)}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Plan</span><span class="admin-profile-value">${escapeHtml(usuario.plan || '-')}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Último acceso</span><span class="admin-profile-value">${formatearHora(usuario.ultimo_acceso)}</span></div>
            `;

            uso.innerHTML = `
                <div class="admin-profile-item"><span class="admin-profile-label">Tasaciones</span><span class="admin-profile-value">${usuario.cantidad_tasaciones || 0}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Comparables</span><span class="admin-profile-value">${usuario.cantidad_comparables || 0}</span></div>
                <div class="admin-profile-item"><span class="admin-profile-label">Recibidas por compartir</span><span class="admin-profile-value">${usuario.cantidad_recibidas || 0}</span></div>
            `;

            tasacionesList.innerHTML = '';
            if (!usuario.ultimas_tasaciones || usuario.ultimas_tasaciones.length === 0) {
                tasacionesList.innerHTML = '<div class="admin-empty">Sin tasaciones</div>';
            } else {
                usuario.ultimas_tasaciones.forEach(t => {
                    const div = document.createElement('div');
                    div.className = 'admin-recent-item';
                    div.innerHTML = `
                        <div class="admin-recent-info">
                            <div class="admin-recent-email">${escapeHtml(t.id || '-')}</div>
                            <div class="admin-recent-meta">${capitalizar(t.tipo)} · ${formatearEstado(t.estado)}</div>
                        </div>
                        <div class="admin-recent-meta">${formatearFecha(t.fecha_creacion)}</div>
                    `;
                    tasacionesList.appendChild(div);
                });
            }

            loading.style.display = 'none';
            info.style.display = 'block';
        } catch (e) {
            loading.textContent = 'Error al cargar el perfil';
            loading.classList.add('admin-error');
            console.error('Error en abrirPerfilUsuario:', e);
        }
    }

    function cerrarPerfilUsuario() {
        const modal = document.getElementById('adminUserModal');
        modal.style.display = 'none';

        document.getElementById('adminUserModalLoading').style.display = 'none';
        document.getElementById('adminUserModalLoading').classList.remove('admin-error');
        document.getElementById('adminUserModalInfo').style.display = 'none';
    }

    function bindFilters() {
        document.getElementById('adminTasacionesBuscar').addEventListener('click', () => {
            loaded.tasaciones = false;
            loadTasaciones();
        });

        document.getElementById('adminComparablesBuscar').addEventListener('click', () => {
            loaded.comparables = false;
            loadComparables();
        });

        document.getElementById('adminUserModalClose').addEventListener('click', cerrarPerfilUsuario);

        document.getElementById('adminUserModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('admin-modal-backdrop')) {
                cerrarPerfilUsuario();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarPerfilUsuario();
        });
    }

    bindFilters();

    // Cargar dashboard al iniciar
    loadDashboard();
})();
