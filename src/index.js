// ============================================================================
// API BACKEND - MATHSOLUIS E-COMMERCE (Inventario, Admin y Auth de Clientes)
// Director de Ingeniería: Studio Pixel
// v2.0 - Sesiones seguras con AdminSessions
// ============================================================================

async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Función auxiliar para descifrar el Token de Google
function parseJwtPayload(token) {
  try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const decoder = new TextDecoder('utf-8');
      return JSON.parse(decoder.decode(bytes));
  } catch(e) { return null; }
}

const formatCurrency = (amount) => '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Convierte el campo categorias_ids (TEXT en D1) a array de enteros.
// Acepta JSON array ("[1,3]"), CSV ("1,3") o número suelto (1).
function parseCategorias(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  const s = String(raw).trim();
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
  } catch (_) {}
  return s.split(',').map(x => parseInt(x, 10)).filter(Boolean);
}

// Convierte un array de enteros al string JSON que se guarda en D1.
function serializeCategorias(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  return JSON.stringify(ids.map(Number).filter(Boolean));
}

// ============================================================================
// HELPER: Subida de imagen Base64 a Cloudflare R2
// Devuelve la URL pública (PUBLIC_IMAGES_URL/key) que se guarda en D1.
// ============================================================================
async function uploadBase64ToR2(env, dataUrl, meta = {}) {
  // Parsear "data:image/jpeg;base64,XXXX..."
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error("Formato Base64 inválido");
  const mime = match[1];
  const base64 = match[2];

  const ext = mime === 'image/jpeg' ? 'jpg'
            : mime === 'image/png'  ? 'png'
            : mime === 'image/webp' ? 'webp'
            : mime === 'image/gif'  ? 'gif'
            : 'bin';

  // Decodificar Base64 a bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Slug del color para URL legible
  const colorSlug = (meta.color || 'img').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'img';
  const productPart = meta.productId ? `p${meta.productId}` : 'p0';
  const rand = crypto.randomUUID().slice(0, 8);
  const key = `productos/${productPart}/${colorSlug}-${Date.now()}-${rand}.${ext}`;

  await env.IMAGES.put(key, bytes, {
    httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' }
  });

  const baseUrl = (env.PUBLIC_IMAGES_URL || '').replace(/\/$/, '');
  return `${baseUrl}/${key}`;
}

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN ADMIN
// Verifica que el token Bearer sea válido y no haya expirado (8 horas)
// ============================================================================

async function verifyAdminToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Extraer token después de "Bearer "

  try {
    // Buscar sesión activa y no expirada (la tabla se crea en /api/admin/login)
    const session = await env.DB.prepare(
      `SELECT * FROM AdminSessions WHERE token = ? AND expires_at > datetime('now')`
    ).bind(token).first();

    return session || null;
  } catch (e) {
    console.error("Error verificando token:", e);
    return null;
  }
}

// ============================================================================
// MÓDULO DE CORREOS (RESEND API) Y AUDITORÍA
// ============================================================================

const LOGO_URL = "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=150&q=80"; // Reemplazar por logo oficial en prod.
const FALLBACK_ITEM_IMG = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=150&q=80";

// 1. Correo de Bienvenida
async function sendWelcomeEmail(env, email, nombre) {
  if (!env.RESEND_API_KEY) return;

  const primerNombre = nombre.split(' ')[0];
  const htmlContent = `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFF8F0; border: 1px solid #FCEEF2; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #FFFFFF; padding: 40px 30px; text-align: center; border-bottom: 2px solid #FCEEF2;">
          <img src="${LOGO_URL}" alt="Mathsoluis" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #FCEEF2; display: block; margin-left: auto; margin-right: auto;" />
          <h1 style="color: #8A7360; margin: 0; font-size: 32px; font-style: italic;">Mathsoluis</h1>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #8A7360; font-size: 24px; margin-top: 0;">¡Bienvenida a nuestra familia, ${primerNombre}! ✨</h2>
          <p style="color: #A09389; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Tu cuenta ha sido creada con éxito. Desde ahora podrás guardar tus prendas favoritas en tu <b>Lista de Deseos</b>, agilizar tu paso por caja y hacer seguimiento a todos tus envíos en tiempo real.</p>
          <a href="https://www.mathsoluis.cl" style="display: inline-block; background-color: #13C2B3; color: #FFFFFF; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-weight: bold; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">Ir de Shopping</a>
      </div>
      <div style="background-color: #F4F0EC; padding: 20px; text-align: center;">
          <p style="color: #A09389; font-size: 12px; margin: 0;">© 2026 Mathsoluis. Ropa de Bebé Premium.</p>
      </div>
  </div>`;

  try {
      await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'Mathsoluis <pedidos@mathsoluis.cl>', to: [email], subject: '¡Bienvenida a Mathsoluis! 💖', html: htmlContent })
      });
  } catch (error) { console.error("Error enviando email:", error); }
}

// 2. Correo de Confirmación de Pedido
async function sendOrderConfirmationEmail(env, customer, orderId, cart, total) {
    if (!env.RESEND_API_KEY) return;

    const primerNombre = customer.nombre.split(' ')[0];

    let itemsHtml = '';
    cart.forEach(item => {
        let imgSrc = FALLBACK_ITEM_IMG;
        if (item.img && item.img.startsWith('http') && !item.img.includes('localhost') && !item.img.includes('127.0.0.1')) {
            imgSrc = item.img;
        }

        itemsHtml += `
            <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #FCEEF2; width: 75px;" valign="top">
                    <img src="${imgSrc}" alt="${item.name}" width="65" height="85" style="width: 65px; height: 85px; object-fit: cover; border-radius: 10px; background-color: #F4F0EC; display: block; border: none; outline: none;" />
                </td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #FCEEF2;" valign="middle">
                    <p style="margin: 0 0 5px 0; font-weight: bold; color: #8A7360; font-size: 15px; line-height: 1.3;">${item.name}</p>
                    <p style="margin: 0; color: #A09389; font-size: 13px;">Cant: ${item.quantity}</p>
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #FCEEF2; text-align: right; font-weight: bold; color: #13C2B3; font-size: 16px;" valign="middle">
                    ${formatCurrency(item.price * item.quantity)}
                </td>
            </tr>
        `;
    });

    const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFF8F0; border: 1px solid #FCEEF2; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #FFFFFF; padding: 40px 30px; text-align: center; border-bottom: 2px solid #FCEEF2;">
            <img src="${LOGO_URL}" alt="Mathsoluis" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #FCEEF2; display: block; margin-left: auto; margin-right: auto;" />
            <h1 style="color: #8A7360; margin: 0; font-size: 32px; font-style: italic;">Mathsoluis</h1>
        </div>
        <div style="padding: 35px 30px;">
            <h2 style="color: #8A7360; font-size: 22px; margin-top: 0; text-align: center;">¡Gracias por tu compra, ${primerNombre}! 🛍️</h2>
            <p style="color: #A09389; font-size: 15px; text-align: center;">Hemos recibido tu pedido <strong style="color: #8A7360;">#${orderId}</strong> exitosamente y ya comenzamos a prepararlo con mucho amor.</p>
            <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #FCEEF2; box-shadow: 0 4px 15px rgba(138, 115, 96, 0.05);">
                <h3 style="color: #8A7360; font-size: 14px; margin-top: 0; border-bottom: 2px solid #FCEEF2; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Resumen de tu pedido</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 10px;">
                    ${itemsHtml}
                </table>
                <div style="text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #8A7360;">
                    Total Pagado: <span style="color: #13C2B3; margin-left: 10px;">${formatCurrency(total)}</span>
                </div>
            </div>
            <div style="background-color: #EAF5FA; border-radius: 12px; padding: 25px; margin-bottom: 35px; border: 1px solid #92CBE6;">
                <h3 style="color: #2874A6; font-size: 14px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Datos de Despacho</h3>
                <p style="margin: 0 0 5px 0; color: #2874A6; font-size: 14px;"><strong>Dirección:</strong> ${customer.direccion || 'Retiro en Tienda'}</p>
                <p style="margin: 0 0 5px 0; color: #2874A6; font-size: 14px;"><strong>Comuna:</strong> ${customer.comuna || '-'}</p>
                <p style="margin: 0; color: #2874A6; font-size: 14px;"><strong>Región:</strong> ${customer.region || '-'}</p>
            </div>
            <p style="color: #A09389; font-size: 14px; text-align: center; font-style: italic; margin-bottom: 30px;">Te enviaremos otro correo cuando tu pedido vaya en camino junto a tu código de seguimiento.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 10px;">
                <tr>
                    <td align="center" style="padding-bottom: 15px;">
                        <a href="https://wa.me/56930338773" target="_blank" style="display: inline-block; background-color: #25D366; color: #FFFFFF; text-decoration: none; padding: 14px 25px; border-radius: 50px; font-weight: bold; font-size: 14px; width: 220px; text-align: center;">💬 Hablar por WhatsApp</a>
                    </td>
                </tr>
                <tr>
                    <td align="center">
                        <a href="https://www.instagram.com/mathsoluis/" target="_blank" style="display: inline-block; background-color: #13C2B3; color: #FFFFFF; text-decoration: none; padding: 14px 25px; border-radius: 50px; font-weight: bold; font-size: 14px; width: 220px; text-align: center;">📸 Seguir en Instagram</a>
                    </td>
                </tr>
            </table>
        </div>
        <div style="background-color: #F4F0EC; padding: 20px; text-align: center;">
            <p style="color: #A09389; font-size: 12px; margin: 0;">© 2026 Mathsoluis. Ropa de Bebé Premium.</p>
        </div>
    </div>`;

    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'Mathsoluis <pedidos@mathsoluis.cl>', to: [customer.email], subject: `Confirmación de Pedido #${orderId} 💖`, html: htmlContent })
        });
    } catch (error) { console.error("Error enviando email de compra:", error); }
}

// 3. Correo de Cambio de Estado de Pedido
async function sendOrderStatusChangeEmail(env, order, customerEmail, customerName) {
    if (!env.RESEND_API_KEY) return;

    const primerNombre = (customerName || 'Cliente').split(' ')[0];
    const estado = order.estado;
    const orderId = order.id;

    const statusLabels = {
        'Pendiente': { label: 'Pendiente de Pago',  emoji: '🟡', color: '#D4AC0D', bg: '#FEF9E7' },
        'Pagado':    { label: 'Pago Confirmado',     emoji: '🔵', color: '#13C2B3', bg: '#E0F6F5' },
        'Preparando':{ label: 'En Preparación',      emoji: '🟣', color: '#8E44AD', bg: '#F4ECF7' },
        'Enviado':   { label: 'En Camino',            emoji: '🚚', color: '#1ABC9C', bg: '#E8F8F5' },
        'Entregado': { label: 'Entregado',            emoji: '✅', color: '#27AE60', bg: '#EAFAF1' },
        'Cancelado': { label: 'Cancelado',            emoji: '🔴', color: '#E74C3C', bg: '#FDEDEC' },
    };
    const statusMessages = {
        'Pendiente':  'Tu pedido está pendiente de confirmación de pago.',
        'Pagado':     '¡Tu pago ha sido confirmado! Ya comenzamos a revisar tu pedido.',
        'Preparando': '¡Estamos preparando tu pedido con mucho amor y cuidado!',
        'Enviado':    '¡Tu pedido está en camino! Ya fue despachado y pronto llegará a tus manos.',
        'Entregado':  '¡Tu pedido fue entregado! Esperamos que les encanten las prendas.',
        'Cancelado':  'Tu pedido ha sido cancelado. Si tienes preguntas, contáctanos.',
    };
    const subjectLabels = {
        'Pendiente':  `Pedido #${orderId} — Pendiente de Pago`,
        'Pagado':     `¡Pedido #${orderId} confirmado! 💖`,
        'Preparando': `Tu pedido #${orderId} está en preparación 🎀`,
        'Enviado':    `¡Tu pedido #${orderId} está en camino! 🚚`,
        'Entregado':  `¡Pedido #${orderId} entregado con éxito! ✨`,
        'Cancelado':  `Pedido #${orderId} cancelado`,
    };

    const si = statusLabels[estado] || { label: estado, emoji: '📦', color: '#8A7360', bg: '#FFF8F0' };
    const statusMsg = statusMessages[estado] || 'El estado de tu pedido ha sido actualizado.';
    const subject   = subjectLabels[estado]  || `Actualización de tu pedido #${orderId}`;

    // Bloque de tracking — solo si está Enviado y tiene número
    let trackingHtml = '';
    if (estado === 'Enviado' && order.tracking_code) {
        const tc = order.tracking_code;
        const courier = order.courier || '';
        const courierUrls = {
            'Blue Express':      `https://www.blue.cl/seguimiento/?codigo=${tc}`,
            'Starken':           `https://www.starken.cl/seguimiento?codigo=${tc}`,
            'Chilexpress':       `https://www.chilexpress.cl/Views/Chilexpress/Estado-envio.aspx?DATA=${tc}`,
            'Correos de Chile':  `https://www.correos.cl/web/guest/seguimiento-en-linea?tracking_number=${tc}`,
        };
        const trackingUrl = courierUrls[courier];

        if (trackingUrl) {
            trackingHtml = `
            <div style="text-align:center; margin:30px 0;">
                <p style="color:#A09389; font-size:14px; margin-bottom:5px;">Tu número de seguimiento:</p>
                <p style="font-family:monospace; font-size:20px; font-weight:bold; color:#8A7360; margin:0 0 20px 0; letter-spacing:2px;">${tc}</p>
                <a href="${trackingUrl}" target="_blank" style="display:inline-block; background-color:#13C2B3; color:#FFFFFF; text-decoration:none; padding:16px 40px; border-radius:50px; font-weight:bold; font-size:15px; letter-spacing:1px;">🔍 Rastrear con ${courier}</a>
            </div>`;
        } else {
            trackingHtml = `
            <div style="text-align:center; margin:30px 0; background:#F4F0EC; border-radius:12px; padding:20px; border:1px solid #E8E0D8;">
                <p style="color:#A09389; font-size:14px; margin-bottom:5px;">Tu número de seguimiento:</p>
                <p style="font-family:monospace; font-size:22px; font-weight:bold; color:#8A7360; margin:0; letter-spacing:2px;">${tc}</p>
                ${courier && courier !== 'Otro' ? `<p style="color:#A09389; font-size:13px; margin:10px 0 0 0;">Courier: ${courier}</p>` : ''}
            </div>`;
        }
    }

    const htmlContent = `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; max-width:600px; margin:0 auto; background-color:#FFF8F0; border:1px solid #FCEEF2; border-radius:16px; overflow:hidden;">
        <div style="background-color:#FFFFFF; padding:40px 30px; text-align:center; border-bottom:2px solid #FCEEF2;">
            <img src="${LOGO_URL}" alt="Mathsoluis" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:15px; border:3px solid #FCEEF2; display:block; margin-left:auto; margin-right:auto;" />
            <h1 style="color:#8A7360; margin:0; font-size:32px; font-style:italic;">Mathsoluis</h1>
        </div>
        <div style="padding:40px 30px; text-align:center;">
            <div style="display:inline-block; background-color:${si.bg}; color:${si.color}; padding:10px 25px; border-radius:50px; font-weight:bold; font-size:15px; margin-bottom:25px; border:1px solid ${si.color};">
                ${si.emoji} ${si.label}
            </div>
            <h2 style="color:#8A7360; font-size:22px; margin-top:0;">Actualización de tu pedido #${orderId}</h2>
            <p style="color:#A09389; font-size:16px; line-height:1.6; margin-bottom:10px;">Hola <strong style="color:#8A7360;">${primerNombre}</strong>,</p>
            <p style="color:#A09389; font-size:15px; line-height:1.6; margin-bottom:25px;">${statusMsg}</p>
            ${trackingHtml}
        </div>
        <div style="padding:0 30px 30px 30px; text-align:center;">
            <a href="https://wa.me/56930338773" target="_blank" style="display:inline-block; background-color:#25D366; color:#FFFFFF; text-decoration:none; padding:14px 25px; border-radius:50px; font-weight:bold; font-size:14px;">💬 ¿Tienes preguntas? Escríbenos</a>
        </div>
        <div style="background-color:#F4F0EC; padding:20px; text-align:center;">
            <p style="color:#A09389; font-size:12px; margin:0;">© 2026 Mathsoluis. Ropa de Bebé Premium.</p>
        </div>
    </div>`;

    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'Mathsoluis <pedidos@mathsoluis.cl>', to: [customerEmail], subject, html: htmlContent })
        });
    } catch (error) { console.error("Error enviando email de cambio de estado:", error); }
}

// 4. Registro de Actividades (Caja Negra)
async function logActivity(env, adminName, action, entityType, entityId, details) {
    try {
        const santiagoDate = new Date().toLocaleString("es-CL", {timeZone: "America/Santiago"});
        await env.DB.prepare(`INSERT INTO ActivityLogs (admin_name, action, entity_type, entity_id, details, fecha) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(adminName, action, entityType, String(entityId), details, santiagoDate).run();
    } catch(e) { console.error("Error registrando actividad", e); }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: cambiar a "https://www.mathsoluis.cl" en producción
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Respuesta de error de autenticación estándar
const unauthorizedResponse = () => Response.json(
  { success: false, error: "No autorizado. Sesión inválida o expirada." },
  { status: 401, headers: corsHeaders }
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (url.pathname === "/" && request.method === "GET") return new Response("¡API de Mathsoluis Operativa!", { status: 200, headers: corsHeaders });

    // ========================================================================
    // A. MÓDULO E-COMMERCE: AUTENTICACIÓN Y CHECKOUT (rutas públicas)
    // ========================================================================

    if (url.pathname === "/api/auth/google" && request.method === "POST") {
        try {
            const { token } = await request.json();
            const payload = parseJwtPayload(token);
            if (!payload || !payload.email) return Response.json({ success: false, error: "Token inválido" }, { headers: corsHeaders });

            const googleId = payload.sub; const email = payload.email; const nombre = payload.name;

            let customer = await env.DB.prepare("SELECT * FROM Customers WHERE email = ?").bind(email).first();
            if (!customer) {
                const info = await env.DB.prepare("INSERT INTO Customers (google_id, nombre, email) VALUES (?, ?, ?)").bind(googleId, nombre, email).run();
                customer = { id: info.meta.last_row_id, nombre, email };
                ctx.waitUntil(sendWelcomeEmail(env, email, nombre));
            } else if (!customer.google_id) {
                await env.DB.prepare("UPDATE Customers SET google_id = ? WHERE email = ?").bind(googleId, email).run();
            }
            return Response.json({ success: true, customer: { id: customer.id, nombre: customer.nombre, email: customer.email } }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    if (url.pathname === "/api/auth/register" && request.method === "POST") {
        try {
            const { nombre, email, password } = await request.json();
            const existing = await env.DB.prepare("SELECT id FROM Customers WHERE email = ?").bind(email).first();
            if (existing) return Response.json({ success: false, error: "Correo ya registrado." }, { status: 400, headers: corsHeaders });

            const hashedPass = await hashPassword(password);
            const info = await env.DB.prepare("INSERT INTO Customers (nombre, email, password_hash) VALUES (?, ?, ?)").bind(nombre, email, hashedPass).run();
            ctx.waitUntil(sendWelcomeEmail(env, email, nombre));

            return Response.json({ success: true, customer: { id: info.meta.last_row_id, nombre, email } }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
        try {
            const { email, password } = await request.json();
            const customer = await env.DB.prepare("SELECT * FROM Customers WHERE email = ?").bind(email).first();
            if (!customer) return Response.json({ success: false, error: "Correo o contraseña incorrectos." }, { status: 401, headers: corsHeaders });
            if (customer.google_id && !customer.password_hash) return Response.json({ success: false, error: "Usa el botón de Google para ingresar." }, { status: 401, headers: corsHeaders });

            const hashedPass = await hashPassword(password);
            if (customer.password_hash !== hashedPass) return Response.json({ success: false, error: "Correo o contraseña incorrectos." }, { status: 401, headers: corsHeaders });

            return Response.json({ success: true, customer: { id: customer.id, nombre: customer.nombre, email: customer.email, telefono: customer.telefono, direccion: customer.direccion, comuna: customer.comuna, region: customer.region } }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    if (url.pathname === "/api/checkout" && request.method === "POST") {
        try {
            const { customer, cart, total } = await request.json();

            let cust = await env.DB.prepare("SELECT id FROM Customers WHERE email = ?").bind(customer.email).first();
            let customerId;
            if (!cust) {
                const info = await env.DB.prepare("INSERT INTO Customers (nombre, email, telefono, direccion, comuna, region) VALUES (?, ?, ?, ?, ?, ?)").bind(customer.nombre, customer.email, customer.telefono || null, customer.direccion || null, customer.comuna || null, customer.region || null).run();
                customerId = info.meta.last_row_id;
            } else {
                customerId = cust.id;
                await env.DB.prepare("UPDATE Customers SET nombre = ?, telefono = ?, direccion = ?, comuna = ?, region = ? WHERE id = ?").bind(customer.nombre, customer.telefono || null, customer.direccion || null, customer.comuna || null, customer.region || null, customerId).run();
            }

            const orderInfo = await env.DB.prepare("INSERT INTO Orders (customer_id, total, estado) VALUES (?, ?, 'Pagado')").bind(customerId, total).run();
            const orderId = orderInfo.meta.last_row_id;

            if (cart && cart.length > 0) {
                const itemStmts = cart.map(item => {
                    const originalProductId = item.id.split('_')[1];
                    return env.DB.prepare("INSERT INTO OrderItems (order_id, product_id, product_name, variant_details, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?, ?)")
                    .bind(orderId, originalProductId, item.name, 'Estándar', item.quantity, item.price);
                });
                await env.DB.batch(itemStmts);
            }

            ctx.waitUntil(sendOrderConfirmationEmail(env, customer, orderId, cart, total));

            return Response.json({ success: true, order_id: orderId }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    // Rutas públicas del ecommerce (catálogo)
    // LISTADO LIVIANO: solo imagen_1 por variante. Las imágenes 2-5 se piden por /api/products/:id
    if (url.pathname === "/api/products" && request.method === "GET") {
        try {
            const query = `SELECT p.*, c.nombre as categoria_nombre FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id WHERE p.visible = 1 ORDER BY p.en_oferta DESC, p.id DESC`;
            const { results: products } = await env.DB.prepare(query).all();
            let variants = [];
            try {
                variants = (await env.DB.prepare(
                    `SELECT id, product_id, color_name, color_hex, tallas, stock, imagen_1,
                     ((CASE WHEN imagen_1 IS NOT NULL AND imagen_1 != '' THEN 1 ELSE 0 END) +
                      (CASE WHEN imagen_2 IS NOT NULL AND imagen_2 != '' THEN 1 ELSE 0 END) +
                      (CASE WHEN imagen_3 IS NOT NULL AND imagen_3 != '' THEN 1 ELSE 0 END) +
                      (CASE WHEN imagen_4 IS NOT NULL AND imagen_4 != '' THEN 1 ELSE 0 END) +
                      (CASE WHEN imagen_5 IS NOT NULL AND imagen_5 != '' THEN 1 ELSE 0 END)) as imagen_count
                     FROM ProductVariants`
                ).all()).results;
            } catch (e) {}
            products.forEach(p => {
                p.categorias_ids = parseCategorias(p.categorias_ids);
                p.variantes = variants.filter(v => v.product_id === p.id);
                if(p.variantes.length === 0 && p.imagen_url) p.variantes = [{ color_name: 'Único', color_hex: '#cccccc', tallas: p.tallas || '', stock: p.stock || 0, imagen_1: p.imagen_url }];
            });
            return Response.json({ success: true, data: products }, {
                headers: { ...corsHeaders, "Cache-Control": "public, max-age=60, s-maxage=60" }
            });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    // DETALLE: producto único con TODAS las imágenes (1-5) de cada variante
    const publicProductMatch = url.pathname.match(/^\/api\/products\/(\d+)$/);
    if (publicProductMatch && request.method === "GET") {
        try {
            const pId = parseInt(publicProductMatch[1], 10);
            const product = await env.DB.prepare(
                `SELECT p.*, c.nombre as categoria_nombre FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id WHERE p.id = ? AND p.visible = 1`
            ).bind(pId).first();
            if (!product) return Response.json({ success: false, error: "Producto no encontrado" }, { status: 404, headers: corsHeaders });

            let variants = [];
            try {
                variants = (await env.DB.prepare(
                    "SELECT * FROM ProductVariants WHERE product_id = ?"
                ).bind(pId).all()).results;
            } catch (e) {}
            product.categorias_ids = parseCategorias(product.categorias_ids);
            product.variantes = variants;
            if (product.variantes.length === 0 && product.imagen_url) {
                product.variantes = [{ color_name: 'Único', color_hex: '#cccccc', tallas: product.tallas || '', stock: product.stock || 0, imagen_1: product.imagen_url }];
            }
            return Response.json({ success: true, data: product }, {
                headers: { ...corsHeaders, "Cache-Control": "public, max-age=60, s-maxage=60" }
            });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    if (url.pathname === "/api/categories" && request.method === "GET") {
        try {
            const { results } = await env.DB.prepare("SELECT * FROM Categories").all();
            return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    // ========================================================================
    // B. MÓDULO PANEL ADMIN
    // ========================================================================

    // LOGIN ADMIN — única ruta pública del panel
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      try {
        const { email, password } = await request.json();
        const admin = await env.DB.prepare("SELECT * FROM Admins WHERE email = ?").bind(email).first();
        if (!admin) return Response.json({ success: false, error: "Credenciales inválidas" }, { status: 401, headers: corsHeaders });

        const hashedPassword = await hashPassword(password);

        // Primer login: auto-setear la contraseña si aún tiene el hash pendiente
        if (admin.password_hash === 'hash_pendiente_generar') {
          await env.DB.prepare("UPDATE Admins SET password_hash = ? WHERE email = ?").bind(hashedPassword, email).run();
          admin.password_hash = hashedPassword;
        }
        if (admin.password_hash !== hashedPassword) return Response.json({ success: false, error: "Credenciales inválidas" }, { status: 401, headers: corsHeaders });

        // ✅ NUEVO: Generar token seguro con UUID
        const token = crypto.randomUUID() + '-' + crypto.randomUUID();

        // Calcular expiración: ahora + 8 horas
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

        // Crear tabla de sesiones si no existe
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS AdminSessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            admin_id INTEGER NOT NULL,
            admin_name TEXT NOT NULL,
            admin_rol TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES Admins(id) ON DELETE CASCADE
          )
        `).run();

        // Limpiar sesiones anteriores del mismo admin (limpieza automática)
        await env.DB.prepare("DELETE FROM AdminSessions WHERE admin_id = ?").bind(admin.id).run();

        // Guardar nueva sesión
        await env.DB.prepare(
          "INSERT INTO AdminSessions (token, admin_id, admin_name, admin_rol, expires_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(token, admin.id, admin.nombre, admin.rol, expiresAt).run();

        return Response.json({
          success: true,
          token: token,
          admin_data: { nombre: admin.nombre, rol: admin.rol }
        }, { status: 200, headers: corsHeaders });

      } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    // LOGOUT ADMIN — invalida la sesión en el servidor
    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
      const session = await verifyAdminToken(request, env);
      if (session) {
        await env.DB.prepare("DELETE FROM AdminSessions WHERE token = ?").bind(
          request.headers.get('Authorization').substring(7)
        ).run();
      }
      return Response.json({ success: true, message: "Sesión cerrada" }, { headers: corsHeaders });
    }

    // ========================================================================
    // ✅ MIDDLEWARE: Todas las rutas /api/admin/* de aquí en adelante
    // requieren un token válido en el header Authorization: Bearer <token>
    // ========================================================================
    if (url.pathname.startsWith('/api/admin/')) {
      const session = await verifyAdminToken(request, env);
      if (!session) return unauthorizedResponse();

      // El nombre del admin viene del servidor (no del cliente — más seguro)
      const adminName = session.admin_name;
      const adminRol = session.admin_rol;

      // ---- IMÁGENES (R2) ----
      // Sube una imagen al bucket R2 y devuelve la URL pública.
      // Body: { data: "data:image/jpeg;base64,...", productId?, color? }
      if (url.pathname === "/api/admin/upload-image" && request.method === "POST") {
        try {
          if (!env.IMAGES) return Response.json({ success: false, error: "R2 no configurado" }, { status: 500, headers: corsHeaders });
          const { data, productId, color } = await request.json();
          if (!data || typeof data !== 'string') return Response.json({ success: false, error: "Falta data Base64" }, { status: 400, headers: corsHeaders });

          const url = await uploadBase64ToR2(env, data, { productId, color });
          return Response.json({ success: true, url }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      // Migra imágenes existentes Base64 → R2. Procesa 5 variantes por llamada.
      // Devuelve { processed, pending, total } para que el cliente lo llame en loop hasta pending=0.
      // Solo superadmin (operación destructiva sobre la base de datos).
      if (url.pathname === "/api/admin/migrate-images-batch" && request.method === "POST") {
        if (adminRol !== 'superadmin') return Response.json({ success: false, error: "Solo superadmin" }, { status: 403, headers: corsHeaders });
        try {
          if (!env.IMAGES) return Response.json({ success: false, error: "R2 no configurado" }, { status: 500, headers: corsHeaders });

          // Buscar variantes con al menos una imagen Base64 (que empiece con "data:")
          const { results: pending } = await env.DB.prepare(`
            SELECT id, product_id FROM ProductVariants
            WHERE substr(COALESCE(imagen_1,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_2,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_3,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_4,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_5,''),1,5) = 'data:'
            LIMIT 5
          `).all();

          let processed = 0;
          for (const v of pending) {
            const variant = await env.DB.prepare("SELECT * FROM ProductVariants WHERE id = ?").bind(v.id).first();
            const updates = {};
            for (const col of ['imagen_1','imagen_2','imagen_3','imagen_4','imagen_5']) {
              const val = variant[col];
              if (val && typeof val === 'string' && val.startsWith('data:')) {
                try {
                  const newUrl = await uploadBase64ToR2(env, val, { productId: variant.product_id, color: variant.color_name });
                  updates[col] = newUrl;
                } catch (e) {
                  console.error(`Error migrando ${col} de variante ${v.id}:`, e);
                }
              }
            }
            const cols = Object.keys(updates);
            if (cols.length > 0) {
              const setClause = cols.map(c => `${c} = ?`).join(', ');
              const values = cols.map(c => updates[c]);
              await env.DB.prepare(`UPDATE ProductVariants SET ${setClause} WHERE id = ?`).bind(...values, v.id).run();
              processed++;
            }
          }

          // Conteo de las que aún faltan tras este batch
          const remaining = await env.DB.prepare(`
            SELECT COUNT(*) as c FROM ProductVariants
            WHERE substr(COALESCE(imagen_1,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_2,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_3,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_4,''),1,5) = 'data:'
               OR substr(COALESCE(imagen_5,''),1,5) = 'data:'
          `).first();

          ctx.waitUntil(logActivity(env, adminName, 'MIGRAR', 'Imagenes', 0, `Batch: ${processed} variantes migradas, faltan ${remaining.c}`));
          return Response.json({ success: true, processed, pending: remaining.c }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      // ---- INVENTARIO ----
      if (url.pathname === "/api/admin/categories" && request.method === "GET") {
        try {
          const { results } = await env.DB.prepare("SELECT * FROM Categories").all();
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      if (url.pathname === "/api/admin/products" && request.method === "GET") {
        try {
          const query = `SELECT p.*, c.nombre as categoria_nombre FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id ORDER BY p.en_oferta DESC, p.id DESC`;
          const { results: products } = await env.DB.prepare(query).all();
          let variants = [];
          try { variants = (await env.DB.prepare("SELECT * FROM ProductVariants").all()).results; } catch (e) {}
          products.forEach(p => {
            p.categorias_ids = parseCategorias(p.categorias_ids);
            p.variantes = variants.filter(v => v.product_id === p.id);
            if(p.variantes.length === 0 && p.imagen_url) p.variantes = [{ color_name: 'Único', color_hex: '#cccccc', tallas: p.tallas || '', stock: p.stock || 0, imagen_1: p.imagen_url }];
          });
          return Response.json({ success: true, data: products }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      if (url.pathname === "/api/admin/products" && request.method === "POST") {
        try {
          const body = await request.json();
          const categoriasStr = serializeCategorias(body.categorias_ids);
          const categoriaIdPrimary = Array.isArray(body.categorias_ids) && body.categorias_ids.length > 0 ? body.categorias_ids[0] : (body.categoria_id || 1);
          const info = await env.DB.prepare(`INSERT INTO Products (sku, nombre, descripcion, precio_normal, precio_oferta, en_oferta, oferta_limitada, fecha_fin_oferta, stock, categoria_id, categorias_ids, etiquetas, es_kit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(body.sku || null, body.nombre, body.descripcion || "", body.precio_normal, body.precio_oferta || null, body.en_oferta || 0, body.oferta_limitada || 0, body.fecha_fin_oferta || null, body.stock || 0, categoriaIdPrimary, categoriasStr, body.etiquetas || null, body.es_kit || 0).run();

          const newProductId = info.meta.last_row_id;
          if (body.variantes && body.variantes.length > 0) {
              const variantStmts = body.variantes.map(v => env.DB.prepare(`INSERT INTO ProductVariants (product_id, color_name, color_hex, tallas, stock, imagen_1, imagen_2, imagen_3, imagen_4, imagen_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(newProductId, v.color_name, v.color_hex, v.tallas, v.stock || 0, v.images[0] || null, v.images[1] || null, v.images[2] || null, v.images[3] || null, v.images[4] || null));
              await env.DB.batch(variantStmts);
          }
          ctx.waitUntil(logActivity(env, adminName, 'CREAR', 'Producto', newProductId, body.nombre));
          return Response.json({ success: true, message: "Producto creado" }, { status: 201, headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      const productMatch = url.pathname.match(/^\/api\/admin\/products\/(\d+)$/);
      if (productMatch) {
        const pId = parseInt(productMatch[1], 10);
        if (request.method === "DELETE") {
          try {
            await env.DB.prepare("DELETE FROM ProductVariants WHERE product_id = ?").bind(pId).run();
            await env.DB.prepare("DELETE FROM Products WHERE id = ?").bind(pId).run();
            ctx.waitUntil(logActivity(env, adminName, 'ELIMINAR', 'Producto', pId, `ID de Producto Borrado: #${pId}`));
            return Response.json({ success: true, message: `Producto eliminado` }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
        if (request.method === "PUT") {
          try {
            const body = await request.json();
            const categoriasStr = serializeCategorias(body.categorias_ids);
            const categoriaIdPrimary = Array.isArray(body.categorias_ids) && body.categorias_ids.length > 0 ? body.categorias_ids[0] : (body.categoria_id || null);
            await env.DB.prepare(`UPDATE Products SET sku = ?, nombre = ?, descripcion = ?, precio_normal = ?, precio_oferta = ?, en_oferta = ?, oferta_limitada = ?, fecha_fin_oferta = ?, stock = ?, categoria_id = ?, categorias_ids = ?, visible = ?, etiquetas = ?, es_kit = ? WHERE id = ?`)
              .bind(body.sku || null, body.nombre, body.descripcion || null, body.precio_normal, body.precio_oferta || null, body.en_oferta || 0, body.oferta_limitada || 0, body.fecha_fin_oferta || null, body.stock || 0, categoriaIdPrimary, categoriasStr, body.visible !== undefined ? body.visible : 1, body.etiquetas || null, body.es_kit || 0, pId).run();
            await env.DB.prepare("DELETE FROM ProductVariants WHERE product_id = ?").bind(pId).run();
            if (body.variantes && body.variantes.length > 0) {
                const variantStmts = body.variantes.map(v => env.DB.prepare(`INSERT INTO ProductVariants (product_id, color_name, color_hex, tallas, stock, imagen_1, imagen_2, imagen_3, imagen_4, imagen_5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                  .bind(pId, v.color_name, v.color_hex, v.tallas, v.stock || 0, v.images[0] || null, v.images[1] || null, v.images[2] || null, v.images[3] || null, v.images[4] || null));
                await env.DB.batch(variantStmts);
            }
            ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Producto', pId, body.nombre));
            return Response.json({ success: true, message: `Producto actualizado` }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
      }

      // ---- ACTIVIDADES (solo superadmin) ----
      if (url.pathname === "/api/admin/activities" && request.method === "GET") {
        if (adminRol !== 'superadmin') return Response.json({ success: false, error: "Acceso restringido a superadmin" }, { status: 403, headers: corsHeaders });
        try {
          const { results } = await env.DB.prepare("SELECT * FROM ActivityLogs ORDER BY id DESC LIMIT 150").all();
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      // ---- CLIENTES ----
      if (url.pathname === "/api/admin/customers" && request.method === "GET") {
        try {
          const { results } = await env.DB.prepare("SELECT * FROM Customers ORDER BY fecha_registro DESC").all();
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      if (url.pathname === "/api/admin/customers" && request.method === "POST") {
        try {
          const body = await request.json();
          const existing = await env.DB.prepare("SELECT id FROM Customers WHERE email = ?").bind(body.email).first();
          if (existing) return Response.json({ success: false, error: "Correo ya registrado" }, { status: 400, headers: corsHeaders });
          const info = await env.DB.prepare(`INSERT INTO Customers (nombre, email, telefono, region, comuna, direccion) VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(body.nombre, body.email, body.telefono || null, body.region || null, body.comuna || null, body.direccion || null).run();
          ctx.waitUntil(logActivity(env, adminName, 'CREAR', 'Cliente', info.meta.last_row_id, body.nombre));
          return Response.json({ success: true, message: "Cliente creado exitosamente" }, { status: 201, headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      const customerMatch = url.pathname.match(/^\/api\/admin\/customers\/(\d+)$/);
      if (customerMatch) {
        const cId = parseInt(customerMatch[1], 10);
        if (request.method === "DELETE") {
          try {
            const ordersQuery = await env.DB.prepare("SELECT id FROM Orders WHERE customer_id = ?").bind(cId).all();
            if (ordersQuery && ordersQuery.results) {
                for (const order of ordersQuery.results) {
                    await env.DB.prepare("DELETE FROM OrderItems WHERE order_id = ?").bind(order.id).run();
                }
            }
            await env.DB.prepare("DELETE FROM Orders WHERE customer_id = ?").bind(cId).run();
            await env.DB.prepare("DELETE FROM Customers WHERE id = ?").bind(cId).run();
            ctx.waitUntil(logActivity(env, adminName, 'ELIMINAR', 'Cliente', cId, `Cliente #${cId} y su historial de compras borrado`));
            return Response.json({ success: true, message: `Cliente eliminado` }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
        if (request.method === "PUT") {
          try {
            const body = await request.json();
            await env.DB.prepare(`UPDATE Customers SET nombre = ?, email = ?, telefono = ?, region = ?, comuna = ?, direccion = ? WHERE id = ?`)
              .bind(body.nombre, body.email, body.telefono || null, body.region || null, body.comuna || null, body.direccion || null, cId).run();
            ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Cliente', cId, body.nombre));
            return Response.json({ success: true, message: `Cliente actualizado` }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
      }

      // ---- PEDIDOS ----
      if (url.pathname === "/api/admin/orders" && request.method === "GET") {
        try {
          const query = `SELECT o.*, c.nombre as cliente_nombre, c.email as cliente_email FROM Orders o LEFT JOIN Customers c ON o.customer_id = c.id ORDER BY o.fecha_creacion DESC`;
          const { results } = await env.DB.prepare(query).all();
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
      if (orderMatch) {
        const oId = parseInt(orderMatch[1], 10);
        if (request.method === "GET") {
          try {
            const order = await env.DB.prepare(`SELECT o.*, c.nombre, c.email, c.telefono, c.direccion, c.comuna, c.region FROM Orders o LEFT JOIN Customers c ON o.customer_id = c.id WHERE o.id = ?`).bind(oId).first();
            if (!order) return Response.json({success: false, error: "Pedido no encontrado"}, {status: 404, headers: corsHeaders});
            try {
              const { results: items } = await env.DB.prepare(`SELECT * FROM OrderItems WHERE order_id = ?`).bind(oId).all();
              order.items = items;
            } catch(e) { order.items = []; }
            return Response.json({success: true, data: order}, {headers: corsHeaders});
          } catch(err) { return Response.json({success: false, error: err.message}, {status:500, headers: corsHeaders}); }
        }
        if (request.method === "PUT") {
          try {
            const body = await request.json();

            // Capturar estado anterior antes de aplicar cambios
            const oldOrder = await env.DB.prepare(`SELECT estado FROM Orders WHERE id = ?`).bind(oId).first();
            const oldEstado = oldOrder?.estado;

            await env.DB.prepare(`UPDATE Orders SET estado = ?, tracking_code = ?, courier = ?, notas = ? WHERE id = ?`)
              .bind(body.estado, body.tracking_code || null, body.courier || null, body.notas || null, oId).run();

            const logDetails = `Estado: ${body.estado} | Courier: ${body.courier || 'Sin asignar'} | Tracking: ${body.tracking_code || 'Sin asignar'}`;
            ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Pedido', oId, logDetails));

            // Notificar al cliente si el estado cambió y la opción está activa
            if (body.notify_customer === true && oldEstado !== body.estado) {
              const updatedOrder = await env.DB.prepare(
                `SELECT o.*, c.nombre, c.email FROM Orders o LEFT JOIN Customers c ON o.customer_id = c.id WHERE o.id = ?`
              ).bind(oId).first();
              if (updatedOrder?.email) {
                ctx.waitUntil(sendOrderStatusChangeEmail(env, updatedOrder, updatedOrder.email, updatedOrder.nombre));
              }
            }

            return Response.json({success: true, message: "Pedido actualizado"}, {headers: corsHeaders});
          } catch(err) { return Response.json({success: false, error: err.message}, {status:500, headers: corsHeaders}); }
        }
      }

      // ---- CONFIGURACIÓN / USUARIOS ADMIN ----
      if (url.pathname === "/api/admin/users" && request.method === "GET") {
        try {
          const { results } = await env.DB.prepare("SELECT id, nombre, email, rol, fecha_creacion FROM Admins").all();
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      if (url.pathname === "/api/admin/users" && request.method === "POST") {
        try {
          const body = await request.json();
          const hashedPass = await hashPassword(body.password);
          await env.DB.prepare("INSERT INTO Admins (nombre, email, rol, password_hash) VALUES (?, ?, ?, ?)").bind(body.nombre, body.email, body.rol, hashedPass).run();
          return Response.json({ success: true, message: "Usuario creado" }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      const userMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
      if (userMatch) {
        const uId = parseInt(userMatch[1], 10);
        if (request.method === "PUT") {
          try {
            const body = await request.json();
            if (body.password) {
                const hashedPass = await hashPassword(body.password);
                await env.DB.prepare("UPDATE Admins SET nombre = ?, email = ?, rol = ?, password_hash = ? WHERE id = ?").bind(body.nombre, body.email, body.rol, hashedPass, uId).run();
            } else {
                await env.DB.prepare("UPDATE Admins SET nombre = ?, email = ?, rol = ? WHERE id = ?").bind(body.nombre, body.email, body.rol, uId).run();
            }
            return Response.json({ success: true, message: "Usuario actualizado" }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
        if (request.method === "DELETE") {
          try {
            await env.DB.prepare("DELETE FROM Admins WHERE id = ?").bind(uId).run();
            return Response.json({ success: true, message: "Usuario eliminado" }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
      }
    }

    return new Response(JSON.stringify({success: false, error: "Ruta en construcción o no encontrada."}), { status: 404, headers: corsHeaders });
  }
};
