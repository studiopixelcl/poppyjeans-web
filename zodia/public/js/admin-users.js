const API_BASE = 'http://localhost:8787';

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    const activeUserRaw = localStorage.getItem('zodia_user');
    const token         = localStorage.getItem('zodia_token');

    if (!activeUserRaw || !token) {
        window.location.href = '../public/login.html';
        return;
    }

    const adminUser = JSON.parse(activeUserRaw);

    const topbarName   = document.getElementById('topbarName');
    const topbarAvatar = document.getElementById('topbarAvatar');
    if (topbarName)   topbarName.textContent = adminUser.nombre_actual || 'Administrador';
    if (topbarAvatar && adminUser.avatar_url) topbarAvatar.src = adminUser.avatar_url;

    loadUsers();

    // ---- Cerrar sesión ----
    document.getElementById('btnSignOut').addEventListener('click', () => {
        localStorage.removeItem('zodia_user');
        localStorage.removeItem('zodia_token');
        window.location.href = '../public/login.html';
    });

    // ---- Refrescar tabla ----
    const btnRefresh = document.getElementById('btnRefresh');
    btnRefresh.addEventListener('click', () => {
        btnRefresh.style.transition = 'transform 0.4s ease';
        btnRefresh.style.transform  = 'rotate(360deg)';
        setTimeout(() => { btnRefresh.style.transform = 'rotate(0deg)'; }, 420);
        loadUsers();
    });

    // ---- Búsqueda en tiempo real (filtrado cliente) ----
    document.getElementById('searchInput').addEventListener('input', function () {
        const q = this.value.trim().toLowerCase();
        const filtered = q
            ? allUsers.filter(u =>
                u.nombre_actual.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)         ||
                (u.signo_zodiacal || '').toLowerCase().includes(q)
            )
            : allUsers;
        renderTable(filtered);
    });

    // ---- Sidebar móvil ----
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    document.getElementById('btnMenuOpen')?.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    });

    // =========================================================
    // Carga de usuarios desde D1
    // =========================================================
    async function loadUsers() {
        setTableLoading();

        try {
            const response = await fetch(`${API_BASE}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[Zodia Admin] Error al cargar usuarios:', err);

                const msg = response.status === 403
                    ? 'Acceso denegado. No tienes privilegios de Guardián del Sistema.'
                    : (err.error || 'Error al conectar con el Akasha.');

                setTableError(msg);
                return;
            }

            const data = await response.json();
            allUsers = data.users;

            updateMetrics(allUsers);
            renderTable(allUsers);

        } catch (err) {
            console.error('[Zodia Admin] Error de red:', err);
            setTableError('Error de red. Verifica que el Worker esté activo en localhost:8787.');
        }
    }

    // =========================================================
    // Métricas de cabecera
    // =========================================================
    function updateMetrics(users) {
        document.getElementById('metricTotal').textContent = users.length;

        const withKarma = users.filter(u => {
            try {
                const k = JSON.parse(u.deudas_karmicas || '[]');
                return Array.isArray(k) && k.length > 0;
            } catch { return false; }
        }).length;
        document.getElementById('metricKarma').textContent = withKarma;

        const admins = users.filter(u => u.role === 'admin').length;
        document.getElementById('metricAdmins').textContent = admins;
    }

    // =========================================================
    // Renderizado de filas
    // =========================================================
    function renderTable(users) {
        const tbody = document.getElementById('usersTableBody');

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7">
                    <div class="table-state">
                        <div class="state-icon">☽</div>
                        <p class="state-msg">No se encontraron almas en el registro.<br>El Akasha permanece en silencio.</p>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(user => {
            // Parsear deudas kármicas con tolerancia a datos malformados
            let deudas = [];
            try {
                const parsed = JSON.parse(user.deudas_karmicas || '[]');
                if (Array.isArray(parsed)) deudas = parsed;
            } catch { /* dato corrupto — tratar como sin deudas */ }

            const karmaHtml = deudas.length > 0
                ? `<div class="karma-badges">
                     ${deudas.map(d => `<span class="badge badge-karma">☯ ${d}</span>`).join('')}
                   </div>`
                : `<span class="badge badge-clean">Sin deudas</span>`;

            const avatarSrc = user.avatar_url
                ? user.avatar_url
                : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.nombre_actual)}`;

            const createdDate = new Date(user.created_at).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric',
            });

            const roleBadge = user.role === 'admin'
                ? `<span class="badge badge-admin">⬡ Guardián</span>`
                : `<span class="badge badge-user">Alma</span>`;

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar">
                                <img
                                    src="${avatarSrc}"
                                    alt="${user.nombre_actual}"
                                    onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=fallback'">
                            </div>
                            <div>
                                <div class="user-name">${user.nombre_actual}</div>
                                <div class="user-id">${user.id.slice(0, 8)}…</div>
                            </div>
                        </div>
                    </td>
                    <td class="email-td">${user.email}</td>
                    <td><span class="badge badge-zodiac">☆ ${user.signo_zodiacal || '—'}</span></td>
                    <td><span class="path-value">${user.camino_vida ?? '—'}</span></td>
                    <td>${karmaHtml}</td>
                    <td>${roleBadge}</td>
                    <td class="date-td">${createdDate}</td>
                </tr>`;
        }).join('');
    }

    // =========================================================
    // Estados auxiliares de la tabla
    // =========================================================
    function setTableLoading() {
        document.getElementById('usersTableBody').innerHTML = `
            <tr><td colspan="7">
                <div class="table-state">
                    <div class="loading-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                    <p class="state-msg">Consultando el Registro Akáshico...</p>
                </div>
            </td></tr>`;
    }

    function setTableError(message) {
        document.getElementById('usersTableBody').innerHTML = `
            <tr><td colspan="7">
                <div class="table-state">
                    <div class="state-icon">⚠</div>
                    <p class="state-msg">${message}</p>
                </div>
            </td></tr>`;
    }
});
