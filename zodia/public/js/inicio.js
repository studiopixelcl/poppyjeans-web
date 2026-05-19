const API_BASE = 'http://localhost:8787';

/**
 * Genera un SVG Data URL con el glifo zodiacal centrado sobre fondo azul noche.
 * Fallback universal cuando avatar_url está vacío.
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

function clearSessionAndRedirect() {
    localStorage.removeItem('zodia_user');
    localStorage.removeItem('zodia_token');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const activeUserRaw = localStorage.getItem('zodia_user');
    const token         = localStorage.getItem('zodia_token');

    if (!activeUserRaw || !token) {
        clearSessionAndRedirect();
        return;
    }

    const user = JSON.parse(activeUserRaw);

    // ---- Topbar greeting ----
    const topbarHello = document.getElementById('topbarHello');
    if (topbarHello) topbarHello.textContent = `Iniciado · ${user.nombre_actual || 'Alma'}`;

    // ---- Avatar del creador ----
    const avatarFallback   = getZodiacAvatar(user.signo_zodiacal);
    const creatorAvatarEl  = document.getElementById('creatorAvatar');
    if (creatorAvatarEl) {
        creatorAvatarEl.src     = user.avatar_url || avatarFallback;
        creatorAvatarEl.onerror = () => { creatorAvatarEl.src = avatarFallback; };
    }

    // ---- Feed DOM refs ----
    const feedContainer = document.getElementById('feedContainer');
    const postContent   = document.getElementById('postContent');
    const charCount     = document.getElementById('charCount');
    const btnPublish    = document.getElementById('btnPublish');

    postContent.addEventListener('input', () => {
        charCount.textContent = postContent.value.length;
    });

    // =========================================================
    // Construir ítem de comentario (helper puro, sin side-effects)
    // =========================================================
    function renderCommentItem(comment) {
        const fallback    = getZodiacAvatar(comment.commenter_signo);
        const avatarSrc   = comment.commenter_avatar || fallback;
        const profileHref = comment.commenter_user_id
            ? `alma.html?id=${comment.commenter_user_id}` : '#';
        const date        = new Date(comment.created_at).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short',
        });
        return `
            <div class="comment-item">
                <img class="comment-avatar"
                     src="${avatarSrc}"
                     alt=""
                     style="cursor:pointer;"
                     onerror="this.src='${fallback}'"
                     onclick="window.location.href='${profileHref}'">
                <div class="comment-bubble">
                    <span class="comment-author"
                          style="cursor:pointer;"
                          onclick="window.location.href='${profileHref}'"
                    >${comment.commenter_name || 'Alma'}</span>
                    <p class="comment-text">${comment.contenido}</p>
                    <span class="comment-time">${date}</span>
                </div>
            </div>`;
    }

    // =========================================================
    // Enviar comentario con actualización optimista del DOM
    // =========================================================
    async function sendComment(postId, cardEl) {
        const inputEl  = cardEl.querySelector(`#ci-${postId}`);
        const sendBtn  = cardEl.querySelector('.btn-send-comment');
        const listEl   = cardEl.querySelector('.comments-list');
        const counterEl = cardEl.querySelector('.comment-count');
        const text = inputEl.value.trim();
        if (!text) return;

        const prevIcon   = sendBtn.textContent;
        sendBtn.disabled = true;
        sendBtn.textContent = '↻';

        let response;
        try {
            response = await fetch(`${API_BASE}/api/users/posts/${postId}/comment`, {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  'application/json',
                },
                body: JSON.stringify({ contenido: text }),
            });
        } catch (netErr) {
            console.error('[Zodia Comment] Error de red:', netErr);
            alert('Error de conexión. Tu comentario no fue enviado.');
            sendBtn.disabled    = false;
            sendBtn.textContent = prevIcon;
            return;
        }

        if (response.status === 401 || response.status === 403) {
            clearSessionAndRedirect();
            return;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('[Zodia Comment] Error del servidor:', err);
            alert(err.error || 'No se pudo publicar el comentario.');
            sendBtn.disabled    = false;
            sendBtn.textContent = prevIcon;
            return;
        }

        const { comment } = await response.json();

        // Insertar en el DOM inmediatamente
        listEl.insertAdjacentHTML('beforeend', renderCommentItem(comment));
        listEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Actualizar contador del botón
        const prev = parseInt(counterEl.textContent, 10) || 0;
        counterEl.textContent = prev + 1;

        inputEl.value       = '';
        sendBtn.disabled    = false;
        sendBtn.textContent = prevIcon;
    }

    // =========================================================
    // Construir tarjeta de post
    // =========================================================
    function createPostCard(post) {
        const fallback    = getZodiacAvatar(post.signo_zodiacal);
        const avatarSrc   = post.avatar_url || fallback;
        const comentarios = post.comentarios || [];
        const profileHref = `alma.html?id=${post.user_id}`;

        const postDate = new Date(post.created_at).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });

        const card = document.createElement('div');
        card.className = 'post-card animate-fade-up';
        card.innerHTML = `
            <div class="post-header">
                <div class="post-user-info" style="cursor:pointer;" data-profile="${profileHref}">
                    <div class="post-avatar">
                        <img
                            src="${avatarSrc}"
                            alt="Avatar"
                            style="object-fit: cover;"
                            onerror="this.src='${fallback}'">
                    </div>
                    <div>
                        <h4 class="post-author">${post.nombre_actual}</h4>
                        <span class="post-badge">${post.signo_zodiacal || '—'}</span>
                    </div>
                </div>
                <span class="post-time">${postDate}</span>
            </div>
            <div class="post-body">
                <p>${post.contenido}</p>
            </div>
            <div class="post-footer">
                <button class="btn-like" data-id="${post.id}">
                    <span class="like-icon">✨</span>
                    <span class="like-count">${post.likes_count ?? 0}</span>
                </button>
                <button class="btn-comment" data-id="${post.id}" aria-expanded="false">
                    💬 <span class="comment-count">${comentarios.length || ''}</span>
                </button>
            </div>
            <div class="comments-section" id="cs-${post.id}" hidden>
                <div class="comments-list">
                    ${comentarios.map(renderCommentItem).join('')}
                </div>
                <div class="comment-composer">
                    <textarea
                        id="ci-${post.id}"
                        class="comment-input"
                        placeholder="Escribe tu resonancia… (Ctrl+↵)"
                        maxlength="500"
                        rows="2"></textarea>
                    <button class="btn-send-comment" data-post-id="${post.id}">↑</button>
                </div>
            </div>`;

        // Clic en nombre/avatar del autor → Espejo Astral
        card.querySelector('.post-user-info').addEventListener('click', () => {
            window.location.href = profileHref;
        });

        // Like
        card.querySelector('.btn-like').addEventListener('click', function () {
            likePost(post.id, this.querySelector('.like-count'), this);
        });

        // Toggle hilo de comentarios
        const commentsSection = card.querySelector(`#cs-${post.id}`);
        const btnComment      = card.querySelector('.btn-comment');
        btnComment.addEventListener('click', () => {
            const isOpen = !commentsSection.hidden;
            commentsSection.hidden = isOpen;
            btnComment.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) card.querySelector(`#ci-${post.id}`)?.focus();
        });

        // Enviar comentario — botón
        card.querySelector('.btn-send-comment').addEventListener('click', () => {
            sendComment(post.id, card);
        });

        // Enviar comentario — Ctrl+Enter
        card.querySelector(`#ci-${post.id}`).addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendComment(post.id, card);
        });

        return card;
    }

    // =========================================================
    // Cargar Feed desde D1
    // =========================================================
    async function loadFeed() {
        feedContainer.innerHTML = `
            <div class="empty-feed" style="opacity:.5">
                <p>Leyendo el Akasha...</p>
            </div>`;

        let response;
        try {
            response = await fetch(`${API_BASE}/api/users/posts`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (networkErr) {
            console.error('[Zodia Feed] Error de red:', networkErr);
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <p>No se pudo conectar con el Akasha. Verifica tu conexión e intenta de nuevo.</p>
                </div>`;
            return;
        }

        if (response.status === 401 || response.status === 403) {
            console.warn('[Zodia Feed] Sesión inválida o expirada — redirigiendo al login.');
            clearSessionAndRedirect();
            return;
        }

        if (!response.ok) {
            let msg = 'Error al conectar con el Akasha. Intenta de nuevo.';
            try {
                const err = await response.json();
                console.error('[Zodia Feed] Error del servidor:', err);
                if (err.error) msg = err.error;
            } catch (_) {}
            feedContainer.innerHTML = `<div class="empty-feed"><p>${msg}</p></div>`;
            return;
        }

        const data = await response.json();
        feedContainer.innerHTML = '';

        if (!data.posts || data.posts.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <p>El Akasha está en silencio. Sé el primero en proyectar tu energía.</p>
                </div>`;
            return;
        }

        data.posts.forEach(post => feedContainer.appendChild(createPostCard(post)));
    }

    // =========================================================
    // Publicar nueva transmisión
    // =========================================================
    btnPublish.addEventListener('click', async () => {
        const text = postContent.value.trim();
        if (!text) return;

        btnPublish.disabled = true;

        let response;
        try {
            response = await fetch(`${API_BASE}/api/users/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contenido: text }),
            });
        } catch (networkErr) {
            console.error('[Zodia Post] Error de red:', networkErr);
            alert('Error de red. Tu transmisión no fue grabada. Intenta de nuevo.');
            btnPublish.disabled = false;
            return;
        }

        if (response.status === 401 || response.status === 403) {
            clearSessionAndRedirect();
            return;
        }

        if (!response.ok) {
            let msg = 'Error al grabar tu transmisión. Intenta de nuevo.';
            try {
                const err = await response.json();
                console.error('[Zodia Post] Error del servidor:', err);
                if (err.error) msg = err.error;
            } catch (_) {}
            alert(msg);
            btnPublish.disabled = false;
            return;
        }

        postContent.value     = '';
        charCount.textContent = '0';
        btnPublish.disabled   = false;
        await loadFeed();
    });

    // =========================================================
    // Destello (like) con actualización optimista
    // =========================================================
    async function likePost(postId, countEl, button) {
        button.disabled = true;
        const prevCount = parseInt(countEl.textContent, 10) || 0;
        countEl.textContent = prevCount + 1;

        let response;
        try {
            response = await fetch(`${API_BASE}/api/users/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (networkErr) {
            console.error('[Zodia Like] Error de red:', networkErr);
            countEl.textContent = prevCount;
            button.disabled = false;
            return;
        }

        if (response.status === 401 || response.status === 403) {
            clearSessionAndRedirect();
            return;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('[Zodia Like] Error al registrar destello:', err);
            countEl.textContent = prevCount;
        } else {
            const data = await response.json().catch(() => null);
            if (data?.likes_count !== undefined) countEl.textContent = data.likes_count;
        }

        button.disabled = false;
    }

    loadFeed();
});
