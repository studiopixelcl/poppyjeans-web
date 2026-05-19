// ============================================================
// ZODIA — El Espejo Astral · Perfil Público
// ============================================================

const API_BASE = 'http://127.0.0.1:8787';

// ── Utilidades ────────────────────────────────────────────────
function clearSessionAndRedirect() {
    localStorage.removeItem('zodia_user');
    localStorage.removeItem('zodia_token');
    window.location.href = 'login.html';
}

/**
 * SVG Data URL con el glifo zodiacal centrado sobre fondo azul noche.
 * Fallback cuando avatar_url está vacío.
 */
function getZodiacAvatar(signo) {
    const GLYPHS = {
        'Aries':'♈','Tauro':'♉','Géminis':'♊','Cáncer':'♋',
        'Leo':'♌','Virgo':'♍','Libra':'♎','Escorpio':'♏',
        'Sagitario':'♐','Capricornio':'♑','Acuario':'♒','Piscis':'♓',
    };
    const glyph = GLYPHS[signo] || '✦';
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
        `<circle cx="40" cy="40" r="40" fill="#0f172a"/>` +
        `<text x="40" y="40" text-anchor="middle" dominant-baseline="central" ` +
        `font-size="40" fill="#38bdf8" ` +
        `font-family="'Segoe UI Symbol','Apple Color Emoji',system-ui,sans-serif">${glyph}</text>` +
        `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ── Niveles de Conciencia ─────────────────────────────────────
function getLevelLabel(nivel) {
    if (nivel <= 1)  return 'Iniciado';
    if (nivel <= 4)  return 'Sintonizado';
    if (nivel <= 9)  return 'Transmutador';
    if (nivel <= 19) return 'Arquitecto';
    if (nivel <= 33) return 'Luminar';
    return 'Soberano';
}

// ── Mapas de presentación ─────────────────────────────────────
const ELEMENTO_POR_SIGNO = {
    'Aries':       'Fuego',  'Leo':        'Fuego',  'Sagitario':   'Fuego',
    'Tauro':       'Tierra', 'Virgo':      'Tierra', 'Capricornio': 'Tierra',
    'Géminis':     'Aire',   'Libra':      'Aire',   'Acuario':     'Aire',
    'Cáncer':      'Agua',   'Escorpio':   'Agua',   'Piscis':      'Agua',
};
const ELEMENTO_EMOJI = { Fuego: '🔥', Tierra: '⛰️', Aire: '💨', Agua: '🌊' };

const GLIFO_SIGNO = {
    'Aries':'♈','Tauro':'♉','Géminis':'♊','Cáncer':'♋',
    'Leo':'♌','Virgo':'♍','Libra':'♎','Escorpio':'♏',
    'Sagitario':'♐','Capricornio':'♑','Acuario':'♒','Piscis':'♓',
};

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

    // ── 1. Extraer ID de la URL ───────────────────────────────
    const params      = new URLSearchParams(window.location.search);
    const visitedId   = params.get('id');

    if (!visitedId) {
        console.warn('[Alma] No se proporcionó ID de usuario en la URL.');
        window.location.href = 'inicio.html';
        return;
    }

    // ── 2. Validar sesión activa ──────────────────────────────
    const token = localStorage.getItem('zodia_token');
    if (!token) {
        clearSessionAndRedirect();
        return;
    }

    // ── 3. Fetch al endpoint de perfil público ────────────────
    let profile;
    try {
        const res = await fetch(`${API_BASE}/api/users/profile/${visitedId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
            clearSessionAndRedirect();
            return;
        }

        if (res.status === 404) {
            console.warn('[Alma] Alma no encontrada:', visitedId);
            renderNotFound();
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('[Alma] Error del servidor:', err);
            renderNotFound();
            return;
        }

        const data = await res.json();
        profile = data.profile;

    } catch (netErr) {
        console.error('[Alma] Error de red:', netErr);
        renderNotFound();
        return;
    }

    // ── 4. Renderizar ─────────────────────────────────────────
    renderProfile(profile);
});

// ============================================================
// RENDER
// ============================================================

function renderProfile(profile) {
    const signo      = profile.signo_zodiacal || '';
    const elemBase   = ELEMENTO_POR_SIGNO[signo] || '';
    const elemText   = elemBase
        ? `${ELEMENTO_EMOJI[elemBase] || ''} ${elemBase}`
        : '—';
    const nivel      = profile.nivel_conciencia ?? 1;
    const levelLabel = `${nivel} · ${getLevelLabel(nivel)}`;

    // Título dinámico de la pestaña
    document.title = `Zodia · ${profile.nombre_actual || 'Alma'}`;

    // Avatar
    const avatarEl = document.getElementById('almaAvatar');
    if (avatarEl) {
        const fallback  = getZodiacAvatar(signo);
        avatarEl.src    = profile.avatar_url || fallback;
        avatarEl.onerror = () => { avatarEl.src = fallback; };
    }

    // Hero
    const nameEl = document.getElementById('almaName');
    if (nameEl) nameEl.textContent = profile.nombre_actual || '—';

    const signEl = document.getElementById('almaSign');
    if (signEl) {
        signEl.textContent = signo
            ? `${GLIFO_SIGNO[signo] || ''} ${signo}`
            : '—';
    }

    const elemRowEl = document.getElementById('almaElementRow');
    if (elemRowEl) elemRowEl.textContent = elemText;

    const levelEl = document.getElementById('almaLevel');
    if (levelEl) levelEl.textContent = levelLabel;

    // Módulo de stats
    const statSignEl    = document.getElementById('almaStatSign');
    const statElementEl = document.getElementById('almaStatElement');
    const statLevelEl   = document.getElementById('almaStatLevel');

    if (statSignEl)    statSignEl.textContent    = signo || '—';
    if (statElementEl) statElementEl.textContent = elemText;
    if (statLevelEl)   statLevelEl.textContent   = levelLabel;

    // Botón Iniciar Sintonía — redirige al hilo de mensajes privados
    document.getElementById('btnSintonia')?.addEventListener('click', () => {
        window.location.href = `mensajes.html?with=${profile.id}`;
    });
}

function renderNotFound() {
    const nameEl = document.getElementById('almaName');
    if (nameEl) nameEl.textContent = 'Alma no encontrada';

    const signEl = document.getElementById('almaSign');
    if (signEl) signEl.textContent = 'Esta firma no existe en el Akasha';

    const avatarEl = document.getElementById('almaAvatar');
    if (avatarEl) avatarEl.src = getZodiacAvatar(null);

    document.getElementById('btnSintonia')?.remove();
}
