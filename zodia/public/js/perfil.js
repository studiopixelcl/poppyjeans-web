// ============================================================
// ZODIA — El Santuario · Códice Interactivo
// ============================================================

// ── Utilidades de sesión ──────────────────────────────────────
/**
 * Genera un SVG Data URL con el glifo zodiacal como avatar por defecto.
 * Reemplaza UI-Avatars cuando avatar_url está vacío.
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

const KARMA_LABELS = {
    13: 'Karma de la Pereza',
    14: 'Karma de los Excesos',
    16: 'Karma del Ego',
    19: 'Karma del Poder',
};

// ============================================================
// CÓDICE — Diccionarios de significados
// ============================================================

const GLIFO_NUMERO = {
    1:'①', 2:'②', 3:'③', 4:'④', 5:'⑤', 6:'⑥', 7:'⑦', 8:'⑧', 9:'⑨',
    11:'⑪', 22:'⑫', 33:'㉝',
};
const GLIFO_SIGNO = {
    'Aries':'♈','Tauro':'♉','Géminis':'♊','Cáncer':'♋',
    'Leo':'♌','Virgo':'♍','Libra':'♎','Escorpio':'♏',
    'Sagitario':'♐','Capricornio':'♑','Acuario':'♒','Piscis':'♓',
};
const GLIFO_ELEMENTO = { Fuego:'🜂', Tierra:'🜃', Aire:'🜁', Agua:'🜄' };
const GLIFO_KARMA = { 13:'☯', 14:'☯', 16:'☯', 19:'☯' };

// ── Signos Zodiacales ─────────────────────────────────────────
const CODICE_SIGNOS = {
    'Aries': {
        title: 'Aries',
        body: `<strong>El Arquetipo del Pionero.</strong> Aries no describe lo que eres: describe la cualidad de voluntad que estás aprendiendo a sostener sin destruir lo que construyes. La energía iniciática de este signo es poderosa, pero su sombra radica en confundir la impulsividad con la valentía. El trabajo evolutivo consiste en desarrollar la <strong>capacidad de comenzar con conciencia</strong>, no solo con fuego. Cuando el ego de Aries se integra, emerge un liderazgo que inspira en lugar de imponer.`,
    },
    'Tauro': {
        title: 'Tauro',
        body: `<strong>El Arquetipo del Manifestador.</strong> Tauro opera en el plano de la <strong>densificación</strong>: su función es dar forma material a lo intangible. La sombra aparece cuando la seguridad se confunde con la posesión, y la estabilidad con la resistencia al cambio. El aprendizaje de fondo es que la verdadera abundancia no se acumula: se circula. Cuando Tauro madura, desarrolla una relación soberana con la materia: la usa sin ser usado por ella.`,
    },
    'Géminis': {
        title: 'Géminis',
        body: `<strong>El Arquetipo del Sintetizador.</strong> Géminis encarna la polaridad mental: la capacidad de sostener dos perspectivas simultáneamente sin colapsar en ninguna. La sombra es la <strong>dispersión</strong>: cuando la mente ágil se convierte en superficialidad, y la curiosidad en evasión del compromiso. El trabajo evolutivo es desarrollar la síntesis: no la elección entre los dos polos, sino la destilación de una verdad que contiene a ambos.`,
    },
    'Cáncer': {
        title: 'Cáncer',
        body: `<strong>El Arquetipo del Guardián de la Memoria.</strong> Cáncer porta la inteligencia emocional del linaje: los patrones aprendidos en la familia de origen que operan como una programación inconsciente. La sombra es la <strong>fusión emocional</strong>: cuidar desde el miedo, no desde la presencia. El trabajo evolutivo consiste en distinguir la nutrición auténtica de la codependencia, y desarrollar la capacidad de <strong>pertenecer sin perderse</strong>.`,
    },
    'Leo': {
        title: 'Leo',
        body: `<strong>El Arquetipo de la Expresión Soberana.</strong> Leo aprende que la verdadera dignidad no necesita audiencia. La búsqueda de reconocimiento exterior es, en su raíz, una pregunta sobre el <strong>propio valor</strong>. La sombra aparece cuando la creatividad se convierte en actuación para la validación ajena. El trabajo es desarrollar una fuente interna de autoridad: crear porque la expresión es inherentemente sagrada, no porque el aplauso la confirme.`,
    },
    'Virgo': {
        title: 'Virgo',
        body: `<strong>El Arquetipo del Artesano de la Conciencia.</strong> Virgo opera con la precisión del análisis aplicado al servicio. Su sombra es el <strong>perfeccionismo como forma de control</strong>: la crítica interiorizada que paraliza la acción antes de que pueda producir algo imperfecto. El trabajo evolutivo consiste en distinguir el discernimiento (que libera) de la autocrítica (que limita), y entender que el servicio más profundo surge desde la plenitud, no desde la deuda.`,
    },
    'Libra': {
        title: 'Libra',
        body: `<strong>El Arquetipo del Armonizador.</strong> Libra porta la conciencia relacional: la percepción aguda del otro como espejo. Su sombra reside en la <strong>dependencia del equilibrio externo</strong> para sostener el interno, lo que produce indecisión crónica y la necesidad de aprobación. El trabajo evolutivo es desarrollar un centro de gravedad propio: la capacidad de mantener la armonía <strong>desde adentro hacia afuera</strong>, no al revés.`,
    },
    'Escorpio': {
        title: 'Escorpio',
        body: `<strong>El Arquetipo del Alquimista de las Sombras.</strong> Escorpio opera en la profundidad donde los demás no miran. Su función es la <strong>transmutación</strong>: convertir lo que fue herida en poder, lo que fue trauma en comprensión. La sombra aparece cuando el control emocional se convierte en manipulación, o cuando la intensidad se vuelve destructiva. Cuando Escorpio integra su sombra, emerge una capacidad de regeneración extraordinaria que puede guiar a otros a través de sus propias oscuridades.`,
    },
    'Sagitario': {
        title: 'Sagitario',
        body: `<strong>El Arquetipo del Explorador de Significado.</strong> Sagitario busca la verdad que da coherencia a la experiencia. Su sombra es el <strong>dogmatismo disfrazado de libertad</strong>: la certeza que cierra el proceso de búsqueda antes de que pueda profundizar. El trabajo evolutivo es mantener la pregunta viva incluso cuando se ha encontrado una respuesta, y desarrollar la capacidad de sostener una filosofía sin usarla como escudo contra la vulnerabilidad.`,
    },
    'Capricornio': {
        title: 'Capricornio',
        body: `<strong>El Arquetipo del Constructor de Estructuras.</strong> Capricornio porta la conciencia de la <strong>responsabilidad sobre el tiempo</strong>: la comprensión de que la autoridad auténtica se construye, no se reclama. Su sombra aparece cuando la ambición se desconecta de los valores, o cuando el logro se convierte en el único idioma disponible para el amor propio. El trabajo evolutivo es construir estructuras que sirvan a la vida, no estructuras que la contengan.`,
    },
    'Acuario': {
        title: 'Acuario',
        body: `<strong>El Arquetipo del Visionario Colectivo.</strong> Acuario opera desde una conciencia que percibe el sistema antes que el individuo. Su sombra es la <strong>desconexión emocional disfrazada de objetividad</strong>: la racionalización que evita el contacto íntimo bajo la premisa del bien común. El trabajo evolutivo es aprender que la revolución más radical comienza en la capacidad de estar completamente presente con otro ser humano, sin teorías de por medio.`,
    },
    'Piscis': {
        title: 'Piscis',
        body: `<strong>El Arquetipo de la Disolución y la Compasión Universal.</strong> Piscis porta la porosidad extrema: la capacidad de sentir más allá de sus propios límites. Su sombra es la <strong>evasión de la realidad material</strong> como forma de evitar el dolor de la encarnación. El trabajo evolutivo es desarrollar la capacidad de contener la profundidad sin perderse en ella, y descubrir que la compasión más poderosa no requiere la disolución del ser: requiere su presencia plena.`,
    },
};

// ── Elementos ─────────────────────────────────────────────────
const CODICE_ELEMENTOS = {
    'Fuego': {
        title: 'Elemento Fuego',
        body: `El <strong>Fuego</strong> es el elemento de la voluntad, la iniciación y la chispa creadora. Los signos de fuego operan desde el <strong>impulso hacia el ser</strong>: necesitan expresarse, liderar y encender posibilidades. Su sombra es el agotamiento del propio combustible cuando la acción no se nutre de un centro sólido. El trabajo evolutivo del Fuego es aprender a sostener la llama sin quemarla, desarrollando la capacidad de actuar desde la visión y no solo desde el impulso.`,
    },
    'Tierra': {
        title: 'Elemento Tierra',
        body: `La <strong>Tierra</strong> es el elemento de la manifestación, la forma y la presencia en el cuerpo físico. Los signos de tierra operan desde la <strong>inteligencia del material</strong>: saben que lo invisible solo tiene valor cuando puede ser aterrizado en algo concreto. Su sombra es el apego a la forma como sustituto de la seguridad interna. El trabajo evolutivo de la Tierra es distinguir la estabilidad auténtica del control, y aprender que toda estructura, por sólida que sea, es eventualmente compostada.`,
    },
    'Aire': {
        title: 'Elemento Aire',
        body: `El <strong>Aire</strong> es el elemento de la mente, la conexión y el intercambio de información. Los signos de aire operan desde la <strong>capacidad de relacionar ideas y perspectivas</strong>, encontrando patrones donde otros ven caos. Su sombra es la hiperintelectualización como evasión de la experiencia directa. El trabajo evolutivo del Aire es descender de la mente al cuerpo: integrar la inteligencia conceptual con la sabiduría somática, y aprender que no todo puede —ni debe— ser comprendido antes de ser vivido.`,
    },
    'Agua': {
        title: 'Elemento Agua',
        body: `El <strong>Agua</strong> es el elemento de la emoción, la memoria y la permeabilidad al campo invisible. Los signos de agua operan desde la <strong>inteligencia emocional</strong>: sienten las corrientes subtiles que otros no perciben. Su sombra es la absorción sin filtro del entorno emocional ajeno, lo que produce confusión entre lo propio y lo prestado. El trabajo evolutivo del Agua es desarrollar contenedores sólidos sin bloquear el flujo: la capacidad de sentir profundamente sin ser arrastrado.`,
    },
};

// ── Números del 1 al 9 y Maestros ────────────────────────────
const CODICE_NUMEROS = {
    1: {
        title: 'Número 1',
        body: `El <strong>1</strong> es la frecuencia de la individuación y la iniciativa soberana. Quien porta este número como eje central está aprendiendo a <strong>actuar desde su propio centro</strong> sin necesitar el permiso o la validación de los otros para hacerlo. La sombra del 1 es la arrogancia que surge cuando la independencia se convierte en aislamiento. El trabajo evolutivo es desarrollar el liderazgo que nace de la autoridad interna genuina, no de la necesidad de diferenciarse del grupo.`,
    },
    2: {
        title: 'Número 2',
        body: `El <strong>2</strong> es la frecuencia de la dualidad, la cooperación y la sensibilidad relacional. Quien porta este número está aprendiendo que <strong>la rendición no es derrota</strong>: hay una forma de fuerza que opera a través de la receptividad, la diplomacia y la escucha activa. La sombra del 2 es la codependencia: la dificultad de existir sin el otro como espejo validador. El trabajo evolutivo es desarrollar la capacidad de colaborar desde la plenitud, no desde el vacío.`,
    },
    3: {
        title: 'Número 3',
        body: `El <strong>3</strong> es la frecuencia de la expresión creativa y la alegría como estado de conciencia. Quien porta este número está aprendiendo que <strong>la creatividad no es un lujo</strong> sino un imperativo del alma. La sombra del 3 es la dispersión: el potencial creativo que se fragmenta en múltiples direcciones sin consolidarse en ninguna. El trabajo evolutivo es aprender a profundizar: elegir una forma de expresión y habitarla con suficiente compromiso como para que la obra trascienda lo superficial.`,
    },
    4: {
        title: 'Número 4',
        body: `El <strong>4</strong> es la frecuencia de la estructura, la disciplina y la construcción sostenida. Quien porta este número está aprendiendo que <strong>la limitación no es el enemigo de la libertad</strong>: es su condición. Solo lo que tiene forma puede transformarse. La sombra del 4 es la rigidez: la estructura que originalmente era herramienta se convierte en prisión. El trabajo evolutivo es construir sistemas que sirvan a la vida, y tener la flexibilidad de reconstruirlos cuando ya no lo hacen.`,
    },
    5: {
        title: 'Número 5',
        body: `El <strong>5</strong> es la frecuencia de la libertad, el cambio y la experiencia directa como fuente de conocimiento. Quien porta este número está aprendiendo que <strong>la verdadera libertad no es la ausencia de compromiso</strong> sino la capacidad de comprometerse sin perder la esencia. La sombra del 5 es la inquietud crónica: el miedo al estancamiento que produce movimiento sin dirección. El trabajo evolutivo es distinguir la exploración que expande del escapismo que evita el trabajo de fondo.`,
    },
    6: {
        title: 'Número 6',
        body: `El <strong>6</strong> es la frecuencia de la responsabilidad, la armonía y el amor como elección consciente. Quien porta este número está aprendiendo que <strong>el cuidado auténtico no es sacrificio</strong>: es presencia. La sombra del 6 es el perfeccionismo relacional: la necesidad de que el entorno (personas, espacios, situaciones) refleje un ideal interior de orden y belleza. El trabajo evolutivo es aceptar la imperfección como parte inherente de cualquier proceso vivo, incluyendo el propio.`,
    },
    7: {
        title: 'Número 7',
        body: `El <strong>7</strong> es la frecuencia de la introspección, el análisis y la búsqueda de verdad no mediada. Quien porta este número está aprendiendo que el conocimiento más importante <strong>no puede ser transferido</strong>: debe ser destilado en soledad, a través de la experiencia directa. La sombra del 7 es el aislamiento como estrategia de protección, y la desconfianza hacia todo lo que no puede ser probado lógicamente. El trabajo evolutivo es aprender a integrar la sabiduría racional con la inteligencia del corazón.`,
    },
    8: {
        title: 'Número 8',
        body: `El <strong>8</strong> es la frecuencia del poder material, la autoridad y el karma del plano físico. Quien porta este número está aprendiendo que <strong>el poder sin ética genera exactamente el ciclo que intenta controlar</strong>. La sombra del 8 es el abuso de la posición y la confusión entre el valor humano y el valor económico. El trabajo evolutivo es desarrollar una relación madura con el poder: usarlo como herramienta de servicio, no como sustituto de la propia inseguridad.`,
    },
    9: {
        title: 'Número 9',
        body: `El <strong>9</strong> es la frecuencia de la completitud, la compasión universal y el arte de soltar. Quien porta este número está en el umbral del fin de un gran ciclo, aprendiendo que <strong>la sabiduría más alta es la capacidad de desprenderse</strong> sin volverse insensible. La sombra del 9 es el martirio: la tendencia a sacrificarse por el otro desde el agotamiento, confundiendo la renuncia con la nobleza. El trabajo evolutivo es aprender a servir desde la abundancia y a cerrar ciclos desde la gratitud, no desde la huida.`,
    },
    11: {
        title: 'Número Maestro 11',
        body: `El <strong>11</strong> es el primer número maestro: la frecuencia del canal intuitivo, la visión elevada y la sensibilidad extrema como don y como desafío. El 11 no reduce porque opera en un registro vibratorio que trasciende el ciclo ordinario. Su portador está aprendiendo a <strong>sostener la percepción del campo sutil sin ser desestabilizado por él</strong>. La sombra es la ansiedad crónica, el nerviosismo y la sobreestimulación sensorial. El trabajo evolutivo es desarrollar estructuras internas que permitan anclar la visión en acción concreta.`,
    },
    22: {
        title: 'Número Maestro 22',
        body: `El <strong>22</strong> es el maestro constructor: la frecuencia que puede hacer visible lo que antes solo existía en el plano de la idea. Su portador tiene la capacidad de <strong>materializar visiones que otros consideran imposibles</strong>, pero también carga el peso de una responsabilidad proporcional a esa capacidad. La sombra del 22 es el temor al fracaso que paraliza la iniciación, o la megalomanía que pierde contacto con la realidad operativa. El trabajo evolutivo es actuar desde la humildad del artesano que sirve a la obra, no del ego que desea ser reconocido por ella.`,
    },
    33: {
        title: 'Número Maestro 33',
        body: `El <strong>33</strong> es el maestro de la compasión consciente: la frecuencia del servicio sagrado, la enseñanza desde la experiencia vivida y el amor como práctica espiritual activa. Es el número maestro más raro, y su activación completa es infrecuente antes de la madurez profunda. Su sombra es el <strong>sacrificio no integrado</strong>: la tendencia a dar hasta el agotamiento bajo la creencia de que ese es el precio de la espiritualidad. El trabajo evolutivo es descubrir que la compasión más poderosa no disuelve al ser que la practica: lo expande.`,
    },
};

// ── Deudas Kármicas ───────────────────────────────────────────
const CODICE_KARMA = {
    13: {
        title: 'Deuda 13 · Karma de la Pereza',
        body: `La <strong>Deuda 13</strong> indica que en ciclos anteriores de aprendizaje, el alma eludió el esfuerzo sostenido, buscando resultados sin el proceso que los fundamenta. En esta encarnación, la firma porta la <strong>necesidad de construir con disciplina y constancia</strong>, especialmente en las áreas donde la tentación de tomar atajos es más fuerte. La resistencia al trabajo arduo no es pereza natural: es el eco de un patrón antiguo que busca ser transformado. Cuando la Deuda 13 se integra conscientemente, emerge una capacidad de manifestación profunda y duradera.`,
    },
    14: {
        title: 'Deuda 14 · Karma de los Excesos',
        body: `La <strong>Deuda 14</strong> señala ciclos anteriores donde la libertad fue usada sin discernimiento: el abuso de placeres, sustancias, poder o experiencias sensoriales dejó patrones de dependencia que el alma ahora trae consigo para ser resueltos. El aprendizaje central es la <strong>templanza como forma de soberanía</strong>: no la negación del placer, sino la capacidad de elegir cuándo participar y cuándo detenerse. Cuando la Deuda 14 se trabaja, produce una libertad genuina que no requiere exceso para validarse.`,
    },
    16: {
        title: 'Deuda 16 · Karma del Ego',
        body: `La <strong>Deuda 16</strong> es la más arquetípicamente compleja: representa las caídas espirituales producidas por el orgullo, la arrogancia y la construcción de identidades que excluyen la vulnerabilidad. En esta encarnación, las estructuras que el ego construye tienden a colapsar de manera inesperada, no como castigo, sino como <strong>mecanismo de liberación</strong>. El trabajo evolutivo es aprender a construir sobre cimientos de humildad auténtica. Cuando la Deuda 16 se integra, produce una profundidad espiritual que solo puede nacer de haber atravesado la ruina del ego.`,
    },
    19: {
        title: 'Deuda 19 · Karma del Poder',
        body: `La <strong>Deuda 19</strong> indica ciclos anteriores marcados por el uso del poder en beneficio exclusivamente personal, el dominio sobre otros o la negativa a reconocer la interdependencia. En esta encarnación, la lección es aprender que <strong>la verdadera autoridad se ejerce en servicio</strong>, no en dominación. La tendencia a resolver los desafíos desde el aislamiento o la autosuficiencia extrema es la expresión moderna de esta deuda. Cuando la Deuda 19 se trabaja conscientemente, emerge una forma de liderazgo compasivo y profundamente transformador.`,
    },
};

// ============================================================
// SISTEMA MODAL
// ============================================================
let modalOverlay, modalGlyph, modalLabel, modalTitle, modalBody;

function initModal() {
    modalOverlay = document.getElementById('zodiaModalOverlay');
    modalGlyph   = document.getElementById('modalGlyph');
    modalLabel   = document.getElementById('modalLabel');
    modalTitle   = document.getElementById('modalTitle');
    modalBody    = document.getElementById('modalBody');

    document.getElementById('modalClose').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(glyph, label, title, bodyHtml) {
    modalGlyph.textContent  = glyph;
    modalLabel.textContent  = label;
    modalTitle.textContent  = title;
    modalBody.innerHTML     = bodyHtml;
    modalOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
}

// ── Enlaza los .codex-trigger al modal correcto ───────────────
function bindTriggers(user) {
    document.querySelectorAll('.codex-trigger').forEach(el => {
        el.addEventListener('click', () => {
            const type  = el.dataset.codexType;
            const label = el.dataset.codexLabel || '';
            const key   = el.dataset.codexKey;  // seteado en render

            if (!key) return;

            if (type === 'signo') {
                const entry = CODICE_SIGNOS[key];
                if (entry) openModal(GLIFO_SIGNO[key] || '★', label, entry.title, entry.body);

            } else if (type === 'elemento') {
                // key puede ser "Fuego 🔥" — extraemos solo la palabra
                const elem  = key.split(' ')[0];
                const entry = CODICE_ELEMENTOS[elem];
                if (entry) openModal(GLIFO_ELEMENTO[elem] || '◈', label, entry.title, entry.body);

            } else if (type === 'numero') {
                const num   = parseInt(key, 10);
                const entry = CODICE_NUMEROS[num];
                if (entry) openModal(GLIFO_NUMERO[num] || '◈', label, entry.title, entry.body);

            } else if (type === 'karma') {
                const num   = parseInt(key, 10);
                const entry = CODICE_KARMA[num];
                if (entry) openModal(GLIFO_KARMA[num] || '☯', 'Deuda Kármica', entry.title, entry.body);
            }
        });
    });
}

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const activeUserRaw = localStorage.getItem('zodia_user');
    const token         = localStorage.getItem('zodia_token');

    if (!activeUserRaw || !token) { clearSessionAndRedirect(); return; }

    let user;
    try { user = JSON.parse(activeUserRaw); }
    catch (e) { console.error('[Santuario] zodia_user corrupto:', e); clearSessionAndRedirect(); return; }

    initModal();
    renderHero(user);
    renderAstrologia(user);
    renderNumerologia(user);
    renderKarma(user);
    bindTriggers(user);

    document.getElementById('btnSignOut')?.addEventListener('click', clearSessionAndRedirect);
});

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderHero(user) {
    const fallback = getZodiacAvatar(user.signo_zodiacal);
    const avatarEl = document.getElementById('userAvatar');
    if (avatarEl) {
        avatarEl.src = user.avatar_url || fallback;
        avatarEl.onerror = () => { avatarEl.src = fallback; };
    }
    document.getElementById('userName').textContent   = user.nombre_actual || 'Iniciado';
    document.getElementById('userZodiac').textContent = user.signo_zodiacal || '—';
    document.getElementById('userEmail').textContent  = user.email || '';
    const nivel = user.nivel_conciencia ?? 1;
    document.getElementById('userLevel').textContent  = `${nivel} · ${getLevelLabel(nivel)}`;
}

function renderAstrologia(user) {
    const signo    = user.signo_zodiacal || '';
    const elemBase = ELEMENTO_POR_SIGNO[signo] || '';
    const elemText = elemBase ? `${elemBase} ${ELEMENTO_EMOJI[elemBase] || ''}`.trim() : '—';

    const signEl = document.getElementById('astroSign');
    const elemEl = document.getElementById('astroElement');

    signEl.textContent = signo || '—';
    elemEl.textContent = elemText;

    // Setear data-codex-key para bindTriggers
    signEl.closest('.codex-trigger')?.setAttribute('data-codex-key', signo);
    elemEl.closest('.codex-trigger')?.setAttribute('data-codex-key', elemText);
}

function renderNumerologia(user) {
    const vals = {
        numLifePath:   user.camino_vida,
        numExpression: user.expresion,
        numSoul:       user.alma,
        numMaturity:   user.madurez,
    };
    Object.entries(vals).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = val ?? '—';
        el.closest('.codex-trigger')?.setAttribute('data-codex-key', String(val ?? ''));
    });
}

function renderKarma(user) {
    const container = document.getElementById('karmaContent');
    if (!container) return;

    const deudas = Array.isArray(user.deudas_karmicas) ? user.deudas_karmicas : [];

    if (deudas.length === 0) {
        container.innerHTML = `<p class="karma-empty">Sin deudas detectadas en tu firma. Tu camino está despejado.</p>`;
        return;
    }

    const tagsHtml = deudas.map(num => {
        const label = KARMA_LABELS[num] || `Deuda ${num}`;
        return `<span class="karma-tag codex-trigger" style="position:relative;"
                     data-codex-type="karma" data-codex-key="${num}" data-codex-label="Deuda Kármica">
                    ☯ ${num} · ${label}
                </span>`;
    }).join('');

    container.innerHTML = `
        <p style="font-size:.82rem; color:var(--text-muted); margin-bottom:.5rem;">
            Tu firma porta ${deudas.length} ${deudas.length === 1 ? 'deuda' : 'deudas'} de vidas anteriores.
            <span style="color:var(--accent-cyan); opacity:.7; font-size:.75rem;"> · Toca cada una para revelarla.</span>
        </p>
        <div class="karma-tag-row">${tagsHtml}</div>`;
}

// ============================================================
// UPLOAD DE AVATAR — Santuario
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const avatarInput = document.getElementById('avatarUpload');
    const btnEdit     = document.getElementById('btnEditAvatar');
    const avatarImg   = document.getElementById('userAvatar');

    if (!btnEdit || !avatarInput) return;

    // ── Lápiz → dispara el selector nativo de archivo ─────────
    btnEdit.addEventListener('click', () => avatarInput.click());

    // ── Procesa el archivo seleccionado ───────────────────────
    avatarInput.addEventListener('change', async () => {
        const file = avatarInput.files?.[0];
        if (!file) return;

        // ── Validación de tipo y peso ─────────────────────────
        const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
        if (!ALLOWED_TYPES.includes(file.type)) {
            alert('Solo se aceptan imágenes PNG, JPG o WEBP.');
            avatarInput.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede superar los 5 MB.');
            avatarInput.value = '';
            return;
        }

        // ── Feedback visual: atenúa foto + ícono de carga ─────
        const prevIcon = btnEdit.textContent;
        if (avatarImg) avatarImg.style.opacity = '0.35';
        btnEdit.textContent = '↻';
        btnEdit.disabled    = true;

        const restoreUI = () => {
            if (avatarImg) avatarImg.style.opacity = '';
            btnEdit.textContent = prevIcon;
            btnEdit.disabled    = false;
            avatarInput.value   = '';
        };

        // ── Token ─────────────────────────────────────────────
        const token = localStorage.getItem('zodia_token');
        if (!token) { clearSessionAndRedirect(); return; }

        // ── Fetch multipart — sin Content-Type (boundary auto) ─
        const fd = new FormData();
        fd.append('avatar', file);

        try {
            const res = await fetch('http://127.0.0.1:8787/api/users/avatar', {
                method : 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body   : fd,
            });

            // Sesión expirada
            if (res.status === 401 || res.status === 403) {
                clearSessionAndRedirect();
                return;
            }

            const data = await res.json();

            if (!res.ok) {
                console.error('[Avatar] Error del servidor:', data);
                alert(data.error || 'No se pudo subir la imagen. Intenta de nuevo.');
                restoreUI();
                return;
            }

            // ── Éxito: actualiza DOM ───────────────────────────
            const newUrl = data.avatar_url;

            if (avatarImg) {
                avatarImg.src           = newUrl;
                avatarImg.style.opacity = '';
            }
            btnEdit.textContent = prevIcon;
            btnEdit.disabled    = false;
            avatarInput.value   = '';

            // ── Persiste en localStorage (feed + otras vistas) ─
            try {
                const stored = JSON.parse(localStorage.getItem('zodia_user') || '{}');
                stored.avatar_url = newUrl;
                localStorage.setItem('zodia_user', JSON.stringify(stored));
            } catch (storageErr) {
                console.warn('[Avatar] No se pudo sincronizar zodia_user:', storageErr);
            }

        } catch (netErr) {
            console.error('[Avatar] Error de red:', netErr);
            alert('Error de conexión. Verifica tu red e intenta de nuevo.');
            restoreUI();
        }
    });
});
