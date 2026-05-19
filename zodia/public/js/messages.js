// ============================================================
// ZODIA — Hilos del Destino · Mensajería Privada
// ============================================================

const API_BASE = 'http://127.0.0.1:8787';

// ── Estado global del módulo ─────────────────────────────────
let currentUser   = null;
let token         = null;
let activeBuddyId = null;
let inboxData     = [];

// ── Utilidades ────────────────────────────────────────────────
function clearSessionAndRedirect() {
    localStorage.removeItem('zodia_user');
    localStorage.removeItem('zodia_token');
    window.location.href = 'login.html';
}

/**
 * SVG Data URL con el glifo zodiacal centrado sobre fondo azul noche.
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

/**
 * Tiempo relativo compacto para los timestamps.
 */
function formatTime(dateStr) {
    const d    = new Date(dateStr);
    const diff = Date.now() - d.getTime();

    if (diff < 60_000)        return 'ahora';
    if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000)    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

    // ── Validar sesión ────────────────────────────────────────
    const userRaw = localStorage.getItem('zodia_user');
    token         = localStorage.getItem('zodia_token');

    if (!userRaw || !token) { clearSessionAndRedirect(); return; }

    try { currentUser = JSON.parse(userRaw); }
    catch (e) { console.error('[Messages] zodia_user corrupto:', e); clearSessionAndRedirect(); return; }

    const topbarHello = document.getElementById('topbarHello');
    if (topbarHello) topbarHello.textContent = currentUser.nombre_actual || 'Alma';

    // ── Leer parámetro ?with= ─────────────────────────────────
    const withId = new URLSearchParams(window.location.search).get('with');

    // ── Cargar bandeja ────────────────────────────────────────
    await loadInbox();

    // ── Auto-abrir chat si viene de alma.html ─────────────────
    if (withId) await openChat(withId);

    // ── Enviar mensaje: botón y Ctrl+Enter ────────────────────
    document.getElementById('btnSendMessage').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
        // Enter envía · Shift+Enter inserta salto de línea
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ── Volver a la bandeja (móvil) ───────────────────────────
    document.getElementById('btnBackToInbox').addEventListener('click', () => {
        document.getElementById('messagesLayout').classList.remove('chat-active');
        activeBuddyId = null;
    });
});

// ============================================================
// BANDEJA DE ENTRADA
// ============================================================
async function loadInbox() {
    const listEl = document.getElementById('inboxList');

    let response;
    try {
        response = await fetch(`${API_BASE}/api/users/messages/inbox`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
    } catch (netErr) {
        console.error('[Messages] Error de red (inbox):', netErr);
        listEl.innerHTML = '';
        const p = document.createElement('p');
        p.className   = 'inbox-empty';
        p.textContent = 'No se pudo conectar con el Akasha.';
        listEl.appendChild(p);
        return;
    }

    if (response.status === 401 || response.status === 403) {
        clearSessionAndRedirect(); return;
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[Messages] Error del servidor (inbox):', err);
        return;
    }

    const data = await response.json();
    inboxData   = data.inbox || [];

    listEl.innerHTML = '';

    if (inboxData.length === 0) {
        const p = document.createElement('p');
        p.className   = 'inbox-empty';
        p.textContent = 'Aún no tienes conversaciones activas. Inicia una desde el Espejo Astral.';
        listEl.appendChild(p);
        return;
    }

    inboxData.forEach(conv => listEl.appendChild(renderInboxItem(conv)));
}

function renderInboxItem(conv) {
    const fallback  = getZodiacAvatar(conv.buddy_signo);
    const avatarSrc = conv.buddy_avatar || fallback;
    const isActive  = conv.buddy_id === activeBuddyId;

    const item = document.createElement('div');
    item.className        = `inbox-item${isActive ? ' active' : ''}`;
    item.dataset.buddyId  = conv.buddy_id;

    // Avatar — XSS-safe: src/onerror solo reciben URLs
    const img       = document.createElement('img');
    img.className   = 'inbox-avatar';
    img.src         = avatarSrc;
    img.alt         = '';
    img.style.objectFit = 'cover';
    img.onerror     = () => { img.src = fallback; };

    // Info: nombre + preview
    const info = document.createElement('div');
    info.className = 'inbox-info';

    const name     = document.createElement('span');
    name.className   = 'inbox-name';
    name.textContent = conv.buddy_name || 'Alma';   // XSS-safe

    const preview  = document.createElement('span');
    preview.className   = 'inbox-preview';
    const prefix        = conv.sender_id === currentUser.id ? 'Tú: ' : '';
    preview.textContent = prefix + (conv.contenido || ''); // XSS-safe

    info.appendChild(name);
    info.appendChild(preview);

    // Timestamp
    const time     = document.createElement('span');
    time.className   = 'inbox-time';
    time.textContent = formatTime(conv.created_at);

    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(time);

    item.addEventListener('click', () => openChat(conv.buddy_id));

    return item;
}

// ============================================================
// CHAT ACTIVO
// ============================================================
async function openChat(buddyId) {
    activeBuddyId = buddyId;

    // Marcar ítem como activo en la lista
    document.querySelectorAll('.inbox-item').forEach(el => {
        el.classList.toggle('active', el.dataset.buddyId === buddyId);
    });

    // Mostrar chat en móvil
    document.getElementById('messagesLayout').classList.add('chat-active');

    // Obtener datos del contacto (desde inbox o fetch fresco para nuevas sintonías)
    let buddy = inboxData.find(c => c.buddy_id === buddyId);

    if (!buddy) {
        // Primera vez — nueva conversación desde alma.html
        try {
            const res = await fetch(`${API_BASE}/api/users/profile/${buddyId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) { clearSessionAndRedirect(); return; }
            if (res.ok) {
                const { profile } = await res.json();
                buddy = {
                    buddy_id:     profile.id,
                    buddy_name:   profile.nombre_actual,
                    buddy_avatar: profile.avatar_url || '',
                    buddy_signo:  profile.signo_zodiacal || '',
                };
            }
        } catch (netErr) {
            console.error('[Messages] No se pudo cargar el perfil del contacto:', netErr);
        }
    }

    if (buddy) renderChatHeader(buddy);

    // Mostrar controles
    document.getElementById('chatHeader').hidden   = false;
    document.getElementById('chatComposer').hidden = false;
    document.getElementById('chatEmpty').style.display = 'none';

    // Cargar historial
    await loadHistory(buddyId);

    document.getElementById('chatInput').focus();
}

function renderChatHeader(buddy) {
    const fallback = getZodiacAvatar(buddy.buddy_signo);
    const avatarEl = document.getElementById('chatBuddyAvatar');
    avatarEl.src     = buddy.buddy_avatar || fallback;
    avatarEl.onerror = () => { avatarEl.src = fallback; };

    // XSS-safe
    document.getElementById('chatBuddyName').textContent = buddy.buddy_name || 'Alma';
    document.getElementById('chatBuddySign').textContent = buddy.buddy_signo || '';
}

async function loadHistory(buddyId) {
    const msgsEl = document.getElementById('chatMessages');

    // Limpiar mensajes anteriores (mantener empty-state oculto)
    Array.from(msgsEl.children).forEach(el => {
        if (!el.id || el.id !== 'chatEmpty') el.remove();
    });

    let response;
    try {
        response = await fetch(`${API_BASE}/api/users/messages/history/${buddyId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
    } catch (netErr) {
        console.error('[Messages] Error de red (history):', netErr);
        const p = document.createElement('p');
        p.className   = 'chat-status-msg';
        p.textContent = 'Error de conexión. Verifica tu red.';
        msgsEl.appendChild(p);
        return;
    }

    if (response.status === 401 || response.status === 403) {
        clearSessionAndRedirect(); return;
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[Messages] Error del servidor (history):', err);
        return;
    }

    const { messages = [] } = await response.json();

    if (messages.length === 0) {
        const p = document.createElement('p');
        p.className   = 'chat-status-msg';
        p.textContent = 'Ningún mensaje aún. Inicia la sintonía.';
        msgsEl.appendChild(p);
    } else {
        messages.forEach(msg => appendMessage(msg, false));
    }

    scrollToBottom();
}

/**
 * Añade una burbuja de mensaje al área de chat.
 * Usa textContent exclusivamente para prevenir XSS.
 */
function appendMessage(msg, scroll = true) {
    const msgsEl = document.getElementById('chatMessages');
    const isOwn  = msg.sender_id === currentUser.id;

    const row    = document.createElement('div');
    row.className = `msg-row ${isOwn ? 'outgoing' : 'incoming'}`;

    const bubble  = document.createElement('div');
    bubble.className = `msg-bubble ${isOwn ? 'outgoing' : 'incoming'}`;

    const text    = document.createElement('p');
    text.className   = 'msg-text';
    text.textContent = msg.contenido; // ← XSS-safe: textContent, nunca innerHTML

    const time    = document.createElement('span');
    time.className   = 'msg-time';
    time.textContent = formatTime(msg.created_at);

    bubble.appendChild(text);
    bubble.appendChild(time);
    row.appendChild(bubble);
    msgsEl.appendChild(row);

    if (scroll) scrollToBottom();
}

function scrollToBottom() {
    const el = document.getElementById('chatMessages');
    el.scrollTop = el.scrollHeight;
}

// ============================================================
// ENVIAR MENSAJE
// ============================================================
async function sendMessage() {
    if (!activeBuddyId) return;

    const inputEl  = document.getElementById('chatInput');
    const sendBtn  = document.getElementById('btnSendMessage');
    const text     = inputEl.value.trim();
    if (!text) return;

    // ── Actualización optimista ───────────────────────────────
    const tempMsg = {
        id:          `temp-${Date.now()}`,
        sender_id:   currentUser.id,
        receiver_id: activeBuddyId,
        contenido:   text,
        created_at:  new Date().toISOString(),
    };
    appendMessage(tempMsg);

    const prevVal       = inputEl.value;
    inputEl.value       = '';
    sendBtn.disabled    = true;

    // ── Fetch ─────────────────────────────────────────────────
    let response;
    try {
        response = await fetch(`${API_BASE}/api/users/messages`, {
            method:  'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({ receiver_id: activeBuddyId, contenido: text }),
        });
    } catch (netErr) {
        console.error('[Messages] Error de red (send):', netErr);
        // Revertir actualización optimista
        document.getElementById('chatMessages').lastElementChild?.remove();
        inputEl.value    = prevVal;
        sendBtn.disabled = false;
        alert('Error de conexión. Tu mensaje no fue enviado.');
        return;
    }

    if (response.status === 401 || response.status === 403) {
        clearSessionAndRedirect(); return;
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[Messages] Error del servidor (send):', err);
        document.getElementById('chatMessages').lastElementChild?.remove();
        inputEl.value    = prevVal;
        sendBtn.disabled = false;
        alert(err.error || 'No se pudo enviar el mensaje.');
        return;
    }

    // Éxito — burbuja optimista permanece
    sendBtn.disabled = false;

    // Actualizar preview en la bandeja sin recargar
    const inboxItem = document.querySelector(`.inbox-item[data-buddy-id="${activeBuddyId}"]`);
    if (inboxItem) {
        const previewEl = inboxItem.querySelector('.inbox-preview');
        const timeEl    = inboxItem.querySelector('.inbox-time');
        if (previewEl) previewEl.textContent = 'Tú: ' + text; // XSS-safe
        if (timeEl)    timeEl.textContent    = 'ahora';
    }
}
