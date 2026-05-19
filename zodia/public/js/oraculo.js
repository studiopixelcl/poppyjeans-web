// ============================================================
// ZODIA — Controlador del Oráculo
// ============================================================

// ── Protección de sesión ─────────────────────────────────────
const activeUserRaw = localStorage.getItem('zodia_user');
const token         = localStorage.getItem('zodia_token');

if (!activeUserRaw || !token) {
    localStorage.removeItem('zodia_user');
    localStorage.removeItem('zodia_token');
    window.location.href = 'login.html';
}

const user = (() => {
    try { return JSON.parse(activeUserRaw); }
    catch (e) {
        console.error('[Oráculo] zodia_user corrupto:', e);
        window.location.href = 'login.html';
    }
})();

// ── Avatar por defecto con glifo zodiacal ────────────────────
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

// ── Glifos por signo ─────────────────────────────────────────
const SIGN_GLYPHS = {
    'Aries':       '♈', 'Tauro':      '♉', 'Géminis':    '♊',
    'Cáncer':      '♋', 'Leo':        '♌', 'Virgo':      '♍',
    'Libra':       '♎', 'Escorpio':   '♏', 'Sagitario':  '♐',
    'Capricornio': '♑', 'Acuario':    '♒', 'Piscis':     '♓',
};

// ── Glifos rotativos del héroe (atmosféricos) ─────────────────
const HERO_GLYPHS = ['◈', '⬡', '✦', '⊕', '◬', '⟁', '✺', '⊗', '◎', '⬟'];

// ── 12 mensajes diarios (lenguaje alquímico-psicológico) ──────
const DAILY_MESSAGES = [
    {
        title: 'La Geometría del Caos',
        msg: 'El caos que percibes no es señal de fractura sino la antesala de una nueva geometría interna. La psiquis reorganiza sus capas cuando el ego ha agotado sus mapas antiguos. No interpretes la turbulencia como error: interpreta la ausencia de mapa como una invitación a cartografiar desde adentro.',
    },
    {
        title: 'La Resistencia como Información',
        msg: 'Toda resistencia sostenida es energía bloqueada en busca de forma. El trabajo alquímico de este tránsito consiste en identificar qué fortaleza aparente esconde un miedo sin nombre. La armadura protege, sí. Pero también impide el contacto. Distingue cuál estás usando ahora.',
    },
    {
        title: 'El Plano de la Intersección',
        msg: 'El plano simbólico y el plano material no son paralelos: se intersectan en cada decisión. La conciencia de esa intersección es el verdadero acto alquímico. Lo que llamas "casualidad" es el lenguaje del campo cuando intenta comunicarse con la parte de ti que aún no escucha.',
    },
    {
        title: 'El Cierre Natural de los Ciclos',
        msg: 'Hay ciclos que solo pueden cerrarse cuando dejas de intentar comprenderlos y empiezas a vivirlos hasta su conclusión natural. La mente que cierra el ciclo no es la misma que lo inició. Ese desajuste no es fracaso: es evidencia de transformación real.',
    },
    {
        title: 'La Precisión Pedagógica del Alma',
        msg: 'Las deudas kármicas no son castigos: son áreas de la conciencia que aún no han integrado su propio aprendizaje. La repetición de patrones no es condena; es precisión pedagógica. La salida no está en eludir el patrón sino en atravesarlo con una calidad de presencia distinta.',
    },
    {
        title: 'El Arquetipo en Proceso',
        msg: 'Tu signo solar no describe lo que eres: describe el arquetipo que estás aprendiendo a encarnar. La tensión entre lo que eres ahora y lo que ese arquetipo representa es exactamente el trabajo evolutivo. No hay destino que alcanzar; hay una capacidad de ser que se expande en cada acto consciente.',
    },
    {
        title: 'La Integración de la Sombra',
        msg: 'La sombra no es el enemigo. Es la parte de ti que fue exiliada antes de que pudieras comprenderla. Integrarla no significa justificar sus expresiones, sino reconocerla como propia y dejar de gastar energía en mantenerla invisible. Lo que no se integra se proyecta.',
    },
    {
        title: 'La Estructura bajo la Agitación',
        msg: 'Cuando el entorno genera agitación, la psiquis sabia no busca controlar el entorno: busca identificar qué estructura interna está siendo probada. Esa estructura es el verdadero campo de trabajo. El mundo exterior es el espejo; la práctica consiste en no confundir el espejo con la imagen.',
    },
    {
        title: 'El Potencial como Práctica',
        msg: 'Cada número en tu firma vibracional es una frecuencia que existe en potencia. La diferencia entre el potencial y su actualización es la calidad de conciencia con la que te relacionas contigo mismo. No es el número lo que limita; es el nivel de honestidad con el que lo habitas.',
    },
    {
        title: 'El Tiempo como Campo Activo',
        msg: 'El tiempo no es lineal para el alma. Lo que llamas "pasado no resuelto" es energía presente que aún no ha encontrado su forma de transformación. Hoy es siempre el momento disponible. No para corregir lo que fue, sino para relacionarte con ello de una manera que cambia lo que será.',
    },
    {
        title: 'El Reconocimiento como Maestría',
        msg: 'La maestría no se mide por la ausencia de crisis sino por la velocidad con la que reconoces el patrón que las genera. Cuando el reconocimiento es instantáneo, la crisis pierde su poder de desorientar. Lo que el iniciado llama "caída" el maestro lo llama "dato de alta precisión".',
    },
    {
        title: 'El Espejo Relacional',
        msg: 'Todo lo que activa tu juicio hacia otro ser humano contiene información sobre un aspecto de ti que aún no has integrado. Esto no invalida el juicio, pero lo transforma: de veredicto a mapa. El otro no es la causa de tu perturbación; es la superficie donde esa perturbación se vuelve visible.',
    },
];

// ── 7 focos semanales ────────────────────────────────────────
const WEEKLY_CYCLES = [
    {
        icon: '🜁',
        title: 'Semana de Integración',
        desc: 'El alma digiere lo que la mente aún procesa. Permite que los ciclos recientes sedimenten antes de iniciar nuevos impulsos. La acción prematura en esta fase produce movimiento sin dirección.',
    },
    {
        icon: '☿',
        title: 'Semana de la Comunicación Interna',
        desc: 'El diálogo más determinante no ocurre con el exterior. Observa el lenguaje con el que te hablas a ti mismo en los momentos de presión. Ese tono revela el nivel de autoridad que te concedes.',
    },
    {
        icon: '◧',
        title: 'Semana de la Arquitectura',
        desc: 'Las estructuras que sostienes actualmente —hábitos, relaciones, proyectos— son el reflejo fiel de tu estado de conciencia presente. Identifica con precisión cuáles amplían tu campo y cuáles lo contraen.',
    },
    {
        icon: '🜂',
        title: 'Semana de la Sombra Creativa',
        desc: 'Aquello que has evitado sostener contiene precisamente la energía que necesitas para el próximo umbral. La incomodidad no señala el lugar equivocado: señala la zona de crecimiento real.',
    },
    {
        icon: '⊛',
        title: 'Semana de la Resonancia',
        desc: 'Tu campo vibracional interactúa con los campos de quienes te rodean de manera constante. Observa sin juicio qué tipo de conciencia orbita en tu entorno esta semana. El entorno es la retroalimentación más honesta disponible.',
    },
    {
        icon: '🜄',
        title: 'Semana de la Transmutación',
        desc: 'El material prima está disponible. El trabajo alquímico de este ciclo consiste en convertir la tensión acumulada en claridad de propósito. La presión no es obstáculo; es el catalizador de la forma siguiente.',
    },
    {
        icon: '◈',
        title: 'Semana del Silencio Productivo',
        desc: 'No toda ausencia de movimiento es estancamiento. Hay ciclos donde la acción más poderosa es la de aquietarse y dejar que la inteligencia profunda emerja sin ser forzada. El ruido interno también se puede elegir silenciar.',
    },
];

// ── Motor determinista ────────────────────────────────────────
/**
 * Genera un hash entero a partir de un string.
 * Produce el mismo valor para el mismo input siempre.
 */
function strHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h * 31 + str.charCodeAt(i), 1) | 0;
    }
    return Math.abs(h);
}

/**
 * Índice diario: cambia cada día UTC, es consistente por signo.
 */
function dailyIndex(signo, dateStr, len) {
    return strHash(signo + '||' + dateStr) % len;
}

/**
 * Número de semana ISO del año (1–53).
 */
function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Índice semanal: cambia cada semana ISO, es consistente por signo.
 */
function weeklyIndex(signo, date, len) {
    const week = isoWeekNumber(date);
    const year = date.getUTCFullYear();
    return strHash(signo + '||' + year + '-W' + week) % len;
}

// ── Acordeón del Códice ───────────────────────────────────────
function initCodex() {
    document.querySelectorAll('.codex-item').forEach(item => {
        const btn  = item.querySelector('.codex-btn');
        const body = item.querySelector('.codex-body');

        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Cierra todos antes de abrir el nuevo
            document.querySelectorAll('.codex-item.open').forEach(other => {
                other.classList.remove('open');
                other.querySelector('.codex-btn').setAttribute('aria-expanded', 'false');
            });

            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Topbar
    const topbarHello = document.getElementById('topbarHello');
    if (topbarHello) topbarHello.textContent = `${user.nombre_actual || 'Alma'}`;

    const now     = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const signo   = user.signo_zodiacal || 'Aries';

    // ── Tránsito Diario ──────────────────────────────────────
    const dIdx    = dailyIndex(signo, dateStr, DAILY_MESSAGES.length);
    const gIdx    = dailyIndex(signo + 'glyph', dateStr, HERO_GLYPHS.length);
    const transit = DAILY_MESSAGES[dIdx];

    document.getElementById('oracleGlyph').textContent  = HERO_GLYPHS[gIdx];
    document.getElementById('oracleDate').textContent   = now.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
    });
    document.getElementById('oracleTitle').textContent  = transit.title;
    document.getElementById('oracleMsg').textContent    = transit.msg;

    const glyph = SIGN_GLYPHS[signo] || '★';
    document.getElementById('oracleSignGlyph').textContent = glyph;
    document.getElementById('oracleSignName').textContent  = `Mensaje para ${signo}`;

    // ── Ciclo Semanal ────────────────────────────────────────
    const wIdx  = weeklyIndex(signo, now, WEEKLY_CYCLES.length);
    const cycle = WEEKLY_CYCLES[wIdx];

    document.getElementById('weekIcon').textContent  = cycle.icon;
    document.getElementById('weekTitle').textContent = cycle.title;
    document.getElementById('weekDesc').textContent  = cycle.desc;

    // ── Acordeón Códice ──────────────────────────────────────
    initCodex();
});
