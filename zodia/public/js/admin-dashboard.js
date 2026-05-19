const API_BASE = 'http://localhost:8787';

const ZODIAC_SYMBOLS = {
    'Aries':       '♈', 'Tauro':      '♉', 'Géminis':    '♊',
    'Cáncer':      '♋', 'Leo':        '♌', 'Virgo':      '♍',
    'Libra':       '♎', 'Escorpio':   '♏', 'Sagitario':  '♐',
    'Capricornio': '♑', 'Acuario':    '♒', 'Piscis':     '♓',
};

const KARMIC_META = {
    13: { label: 'Karma de la Pereza', desc: 'Esfuerzo evadido en vidas anteriores' },
    14: { label: 'Karma de los Excesos', desc: 'Abuso de libertades y placeres' },
    16: { label: 'Karma del Ego',       desc: 'Orgullo y caídas espirituales' },
    19: { label: 'Karma del Poder',     desc: 'Egoísmo y dominio sobre otros' },
};

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

    // Fecha en topbar de saludo
    document.getElementById('greetingDate').textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    document.getElementById('greetingTitle').textContent =
        `Bienvenido, ${adminUser.nombre_actual || 'Guardián'}`;

    loadMetrics();

    // ---- Cerrar sesión ----
    document.getElementById('btnSignOut').addEventListener('click', () => {
        localStorage.removeItem('zodia_user');
        localStorage.removeItem('zodia_token');
        window.location.href = '../public/login.html';
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
    // Fetch de métricas
    // =========================================================
    async function loadMetrics() {
        try {
            const response = await fetch(`${API_BASE}/api/admin/metrics`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[Zodia Dashboard] Error al cargar métricas:', err);
                showError(
                    response.status === 403
                        ? 'Acceso denegado. No tienes privilegios de Guardián del Sistema.'
                        : (err.error || 'Error al conectar con el Akasha.')
                );
                return;
            }

            const data = await response.json();

            // Ocultar estado de carga y mostrar secciones
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('greeting').style.display     = '';
            document.getElementById('kpiRow').style.display       = '';
            document.getElementById('midRow').style.display       = '';
            document.getElementById('zodiacSection').style.display = '';

            populateKPIs(data);
            renderDominantSign(data.zodiac_distribution, data.total_users);
            renderKarmicMap(data.karmic_map);
            renderZodiacDistribution(data.zodiac_distribution, data.total_users);

        } catch (err) {
            console.error('[Zodia Dashboard] Error de red:', err);
            showError('Error de red. Verifica que el Worker esté activo en localhost:8787.');
        }
    }

    // =========================================================
    // KPI cards
    // =========================================================
    function populateKPIs(data) {
        animateCount('kpiUsers', data.total_users);
        animateCount('kpiPosts', data.total_posts);
        animateCount('kpiLikes', data.total_likes);
        animateCount('kpiKarma', data.users_with_karma);
    }

    // Animación de conteo ascendente
    function animateCount(elementId, target) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const duration = 900;
        const start    = performance.now();

        function step(now) {
            const elapsed  = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased    = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target).toLocaleString('es-ES');
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // =========================================================
    // Signo Zodiacal Predominante
    // =========================================================
    function renderDominantSign(distribution, totalUsers) {
        if (!distribution || distribution.length === 0) {
            document.getElementById('dominantSymbol').textContent = '—';
            document.getElementById('dominantName').textContent   = 'Sin datos';
            document.getElementById('dominantCount').textContent  = '';
            document.getElementById('dominantPct').textContent    = '';
            return;
        }

        // distribution ya viene ordenado DESC por el backend
        const top   = distribution[0];
        const sym   = ZODIAC_SYMBOLS[top.signo_zodiacal] ?? '★';
        const pct   = totalUsers > 0 ? ((top.count / totalUsers) * 100).toFixed(1) : 0;

        document.getElementById('dominantSymbol').textContent = sym;
        document.getElementById('dominantName').textContent   = top.signo_zodiacal;
        document.getElementById('dominantCount').textContent  = `${top.count} almas — ${pct}% del total`;
        document.getElementById('dominantPct').textContent    = `El signo más frecuente en la plataforma`;
    }

    // =========================================================
    // Mapa Kármico: barras de progreso por número de deuda
    // =========================================================
    function renderKarmicMap(karmicMap) {
        const container = document.getElementById('karmicMap');
        const entries   = [13, 14, 16, 19];
        const maxVal    = Math.max(...entries.map(k => karmicMap[k] || 0), 1);

        container.innerHTML = entries.map(num => {
            const count = karmicMap[num] || 0;
            const pct   = Math.round((count / maxVal) * 100);
            const meta  = KARMIC_META[num];

            return `
                <div class="karma-row">
                    <div class="karma-row-header">
                        <div class="karma-num">
                            <span>☯</span>
                            <span>${num}</span>
                            <span class="karma-label">— ${meta.label}</span>
                        </div>
                        <span class="karma-count-val">${count}</span>
                    </div>
                    <div class="karma-bar-bg">
                        <div class="karma-bar-fill" style="width:0%" data-target="${pct}"></div>
                    </div>
                    <div style="font-size:.65rem; color:#475569; margin-top:.2rem">${meta.desc}</div>
                </div>`;
        }).join('');

        // Animar barras tras inserción en DOM
        requestAnimationFrame(() => {
            container.querySelectorAll('.karma-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.target + '%';
            });
        });
    }

    // =========================================================
    // Distribución zodiacal completa (12 signos con barras)
    // =========================================================
    function renderZodiacDistribution(distribution, totalUsers) {
        const grid = document.getElementById('zodiacGrid');

        if (!distribution || distribution.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted); font-size:.875rem;">Sin datos zodiacales disponibles.</p>`;
            return;
        }

        // Asegurar los 12 signos — rellenar con 0 si no existen en los datos
        const ALL_SIGNS = [
            'Aries','Tauro','Géminis','Cáncer','Leo','Virgo',
            'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis',
        ];
        const countMap = {};
        distribution.forEach(d => { countMap[d.signo_zodiacal] = d.count; });
        ALL_SIGNS.forEach(s => { if (countMap[s] === undefined) countMap[s] = 0; });

        const maxCount = Math.max(...Object.values(countMap), 1);

        // Ordenar de mayor a menor para el grid
        const sorted = ALL_SIGNS
            .map(sign => ({ sign, count: countMap[sign] }))
            .sort((a, b) => b.count - a.count);

        grid.innerHTML = sorted.map((item, idx) => {
            const sym = ZODIAC_SYMBOLS[item.sign] ?? '★';
            const pct = Math.round((item.count / maxCount) * 100);
            const ofTotal = totalUsers > 0 ? ((item.count / totalUsers) * 100).toFixed(1) : '0.0';
            const isTop   = idx === 0 && item.count > 0;

            return `
                <div class="zodiac-row${isTop ? ' is-top' : ''}">
                    <div class="zodiac-row-top">
                        <div class="zodiac-name-wrap">
                            <span class="zodiac-sym">${sym}</span>
                            <span class="zodiac-name">${item.sign}</span>
                        </div>
                        <span class="zodiac-count-badge">${item.count}</span>
                    </div>
                    <div class="zodiac-bar-bg">
                        <div class="zodiac-bar-fill" style="width:0%" data-target="${pct}"></div>
                    </div>
                    <div class="zodiac-pct">${ofTotal}% del total de almas</div>
                </div>`;
        }).join('');

        // Animar barras
        requestAnimationFrame(() => {
            grid.querySelectorAll('.zodiac-bar-fill').forEach((bar, i) => {
                setTimeout(() => { bar.style.width = bar.dataset.target + '%'; }, i * 40);
            });
        });
    }

    // =========================================================
    // Error de carga
    // =========================================================
    function showError(message) {
        document.getElementById('loadingState').innerHTML = `
            <div style="font-size:2rem; opacity:.4; margin-bottom:.85rem">⚠</div>
            <p style="font-size:.875rem; color:var(--text-muted); line-height:1.6">${message}</p>`;
    }
});
