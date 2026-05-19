const API_BASE = 'http://localhost:8787';

let allPosts = [];

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

    loadPosts();

    // ---- Cerrar sesión ----
    document.getElementById('btnSignOut').addEventListener('click', () => {
        localStorage.removeItem('zodia_user');
        localStorage.removeItem('zodia_token');
        window.location.href = '../public/login.html';
    });

    // ---- Botón refrescar ----
    const btnRefresh = document.getElementById('btnRefresh');
    btnRefresh.addEventListener('click', () => {
        btnRefresh.style.transition = 'transform 0.4s ease';
        btnRefresh.style.transform  = 'rotate(360deg)';
        setTimeout(() => { btnRefresh.style.transform = 'rotate(0deg)'; }, 420);
        loadPosts();
    });

    // ---- Búsqueda en tiempo real ----
    document.getElementById('searchInput').addEventListener('input', function () {
        const q = this.value.trim().toLowerCase();
        const filtered = q
            ? allPosts.filter(p =>
                p.contenido.toLowerCase().includes(q)     ||
                p.nombre_actual.toLowerCase().includes(q) ||
                (p.email || '').toLowerCase().includes(q)
            )
            : allPosts;
        renderGrid(filtered);
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
    // Carga de transmisiones desde D1
    // =========================================================
    async function loadPosts() {
        setGridLoading();

        try {
            const response = await fetch(`${API_BASE}/api/admin/posts`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[Zodia Admin] Error al cargar transmisiones:', err);

                const msg = response.status === 403
                    ? 'Acceso denegado. No tienes privilegios de Guardián del Sistema.'
                    : (err.error || 'Error al conectar con el Akasha.');

                setGridError(msg);
                return;
            }

            const data = await response.json();
            allPosts = data.posts;

            updateMetrics(allPosts);
            renderGrid(allPosts);

        } catch (err) {
            console.error('[Zodia Admin] Error de red:', err);
            setGridError('Error de red. Verifica que el Worker esté activo en localhost:8787.');
        }
    }

    // =========================================================
    // Métricas de cabecera
    // =========================================================
    function updateMetrics(posts) {
        document.getElementById('metricTotal').textContent = posts.length;

        const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
        document.getElementById('metricLikes').textContent = totalLikes;

        const uniqueAuthors = new Set(posts.map(p => p.user_id)).size;
        document.getElementById('metricAuthors').textContent = uniqueAuthors;
    }

    // =========================================================
    // Renderizado del grid de tarjetas
    // =========================================================
    function renderGrid(posts) {
        const grid = document.getElementById('postsGrid');

        if (posts.length === 0) {
            grid.innerHTML = `
                <div class="grid-state">
                    <div class="state-icon">✦</div>
                    <p class="state-msg">No hay transmisiones en el Akasha.<br>El registro permanece en silencio.</p>
                </div>`;
            return;
        }

        grid.innerHTML = '';
        posts.forEach(post => grid.appendChild(buildCard(post)));
    }

    function buildCard(post) {
        const avatarSrc = post.avatar_url
            ? post.avatar_url
            : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.nombre_actual)}`;

        const dateStr = new Date(post.created_at).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        const card = document.createElement('div');
        card.className = 'post-card';
        card.dataset.postId = post.id;

        card.innerHTML = `
            <div class="card-author">
                <div class="author-avatar">
                    <img
                        src="${avatarSrc}"
                        alt="${post.nombre_actual}"
                        onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=fallback'">
                </div>
                <div>
                    <div class="author-name">${post.nombre_actual}</div>
                    <div class="author-meta">
                        <span class="author-email">${post.email}</span>
                        <span class="badge-zodiac">☆ ${post.signo_zodiacal || '—'}</span>
                    </div>
                </div>
            </div>

            <div class="card-body">
                <p class="post-text">${post.contenido}</p>
                ${post.imagen_url
                    ? `<img src="${post.imagen_url}" alt="Imagen de transmisión" class="post-image">`
                    : ''}
            </div>

            <div class="card-footer">
                <div>
                    <div class="card-meta">
                        <span class="meta-item"><span class="meta-icon">✨</span>${post.likes_count ?? 0} destellos</span>
                        <span class="meta-item"><span class="meta-icon">◷</span>${dateStr}</span>
                    </div>
                    <div class="post-id">${post.id.slice(0, 12)}…</div>
                </div>
                <button class="btn-purge" data-id="${post.id}" aria-label="Purgar transmisión">
                    ⊗ Purgar
                </button>
            </div>`;

        card.querySelector('.btn-purge').addEventListener('click', function () {
            purgePost(post.id, card, this);
        });

        return card;
    }

    // =========================================================
    // Purga con eliminación optimista
    // =========================================================
    async function purgePost(postId, cardEl, btn) {
        btn.disabled = true;

        // Fijar max-height explícito antes de la transición (requisito de CSS)
        cardEl.style.maxHeight = cardEl.scrollHeight + 'px';

        // Forzar reflow para que el navegador registre el valor inicial
        cardEl.getBoundingClientRect();

        // Disparar animación de salida
        cardEl.classList.add('removing');

        try {
            const response = await fetch(`${API_BASE}/api/admin/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[Zodia Admin] Error al purgar transmisión:', err);

                // Revertir animación
                cardEl.classList.remove('removing');
                cardEl.style.maxHeight = '';
                btn.disabled = false;

                showToast(err.error || 'Error al purgar la transmisión. Intenta de nuevo.', 'error');
                return;
            }

            // Éxito confirmado: eliminar nodo tras completar animación
            setTimeout(() => cardEl.remove(), 430);

            // Actualizar array y métricas en caliente
            allPosts = allPosts.filter(p => p.id !== postId);
            updateMetrics(allPosts);

            showToast('Transmisión purgada del Akasha.', 'success');

        } catch (err) {
            console.error('[Zodia Admin] Error de red al purgar:', err);

            cardEl.classList.remove('removing');
            cardEl.style.maxHeight = '';
            btn.disabled = false;

            showToast('Error de red. La transmisión no fue purgada.', 'error');
        }
    }

    // =========================================================
    // Estados auxiliares del grid
    // =========================================================
    function setGridLoading() {
        document.getElementById('postsGrid').innerHTML = `
            <div class="grid-state">
                <div class="loading-dots">
                    <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                </div>
                <p class="state-msg">Leyendo el Akasha...</p>
            </div>`;
    }

    function setGridError(message) {
        document.getElementById('postsGrid').innerHTML = `
            <div class="grid-state">
                <div class="state-icon">⚠</div>
                <p class="state-msg">${message}</p>
            </div>`;
    }

    // =========================================================
    // Toast de notificación
    // =========================================================
    function showToast(message, type = 'error') {
        const existing = document.querySelector('.admin-toast');
        if (existing) {
            existing.classList.add('closing');
            setTimeout(() => existing.remove(), 320);
        }

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('closing');
            setTimeout(() => toast.remove(), 320);
        }, 4000);
    }
});
