import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';

const app = new Hono();

app.use('/*', cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
}));

// =========================================================================
// EL MOTOR AKÁSHICO: CONFIGURACIÓN Y ALGORITMOS DE GEOMETRÍA SAGRADA
// =========================================================================

const MASTER_NUMBERS = [11, 22, 33];
const KARMIC_NUMBERS = [13, 14, 16, 19];

function removeAccents(str) {
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getNumerologyValue(char) {
    const charCode = char.toUpperCase().charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) {
        return ((charCode - 65) % 9) + 1;
    }
    if (char.toUpperCase() === 'Ñ') return 5;
    return 0;
}

function reduceAndCheckKarma(number, karmicArray) {
    if (MASTER_NUMBERS.includes(number)) return number;
    if (KARMIC_NUMBERS.includes(number) && !karmicArray.includes(number)) {
        karmicArray.push(number);
    }
    let sum = number;
    while (sum > 9 && !MASTER_NUMBERS.includes(sum)) {
        sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
        if (KARMIC_NUMBERS.includes(sum) && !karmicArray.includes(sum)) {
            karmicArray.push(sum);
        }
    }
    return sum;
}

function getZodiacSign(day, month) {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Tauro';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Géminis';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cáncer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitario';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricornio';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Acuario';
    return 'Piscis';
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =========================================================================
// MIDDLEWARE DE AUTENTICACIÓN JWT (Guardián del Umbral)
// =========================================================================

const authMiddleware = async (c, next) => {
    if (c.req.method === 'OPTIONS') {
        return c.next();
    }
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Acceso denegado. Se requiere token de autenticación.' }, 401);
    }
    const token = authHeader.slice(7);
    try {
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
        c.set('userId', payload.userId);
        await next();
    } catch (err) {
        return c.json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' }, 401);
    }
};

// =========================================================================
// RUTAS PÚBLICAS (/api/public/...)
// =========================================================================

app.post('/api/public/registro', async (c) => {
    try {
        const body = await c.req.json();
        const { nombre_completo, nombre_actual, email, password, fecha_nacimiento } = body;

        if (!nombre_completo || !nombre_actual || !email || !password || !fecha_nacimiento) {
            return c.json({ error: "Faltan elementos para decodificar e inscribir tu firma energética." }, 400);
        }

        const [yyyy, mm, dd] = fecha_nacimiento.split('-').map(Number);
        const signo_zodiacal = getZodiacSign(dd, mm);

        let deudas_karmicas = [];
        const camino_vida = reduceAndCheckKarma(dd + mm + yyyy, deudas_karmicas);
        const actitud = reduceAndCheckKarma(dd + mm, deudas_karmicas);
        const generacion = reduceAndCheckKarma(yyyy, deudas_karmicas);
        const dia_espiritual = reduceAndCheckKarma(dd, deudas_karmicas);

        let sumVocales = 0;
        let sumConsonantes = 0;
        let sumTotal = 0;

        const cleanName = removeAccents(nombre_completo).toUpperCase().replace(/[^A-ZÑ]/g, '');
        const vowels = ['A', 'E', 'I', 'O', 'U'];

        for (const char of cleanName) {
            const val = getNumerologyValue(char);
            sumTotal += val;
            if (vowels.includes(char)) {
                sumVocales += val;
            } else {
                sumConsonantes += val;
            }
        }

        const expresion = reduceAndCheckKarma(sumTotal, deudas_karmicas);
        const alma = reduceAndCheckKarma(sumVocales, deudas_karmicas);
        const personalidad = reduceAndCheckKarma(sumConsonantes, deudas_karmicas);
        const madurez = reduceAndCheckKarma(camino_vida + expresion, deudas_karmicas);

        const password_hash = await hashPassword(password);
        const userId = crypto.randomUUID();
        const karmaJson = JSON.stringify(deudas_karmicas);

        const stmt = c.env.DB.prepare(`
            INSERT INTO Users (
                id, nombre_completo, nombre_actual, email, password_hash, fecha_nacimiento,
                signo_zodiacal, camino_vida, actitud, generacion, dia_espiritual,
                expresion, alma, personalidad, madurez, deudas_karmicas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.bind(
            userId, nombre_completo, nombre_actual, email, password_hash, fecha_nacimiento,
            signo_zodiacal, camino_vida, actitud, generacion, dia_espiritual,
            expresion, alma, personalidad, madurez, karmaJson
        ).run();

        if (!c.env.JWT_SECRET) {
            return c.json({ error: "Configuración incompleta: JWT_SECRET no definido en el entorno." }, 500);
        }

        const token = await sign(
            {
                userId,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
            },
            c.env.JWT_SECRET,
            'HS256'
        );

        return c.json({
            message: "Firma grabada exitosamente en el Akasha.",
            token,
            userId,
            perfil: {
                id: userId,
                nombre_actual,
                email,
                signo_zodiacal,
                camino_vida,
                expresion,
                alma,
                madurez,
                deudas_karmicas,
                avatar_url: "",
                nivel_conciencia: 1,
            }
        }, 201);

    } catch (err) {
        if (err.message.includes("UNIQUE constraint failed: Users.email")) {
            return c.json({ error: "Este correo electrónico ya está enlazado a una firma activa." }, 409);
        }
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/public/login', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password } = body;

        if (!email || !password) {
            return c.json({ error: "Llave o firma incompleta." }, 400);
        }

        const user = await c.env.DB.prepare("SELECT * FROM Users WHERE email = ?")
            .bind(email)
            .first();

        if (!user) {
            return c.json({ error: "Esta firma energética no se encuentra registrada en Zodia." }, 401);
        }

        const password_hash = await hashPassword(password);
        if (password_hash !== user.password_hash) {
            return c.json({ error: "La contraseña es incorrecta. Sincronización denegada." }, 401);
        }

        if (!c.env.JWT_SECRET) {
            return c.json({ error: "Configuración incompleta: JWT_SECRET no definido en el entorno." }, 500);
        }

        const token = await sign(
            {
                userId: user.id,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
            },
            c.env.JWT_SECRET,
            'HS256'
        );

        // ── Sistema de progresión: +1 nivel por cada día nuevo (UTC) ──────────
        const today         = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        let nivel_conciencia = user.nivel_conciencia ?? 1;

        if (user.ultimo_login !== today) {
            nivel_conciencia += 1;
            await c.env.DB.prepare(
                "UPDATE Users SET nivel_conciencia = ?, ultimo_login = ? WHERE id = ?"
            ).bind(nivel_conciencia, today, user.id).run();
        }
        // ─────────────────────────────────────────────────────────────────────

        let deudas_karmicas = [];
        try {
            deudas_karmicas = JSON.parse(user.deudas_karmicas);
        } catch (e) {}

        return c.json({
            message: "Sello de ingreso validado exitosamente.",
            token,
            perfil: {
                id: user.id,
                nombre_actual: user.nombre_actual,
                email: user.email,
                signo_zodiacal: user.signo_zodiacal,
                camino_vida: user.camino_vida,
                expresion: user.expresion,
                alma: user.alma,
                madurez: user.madurez,
                deudas_karmicas,
                avatar_url: user.avatar_url || "",
                nivel_conciencia,
            }
        }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// =========================================================================
// RUTAS PÚBLICAS — Servir avatares desde R2
// =========================================================================

app.get('/api/public/avatar/:filename', async (c) => {
    const filename = c.req.param('filename');

    // Previene path traversal
    if (!filename || filename.includes('/') || filename.includes('..')) {
        return c.json({ error: 'Nombre de archivo inválido.' }, 400);
    }

    const key = `avatars/${filename}`;
    const object = await c.env.BUCKET_AVATARS.get(key);

    if (!object) {
        return c.json({ error: 'Avatar no encontrado.' }, 404);
    }

    const EXT_MIME = {
        jpg:  'image/jpeg',
        jpeg: 'image/jpeg',
        png:  'image/png',
        webp: 'image/webp',
        gif:  'image/gif',
    };
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = EXT_MIME[ext] || 'application/octet-stream';

    return new Response(object.body, {
        headers: {
            'Content-Type':  contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
});

// =========================================================================
// RUTAS PROTEGIDAS (/api/users/...) — requieren Bearer JWT válido
// =========================================================================

app.post('/api/users/avatar', authMiddleware, async (c) => {
    try {
        const userId = c.get('userId');

        const formData = await c.req.formData();
        const file = formData.get('avatar');

        if (!file || !(file instanceof File)) {
            return c.json({ error: "No se encontró el archivo 'avatar' en el formulario." }, 400);
        }

        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return c.json({ error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." }, 415);
        }

        const EXT_MAP = {
            'image/jpeg': 'jpg',
            'image/png':  'png',
            'image/webp': 'webp',
            'image/gif':  'gif',
        };
        const ext = EXT_MAP[file.type];
        const objectKey = `avatars/${userId}.${ext}`;

        const buffer = await file.arrayBuffer();

        await c.env.BUCKET_AVATARS.put(objectKey, buffer, {
            httpMetadata: { contentType: file.type },
        });

        const fileName   = `${userId}.${ext}`;
        const avatar_url = `http://127.0.0.1:8787/api/public/avatar/${fileName}`;

        await c.env.DB.prepare("UPDATE Users SET avatar_url = ? WHERE id = ?")
            .bind(avatar_url, userId)
            .run();

        return c.json({
            message: "Avatar sellado en la Bóveda de Cristal.",
            avatar_url,
        }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// =========================================================================
// MIDDLEWARE DE ADMINISTRACIÓN (Guardián del Santuario Interior)
// =========================================================================

const adminMiddleware = async (c, next) => {
    if (c.req.method === 'OPTIONS') {
        return c.next();
    }
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Acceso denegado. Se requiere token de autenticación.' }, 401);
    }
    const token = authHeader.slice(7);
    try {
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
        const requester = await c.env.DB.prepare(
            "SELECT role FROM Users WHERE id = ?"
        ).bind(payload.userId).first();

        if (!requester || requester.role !== 'admin') {
            return c.json({ error: 'Acceso denegado. Nivel de acceso insuficiente.' }, 403);
        }
        c.set('userId', payload.userId);
        await next();
    } catch (err) {
        return c.json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' }, 401);
    }
};

// =========================================================================
// RUTAS ADMINISTRATIVAS (/api/admin/...) — requieren role = 'admin'
// =========================================================================

// GET /api/admin/metrics — Centro de Mando: métricas globales de la plataforma
app.get('/api/admin/metrics', adminMiddleware, async (c) => {
    try {
        const [usersRes, postsRes, zodiacRes, karmicRes] = await c.env.DB.batch([
            c.env.DB.prepare("SELECT COUNT(*) AS total FROM Users"),
            c.env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(likes_count), 0) AS total_likes FROM Posts"),
            c.env.DB.prepare(`
                SELECT signo_zodiacal, COUNT(*) AS count
                FROM Users
                WHERE signo_zodiacal IS NOT NULL
                GROUP BY signo_zodiacal
                ORDER BY count DESC
            `),
            c.env.DB.prepare(
                "SELECT deudas_karmicas FROM Users WHERE deudas_karmicas IS NOT NULL AND deudas_karmicas NOT IN ('[]', 'null', '')"
            ),
        ]);

        const karmicMap = { 13: 0, 14: 0, 16: 0, 19: 0 };
        for (const row of karmicRes.results) {
            try {
                const deudas = JSON.parse(row.deudas_karmicas);
                if (Array.isArray(deudas)) {
                    for (const d of deudas) {
                        if (Object.prototype.hasOwnProperty.call(karmicMap, d)) {
                            karmicMap[d]++;
                        }
                    }
                }
            } catch { /* fila con JSON corrupto — ignorar */ }
        }

        return c.json({
            total_users:         usersRes.results[0]?.total       ?? 0,
            total_posts:         postsRes.results[0]?.total       ?? 0,
            total_likes:         postsRes.results[0]?.total_likes ?? 0,
            users_with_karma:    karmicRes.results.length,
            zodiac_distribution: zodiacRes.results,
            karmic_map:          karmicMap,
        }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// GET /api/admin/users — Consulta completa del Registro Akáshico
app.get('/api/admin/users', adminMiddleware, async (c) => {
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT
                id, nombre_completo, nombre_actual, email,
                signo_zodiacal, camino_vida, expresion, alma,
                deudas_karmicas, role, avatar_url, created_at
            FROM Users
            ORDER BY created_at DESC
        `).all();

        return c.json({ users: results }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// GET /api/admin/posts — Feed completo con firma del autor (JOIN)
app.get('/api/admin/posts', adminMiddleware, async (c) => {
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT
                Posts.id,
                Posts.user_id,
                Posts.contenido,
                Posts.imagen_url,
                Posts.likes_count,
                Posts.created_at,
                Users.nombre_actual,
                Users.email,
                Users.signo_zodiacal,
                Users.avatar_url
            FROM Posts
            JOIN Users ON Posts.user_id = Users.id
            ORDER BY Posts.created_at DESC
        `).all();

        return c.json({ posts: results }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// DELETE /api/admin/posts/:id — Purgar una transmisión del Akasha
app.delete('/api/admin/posts/:id', adminMiddleware, async (c) => {
    try {
        const postId = c.req.param('id');

        const result = await c.env.DB.prepare(
            "DELETE FROM Posts WHERE id = ?"
        ).bind(postId).run();

        if (result.meta.changes === 0) {
            return c.json({ error: "La transmisión no existe en el registro Akáshico." }, 404);
        }

        return c.json({ message: "Transmisión purgada del Akasha." }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// =========================================================================
// RUTAS DE TRANSMISIONES PROTEGIDAS (/api/users/posts/...)
// =========================================================================

// POST /api/users/posts — Grabar nueva transmisión en el Akasha
app.post('/api/users/posts', authMiddleware, async (c) => {
    try {
        const userId = c.get('userId');
        const body = await c.req.json();
        const { contenido } = body;

        if (!contenido || contenido.trim() === '') {
            return c.json({ error: "El contenido de la transmisión no puede estar vacío." }, 400);
        }

        const postId = crypto.randomUUID();

        await c.env.DB.prepare(
            "INSERT INTO Posts (id, user_id, contenido) VALUES (?, ?, ?)"
        ).bind(postId, userId, contenido.trim()).run();

        return c.json({ message: "Transmisión grabada en el Akasha.", postId }, 201);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// GET /api/users/posts — Feed completo + comentarios en un batch de 2 queries
app.get('/api/users/posts', authMiddleware, async (c) => {
    try {
        const [postsRes, commentsRes] = await c.env.DB.batch([
            c.env.DB.prepare(`
                SELECT
                    Posts.id,
                    Posts.user_id,
                    Posts.contenido,
                    Posts.imagen_url,
                    Posts.likes_count,
                    Posts.created_at,
                    Users.nombre_actual,
                    Users.signo_zodiacal,
                    Users.avatar_url
                FROM Posts
                JOIN Users ON Posts.user_id = Users.id
                ORDER BY Posts.created_at DESC
            `),
            c.env.DB.prepare(`
                SELECT
                    Comments.id,
                    Comments.post_id,
                    Comments.user_id     AS commenter_user_id,
                    Comments.contenido,
                    Comments.created_at,
                    Users.nombre_actual  AS commenter_name,
                    Users.avatar_url     AS commenter_avatar,
                    Users.signo_zodiacal AS commenter_signo
                FROM Comments
                JOIN Users ON Comments.user_id = Users.id
                ORDER BY Comments.created_at ASC
            `),
        ]);

        // Agrupar comentarios por post_id
        const byPost = {};
        for (const c of commentsRes.results) {
            if (!byPost[c.post_id]) byPost[c.post_id] = [];
            byPost[c.post_id].push(c);
        }

        const posts = postsRes.results.map(p => ({
            ...p,
            comentarios: byPost[p.id] || [],
        }));

        return c.json({ posts }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// POST /api/users/posts/:id/like — Incremento atómico de destellos
app.post('/api/users/posts/:id/like', authMiddleware, async (c) => {
    try {
        const postId = c.req.param('id');

        const result = await c.env.DB.prepare(
            "UPDATE Posts SET likes_count = likes_count + 1 WHERE id = ?"
        ).bind(postId).run();

        if (result.meta.changes === 0) {
            return c.json({ error: "Esta transmisión no existe en el registro Akáshico." }, 404);
        }

        const post = await c.env.DB.prepare(
            "SELECT likes_count FROM Posts WHERE id = ?"
        ).bind(postId).first();

        return c.json({ likes_count: post.likes_count }, 200);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// GET /api/users/profile/:id — Perfil público de un alma (campos no-sensibles)
app.get('/api/users/profile/:id', authMiddleware, async (c) => {
    try {
        const visitedId = c.req.param('id');

        // SELECT explícito — nunca SELECT * para evitar fuga de datos sensibles
        const profile = await c.env.DB.prepare(`
            SELECT
                id,
                nombre_actual,
                signo_zodiacal,
                avatar_url,
                nivel_conciencia
            FROM Users
            WHERE id = ?
        `).bind(visitedId).first();

        if (!profile) {
            return c.json({ error: 'Alma no encontrada en el Akasha.' }, 404);
        }

        return c.json({ profile }, 200);

    } catch (err) {
        console.error('[API Profile] Error:', err);
        return c.json({ error: err.message }, 500);
    }
});

// =========================================================================
// MENSAJERÍA PRIVADA
// =========================================================================

// POST /api/users/messages — Enviar un mensaje privado
app.post('/api/users/messages', authMiddleware, async (c) => {
    try {
        const senderId = c.get('userId');
        const { receiver_id, contenido } = await c.req.json();

        if (!receiver_id || !contenido?.trim()) {
            return c.json({ error: 'receiver_id y contenido son requeridos.' }, 400);
        }
        if (contenido.trim().length > 500) {
            return c.json({ error: 'El mensaje no puede superar los 500 caracteres.' }, 400);
        }
        if (senderId === receiver_id) {
            return c.json({ error: 'No puedes enviarte un mensaje a ti mismo.' }, 400);
        }

        // Verificar que el destinatario existe
        const receiver = await c.env.DB.prepare(
            "SELECT id FROM Users WHERE id = ?"
        ).bind(receiver_id).first();
        if (!receiver) return c.json({ error: 'El destinatario no existe en el Akasha.' }, 404);

        const result = await c.env.DB.prepare(
            "INSERT INTO Messages (sender_id, receiver_id, contenido) VALUES (?, ?, ?)"
        ).bind(senderId, receiver_id, contenido.trim()).run();

        return c.json({
            message: {
                id:          result.meta.last_row_id,
                sender_id:   senderId,
                receiver_id,
                contenido:   contenido.trim(),
                created_at:  new Date().toISOString(),
            },
        }, 201);

    } catch (err) {
        console.error('[API Messages POST]', err);
        return c.json({ error: err.message }, 500);
    }
});

// GET /api/users/messages/inbox — Última conversación con cada contacto
app.get('/api/users/messages/inbox', authMiddleware, async (c) => {
    try {
        const userId = c.get('userId');

        // Agrupa por par canónico de IDs y trae el mensaje más reciente de cada hilo
        const { results } = await c.env.DB.prepare(`
            SELECT
                m.id,
                m.sender_id,
                m.receiver_id,
                m.contenido,
                m.created_at,
                CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS buddy_id,
                u.nombre_actual  AS buddy_name,
                u.avatar_url     AS buddy_avatar,
                u.signo_zodiacal AS buddy_signo
            FROM Messages m
            JOIN Users u
              ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
            WHERE (m.sender_id = ? OR m.receiver_id = ?)
              AND m.id IN (
                  SELECT MAX(id)
                  FROM Messages
                  WHERE sender_id = ? OR receiver_id = ?
                  GROUP BY MIN(sender_id, receiver_id) || ':' || MAX(sender_id, receiver_id)
              )
            ORDER BY m.created_at DESC
        `).bind(userId, userId, userId, userId, userId, userId).all();

        return c.json({ inbox: results }, 200);

    } catch (err) {
        console.error('[API Messages Inbox]', err);
        return c.json({ error: err.message }, 500);
    }
});

// GET /api/users/messages/history/:buddyId — Historial completo entre dos usuarios
app.get('/api/users/messages/history/:buddyId', authMiddleware, async (c) => {
    try {
        const userId  = c.get('userId');
        const buddyId = c.req.param('buddyId');

        const { results } = await c.env.DB.prepare(`
            SELECT
                Messages.id,
                Messages.sender_id,
                Messages.receiver_id,
                Messages.contenido,
                Messages.created_at
            FROM Messages
            WHERE (Messages.sender_id = ? AND Messages.receiver_id = ?)
               OR (Messages.sender_id = ? AND Messages.receiver_id = ?)
            ORDER BY Messages.created_at ASC, Messages.id ASC
        `).bind(userId, buddyId, buddyId, userId).all();

        return c.json({ messages: results }, 200);

    } catch (err) {
        console.error('[API Messages History]', err);
        return c.json({ error: err.message }, 500);
    }
});

// POST /api/users/posts/:id/comment — Añadir comentario a una transmisión
app.post('/api/users/posts/:id/comment', authMiddleware, async (c) => {
    try {
        const postId = c.req.param('id');
        const userId = c.get('userId');
        const { contenido } = await c.req.json();

        if (!contenido || !contenido.trim()) {
            return c.json({ error: 'El comentario no puede estar vacío.' }, 400);
        }
        if (contenido.trim().length > 500) {
            return c.json({ error: 'El comentario no puede superar los 500 caracteres.' }, 400);
        }

        // Verifica que el post exista
        const post = await c.env.DB.prepare(
            "SELECT id FROM Posts WHERE id = ?"
        ).bind(postId).first();
        if (!post) return c.json({ error: 'La transmisión no existe en el Akasha.' }, 404);

        const commentId = crypto.randomUUID();
        await c.env.DB.prepare(
            "INSERT INTO Comments (id, post_id, user_id, contenido) VALUES (?, ?, ?, ?)"
        ).bind(commentId, postId, userId, contenido.trim()).run();

        // Devuelve el comentario completo para actualización optimista del DOM
        const author = await c.env.DB.prepare(
            "SELECT nombre_actual, avatar_url FROM Users WHERE id = ?"
        ).bind(userId).first();

        return c.json({
            comment: {
                id:               commentId,
                post_id:          postId,
                contenido:        contenido.trim(),
                created_at:       new Date().toISOString(),
                commenter_name:   author.nombre_actual,
                commenter_avatar: author.avatar_url || '',
            },
        }, 201);

    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

export default app;

