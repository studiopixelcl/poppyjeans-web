// ============================================================================
// API BACKEND - POPPYJEANS E-COMMERCE (Inventario, Admin y Auth de Clientes)
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
  } catch (e) { return null; }
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
  } catch (_) { }
  return s.split(',').map(x => parseInt(x, 10)).filter(Boolean);
}

// Convierte un array de enteros al string JSON que se guarda en D1.
function serializeCategorias(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  return JSON.stringify(ids.map(Number).filter(Boolean));
}

// Resuelve el desfase UTC de Chile (UTC-4) para consultas SQL en SQLite.
// Convierte fechas YYYY-MM-DD locales a strings YYYY-MM-DD HH:MM:SS en UTC.
function getUtcBounds(fromStr, toStr) {
  const normDate = raw => {
    if (!raw) return null;
    const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
    return m ? `${m[3]}-${m[2]}-${m[1]}` : raw;       // → YYYY-MM-DD
  };

  const fNorm = normDate(fromStr);
  const tNorm = normDate(toStr);

  let utcFrom = null;
  let utcTo = null;

  if (fNorm) {
    utcFrom = `${fNorm} 04:00:00`;
  }

  if (tNorm) {
    const d = new Date(`${tNorm}T00:00:00Z`);
    if (!isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() + 1);
      utcTo = `${d.toISOString().slice(0, 10)} 03:59:59`;
    }
  }

  return { utcFrom, utcTo };
}

// ============================================================================
// HELPER: Subida de imagen Base64 a Cloudflare R2
// Devuelve la URL pública (PUBLIC_IMAGES_URL/key) que se guarda en D1.
// ============================================================================
async function uploadBase64ToR2(env, dataUrl, meta = {}, requestUrl = null) {
  // Parsear "data:image/jpeg;base64,XXXX..." o "data:video/mp4;base64,XXXX..."
  // Usamos un slice para evitar problemas de regex con strings muy largos
  const colonIdx = dataUrl.indexOf(':');
  const semicolonIdx = dataUrl.indexOf(';');
  const commaIdx = dataUrl.indexOf(',');
  if (colonIdx < 0 || semicolonIdx < 0 || commaIdx < 0) throw new Error('Formato Base64 inválido');
  const mime = dataUrl.slice(colonIdx + 1, semicolonIdx);
  const encoding = dataUrl.slice(semicolonIdx + 1, commaIdx);
  if (encoding !== 'base64') throw new Error('Solo se acepta encoding base64');
  const base64 = dataUrl.slice(commaIdx + 1);

  const ext = mime === 'image/jpeg' ? 'jpg'
    : mime === 'image/png' ? 'png'
      : mime === 'image/webp' ? 'webp'
        : mime === 'image/gif' ? 'gif'
          : mime === 'video/mp4' ? 'mp4'
            : mime === 'video/webm' ? 'webm'
              : 'bin';

  // Decodificar Base64 a bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return uploadBytesToR2(env, bytes, mime, ext, meta, requestUrl);
}

// ============================================================================
// HELPER: Subida de bytes binarios directos a Cloudflare R2
// Usado para uploads multipart/form-data (imágenes y videos)
// ============================================================================
async function uploadBytesToR2(env, bytes, mime, ext, meta = {}, requestUrl = null) {
  // Slug del color para URL legible
  const colorSlug = (meta.color || 'img').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'img';
  const productPart = meta.productId ? `p${meta.productId}` : 'p0';
  const rand = crypto.randomUUID().slice(0, 8);
  const folder = (mime.startsWith('video/')) ? 'videos' : 'productos';
  const key = `${folder}/${productPart}/${colorSlug}-${Date.now()}-${rand}.${ext}`;

  await env.IMAGES.put(key, bytes, {
    httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' }
  });

  let baseUrl = (env.PUBLIC_IMAGES_URL || '').replace(/\/$/, '');
  if (requestUrl) {
    const origin = new URL(requestUrl).origin;
    baseUrl = `${origin}/images`;
  }
  return `${baseUrl}/${key}`;
}

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN ADMIN
// Verifica que el token Bearer sea válido y no haya expirado (7 días)
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

async function createCustomerSession(env, customerId) {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  
  await env.DB.prepare(
    "INSERT INTO CustomerSessions (token, customer_id, expires_at) VALUES (?, ?, ?)"
  ).bind(token, customerId, expiresAt).run();
  
  return token;
}

async function verifyCustomerToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = request.headers.get('X-Customer-Token');
  }

  if (!token) return null;

  try {
    const session = await env.DB.prepare(
      `SELECT cs.*, c.email, c.nombre FROM CustomerSessions cs JOIN Customers c ON cs.customer_id = c.id WHERE cs.token = ? AND cs.expires_at > datetime('now')`
    ).bind(token).first();
    return session || null;
  } catch (e) {
    console.error("Error verificando token de cliente:", e);
    return null;
  }
}

// ============================================================================
// MÓDULO DE CORREOS (RESEND API) Y AUDITORÍA
// ============================================================================

const LOGO_URL = "https://www.poppyjeans.cl/poppyjeanslogo.png";

// 1. Correo de Bienvenida
async function sendWelcomeEmail(env, email, nombre) {
  if (!env.RESEND_API_KEY) return;

  const primerNombre = nombre.split(' ')[0];
  const htmlContent = `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFDF5; border: 1px solid #F2E6E6; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #FFFFFF; padding: 40px 30px; text-align: center; border-bottom: 2px solid #F2E6E6;">
          <img src="${LOGO_URL}" alt="PoppyJeans" style="width: 100px; height: auto; border-radius: 10px; object-fit: contain; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" />
          <h1 style="color: #8a4d4e; margin: 0; font-size: 32px; font-style: italic;">PoppyJeans</h1>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #8a4d4e; font-size: 24px; margin-top: 0;">¡Bienvenida a nuestra familia, ${primerNombre}! ✨</h2>
          <p style="color: #665c5b; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Tu cuenta ha sido creada con éxito. Desde ahora podrás guardar tus prendas favoritas en tu <b>Lista de Deseos</b>, agilizar tu paso por caja y hacer seguimiento a todos tus envíos en tiempo real.</p>
          <a href="https://www.poppyjeans.cl" style="display: inline-block; background-color: #8a4d4e; color: #FFFFFF; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-weight: bold; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">Ir de Shopping</a>
      </div>
      <div style="background-color: #fcf9f9; padding: 20px; text-align: center;">
          <p style="color: #665c5b; font-size: 12px; margin: 0;">© 2026 PoppyJeans. Moda Femenina Premium.</p>
      </div>
  </div>`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL || 'PoppyJeans <pedidos@poppyjeans.cl>', to: [email], subject: '¡Bienvenida a PoppyJeans! 💖', html: htmlContent })
    });
    if (!resendRes.ok) {
      const dataError = await resendRes.json().catch(async () => ({ raw: await resendRes.text() }));
      console.error("Error en Resend (bienvenida):", JSON.stringify(dataError));
    }
  } catch (error) { console.error("Error enviando email:", error); }
}

// 2. Correo de Confirmación de Pedido
async function sendOrderConfirmationEmail(env, customer, orderId, cart, total) {
  if (!env.RESEND_API_KEY) return;

  const primerNombre = customer.nombre.split(' ')[0];

  let itemsHtml = '';
  cart.forEach(item => {
    // Si hay URL de imagen → <img> real. Si no → cuadrado beige con emoji 📦
    // (display:flex no funciona en todos los clientes de correo; usamos text-align + padding)
    const imgCell = item.img
      ? `<img src="${item.img}" alt="${item.name}" width="65" height="65"
                    style="width:65px;height:65px;object-fit:cover;border-radius:10px;
                           display:block;border:1px solid #FCEEF2;" />`
      : `<div style="width:65px;height:65px;background-color:#F4F0EC;
                           border-radius:10px;text-align:center;
                           padding-top:14px;font-size:28px;
                           box-sizing:border-box;">📦</div>`;
    itemsHtml += `
            <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #FCEEF2; width: 75px;" valign="top">
                    ${imgCell}
                </td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #FCEEF2;" valign="middle">
                    <p style="margin: 0 0 5px 0; font-weight: bold; color: #8a4d4e; font-size: 15px; line-height: 1.3;">${item.name}</p>
                    <p style="margin: 0; color: #665c5b; font-size: 13px;">Cant: ${item.quantity}</p>
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #F2E6E6; text-align: right; font-weight: bold; color: #8a4d4e; font-size: 16px;" valign="middle">
                    ${formatCurrency(item.price * item.quantity)}
                </td>
            </tr>
        `;
  });

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFDF5; border: 1px solid #F2E6E6; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #FFFFFF; padding: 40px 30px; text-align: center; border-bottom: 2px solid #F2E6E6;">
            <img src="${LOGO_URL}" alt="PoppyJeans" style="width: 100px; height: auto; border-radius: 10px; object-fit: contain; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" />
            <h1 style="color: #8a4d4e; margin: 0; font-size: 32px; font-style: italic;">PoppyJeans</h1>
        </div>
        <div style="padding: 35px 30px;">
            <h2 style="color: #8a4d4e; font-size: 22px; margin-top: 0; text-align: center;">¡Gracias por tu compra, ${primerNombre}! 🛍️</h2>
            <p style="color: #665c5b; font-size: 15px; text-align: center;">Hemos recibido tu pedido <strong style="color: #8a4d4e;">#${orderId}</strong> exitosamente y ya comenzamos a prepararlo con mucho amor.</p>
            <div style="background-color: #FFFFFF; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #F2E6E6; box-shadow: 0 4px 15px rgba(138, 77, 78, 0.05);">
                <h3 style="color: #8a4d4e; font-size: 14px; margin-top: 0; border-bottom: 2px solid #F2E6E6; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Resumen de tu pedido</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 10px;">
                    ${itemsHtml}
                </table>
                <div style="text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #8a4d4e;">
                    Total Pagado: <span style="color: #8a4d4e; margin-left: 10px;">${formatCurrency(total)}</span>
                </div>
            </div>
            <div style="background-color: #FFFDF5; border-radius: 12px; padding: 25px; margin-bottom: 35px; border: 1px solid #d7c2c1;">
                <h3 style="color: #8a4d4e; font-size: 14px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Datos de Despacho</h3>
                <p style="margin: 0 0 5px 0; color: #665c5b; font-size: 14px;"><strong>Dirección:</strong> ${customer.direccion || 'Retiro en Tienda'}</p>
                <p style="margin: 0 0 5px 0; color: #665c5b; font-size: 14px;"><strong>Comuna:</strong> ${customer.comuna || '-'}</p>
                <p style="margin: 0; color: #665c5b; font-size: 14px;"><strong>Región:</strong> ${customer.region || '-'}</p>
            </div>
            <p style="color: #665c5b; font-size: 14px; text-align: center; font-style: italic; margin-bottom: 30px;">Te enviaremos otro correo cuando tu pedido vaya en camino junto a tu código de seguimiento.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 10px;">
                <tr>
                    <td align="center" style="padding-bottom: 15px;">
                        <a href="https://wa.me/56930338773" target="_blank" style="display: inline-block; background-color: #25D366; color: #FFFFFF; text-decoration: none; padding: 14px 25px; border-radius: 50px; font-weight: bold; font-size: 14px; width: 220px; text-align: center;">💬 Hablar por WhatsApp</a>
                    </td>
                </tr>
                <tr>
                    <td align="center">
                        <a href="https://www.instagram.com/poppyjeans/" target="_blank" style="display: inline-block; background-color: #8a4d4e; color: #FFFFFF; text-decoration: none; padding: 14px 25px; border-radius: 50px; font-weight: bold; font-size: 14px; width: 220px; text-align: center;">📸 Seguir en Instagram</a>
                    </td>
                </tr>
            </table>
        </div>
        <div style="background-color: #fcf9f9; padding: 20px; text-align: center;">
            <p style="color: #665c5b; font-size: 12px; margin: 0;">© 2026 PoppyJeans. Moda Femenina Premium.</p>
        </div>
    </div>`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL || 'PoppyJeans <pedidos@poppyjeans.cl>', to: [customer.email], subject: `Confirmación de Pedido #${orderId} 💖`, html: htmlContent })
    });
    if (!resendRes.ok) {
      const dataError = await resendRes.json().catch(async () => ({ raw: await resendRes.text() }));
      console.error("Error en Resend (confirmación):", JSON.stringify(dataError));
    }
  } catch (error) { console.error("Error enviando email de compra:", error); }
}

// 3. Correo de Cambio de Estado de Pedido
// 3. Correo de Cambio de Estado de Pedido
async function sendOrderStatusChangeEmail(env, order, customerEmail, customerName, customerNote = '') {
  if (!env.RESEND_API_KEY) return;

  const primerNombre = (customerName || 'Cliente').split(' ')[0];
  const estado = order.estado;
  const orderId = order.id;

  const statusLabels = {
    'Pendiente': { label: 'Pendiente de Pago', emoji: '🟡', color: '#D4AC0D', bg: '#FEF9E7' },
    'Pagado': { label: 'Pago Confirmado', emoji: '🔵', color: '#8a4d4e', bg: '#ffdad9' },
    'Preparando': { label: 'En Preparación', emoji: '🟣', color: '#8E44AD', bg: '#F4ECF7' },
    'En Tránsito': { label: 'En Tránsito', emoji: '🚛', color: '#2980B9', bg: '#EBF5FB' },
    'Enviado': { label: 'En Camino', emoji: '🚚', color: '#1ABC9C', bg: '#E8F8F5' },
    'Entregado': { label: 'Entregado', emoji: '✅', color: '#27AE60', bg: '#EAFAF1' },
    'Cancelado': { label: 'Cancelado', emoji: '🔴', color: '#E74C3C', bg: '#FDEDEC' },
  };
  const statusMessages = {
    'Pendiente': 'Tu pedido está pendiente de confirmación de pago.',
    'Pagado': '¡Tu pago ha sido confirmado! Ya comenzamos a revisar tu pedido.',
    'Preparando': '¡Estamos preparando tu pedido con mucho amor y cuidado!',
    'En Tránsito': '¡Tu pedido se encuentra en tránsito! Ya va en camino hacia la comuna de destino.',
    'Enviado': '¡Tu pedido fue despachado y pronto llegará a tus manos!',
    'Entregado': '¡Tu pedido fue entregado! Esperamos que les encanten las prendas.',
    'Cancelado': 'Tu pedido ha sido cancelado. Si tienes preguntas, contáctanos.',
  };
  const subjectLabels = {
    'Pendiente': `Pedido #${orderId} — Pendiente de Pago`,
    'Pagado': `¡Pedido #${orderId} confirmado! 💖`,
    'Preparando': `Tu pedido #${orderId} está en preparación 🎀`,
    'En Tránsito': `Tu pedido #${orderId} está en tránsito 🚛`,
    'Enviado': `¡Tu pedido #${orderId} está en camino! 🚚`,
    'Entregado': `¡Pedido #${orderId} entregado con éxito! ✨`,
    'Cancelado': `Pedido #${orderId} cancelado`,
  };

  const si = statusLabels[estado] || { label: estado, emoji: '📦', color: '#8a4d4e', bg: '#FFFDF5' };
  const statusMsg = statusMessages[estado] || 'El estado de tu pedido ha sido actualizado.';
  const subject = subjectLabels[estado] || `Actualización de tu pedido #${orderId}`;

  // Bloque de tracking — si está Enviado o En Tránsito y tiene número
  let trackingHtml = '';
  if ((estado === 'Enviado' || estado === 'En Tránsito') && order.tracking_code) {
    const tc = order.tracking_code;
    const courier = order.courier || '';
    const courierUrls = {
      'Blue Express': `https://www.blue.cl/seguimiento/?codigo=${tc}`,
      'Starken': `https://www.starken.cl/seguimiento?codigo=${tc}`,
      'Chilexpress': `https://www.chilexpress.cl/Views/Chilexpress/Estado-envio.aspx?DATA=${tc}`,
      'Correos de Chile': `https://www.correos.cl/web/guest/seguimiento-en-linea?tracking_number=${tc}`,
    };
    const trackingUrl = courierUrls[courier];

    if (trackingUrl) {
      trackingHtml = `
            <div style="text-align:center; margin:25px 0;">
                <p style="color:#665c5b; font-size:14px; margin-bottom:5px;">Tu número de seguimiento:</p>
                <p style="font-family:monospace; font-size:20px; font-weight:bold; color:#8a4d4e; margin:0 0 15px 0; letter-spacing:2px;">${tc}</p>
                <a href="${trackingUrl}" target="_blank" style="display:inline-block; background-color:#8a4d4e; color:#FFFFFF; text-decoration:none; padding:14px 35px; border-radius:50px; font-weight:bold; font-size:14px; letter-spacing:1px;">🔍 Rastrear con ${courier}</a>
            </div>`;
    } else {
      trackingHtml = `
            <div style="text-align:center; margin:25px 0; background:#fcf9f9; border-radius:12px; padding:20px; border:1px solid #F2E6E6;">
                <p style="color:#665c5b; font-size:14px; margin-bottom:5px;">Tu número de seguimiento:</p>
                <p style="font-family:monospace; font-size:22px; font-weight:bold; color:#8a4d4e; margin:0; letter-spacing:2px;">${tc}</p>
                ${courier && courier !== 'Otro' ? `<p style="color:#665c5b; font-size:13px; margin:10px 0 0 0;">Courier: ${courier}</p>` : ''}
            </div>`;
    }
  }

  // Bloque de nota para el cliente
  let customerNoteHtml = '';
  if (customerNote && String(customerNote).trim()) {
    const escapedNote = String(customerNote)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    customerNoteHtml = `
      <div style="background-color:#FDF8F7; border-left:4px solid #8a4d4e; padding:16px; border-radius:10px; margin:20px 0; text-align:left;">
          <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#8a4d4e; text-transform:uppercase; letter-spacing:1px;">✉️ Mensaje de Poppy Jeans:</p>
          <p style="margin:0; font-size:14px; color:#211a19; line-height:1.6;">${escapedNote}</p>
      </div>`;
  }

  const htmlContent = `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; max-width:600px; margin:0 auto; background-color:#FFFDF5; border:1px solid #F2E6E6; border-radius:16px; overflow:hidden;">
        <div style="background-color:#FFFFFF; padding:35px 30px; text-align:center; border-bottom:2px solid #F2E6E6;">
            <img src="${LOGO_URL}" alt="PoppyJeans" style="width:100px; height:auto; border-radius:10px; object-fit:contain; margin-bottom:15px; display:block; margin-left:auto; margin-right:auto;" />
            <h1 style="color:#8a4d4e; margin:0; font-size:32px; font-style:italic;">PoppyJeans</h1>
        </div>
        <div style="padding:35px 30px; text-align:center;">
            <div style="display:inline-block; background-color:${si.bg}; color:${si.color}; padding:10px 25px; border-radius:50px; font-weight:bold; font-size:15px; margin-bottom:25px; border:1px solid ${si.color};">
                ${si.emoji} ${si.label}
            </div>
            <h2 style="color:#8a4d4e; font-size:22px; margin-top:0;">Actualización de tu pedido #${orderId}</h2>
            <p style="color:#665c5b; font-size:16px; line-height:1.6; margin-bottom:10px;">Hola <strong style="color:#8a4d4e;">${primerNombre}</strong>,</p>
            <p style="color:#665c5b; font-size:15px; line-height:1.6; margin-bottom:15px;">${statusMsg}</p>
            ${customerNoteHtml}
            ${trackingHtml}
        </div>
        <div style="padding:0 30px 30px 30px; text-align:center;">
            <a href="https://wa.me/56930338773" target="_blank" style="display:inline-block; background-color:#25D366; color:#FFFFFF; text-decoration:none; padding:14px 25px; border-radius:50px; font-weight:bold; font-size:14px;">💬 ¿Tienes preguntas? Escríbenos</a>
        </div>
        <div style="background-color:#fcf9f9; padding:20px; text-align:center;">
            <p style="color:#665c5b; font-size:12px; margin:0;">© 2026 PoppyJeans. Moda Femenina Premium.</p>
        </div>
    </div>`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL || 'PoppyJeans <pedidos@poppyjeans.cl>', to: [customerEmail], subject, html: htmlContent })
    });
    if (!resendRes.ok) {
      const dataError = await resendRes.json().catch(async () => ({ raw: await resendRes.text() }));
      console.error("Error en Resend (cambio de estado):", JSON.stringify(dataError));
    }
  } catch (error) { console.error("Error enviando email de cambio de estado:", error); }
}

// 4. Registro de Actividades (Caja Negra)
async function logActivity(env, adminName, action, entityType, entityId, details) {
  try {
    const santiagoDate = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
    await env.DB.prepare(`INSERT INTO ActivityLogs (admin_name, action, entity_type, entity_id, details, fecha) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(adminName, action, entityType, String(entityId), details, santiagoDate).run();
  } catch (e) { console.error("Error registrando actividad", e); }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Customer-Token",
};

// Respuesta de error de autenticación estándar
const unauthorizedResponse = (headers) => Response.json(
  { success: false, error: "No autorizado. Sesión inválida o expirada." },
  { status: 401, headers: headers || corsHeaders }
);

let dbInitialized = false;

async function ensureSchema(env) {
  if (dbInitialized) return;
  try {
    // 1. Crear tabla Coupons
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS Coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        descuento_porcentaje REAL NOT NULL,
        activo INTEGER DEFAULT 1,
        mostrar_en_banner INTEGER DEFAULT 0,
        fecha_inicio TEXT,
        fecha_fin TEXT,
        productos_ids TEXT,
        fecha_creacion TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 1.5. Crear tabla CustomerSessions
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS CustomerSessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE CASCADE
      )
    `).run();

    // 2. Modificar tabla Orders de forma defensiva
    try {
      await env.DB.prepare("ALTER TABLE Orders ADD COLUMN coupon_code TEXT").run();
    } catch (_) {}
    try {
      await env.DB.prepare("ALTER TABLE Orders ADD COLUMN discount_amount REAL DEFAULT 0").run();
    } catch (_) {}

    try {
      await env.DB.prepare("ALTER TABLE Products ADD COLUMN bestseller INTEGER DEFAULT 0").run();
    } catch (_) {}
    try {
      await env.DB.prepare("ALTER TABLE Products ADD COLUMN video_url TEXT").run();
    } catch (_) {}
    try {
      await env.DB.prepare("ALTER TABLE Products ADD COLUMN is_clearance INTEGER DEFAULT 0").run();
    } catch (_) {}
    try {
      await env.DB.prepare("ALTER TABLE ProductVariants ADD COLUMN video_url TEXT").run();
    } catch (_) {}

    dbInitialized = true;
  } catch (err) {
    console.error("Error al inicializar esquema de base de datos:", err);
  }
}

export default {
  async fetch(request, env, ctx) {
    // Dynamic CORS Headers for the current request
    const origin = request.headers.get("Origin") || "";
    let allowedOrigin = "https://www.poppyjeans.cl";
    if (
      origin === "https://www.poppyjeans.cl" ||
      origin === "https://poppyjeans.cl" ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("file://")
    ) {
      allowedOrigin = origin;
    }
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Customer-Token",
    };

    await ensureSchema(env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (url.pathname === "/" && request.method === "GET") return new Response("¡API de PoppyJeans Operativa!", { status: 200, headers: corsHeaders });

    // Servir imágenes y videos de R2 directamente a través del Worker
    if (url.pathname.startsWith("/images/") && request.method === "GET") {
      try {
        if (!env.IMAGES) return new Response("R2 not configured", { status: 500, headers: corsHeaders });
        const key = decodeURIComponent(url.pathname.substring(8)); // quitar "/images/"
        const rangeHeader = request.headers.get("Range");
        const headers = new Headers();

        if (rangeHeader) {
          const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
          if (match) {
            const start = parseInt(match[1], 10);
            const end = match[2] ? parseInt(match[2], 10) : undefined;
            const object = await env.IMAGES.get(key, { 
              range: { offset: start, length: end !== undefined ? (end - start + 1) : undefined } 
            });
            if (object) {
              object.writeHttpMetadata(headers);
              headers.set("Access-Control-Allow-Origin", "*");
              headers.set("Content-Range", `bytes ${start}-${end !== undefined ? end : (object.size - 1)}/${object.size}`);
              headers.set("Accept-Ranges", "bytes");
              if (!headers.has("Cache-Control")) {
                headers.set("Cache-Control", "public, max-age=31536000, immutable");
              }
              return new Response(object.body, { status: 206, headers });
            }
          }
        }

        const object = await env.IMAGES.get(key);
        if (!object) return new Response("Image Not Found", { status: 404, headers: corsHeaders });

        object.writeHttpMetadata(headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Accept-Ranges", "bytes");
        if (!headers.has("Cache-Control")) {
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        return new Response(object.body, { headers });
      } catch (error) {
        return new Response(error.message, { status: 500, headers: corsHeaders });
      }
    }

    // ========================================================================
    // INTERCEPTOR OPEN GRAPH DINÁMICO (WhatsApp, Facebook, Twitter, Telegram)
    // Inyecta título, descripción y primera imagen de variante para links de producto
    // ========================================================================
    if ((url.pathname === "/producto.html" || url.pathname === "/producto") && url.searchParams.has("id")) {
      const productId = parseInt(url.searchParams.get("id"), 10);
      const requestedVariant = url.searchParams.get("variant") || url.searchParams.get("v") || url.searchParams.get("color");

      try {
        if (productId && env.DB) {
          const product = await env.DB.prepare("SELECT * FROM Products WHERE id = ?").bind(productId).first();
          if (product) {
            const variantsRes = await env.DB.prepare("SELECT * FROM ProductVariants WHERE product_id = ? ORDER BY id ASC").bind(productId).all();
            const variants = (variantsRes && variantsRes.results) ? variantsRes.results : [];

            let selectedVariant = null;
            if (variants.length > 0) {
              if (requestedVariant) {
                selectedVariant = variants.find(v => (v.color_name && v.color_name.toLowerCase() === requestedVariant.toLowerCase()) || String(v.id) === requestedVariant);
              }
              if (!selectedVariant) selectedVariant = variants[0];
            }

            let ogImg = null;
            if (selectedVariant) {
              ogImg = selectedVariant.imagen_1 || selectedVariant.imagen_2 || selectedVariant.imagen_3 || selectedVariant.imagen_url;
              if (!ogImg && selectedVariant.fotos) {
                try {
                  const arr = JSON.parse(selectedVariant.fotos);
                  if (Array.isArray(arr) && arr.length > 0) ogImg = arr[0];
                } catch (_) {}
              }
            }
            if (!ogImg && product.imagen_url) ogImg = product.imagen_url;
            if (!ogImg) ogImg = "https://poppyjeans.cl/media/og-logo.jpg";

            const colorLabel = (selectedVariant && selectedVariant.color_name) ? ` (${selectedVariant.color_name})` : "";
            const pageTitle = `${product.nombre}${colorLabel} | Poppy Jeans`;
            const rawDesc = product.description || product.descripcion || "Descubre el calce perfecto con nuestra colección de Denim Premium y Alta Costura. Envíos a todo Chile.";
            const pageDesc = rawDesc.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, 200);
            const pageUrl = request.url;

            let originResponse = null;
            if (env.ASSETS) {
              originResponse = await env.ASSETS.fetch(request);
            } else {
              const fetchUrl = new URL("/producto.html", request.url);
              originResponse = await fetch(fetchUrl.toString(), { headers: request.headers });
            }

            if (originResponse && originResponse.ok) {
              const rewriter = new HTMLRewriter()
                .on('title', { element(e) { e.setInnerContent(pageTitle); } })
                .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', pageTitle); } })
                .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', pageTitle); } })
                .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', pageDesc); } })
                .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', pageDesc); } })
                .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', ogImg); } })
                .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', ogImg); } })
                .on('meta[property="og:url"]', { element(e) { e.setAttribute('content', pageUrl); } })
                .on('meta[name="twitter:url"]', { element(e) { e.setAttribute('content', pageUrl); } });

              return rewriter.transform(originResponse);
            }
          }
        }
      } catch (ogErr) {
        console.error("Error injectando Open Graph tags:", ogErr);
      }
    }

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
        const sessionToken = await createCustomerSession(env, customer.id);
        return Response.json({ success: true, token: sessionToken, customer: { id: customer.id, nombre: customer.nombre, email: customer.email } }, { headers: corsHeaders });
      } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      try {
        const { nombre, email, password } = await request.json();
        const existing = await env.DB.prepare("SELECT id FROM Customers WHERE email = ?").bind(email).first();
        if (existing) return Response.json({ success: false, error: "Correo ya registrado." }, { status: 400, headers: corsHeaders });

        const hashedPass = await hashPassword(password);
        const info = await env.DB.prepare("INSERT INTO Customers (nombre, email, password_hash) VALUES (?, ?, ?)").bind(nombre, email, hashedPass).run();
        const customerId = info.meta.last_row_id;
        ctx.waitUntil(sendWelcomeEmail(env, email, nombre));

        const sessionToken = await createCustomerSession(env, customerId);
        return Response.json({ success: true, token: sessionToken, customer: { id: customerId, nombre, email } }, { headers: corsHeaders });
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

        const sessionToken = await createCustomerSession(env, customer.id);
        return Response.json({ success: true, token: sessionToken, customer: { id: customer.id, nombre: customer.nombre, email: customer.email, telefono: customer.telefono, direccion: customer.direccion, comuna: customer.comuna, region: customer.region } }, { headers: corsHeaders });
      } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    if (url.pathname === "/api/shipping/quote" && request.method === "POST") {
      try {
        const { region, comuna, cart } = await request.json();

        // Sumar peso total del carrito; default 500g por item si no tiene weight
        let totalWeightGrams = 0;
        if (Array.isArray(cart) && cart.length > 0) {
          for (const item of cart) {
            const w = (typeof item.weight === 'number' && item.weight > 0) ? item.weight : 500;
            totalWeightGrams += w * (item.quantity || 1);
          }
        }

        // Tallas Blue Express (en gramos)
        let tier;
        if (totalWeightGrams < 500) tier = 'XS';
        else if (totalWeightGrams < 3000) tier = 'S';
        else if (totalWeightGrams < 6000) tier = 'M';
        else tier = 'L';

        // Zonas tarifarias — valores exactos del <select> en checkout.html
        const CENTRAL = ["Valparaíso", "O'Higgins", "Maule", "Coquimbo", "Ñuble", "Biobío"];
        const REMOTE = ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"];

        // Tarifas Blue Express por zona y talla (CLP)
        const PRICING = {
          RM: { XS: 3100, S: 3650, M: 4700, L: 5700 },
          Central: { XS: 3900, S: 4300, M: 7000, L: 9600 },
          Remote: { XS: 6000, S: 7500, M: 10000, L: 15000 },
        };

        let zone;
        if (region === "Región Metropolitana") zone = 'RM';
        else if (REMOTE.includes(region)) zone = 'Remote';
        else zone = 'Central';

        const cost = PRICING[zone][tier];
        return Response.json({ success: true, courier: 'Blue Express', cost, weight: totalWeightGrams }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ---- PERSONAL SHOPPER CHATPROXY ----
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { message, catalog } = await request.json();
        if (!message) {
          return Response.json({ success: false, error: "Falta el mensaje." }, { status: 400, headers: corsHeaders });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return Response.json({ success: false, error: "Personal Shopper temporalmente fuera de servicio." }, { status: 503, headers: corsHeaders });
        }

        const systemPrompt = `Eres un Personal Shopper de Poppy Jeans. Catálogo JSON: ${JSON.stringify(catalog || [])}. Consulta del cliente: "${message}". Recomienda 1 o 2 productos exactos. Menciona las tallas y colores que tenemos disponibles según el catálogo. Usa un formato de lista en HTML simple. Sé cordial y empático.`;
        const payload = { 
          contents: [{ parts: [{ text: message }] }], 
          systemInstruction: { parts: [{ text: systemPrompt }] } 
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          return Response.json({ success: true, text: data.candidates[0].content.parts[0].text }, { headers: corsHeaders });
        } else {
          return Response.json({ success: false, error: "No se pudo generar respuesta.", details: data }, { status: 502, headers: corsHeaders });
        }
      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ---- VER BANNER DE CUPÓN DE DESCUENTO ACTIVO ----
    if (url.pathname === "/api/coupons/banner" && request.method === "GET") {
      try {
        const nowIso = new Date().toISOString();
        const query = `
          SELECT * FROM Coupons 
          WHERE activo = 1 AND mostrar_en_banner = 1
          ORDER BY id DESC
        `;
        const { results } = await env.DB.prepare(query).all();
        
        const validCoupon = (results || []).find(coupon => {
          if (coupon.fecha_inicio && nowIso < coupon.fecha_inicio) return false;
          if (coupon.fecha_fin && nowIso > coupon.fecha_fin) return false;
          return true;
        });

        if (validCoupon) {
          return Response.json({ 
            success: true, 
            coupon: {
              codigo: validCoupon.codigo,
              descuento_porcentaje: validCoupon.descuento_porcentaje,
              fecha_fin: validCoupon.fecha_fin,
              productos_ids: validCoupon.productos_ids
            }
          }, { headers: corsHeaders });
        }
        
        return Response.json({ success: true, coupon: null }, { headers: corsHeaders });
      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ---- VALIDAR CUPÓN DE DESCUENTO ----
    if (url.pathname === "/api/coupons/validate" && request.method === "POST") {
      try {
        const { code, cart } = await request.json();
        if (!code) {
          return Response.json({ success: false, error: "invalid_code", message: "Código de cupón requerido." }, { status: 400, headers: corsHeaders });
        }

        const coupon = await env.DB.prepare("SELECT * FROM Coupons WHERE codigo = ?").bind(code.trim().toUpperCase()).first();
        if (!coupon) {
          return Response.json({ success: false, error: "not_found", message: "El cupón ingresado no existe." }, { headers: corsHeaders });
        }

        if (coupon.activo !== 1) {
          return Response.json({ success: false, error: "inactive", message: "Este cupón se encuentra inactivo." }, { headers: corsHeaders });
        }

        const nowIso = new Date().toISOString();
        if (coupon.fecha_inicio && nowIso < coupon.fecha_inicio) {
          return Response.json({ success: false, error: "not_started", message: "Este cupón aún no está disponible para su uso." }, { headers: corsHeaders });
        }

        if (coupon.fecha_fin && nowIso > coupon.fecha_fin) {
          return Response.json({ success: false, error: "expired", message: "Este cupón ha expirado." }, { headers: corsHeaders });
        }

        let applyToAll = true;
        let allowedProductIds = [];
        if (coupon.productos_ids) {
          try {
            allowedProductIds = JSON.parse(coupon.productos_ids);
            if (Array.isArray(allowedProductIds) && allowedProductIds.length > 0) {
              applyToAll = false;
            }
          } catch (e) {}
        }

        let eligibleItems = [];
        if (!applyToAll) {
          if (!Array.isArray(cart) || cart.length === 0) {
            return Response.json({ success: false, error: "empty_cart", message: "El carrito está vacío." }, { headers: corsHeaders });
          }

          cart.forEach(item => {
            const parts = item.id.split('_');
            const originalProductId = parseInt(parts[1], 10);
            
            if (allowedProductIds.includes(originalProductId)) {
              eligibleItems.push(item.id);
            }
          });

          if (eligibleItems.length === 0) {
            return Response.json({ 
              success: false, 
              error: "no_matching_products", 
              message: "Este cupón no aplica a los productos en tu carrito." 
            }, { headers: corsHeaders });
          }
        }

        return Response.json({
          success: true,
          coupon: {
            codigo: coupon.codigo,
            descuento_porcentaje: coupon.descuento_porcentaje,
            apply_to_all: applyToAll,
            eligible_items: applyToAll ? null : eligibleItems
          }
        }, { headers: corsHeaders });

      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname === "/api/checkout" && request.method === "POST") {
      try {
        const { customer, cart, total, shipping_cost, resume_order_id, coupon_code, discount_amount } = await request.json();

        let cust = await env.DB.prepare("SELECT id FROM Customers WHERE email = ?").bind(customer.email).first();
        let customerId;
        if (!cust) {
          const info = await env.DB.prepare("INSERT INTO Customers (nombre, email, telefono, direccion, comuna, region) VALUES (?, ?, ?, ?, ?, ?)").bind(customer.nombre, customer.email, customer.telefono || null, customer.direccion || null, customer.comuna || null, customer.region || null).run();
          customerId = info.meta.last_row_id;
        } else {
          customerId = cust.id;
          await env.DB.prepare("UPDATE Customers SET nombre = ?, telefono = ?, direccion = ?, comuna = ?, region = ? WHERE id = ?").bind(customer.nombre, customer.telefono || null, customer.direccion || null, customer.comuna || null, customer.region || null, customerId).run();
        }

        // shipping_cost: costo de envío calculado por /api/shipping/quote y enviado desde el frontend de checkout.
        const shippingCostSafe = (typeof shipping_cost === 'number' && shipping_cost >= 0) ? shipping_cost : 0;

        // VALIDACION DEFENSIVA DE STOCK PREVIA A TRANSBANK
        if (cart && Array.isArray(cart)) {
          for (const item of cart) {
            const parts = item.id.split('_');
            const variantId = parts[2] ? parseInt(parts[2], 10) : null;
            if (variantId) {
              const variant = await env.DB.prepare("SELECT stock, tallas FROM ProductVariants WHERE id = ?").bind(variantId).first();
              if (!variant) {
                return Response.json({ success: false, error: 'stock_insufficient', item_id: item.id, max_available: 0, message: `El producto ${item.name} ya no existe o fue retirado.` }, { status: 409, headers: corsHeaders });
              }
              
              let maxAvailable = 0;
              try {
                if (variant.tallas) {
                  const parsedTallas = JSON.parse(variant.tallas);
                  if (item.kitSizes && typeof item.kitSizes === 'object' && !Array.isArray(item.kitSizes)) {
                    if (typeof parsedTallas === 'object' && !Array.isArray(parsedTallas)) {
                      let minComponentStock = Infinity;
                      for (const [pieza, talla] of Object.entries(item.kitSizes)) {
                        const compTallas = parsedTallas[pieza];
                        const matchTalla = Array.isArray(compTallas) ? compTallas.find(t => t.size === talla) : null;
                        const qty = matchTalla ? (Number(matchTalla.stock) || 0) : 0;
                        if (qty < minComponentStock) minComponentStock = qty;
                      }
                      maxAvailable = minComponentStock === Infinity ? 0 : minComponentStock;
                    } else {
                      maxAvailable = 0;
                    }
                  } else {
                    const sizeRaw = parts.slice(3).join('_');
                    if (sizeRaw && sizeRaw !== 'u' && Array.isArray(parsedTallas)) {
                      const matchTalla = parsedTallas.find(t => t.size === sizeRaw);
                      maxAvailable = matchTalla ? (Number(matchTalla.stock) || 0) : 0;
                    } else {
                      maxAvailable = Number(variant.stock) || 0;
                    }
                  }
                } else {
                  maxAvailable = Number(variant.stock) || 0;
                }
              } catch(e) {
                maxAvailable = Number(variant.stock) || 0;
              }

              if (item.quantity > maxAvailable) {
                return Response.json({ 
                  success: false, 
                  error: 'stock_insufficient', 
                  item_id: item.id,
                  max_available: maxAvailable,
                  message: `Stock insuficiente para "${item.name}". Solo quedan ${maxAvailable} unidades disponibles.` 
                }, { status: 409, headers: corsHeaders });
              }
            }
          }
        }

        let orderId;
        if (resume_order_id) {
          // ── REANUDAR PAGO DE UNA ORDEN EXISTENTE ───────────────────────────
          // El cliente vuelve a pagar una orden que quedó 'Pendiente'. Sus
          // OrderItems YA existen, por lo que NO se insertan de nuevo (evita
          // duplicar la orden). Solo se refresca total/envío y se reabre Webpay
          // reutilizando el mismo buy_order. /api/checkout/confirm la marcará
          // 'Pagado' y descontará stock una sola vez.
          const existing = await env.DB.prepare(
            "SELECT id, estado FROM Orders WHERE id = ? AND customer_id = ?"
          ).bind(resume_order_id, customerId).first();
          if (!existing) {
            return Response.json({ success: false, error: 'La orden a reanudar no existe o no pertenece a este cliente' }, { status: 404, headers: corsHeaders });
          }
          const estResume = (existing.estado || '').toLowerCase();
          if (!estResume.includes('pendiente') && !estResume.includes('sin pagar')) {
            return Response.json({ success: false, error: `La orden #${resume_order_id} ya no está pendiente de pago (estado actual: ${existing.estado}).` }, { status: 409, headers: corsHeaders });
          }
          await env.DB.prepare("UPDATE Orders SET total = ?, shipping_cost = ?, coupon_code = ?, discount_amount = ? WHERE id = ?")
            .bind(total, shippingCostSafe, coupon_code || null, discount_amount || 0, resume_order_id).run();
          orderId = resume_order_id;
        } else {
          // La orden nace 'Pendiente'. Solo pasa a 'Pagado' tras la confirmación AUTHORIZED en /api/checkout/confirm.
          const orderInfo = await env.DB.prepare("INSERT INTO Orders (customer_id, total, shipping_cost, estado, coupon_code, discount_amount) VALUES (?, ?, ?, 'Pendiente', ?, ?)")
            .bind(customerId, total, shippingCostSafe, coupon_code || null, discount_amount || 0).run();
          orderId = orderInfo.meta.last_row_id;

          if (cart && cart.length > 0) {
            const itemStmts = cart.map(item => {
              // ID formato: "cart_{productId}_{variantId}_{...size}"
              const parts = item.id.split('_');
              const originalProductId = parts[1] || null;
              const variantId = parts[2] ? (parseInt(parts[2]) || null) : null;
              // Kit: el frontend adjunta item.kitSizes = { bata:"M", sosten:"44" }.
              // Se serializa como JSON y se guarda en variant_details para que el
              // Paso 3 del webhook pueda descontar cada componente de forma granular.
              // Normal: se extrae la talla del ID y se guarda como "Talla: X" / "Estándar".
              let variantDetail;
              if (item.kitSizes && typeof item.kitSizes === 'object' && !Array.isArray(item.kitSizes)) {
                variantDetail = JSON.stringify(item.kitSizes); // ej. '{"bata":"M","sosten":"44"}'
              } else {
                const sizeRaw = parts.slice(3).join('_');
                variantDetail = (sizeRaw && sizeRaw !== 'u') ? `Talla: ${sizeRaw}` : 'Estándar';
              }
              // Guardar la imagen de la variante directamente; descartar rutas relativas.
              const imgUrl = (item.img && !item.img.startsWith('./') && !item.img.startsWith('../')) ? item.img : null;
              return env.DB.prepare(
                "INSERT INTO OrderItems (order_id, product_id, variant_id, product_name, variant_details, cantidad, precio_unitario, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
              ).bind(orderId, originalProductId, variantId, item.name, variantDetail, item.quantity, item.price, imgUrl);
            });
            try {
              await env.DB.batch(itemStmts);
            } catch (batchErr) {
              // Si falla el batch de items, cancelar la orden para no dejarla huérfana
              await env.DB.prepare("UPDATE Orders SET estado = 'Cancelado' WHERE id = ?").bind(orderId).run();
              return Response.json({ success: false, error: `Error al guardar productos del pedido: ${batchErr.message}` }, { status: 500, headers: corsHeaders });
            }
          }
        }

        // Crear transacción en Webpay Plus (Entorno INTEGRACIÓN / CERTIFICACIÓN: 597055555532).
        const TBK_API_KEY_ID = env.TBK_API_KEY_ID || '597055555532';
        const TBK_API_KEY_SECRET = env.TBK_API_KEY_SECRET || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';
        const TBK_BASE = env.TBK_BASE_URL || 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions';

        const tbkRes = await fetch(TBK_BASE, {
          method: 'POST',
          headers: {
            'Tbk-Api-Key-Id': TBK_API_KEY_ID,
            'Tbk-Api-Key-Secret': TBK_API_KEY_SECRET,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            buy_order: String(orderId),
            session_id: String(customerId),
            amount: total,
            return_url: url.origin + "/api/checkout/confirm"
          })
        });

        const tbkResponse = await tbkRes.json();
        if (!tbkRes.ok || !tbkResponse.url || !tbkResponse.token) {
          await env.DB.prepare("UPDATE Orders SET estado = 'Cancelado' WHERE id = ?").bind(orderId).run();
          return Response.json({ success: false, error: tbkResponse.error_message || 'No se pudo iniciar la transacción en Webpay', tbk: tbkResponse }, { status: 502, headers: corsHeaders });
        }

        return Response.json({ success: true, tbk_url: tbkResponse.url, tbk_token: tbkResponse.token, order_id: orderId }, { headers: corsHeaders });
      } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    // Confirmación de Webpay: Transbank redirige al cliente aquí con ?token_ws=...
    if (url.pathname === "/api/checkout/confirm" && (request.method === "GET" || request.method === "POST")) {
      try {
        // Webpay puede enviar token_ws por query (GET) o por form-urlencoded (POST).
        let token_ws = url.searchParams.get('token_ws');
        if (!token_ws && request.method === "POST") {
          try {
            const form = await request.formData();
            token_ws = form.get('token_ws');
          } catch (_) { }
        }

        const FRONTEND_URL = env.FRONTEND_URL || 'https://poppyjeans.cl';

        // Pago abortado por el usuario o token ausente.
        if (!token_ws) {
          return Response.redirect(FRONTEND_URL + "/checkout.html?status=aborted", 302);
        }

        const TBK_API_KEY_ID = env.TBK_API_KEY_ID || '597055555532';
        const TBK_API_KEY_SECRET = env.TBK_API_KEY_SECRET || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';
        const TBK_BASE = env.TBK_BASE_URL || 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions';

        const confirmRes = await fetch(`${TBK_BASE}/${token_ws}`, {
          method: 'PUT',
          headers: {
            'Tbk-Api-Key-Id': TBK_API_KEY_ID,
            'Tbk-Api-Key-Secret': TBK_API_KEY_SECRET,
            'Content-Type': 'application/json'
          }
        });
        const tbkData = await confirmRes.json();

        const orderId = parseInt(tbkData.buy_order, 10);
        const order = orderId ? await env.DB.prepare(`SELECT o.*, c.nombre, c.email, c.telefono, c.direccion, c.comuna, c.region FROM Orders o LEFT JOIN Customers c ON o.customer_id = c.id WHERE o.id = ?`).bind(orderId).first() : null;

        if (tbkData.status === 'AUTHORIZED' && order) {
          await env.DB.prepare("UPDATE Orders SET estado = 'Pagado' WHERE id = ?").bind(order.id).run();

          // ── DESCUENTO DE INVENTARIO ────────────────────────────────────────────
          // Esquema confirmado (admin/index.html línea 1588):
          //   Producto normal → tallas = JSON array  [{ size: "3-6M", stock: 5 }, ...]
          //   Producto kit    → tallas = JSON object { bata:[{size,stock}], ... }
          // El cart ID usa el valor de `s.size` como segmento de talla (producto.html línea 1067).
          // Kits codifican todas las tallas con join('-') → "M-44"; no recuperables en backend.
          try {
            const { results: stockItems } = await env.DB.prepare(
              "SELECT product_id, variant_id, variant_details, cantidad FROM OrderItems WHERE order_id = ?"
            ).bind(order.id).all();

            console.log(`[Stock] Pedido #${order.id} — iniciando descuento para ${(stockItems || []).length} ítem(s)`);

            // Dump explícito de cada fila para diagnosticar problemas en producción.
            // Si un ítem llega con product_id=NULL, variant_id=NULL o variant_details="",
            // este log mostrará la fila completa en el dashboard de Cloudflare.
            (stockItems || []).forEach((item, i) => {
              console.log(`[Stock] Pedido #${order.id} · ítem ${i + 1}/${stockItems.length}:`,
                JSON.stringify({
                  product_id: item.product_id,
                  variant_id: item.variant_id,
                  variant_details: item.variant_details,
                  cantidad: item.cantidad,
                  is_kit_format: !!(item.variant_details && item.variant_details.startsWith('{')),
                  has_talla_prefix: !!(item.variant_details && /^Talla:/.test(item.variant_details)),
                })
              );
            });

            if (stockItems && stockItems.length > 0) {

              // ── PASO 1: Products.stock (global del producto) ─────────────────
              await Promise.all(stockItems.map(async item => {
                if (!item.product_id) return;
                const row = await env.DB.prepare("SELECT stock FROM Products WHERE id = ?").bind(item.product_id).first();
                const antes = row?.stock ?? 0;
                const despues = Math.max(0, antes - item.cantidad);
                await env.DB.prepare("UPDATE Products SET stock = MAX(0, stock - ?) WHERE id = ?")
                  .bind(item.cantidad, item.product_id).run();
                console.log(`[Stock] Paso1 | Producto #${item.product_id} | antes=${antes} | -${item.cantidad} | después=${despues}`);
              }));

              // ── PASO 2: ProductVariants.stock (stock del color / variante) ───
              await Promise.all(stockItems.map(async item => {
                if (!item.variant_id) return;
                const row = await env.DB.prepare("SELECT stock FROM ProductVariants WHERE id = ?").bind(item.variant_id).first();
                const antes = row?.stock ?? 0;
                const despues = Math.max(0, antes - item.cantidad);
                await env.DB.prepare("UPDATE ProductVariants SET stock = MAX(0, stock - ?) WHERE id = ?")
                  .bind(item.cantidad, item.variant_id).run();
                console.log(`[Stock] Paso2 | Variante #${item.variant_id} | antes=${antes} | -${item.cantidad} | después=${despues}`);
              }));

              // ── PASO 3: ProductVariants.tallas JSON (stock de talla exacta) ──
              // Clave confirmada: 't.size' (admin/index.html línea 1588).
              // Dos formatos posibles en variant_details:
              //   · Normal → "Talla: 3-6M"  (regex /^Talla:\s*(.+)$/)
              //   · Kit    → '{"bata":"M","sosten":"44"}'  (JSON guardado en /api/checkout)
              // "Estándar" no tiene JSON de tallas → se omite.
              await Promise.all(stockItems.map(async item => {
                if (!item.variant_id || !item.variant_details) return;
                // Detectar formato: JSON de kit (empieza con '{') vs. string normal
                const isKitVariant = item.variant_details.startsWith('{');
                const tallaMatch = isKitVariant ? null : item.variant_details.match(/^Talla:\s*(.+)$/);
                if (!tallaMatch && !isKitVariant) return; // "Estándar" → sin JSON que actualizar
                const tallaName = isKitVariant ? null : tallaMatch[1].trim();
                try {
                  const variant = await env.DB.prepare(
                    "SELECT tallas FROM ProductVariants WHERE id = ?"
                  ).bind(item.variant_id).first();
                  if (!variant || !variant.tallas) return;

                  let tallasData;
                  try { tallasData = JSON.parse(variant.tallas); } catch (_) {
                    console.warn(`[Stock] Paso3 | Variante #${item.variant_id}: tallas JSON malformado — omitido`);
                    return;
                  }

                  // Kit → JSON object { comp: [{size,stock},...] }; no array
                  if (!Array.isArray(tallasData)) {
                    // variant_details debe ser el JSON de kitSizes guardado en /api/checkout
                    // ej. '{"bata":"M","sosten":"44"}' → { bata:"M", sosten:"44" }
                    let kitSizes = null;
                    try { kitSizes = JSON.parse(item.variant_details); } catch (_) { }

                    if (!kitSizes || typeof kitSizes !== 'object' || Array.isArray(kitSizes)) {
                      // variant_details tiene formato legacy "Talla: M-44" (orden antiguo)
                      console.warn(`[Stock] Paso3 | Variante #${item.variant_id} (kit legacy): variant_details no es JSON de componentes → "${item.variant_details}". Descuento granular omitido. Pasos 1-2 ya aplicados.`);
                      return;
                    }

                    // Clonar el objeto para no mutar la referencia original
                    const updatedKit = JSON.parse(JSON.stringify(tallasData));
                    let kitModified = false;

                    for (const [comp, selectedSize] of Object.entries(kitSizes)) {
                      if (!updatedKit[comp] || !Array.isArray(updatedKit[comp])) {
                        console.warn(`[Stock] Paso3 | Kit variante #${item.variant_id}: componente "${comp}" no existe en tallas JSON — omitido`);
                        continue;
                      }
                      let compModificado = false;
                      updatedKit[comp] = updatedKit[comp].map(t => {
                        if (t.size === selectedSize) {
                          compModificado = true;
                          kitModified = true;
                          const antes = t.stock ?? 0;
                          const despues = Math.max(0, antes - item.cantidad);
                          console.log(`[Stock] Paso3 | Kit comp="${comp}" talla="${selectedSize}" variante #${item.variant_id} | antes=${antes} | -${item.cantidad} | después=${despues}`);
                          return { ...t, stock: despues };
                        }
                        return t;
                      });
                      if (!compModificado) {
                        console.warn(`[Stock] Paso3 | Kit comp="${comp}" talla="${selectedSize}" no hallada en variante #${item.variant_id}`);
                      }
                    }

                    if (!kitModified) return;
                    await env.DB.prepare("UPDATE ProductVariants SET tallas = ? WHERE id = ?")
                      .bind(JSON.stringify(updatedKit), item.variant_id).run();
                    return; // Kit procesado — no continuar al bloque de array
                  }

                  // Normal → [{size, stock}, ...]; clave 'size' confirmada
                  let modified = false;
                  const updated = tallasData.map(t => {
                    if (t.size === tallaName) {
                      modified = true;
                      const antes = t.stock ?? 0;
                      const despues = Math.max(0, antes - item.cantidad);
                      console.log(`[Stock] Paso3 | Talla "${tallaName}" variante #${item.variant_id} | antes=${antes} | -${item.cantidad} | después=${despues}`);
                      return { ...t, stock: despues };
                    }
                    return t;
                  });

                  if (!modified) {
                    console.warn(`[Stock] Paso3 | Talla "${tallaName}" no hallada en variante #${item.variant_id}. Disponibles: [${tallasData.map(t => t.size).join(', ')}]`);
                    return;
                  }

                  await env.DB.prepare("UPDATE ProductVariants SET tallas = ? WHERE id = ?")
                    .bind(JSON.stringify(updated), item.variant_id).run();
                } catch (e) {
                  console.error(`[Stock] Paso3 | Error en talla "${tallaName}" variante #${item.variant_id}:`, e);
                }
              }));
            }
          } catch (stockErr) {
            console.error("[Stock] Error general al descontar inventario del pedido", order.id, ":", stockErr);
          }
          // ── FIN DESCUENTO DE INVENTARIO ────────────────────────────────────────

          // Reconstruir el carrito desde OrderItems para el correo de confirmación.
          // JOIN con ProductVariants para obtener pv.imagen_1 como fallback cuando
          // el ítem no tenía imagen propia al momento del checkout (variant.imagen_1 null → './ico.jpg' → filtrado).
          const { results: items } = await env.DB.prepare(
            `SELECT oi.product_name, oi.cantidad, oi.precio_unitario,
                            oi.imagen_url      AS oi_imagen_url,
                            pv.imagen_1        AS pv_imagen_1
                     FROM   OrderItems oi
                     LEFT   JOIN ProductVariants pv ON oi.variant_id = pv.id
                     WHERE  oi.order_id = ?`
          ).bind(order.id).all();
          const cartForEmail = (items || []).map(it => ({
            name: it.product_name,
            quantity: it.cantidad,
            price: it.precio_unitario,
            img: it.oi_imagen_url || it.pv_imagen_1 || null
          }));
          const customerForEmail = {
            nombre: order.nombre || 'Cliente',
            email: order.email,
            telefono: order.telefono,
            direccion: order.direccion,
            comuna: order.comuna,
            region: order.region
          };
          if (customerForEmail.email) {
            ctx.waitUntil(sendOrderConfirmationEmail(env, customerForEmail, order.id, cartForEmail, order.total));
          }

          return Response.redirect(FRONTEND_URL + "/checkout.html?status=success&order_id=" + order.id, 302);
        }

        // Rechazado (status distinto de AUTHORIZED) o sin orden recuperable.
        if (order) {
          await env.DB.prepare("UPDATE Orders SET estado = 'Cancelado' WHERE id = ?").bind(order.id).run();
        }
        const rejectId = order ? `&order_id=${order.id}` : '';
        return Response.redirect(FRONTEND_URL + "/checkout.html?status=rejected" + rejectId, 302);
      } catch (error) {
        console.error("Error en /api/checkout/confirm:", error);
        const FRONTEND_URL = (env.FRONTEND_URL || url.origin).replace(/\/$/, '');
        return Response.redirect(FRONTEND_URL + "/checkout.html?status=rejected", 302);
      }
    }

    // Rutas públicas del ecommerce (catálogo)
    // LISTADO LIVIANO: solo imagen_1 por variante. Las imágenes 2-5 se piden por /api/products/:id
    if (url.pathname === "/api/products" && request.method === "GET") {
      try {
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
        const offset = (page - 1) * limit;
        const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
        const searchTerm = search ? `%${search}%` : null;
        const isPackParam = url.searchParams.get('is_pack');
        const isSaleParam = url.searchParams.get('is_sale');
        let categoryParam = url.searchParams.get('category') || url.searchParams.get('categoria');
        if (categoryParam) {
          try {
            categoryParam = decodeURIComponent(categoryParam);
          } catch (e) {
            console.error('[API] Error decodificando categoryParam:', e);
          }
        }

        console.log('[API] url.searchParams:', url.searchParams.toString());
        console.log('[API] Valor final categoryParam:', categoryParam);

        // WHERE dinámico: siempre visible=1; LIKE en nombre y etiquetas cuando hay búsqueda
        const whereConditions = ['p.visible = 1'];
        const queryParams = [];
        if (searchTerm) {
          whereConditions.push('(p.nombre LIKE ? OR p.etiquetas LIKE ?)');
          queryParams.push(searchTerm, searchTerm);
        }
        // Filtro B2B: si is_pack=1 sólo packs; en su defecto sólo retail (excluir packs)
        if (isPackParam === '1') {
          whereConditions.push('p.is_pack = 1');
        } else {
          whereConditions.push('(p.is_pack = 0 OR p.is_pack IS NULL)');
        }
        // Filtro Bestseller: solo productos marcados como bestseller
        const bestsellerParam = url.searchParams.get('bestseller');
        if (bestsellerParam === '1') {
          whereConditions.push('p.bestseller = 1');
        }
        // Filtro Liquidación: solo productos en liquidación
        const clearanceParam = url.searchParams.get('clearance') || url.searchParams.get('is_clearance');
        if (clearanceParam === '1' || clearanceParam === 'true') {
          whereConditions.push('p.is_clearance = 1');
        }
        // Filtro Cyber Day / Ofertas: solo productos marcados como en oferta
        if (isSaleParam === '1') {
          whereConditions.push('p.en_oferta = 1');
        }

        // Filtro de categoría: resolución por software para evadir límite LOWER() ASCII
        if (categoryParam && categoryParam.trim() !== '' && categoryParam !== 'undefined') {
          const { results: allCats } = await env.DB.prepare("SELECT id, nombre, slug FROM Categories").all();
          const cleanCat = categoryParam.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const matchedCat = allCats.find(c =>
            (c.nombre && c.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === cleanCat) ||
            (c.slug && c.slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === cleanCat)
          );

          if (matchedCat) {
            whereConditions.push('(p.categoria_id = ? OR p.categorias_ids LIKE ?)');
            queryParams.push(matchedCat.id, `%${matchedCat.id}%`);
          } else {
            whereConditions.push('1 = 0');
          }
        }
        const whereClause = whereConditions.join(' AND ');

        const totalRow = await env.DB.prepare(
          `SELECT COUNT(*) AS total FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id WHERE ${whereClause}`
        ).bind(...queryParams).first();
        const total = totalRow?.total || 0;

        const query = `SELECT p.*, c.nombre as categoria_nombre FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id WHERE ${whereClause} ORDER BY p.en_oferta DESC, p.id DESC LIMIT ? OFFSET ?`;
        const { results: products } = await env.DB.prepare(query).bind(...queryParams, limit, offset).all();

        let variants = [];
        if (products.length > 0) {
          const ids = products.map(p => p.id);
          const placeholders = ids.map(() => '?').join(',');
          try {
            variants = (await env.DB.prepare(
              `SELECT id, product_id, color_name, color_hex, tallas, stock, imagen_1, video_url,
                         ((CASE WHEN imagen_1 IS NOT NULL AND imagen_1 != '' THEN 1 ELSE 0 END) +
                          (CASE WHEN imagen_2 IS NOT NULL AND imagen_2 != '' THEN 1 ELSE 0 END) +
                          (CASE WHEN imagen_3 IS NOT NULL AND imagen_3 != '' THEN 1 ELSE 0 END) +
                          (CASE WHEN imagen_4 IS NOT NULL AND imagen_4 != '' THEN 1 ELSE 0 END) +
                          (CASE WHEN imagen_5 IS NOT NULL AND imagen_5 != '' THEN 1 ELSE 0 END)) as imagen_count
                         FROM ProductVariants WHERE product_id IN (${placeholders})`
            ).bind(...ids).all()).results;
          } catch (e) { }
        }
        products.forEach(p => {
          p.categorias_ids = parseCategorias(p.categorias_ids);
          p.variantes = variants.filter(v => v.product_id === p.id);
          if (p.variantes.length === 0 && p.imagen_url) p.variantes = [{ color_name: 'Único', color_hex: '#cccccc', tallas: p.tallas || '', stock: p.stock || 0, imagen_1: p.imagen_url }];
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));
        // Sin caché cuando hay búsqueda activa para no contaminar la caché de la vitrina general
        const cacheHeader = search
          ? "no-store"
          : "public, max-age=60, s-maxage=60";
        return Response.json({
          success: true,
          data: products,
          pagination: { total, page, limit, totalPages }
        }, {
          headers: { ...corsHeaders, "Cache-Control": cacheHeader }
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
        } catch (e) { }
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
        let { results } = await env.DB.prepare("SELECT * FROM Categories").all();
        if (results) {
          if (!results.some(c => Number(c.id) === 6 || (c.slug && c.slug.toLowerCase() === 'poleras'))) {
            try { await env.DB.prepare("INSERT INTO Categories (id, nombre, slug) VALUES (6, 'Poleras', 'poleras')").run(); } catch(e) {}
          }
          if (!results.some(c => Number(c.id) === 7 || (c.slug && c.slug.toLowerCase() === 'bodys'))) {
            try { await env.DB.prepare("INSERT INTO Categories (id, nombre, slug) VALUES (7, 'Bodys', 'bodys')").run(); } catch(e) {}
          }
          const res2 = await env.DB.prepare("SELECT * FROM Categories").all();
          results = res2.results;
        }
        return Response.json({ success: true, data: results }, { headers: corsHeaders });
      } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
    }

    const custOrderMatch = url.pathname.match(/^\/api\/orders\/customer\/(.+)$/);
    if (custOrderMatch && request.method === "GET") {
      try {
        const emailDecoded = decodeURIComponent(custOrderMatch[1]);
        const session = await verifyCustomerToken(request, env);
        if (!session || session.email.toLowerCase() !== emailDecoded.toLowerCase()) {
          return Response.json({ success: false, error: "No autorizado para ver estas órdenes." }, { status: 403, headers: corsHeaders });
        }
        const query = `SELECT o.*, c.nombre as cliente_nombre, c.email as cliente_email FROM Orders o JOIN Customers c ON o.customer_id = c.id WHERE c.email = ? ORDER BY o.fecha_creacion DESC`;
        const { results } = await env.DB.prepare(query).bind(emailDecoded).all();
        return Response.json({ success: true, data: results }, { headers: corsHeaders });
      } catch (e) { console.error("[Orders Customer] D1 error:", e.message); return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders }); }
    }

    // ── GET /api/orders/:id ────────────────────────────────────────────────────
    // Detalle de una orden para el CLIENTE (validado por ?email=). Devuelve cada
    // ítem enriquecido con su stock ACTUAL para que el frontend pueda decidir si
    // es posible reanudar el pago o si hay quiebre de stock. Es de solo lectura:
    // no muta inventario. Replica (en modo lectura) la lógica de descuento del
    // webhook de pago (Paso 3) para calcular la disponibilidad real por talla.
    const orderDetailMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
    if (orderDetailMatch && request.method === "GET") {
      try {
        const orderId = parseInt(orderDetailMatch[1], 10);
        const email = (url.searchParams.get('email') || '').toLowerCase().trim();
        if (!orderId) return Response.json({ success: false, error: 'ID de pedido inválido' }, { status: 400, headers: corsHeaders });

        const session = await verifyCustomerToken(request, env);
        const order = await env.DB.prepare(
          `SELECT o.*, c.nombre AS cliente_nombre, c.email AS cliente_email
                 FROM Orders o JOIN Customers c ON o.customer_id = c.id
                 WHERE o.id = ?`
        ).bind(orderId).first();
        if (!order) return Response.json({ success: false, error: 'Pedido no encontrado' }, { status: 404, headers: corsHeaders });

        // Validación de propiedad: el email debe coincidir con el dueño de la orden.
        if (email && (order.cliente_email || '').toLowerCase() !== email) {
          return Response.json({ success: false, error: 'No autorizado para ver este pedido' }, { status: 403, headers: corsHeaders });
        }
        if (!session || (order.cliente_email || '').toLowerCase() !== session.email.toLowerCase()) {
          return Response.json({ success: false, error: 'No autorizado para ver este pedido (sesión inválida)' }, { status: 403, headers: corsHeaders });
        }

        const { results: rawItems } = await env.DB.prepare(
          `SELECT oi.product_id, oi.variant_id, oi.product_name, oi.variant_details,
                        oi.cantidad, oi.precio_unitario,
                        oi.imagen_url AS oi_imagen_url,
                        pv.imagen_1   AS pv_imagen_1,
                        pv.tallas     AS variant_tallas,
                        pv.stock      AS variant_stock,
                        p.stock       AS product_stock,
                        p.weight      AS product_weight
                 FROM OrderItems oi
                 LEFT JOIN ProductVariants pv ON oi.variant_id = pv.id
                 LEFT JOIN Products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`
        ).bind(orderId).all();

        // Calcula el stock disponible ACTUAL de un ítem según su formato:
        //   · Kit    → variant_details '{"bata":"M",...}' → mínimo entre componentes
        //   · Normal → "Talla: X" → stock de esa talla en el JSON de la variante
        //   · Estándar → stock de la variante o, en su defecto, del producto
        const computeStock = (it) => {
          const vd = it.variant_details || '';
          let tallas = null;
          if (it.variant_tallas) { try { tallas = JSON.parse(it.variant_tallas); } catch (_) { } }

          if (vd.startsWith('{')) {
            let kitSizes = null;
            try { kitSizes = JSON.parse(vd); } catch (_) { }
            if (!kitSizes || !tallas || Array.isArray(tallas)) return it.variant_stock ?? it.product_stock ?? 0;
            let min = Infinity;
            for (const [comp, size] of Object.entries(kitSizes)) {
              const arr = tallas[comp];
              if (!Array.isArray(arr)) { min = 0; continue; }
              const found = arr.find(t => t.size === size);
              min = Math.min(min, found ? (found.stock ?? 0) : 0);
            }
            return min === Infinity ? 0 : min;
          }

          const m = vd.match(/^Talla:\s*(.+)$/);
          if (m && Array.isArray(tallas)) {
            const found = tallas.find(t => t.size === m[1].trim());
            return found ? (found.stock ?? 0) : 0;
          }

          return it.variant_stock ?? it.product_stock ?? 0;
        };

        const items = (rawItems || []).map(it => {
          const stockDisponible = computeStock(it);
          return {
            product_id: it.product_id,
            variant_id: it.variant_id,
            product_name: it.product_name,
            variant_details: it.variant_details,
            cantidad: it.cantidad,
            precio_unitario: it.precio_unitario,
            imagen_url: it.oi_imagen_url || it.pv_imagen_1 || null,
            weight: it.product_weight || 0,
            stock_disponible: stockDisponible,
            disponible: stockDisponible >= it.cantidad
          };
        });

        return Response.json({
          success: true,
          data: {
            id: order.id,
            estado: order.estado,
            total: order.total,
            shipping_cost: order.shipping_cost,
            cliente_nombre: order.cliente_nombre,
            cliente_email: order.cliente_email,
            items
          }
        }, { headers: corsHeaders });
      } catch (e) {
        console.error('[OrderDetail]', e.message);
        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ── PUT /api/orders/:id/cancel ─────────────────────────────────────────────
    // Permite al cliente cancelar una orden cuyo pago aún está pendiente.
    const cancelOrderMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/cancel$/);
    if (cancelOrderMatch && request.method === "PUT") {
      try {
        const orderId = parseInt(cancelOrderMatch[1], 10);
        if (!orderId) return Response.json({ success: false, error: 'ID de pedido inválido' }, { status: 400, headers: corsHeaders });

        let body;
        try { body = await request.json(); } catch (_) { body = {}; }
        const email = (body.email || '').toLowerCase().trim();
        if (!email) return Response.json({ success: false, error: 'Email del cliente requerido' }, { status: 400, headers: corsHeaders });

        const session = await verifyCustomerToken(request, env);
        if (!session || session.email.toLowerCase() !== email) {
          return Response.json({ success: false, error: 'No autorizado para cancelar este pedido (sesión inválida)' }, { status: 403, headers: corsHeaders });
        }

        // Verificar que la orden existe y pertenece al cliente que solicita
        const order = await env.DB.prepare(
          `SELECT o.id, o.estado FROM Orders o
                 JOIN Customers c ON o.customer_id = c.id
                 WHERE o.id = ? AND LOWER(c.email) = ?`
        ).bind(orderId, email).first();

        if (!order) return Response.json({ success: false, error: 'Pedido no encontrado o no pertenece a esta cuenta' }, { status: 404, headers: corsHeaders });

        const estadoActual = (order.estado || '').toLowerCase();
        // Solo se pueden cancelar órdenes pendientes de pago
        if (!estadoActual.includes('pendiente') && !estadoActual.includes('sin pagar')) {
          return Response.json({
            success: false,
            error: `No se puede cancelar una orden con estado "${order.estado}". Solo se permiten cancelar órdenes pendientes de pago.`
          }, { status: 409, headers: corsHeaders });
        }

        await env.DB.prepare("UPDATE Orders SET estado = 'Cancelado' WHERE id = ?").bind(orderId).run();
        console.log(`[CancelOrder] Orden #${orderId} cancelada por cliente ${email}`);

        return Response.json({ success: true, message: 'Pedido cancelado correctamente' }, { headers: corsHeaders });
      } catch (e) {
        console.error('[CancelOrder]', e.message);
        return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
      }
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

        // Calcular expiración: ahora + 7 días (604800 segundos)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

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
    // CONFIGURACIÓN GLOBAL DE LA TIENDA (clave/valor en tabla Config)
    // Usada por admin/configuracion.html. Requiere token admin válido.
    // Almacena aiAgents como JSON string bajo la clave 'aiAgents'.
    // ========================================================================
    if (url.pathname === "/api/config" && (request.method === "GET" || request.method === "POST")) {
      const session = await verifyAdminToken(request, env);
      if (!session) return unauthorizedResponse(corsHeaders);

      // Asegurar que la tabla de configuración exista (clave/valor)
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS Config (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // --- LEER configuración ---
      if (request.method === "GET") {
        try {
          const { results } = await env.DB.prepare("SELECT key, value FROM Config").all();
          const data = {};
          for (const row of (results || [])) {
            try { data[row.key] = JSON.parse(row.value); }
            catch (_) { data[row.key] = row.value; }
          }
          // Garantizar que aiAgents siempre sea un array
          if (!Array.isArray(data.aiAgents)) data.aiAgents = [];
          return Response.json({ success: true, data }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
        }
      }

      // --- GUARDAR configuración ---
      if (request.method === "POST") {
        try {
          const body = await request.json();

          // Extraer y guardar aiAgents como JSON string
          if (body.aiAgents !== undefined) {
            const agentsArr = Array.isArray(body.aiAgents) ? body.aiAgents : [];
            await env.DB.prepare(
              `INSERT INTO Config (key, value, updated_at) VALUES ('aiAgents', ?, CURRENT_TIMESTAMP)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind(JSON.stringify(agentsArr)).run();
          }

          ctx.waitUntil(logActivity(env, session.admin_name, 'EDITAR', 'Configuracion', 0, `Configuración de agentes IA actualizada (${(body.aiAgents || []).length} agentes)`));
          return Response.json({ success: true, message: "Configuración guardada" }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
        }
      }
    }

    // ========================================================================
    // ✅ MIDDLEWARE: Todas las rutas /api/admin/* de aquí en adelante
    // requieren un token válido en el header Authorization: Bearer <token>
    // ========================================================================
    if (url.pathname.startsWith('/api/admin/')) {
      const session = await verifyAdminToken(request, env);
      if (!session) return unauthorizedResponse(corsHeaders);

      // El nombre del admin viene del servidor (no del cliente — más seguro)
      const adminName = session.admin_name;
      const adminRol = session.admin_rol;

      // ---- IMÁGENES (R2) ----
      // Sube una imagen al bucket R2 y devuelve la URL pública.
      // Soporta dos modos:
      //   1) JSON body: { data: "data:image/jpeg;base64,...", productId?, color? }
      //   2) FormData body: campo "file" (Blob/File), productId?, color?
      if (url.pathname === "/api/admin/upload-image" && request.method === "POST") {
        try {
          if (!env.IMAGES) return Response.json({ success: false, error: "R2 no configurado" }, { status: 500, headers: corsHeaders });
          const ct = request.headers.get('content-type') || '';
          if (ct.includes('multipart/form-data') || ct.includes('application/octet-stream')) {
            // Modo binario: FormData
            const form = await request.formData();
            const fileField = form.get('file');
            if (!fileField) return Response.json({ success: false, error: "Falta campo 'file'" }, { status: 400, headers: corsHeaders });
            const productId = form.get('productId') || null;
            const color = form.get('color') || 'img';
            const mime = fileField.type || 'image/jpeg';
            const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : 'jpg';
            const bytes = new Uint8Array(await fileField.arrayBuffer());
            const publicUrl = await uploadBytesToR2(env, bytes, mime, ext, { productId, color }, request.url);
            return Response.json({ success: true, url: publicUrl }, { headers: corsHeaders });
          } else {
            // Modo base64 JSON (retrocompatibilidad)
            const { data, productId, color } = await request.json();
            if (!data || typeof data !== 'string') return Response.json({ success: false, error: "Falta data Base64" }, { status: 400, headers: corsHeaders });
            const publicUrl = await uploadBase64ToR2(env, data, { productId, color }, request.url);
            return Response.json({ success: true, url: publicUrl }, { headers: corsHeaders });
          }
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      // ---- VIDEOS (R2) — upload binario via FormData ----
      // Body: FormData con campo "file" (video/mp4 o video/webm), productId?, color?
      if (url.pathname === "/api/admin/upload-video" && request.method === "POST") {
        try {
          if (!env.IMAGES) return Response.json({ success: false, error: "R2 no configurado" }, { status: 500, headers: corsHeaders });
          const form = await request.formData();
          const fileField = form.get('file');
          if (!fileField) return Response.json({ success: false, error: "Falta campo 'file'" }, { status: 400, headers: corsHeaders });
          const productId = form.get('productId') || null;
          const color = form.get('color') || 'video';
          const mime = fileField.type || 'video/mp4';
          if (!mime.startsWith('video/')) return Response.json({ success: false, error: "Solo se permiten archivos de video" }, { status: 400, headers: corsHeaders });
          const ext = mime === 'video/mp4' ? 'mp4' : mime === 'video/webm' ? 'webm' : mime === 'video/quicktime' ? 'mov' : 'mp4';
          // Validar tamaño (max 50MB)
          const bytes = new Uint8Array(await fileField.arrayBuffer());
          if (bytes.length > 50 * 1024 * 1024) return Response.json({ success: false, error: "El video supera el límite de 50MB" }, { status: 413, headers: corsHeaders });
          const publicUrl = await uploadBytesToR2(env, bytes, mime, ext, { productId, color }, request.url);
          return Response.json({ success: true, url: publicUrl }, { headers: corsHeaders });
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
            for (const col of ['imagen_1', 'imagen_2', 'imagen_3', 'imagen_4', 'imagen_5']) {
              const val = variant[col];
              if (val && typeof val === 'string' && val.startsWith('data:')) {
                try {
                  const newUrl = await uploadBase64ToR2(env, val, { productId: variant.product_id, color: variant.color_name }, request.url);
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

      if (url.pathname === "/api/admin/categories" && request.method === "GET") {
        try {
          let { results } = await env.DB.prepare("SELECT * FROM Categories").all();
          if (results) {
            if (!results.some(c => Number(c.id) === 6 || (c.slug && c.slug.toLowerCase() === 'poleras'))) {
              try { await env.DB.prepare("INSERT INTO Categories (id, nombre, slug) VALUES (6, 'Poleras', 'poleras')").run(); } catch(e) {}
            }
            if (!results.some(c => Number(c.id) === 7 || (c.slug && c.slug.toLowerCase() === 'bodys'))) {
              try { await env.DB.prepare("INSERT INTO Categories (id, nombre, slug) VALUES (7, 'Bodys', 'bodys')").run(); } catch(e) {}
            }
            const res2 = await env.DB.prepare("SELECT * FROM Categories").all();
            results = res2.results;
          }
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      if (url.pathname === "/api/admin/products" && request.method === "GET") {
        try {
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
          const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
          const offset = (page - 1) * limit;
          const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
          const searchTerm = search ? `%${search}%` : null;
          const kitFilter = url.searchParams.get('kit');
          const ofertaFilter = url.searchParams.get('oferta');
          const isPackFilter = url.searchParams.get('is_pack');
          const bestsellerFilter = url.searchParams.get('bestseller');
          const clearanceFilter = url.searchParams.get('clearance') || url.searchParams.get('is_clearance');

          // WHERE dinámico: búsqueda en nombre, SKU y etiquetas; filtros rápidos de panel
          const whereConditions = [];
          const queryParams = [];
          if (searchTerm) {
            whereConditions.push('(p.nombre LIKE ? OR p.sku LIKE ? OR p.etiquetas LIKE ?)');
            queryParams.push(searchTerm, searchTerm, searchTerm);
          }
          if (kitFilter === '1') { whereConditions.push('p.es_kit = 1'); }
          if (ofertaFilter === '1') { whereConditions.push('(p.en_oferta = 1 OR p.isOffer = 1)'); }
          if (isPackFilter === '1') { whereConditions.push('p.is_pack = 1'); }
          if (bestsellerFilter === '1') { whereConditions.push('p.bestseller = 1'); }
          if (clearanceFilter === '1') { whereConditions.push('p.is_clearance = 1'); }
          const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

          const totalRow = await env.DB.prepare(
            `SELECT COUNT(*) AS total FROM Products p ${whereClause}`
          ).bind(...queryParams).first();
          const total = totalRow?.total || 0;

          const query = `SELECT p.*, c.nombre as categoria_nombre FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id ${whereClause} ORDER BY p.en_oferta DESC, p.id DESC LIMIT ? OFFSET ?`;
          const { results: products } = await env.DB.prepare(query).bind(...queryParams, limit, offset).all();

          let variants = [];
          if (products.length > 0) {
            const ids = products.map(p => p.id);
            const placeholders = ids.map(() => '?').join(',');
            try {
              variants = (await env.DB.prepare(`SELECT * FROM ProductVariants WHERE product_id IN (${placeholders})`).bind(...ids).all()).results;
            } catch (e) { }
          }
          products.forEach(p => {
            p.categorias_ids = parseCategorias(p.categorias_ids);
            p.variantes = variants.filter(v => v.product_id === p.id);
            if (p.variantes.length === 0 && p.imagen_url) p.variantes = [{ color_name: 'Único', color_hex: '#cccccc', tallas: p.tallas || '', stock: p.stock || 0, imagen_1: p.imagen_url }];
          });

          const totalPages = Math.max(1, Math.ceil(total / limit));
          return Response.json({
            success: true,
            data: products,
            pagination: { total, page, limit, totalPages }
          }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      if (url.pathname === "/api/admin/products" && request.method === "POST") {
        try {
          const body = await request.json();
          const categoriasStr = serializeCategorias(body.categorias_ids);
          const categoriaIdPrimary = Array.isArray(body.categorias_ids) && body.categorias_ids.length > 0 ? body.categorias_ids[0] : (body.categoria_id || 1);
          const _descP = body.description || body.descripcion || "";
          const _tagsP = body.tags || body.etiquetas || null;
          const _isoP = body.isOffer || body.en_oferta || 0;
          const _ofpP = body.offerPrice || body.precio_oferta || null;
          const _isPackP = body.is_pack === 1 || body.is_pack === '1' ? 1 : 0;
          const _bestsellerP = body.bestseller === 1 || body.bestseller === '1' || body.bestseller === true ? 1 : 0;
          const _clearanceP = body.is_clearance === 1 || body.is_clearance === '1' || body.is_clearance === true || body.en_liquidacion === 1 ? 1 : 0;
          const _videoUrlP = body.video_url || null;
          const info = await env.DB.prepare(`INSERT INTO Products (sku, nombre, descripcion, precio_normal, precio_oferta, en_oferta, oferta_limitada, fecha_fin_oferta, stock, categoria_id, categorias_ids, etiquetas, weight, is_pack, bestseller, video_url, is_clearance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(body.sku || null, body.nombre, _descP, body.precio_normal, _ofpP, _isoP, body.oferta_limitada || 0, body.fecha_fin_oferta || null, body.stock || 0, categoriaIdPrimary, categoriasStr, _tagsP, body.weight || 0, _isPackP, _bestsellerP, _videoUrlP, _clearanceP).run();

          const newProductId = info.meta.last_row_id;
          if (body.variantes && body.variantes.length > 0) {
            const variantStmts = body.variantes.map(v => env.DB.prepare(`INSERT INTO ProductVariants (product_id, color_name, color_hex, tallas, stock, imagen_1, imagen_2, imagen_3, imagen_4, imagen_5, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind(newProductId, v.color_name, v.color_hex, v.tallas, v.stock || 0, v.images[0] || null, v.images[1] || null, v.images[2] || null, v.images[3] || null, v.images[4] || null, v.video_url || null));
            await env.DB.batch(variantStmts);
          }
          ctx.waitUntil(logActivity(env, adminName, 'CREAR', 'Producto', newProductId, body.nombre));
          return Response.json({ success: true, message: "Producto creado" }, { status: 201, headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      const productMatch = url.pathname.match(/^\/api\/admin\/products\/(\d+)$/);
      if (productMatch) {
        const pId = parseInt(productMatch[1], 10);
        if (request.method === "GET") {
          try {
            const product = await env.DB.prepare(`SELECT p.*, c.nombre as categoria_nombre FROM Products p LEFT JOIN Categories c ON p.categoria_id = c.id WHERE p.id = ?`).bind(pId).first();
            if (!product) return Response.json({ success: false, error: "Producto no encontrado" }, { status: 404, headers: corsHeaders });
            product.categorias_ids = parseCategorias(product.categorias_ids);
            const { results: variants } = await env.DB.prepare("SELECT * FROM ProductVariants WHERE product_id = ?").bind(pId).all();
            product.variantes = variants;
            if (product.variantes.length === 0 && product.imagen_url) product.variantes = [{ color_name: 'Único', color_hex: '#cccccc', tallas: product.tallas || '', stock: product.stock || 0, imagen_1: product.imagen_url }];
            return Response.json({ success: true, data: product }, { headers: corsHeaders });
          } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
        }
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
            if (body.toggleStatusOnly) {
              const newVisible = (body.visible == 1 || body.visible === true || body.visible === '1') ? 1 : 0;
              await env.DB.prepare(`UPDATE Products SET visible = ? WHERE id = ?`)
                .bind(newVisible, pId).run();
              ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Producto', pId, `${body.nombre || ''} (Cambio de estado)`));
              return Response.json({ success: true, message: `Estado de producto actualizado` }, { headers: corsHeaders });
            }
            const categoriasStr = serializeCategorias(body.categorias_ids);
            const categoriaIdPrimary = Array.isArray(body.categorias_ids) && body.categorias_ids.length > 0 ? body.categorias_ids[0] : (body.categoria_id || null);
            const _descU = body.description || body.descripcion || null;
            const _tagsU = body.tags || body.etiquetas || null;
            const _isoU = body.isOffer || body.en_oferta || 0;
            const _ofpU = body.offerPrice || body.precio_oferta || null;
            const _isPackU = body.is_pack === 1 || body.is_pack === '1' ? 1 : 0;
            const _bestsellerU = body.bestseller === 1 || body.bestseller === '1' || body.bestseller === true ? 1 : 0;
            const _clearanceU = body.is_clearance === 1 || body.is_clearance === '1' || body.is_clearance === true || body.en_liquidacion === 1 ? 1 : 0;
            const _videoUrlU = body.video_url || null;
            await env.DB.prepare(`UPDATE Products SET sku = ?, nombre = ?, descripcion = ?, precio_normal = ?, precio_oferta = ?, en_oferta = ?, oferta_limitada = ?, fecha_fin_oferta = ?, stock = ?, categoria_id = ?, categorias_ids = ?, visible = ?, etiquetas = ?, weight = ?, is_pack = ?, bestseller = ?, video_url = ?, is_clearance = ? WHERE id = ?`)
              .bind(body.sku || null, body.nombre, _descU, body.precio_normal, _ofpU, _isoU, body.oferta_limitada || 0, body.fecha_fin_oferta || null, body.stock || 0, categoriaIdPrimary, categoriasStr, body.visible !== undefined ? body.visible : 1, _tagsU, body.weight || 0, _isPackU, _bestsellerU, _videoUrlU, _clearanceU, pId).run();
            await env.DB.prepare("DELETE FROM ProductVariants WHERE product_id = ?").bind(pId).run();
            if (body.variantes && body.variantes.length > 0) {
              const variantStmts = body.variantes.map(v => env.DB.prepare(`INSERT INTO ProductVariants (product_id, color_name, color_hex, tallas, stock, imagen_1, imagen_2, imagen_3, imagen_4, imagen_5, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(pId, v.color_name, v.color_hex, v.tallas, v.stock || 0, v.images[0] || null, v.images[1] || null, v.images[2] || null, v.images[3] || null, v.images[4] || null, v.video_url || null));
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
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
          const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
          const offset = (page - 1) * limit;
          const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
          const searchTerm = search ? `%${search}%` : null;

          const whereConditions = [];
          const queryParams = [];
          if (searchTerm) {
            whereConditions.push('(admin_name LIKE ? OR details LIKE ? OR action LIKE ?)');
            queryParams.push(searchTerm, searchTerm, searchTerm);
          }
          const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

          const totalRow = await env.DB.prepare(
            `SELECT COUNT(*) AS total FROM ActivityLogs ${whereClause}`
          ).bind(...queryParams).first();
          const total = totalRow?.total || 0;

          const { results } = await env.DB.prepare(
            `SELECT * FROM ActivityLogs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`
          ).bind(...queryParams, limit, offset).all();
          const totalPages = Math.max(1, Math.ceil(total / limit));
          return Response.json({
            success: true,
            data: results,
            pagination: { total, page, limit, totalPages }
          }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      // ---- CLIENTES ----
      if (url.pathname === "/api/admin/customers" && request.method === "GET") {
        try {
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
          const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
          const offset = (page - 1) * limit;
          const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
          const searchTerm = search ? `%${search}%` : null;

          const whereConditions = [];
          const queryParams = [];
          if (searchTerm) {
            whereConditions.push('(nombre LIKE ? OR email LIKE ?)');
            queryParams.push(searchTerm, searchTerm);
          }
          const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

          const totalRow = await env.DB.prepare(
            `SELECT COUNT(*) AS total FROM Customers ${whereClause}`
          ).bind(...queryParams).first();
          const total = totalRow?.total || 0;

          const { results } = await env.DB.prepare(
            `SELECT * FROM Customers ${whereClause} ORDER BY fecha_registro DESC LIMIT ? OFFSET ?`
          ).bind(...queryParams, limit, offset).all();
          const totalPages = Math.max(1, Math.ceil(total / limit));
          return Response.json({
            success: true,
            data: results,
            pagination: { total, page, limit, totalPages }
          }, { headers: corsHeaders });
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
      // Acepta ?from=YYYY-MM-DD&to=YYYY-MM-DD para filtrar por rango de fecha.
      // Acepta ?search= para buscar por ID de pedido, nombre o email del cliente.
      // Usa alias explícitos (o.${fechaCol}) en lugar de subquery para evitar
      // "ambiguous column name" y poder añadir WHERE post-JOIN para la búsqueda.
      if (url.pathname === "/api/admin/orders" && request.method === "GET") {
        try {
          const fromQ = url.searchParams.get('from');
          const toQ = url.searchParams.get('to');
          const estadoQ = (url.searchParams.get('estado') || url.searchParams.get('status') || '').trim();
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
          const limit = Math.min(10000, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
          const offset = (page - 1) * limit;
          const search = (url.searchParams.get('search') || url.searchParams.get('q') || '').trim();
          const searchTerm = search ? `%${search}%` : null;

          // Detección dinámica de la columna de fecha (created_at vs fecha_creacion).
          const { results: ordersSchema } = await env.DB.prepare("PRAGMA table_info(Orders)").all();
          const colNames = (ordersSchema || []).map(c => c.name);
          const fechaCol = colNames.includes('created_at') ? 'created_at' : 'fecha_creacion';

          // Construir condiciones WHERE combinadas (from/to + search + estado).
          // Los aliases explícitos o.${fechaCol} y c.nombre evitan ambigüedad.
          const conditions = [];
          const bindParams = [];
          const { utcFrom, utcTo } = getUtcBounds(fromQ, toQ);
          if (utcFrom) { conditions.push(`o.${fechaCol} >= ?`); bindParams.push(utcFrom); }
          if (utcTo) { conditions.push(`o.${fechaCol} <= ?`); bindParams.push(utcTo); }
          if (estadoQ) { conditions.push(`LOWER(o.estado) LIKE ?`); bindParams.push(`%${estadoQ.toLowerCase()}%`); }
          if (searchTerm) {
            conditions.push(`(CAST(o.id AS TEXT) LIKE ? OR c.nombre LIKE ? OR c.email LIKE ? OR LOWER(o.courier) LIKE ? OR LOWER(o.tracking_code) LIKE ?)`);
            bindParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
          }
          const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

          // COUNT necesita el JOIN con Customers para poder filtrar por nombre/email del cliente.
          const countQuery = `
            SELECT COUNT(*) AS total
            FROM   Orders o
            LEFT   JOIN Customers c ON o.customer_id = c.id
            ${whereClause}`;
          const totalRow = await env.DB.prepare(countQuery).bind(...bindParams).first();
          const total = totalRow?.total || 0;

          // Query principal con JOIN explícito + LIMIT/OFFSET en el nivel externo.
          const query = `
            SELECT o.*, c.nombre AS cliente_nombre, c.email AS cliente_email,
                   oi_sum.items_summary, oi_sum.items_count
            FROM   Orders o
            LEFT   JOIN Customers c ON o.customer_id = c.id
            LEFT   JOIN (
                SELECT order_id,
                       GROUP_CONCAT(product_name || ' ×' || cantidad, ' | ') AS items_summary,
                       COUNT(*) AS items_count
                FROM   OrderItems
                GROUP  BY order_id
            ) AS oi_sum ON oi_sum.order_id = o.id
            ${whereClause}
            ORDER  BY o.${fechaCol} DESC
            LIMIT  ? OFFSET ?`;

          const { results } = await env.DB.prepare(query).bind(...bindParams, limit, offset).all();
          const totalPages = Math.max(1, Math.ceil(total / limit));
          return Response.json({
            success: true,
            data: results,
            pagination: { total, page, limit, totalPages }
          }, { headers: corsHeaders });
        } catch (error) { return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); }
      }

      const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
      if (orderMatch) {
        const oId = parseInt(orderMatch[1], 10);
        if (request.method === "GET") {
          try {
            const order = await env.DB.prepare(`SELECT o.*, c.nombre, c.email, c.telefono, c.direccion, c.comuna, c.region FROM Orders o LEFT JOIN Customers c ON o.customer_id = c.id WHERE o.id = ?`).bind(oId).first();
            if (!order) return Response.json({ success: false, error: "Pedido no encontrado" }, { status: 404, headers: corsHeaders });
            try {
              const { results: rawItems } = await env.DB.prepare(
                `SELECT oi.id, oi.order_id, oi.product_id, oi.variant_id,
                        oi.product_name, oi.variant_details, oi.cantidad, oi.precio_unitario,
                        oi.imagen_url AS oi_imagen_url,
                        p.sku,
                        pv.color_name,
                        pv.color_hex,
                        pv.imagen_1   AS pv_imagen_1,
                        pv.tallas     AS variant_tallas
                 FROM OrderItems oi
                 LEFT JOIN Products p  ON oi.product_id  = p.id
                 LEFT JOIN ProductVariants pv ON oi.variant_id = pv.id
                 WHERE oi.order_id = ?`
              ).bind(oId).all();
              // imagen_url: prioridad oi → variante elegida (pv.imagen_1).
              // Products no tiene imagen_url en el schema de producción.
              order.items = (rawItems || []).map(it => ({
                id: it.id,
                order_id: it.order_id,
                product_id: it.product_id,
                variant_id: it.variant_id,
                product_name: it.product_name,
                variant_details: it.variant_details,
                cantidad: it.cantidad,
                precio_unitario: it.precio_unitario,
                imagen_url: it.oi_imagen_url || it.pv_imagen_1 || null,
                sku: it.sku,
                color_name: it.color_name,
                color_hex: it.color_hex,
                variant_tallas: it.variant_tallas,
              }));
            } catch (e) {
              order.items = [];
              console.error('[OrderItems query error]', e.message);
            }
            return Response.json({ success: true, data: order }, { headers: corsHeaders });
          } catch (err) { return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders }); }
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

            // Notificar al cliente si la opción está activa
            if (body.notify_customer === true) {
              const updatedOrder = await env.DB.prepare(
                `SELECT o.*, c.nombre, c.email FROM Orders o LEFT JOIN Customers c ON o.customer_id = c.id WHERE o.id = ?`
              ).bind(oId).first();
              if (updatedOrder?.email) {
                const customerNote = body.nota_cliente || body.customer_note || '';
                ctx.waitUntil(sendOrderStatusChangeEmail(env, updatedOrder, updatedOrder.email, updatedOrder.nombre, customerNote));
              }
            }

            return Response.json({ success: true, message: "Pedido actualizado" }, { headers: corsHeaders });
          } catch (err) { return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders }); }
        }
      }

      // ---- AUDITORÍA DE STOCK POR PEDIDO ----------------------------------
      // GET /api/admin/stock-audit/:orderId
      // Devuelve un reporte detallado por ítem mostrando si el descuento del
      // inventario quedó aplicado correctamente. Compara variant_details (lo
      // que se vendió) contra el JSON actual de tallas (lo que queda en BD).
      // No modifica nada — solo lectura, para verificación.
      const stockAuditMatch = url.pathname.match(/^\/api\/admin\/stock-audit\/(\d+)$/);
      if (stockAuditMatch && request.method === "GET") {
        try {
          const orderId = parseInt(stockAuditMatch[1], 10);
          if (!orderId) {
            return Response.json({ success: false, error: "ID de pedido inválido" }, { status: 400, headers: corsHeaders });
          }

          // 1) Cabecera del pedido
          const order = await env.DB.prepare(
            `SELECT id, estado, total, customer_id FROM Orders WHERE id = ?`
          ).bind(orderId).first();
          if (!order) {
            return Response.json({ success: false, error: `Pedido #${orderId} no existe` }, { status: 404, headers: corsHeaders });
          }

          // 2) Ítems vendidos
          const { results: items } = await env.DB.prepare(
            `SELECT product_id, variant_id, product_name, variant_details, cantidad, precio_unitario
             FROM OrderItems WHERE order_id = ?`
          ).bind(orderId).all();

          // 3) Para cada ítem: consulta el estado ACTUAL del stock en los 3 niveles
          const audit = await Promise.all((items || []).map(async (it) => {
            const diag = [];
            const report = {
              product_id: it.product_id,
              variant_id: it.variant_id,
              product_name: it.product_name,
              variant_details: it.variant_details,
              cantidad_vendida: it.cantidad,
              level1_product: null,
              level2_variant: null,
              level3_talla: null,
              diagnosis: diag,
              status: 'unknown',
            };

            // ── Nivel 1: Products.stock ──────────────────────────────────────
            if (!it.product_id) {
              diag.push('✗ product_id es NULL en OrderItems — Paso 1 omitido');
            } else {
              const p = await env.DB.prepare(
                `SELECT id, nombre, stock FROM Products WHERE id = ?`
              ).bind(it.product_id).first();
              if (!p) {
                diag.push(`✗ Producto #${it.product_id} no existe en BD (posiblemente borrado)`);
              } else {
                report.level1_product = { id: p.id, nombre: p.nombre, current_stock: p.stock };
                diag.push(`✓ Producto #${p.id} "${p.nombre}" — stock global actual: ${p.stock}`);
              }
            }

            // ── Nivel 2: ProductVariants.stock ───────────────────────────────
            if (!it.variant_id) {
              diag.push('✗ variant_id es NULL en OrderItems — Pasos 2 y 3 omitidos');
              report.status = 'sin_variante';
              return report;
            }
            const v = await env.DB.prepare(
              `SELECT id, color_name, stock, tallas FROM ProductVariants WHERE id = ?`
            ).bind(it.variant_id).first();
            if (!v) {
              diag.push(`✗ Variante #${it.variant_id} no existe en BD`);
              report.status = 'variante_huerfana';
              return report;
            }
            report.level2_variant = { id: v.id, color_name: v.color_name, current_stock: v.stock };
            diag.push(`✓ Variante #${v.id} (${v.color_name || 'sin color'}) — stock de color actual: ${v.stock}`);

            // ── Nivel 3: ProductVariants.tallas JSON ─────────────────────────
            if (!v.tallas) {
              diag.push('⚠ tallas JSON vacío o NULL — producto sin talla (probablemente "Estándar")');
              report.level3_talla = { kind: 'sin_tallas', parsed_size: null, found: false };
              report.status = 'sin_tallas_json';
              return report;
            }

            let tallasData;
            try { tallasData = JSON.parse(v.tallas); }
            catch (e) {
              diag.push(`✗ tallas JSON malformado: ${e.message}`);
              report.level3_talla = { kind: 'json_invalido', parsed_size: null, found: false, raw: v.tallas };
              report.status = 'json_invalido';
              return report;
            }

            const isKitVariant = it.variant_details && it.variant_details.startsWith('{');
            const tallaMatch = isKitVariant ? null : (it.variant_details || '').match(/^Talla:\s*(.+)$/);

            // Caso A: producto sin talla seleccionada ("Estándar")
            if (!tallaMatch && !isKitVariant) {
              diag.push(`⚠ variant_details = "${it.variant_details}" — no aplica descuento de talla`);
              report.level3_talla = { kind: 'estandar', parsed_size: null, found: false, all_tallas: tallasData };
              report.status = 'estandar';
              return report;
            }

            // Caso B: kit (tallas es objeto)
            if (isKitVariant) {
              let kitSizes = null;
              try { kitSizes = JSON.parse(it.variant_details); } catch (_) { }
              const kitReport = { kind: 'kit', selected: kitSizes, components: {} };

              if (!kitSizes || typeof kitSizes !== 'object' || Array.isArray(kitSizes)) {
                diag.push(`✗ Kit: variant_details no es JSON válido — "${it.variant_details}"`);
                report.level3_talla = kitReport;
                report.status = 'kit_legacy';
                return report;
              }
              if (Array.isArray(tallasData)) {
                diag.push('✗ Kit esperaba tallas como objeto pero la variante guarda array');
                report.level3_talla = kitReport;
                report.status = 'kit_estructura_invalida';
                return report;
              }

              let allFound = true;
              for (const [comp, selectedSize] of Object.entries(kitSizes)) {
                const arr = tallasData[comp];
                if (!Array.isArray(arr)) {
                  diag.push(`✗ Kit: componente "${comp}" no existe en JSON`);
                  kitReport.components[comp] = { selected: selectedSize, found: false, current_stock: null };
                  allFound = false;
                  continue;
                }
                const hit = arr.find(t => t.size === selectedSize);
                if (hit) {
                  diag.push(`✓ Kit · ${comp} · talla "${selectedSize}" → stock actual: ${hit.stock}`);
                  kitReport.components[comp] = { selected: selectedSize, found: true, current_stock: hit.stock, all_sizes: arr };
                } else {
                  diag.push(`✗ Kit · ${comp} · talla "${selectedSize}" NO está en JSON. Disponibles: [${arr.map(t => t.size).join(', ')}]`);
                  kitReport.components[comp] = { selected: selectedSize, found: false, current_stock: null, all_sizes: arr };
                  allFound = false;
                }
              }
              report.level3_talla = kitReport;
              report.status = allFound ? 'kit_ok' : 'kit_talla_no_encontrada';
              return report;
            }

            // Caso C: producto normal con talla
            const tallaName = tallaMatch[1].trim();
            if (!Array.isArray(tallasData)) {
              diag.push(`✗ Esperaba tallas como array pero recibí objeto (¿es kit mal etiquetado?)`);
              report.level3_talla = { kind: 'estructura_invalida', parsed_size: tallaName, found: false, raw: tallasData };
              report.status = 'estructura_invalida';
              return report;
            }
            const hit = tallasData.find(t => t.size === tallaName);
            if (hit) {
              diag.push(`✓ Talla "${tallaName}" presente en JSON → stock actual: ${hit.stock}`);
              report.level3_talla = { kind: 'normal', parsed_size: tallaName, found: true, current_stock: hit.stock, all_tallas: tallasData };
              report.status = 'ok';
            } else {
              diag.push(`✗ Talla "${tallaName}" NO está en el JSON. Disponibles: [${tallasData.map(t => t.size).join(', ')}]`);
              report.level3_talla = { kind: 'normal', parsed_size: tallaName, found: false, all_tallas: tallasData };
              report.status = 'talla_no_encontrada';
            }
            return report;
          }));

          return Response.json({
            success: true,
            data: {
              order: { id: order.id, estado: order.estado, total: order.total },
              items_count: (items || []).length,
              audit,
              hints: [
                "Si la orden está en 'Pagado' y todos los ítems muestran ✓, el descuento se aplicó correctamente.",
                "Si ves 'talla_no_encontrada', verifica que el valor de variant_details coincida exactamente con t.size del JSON (mayúsculas/minúsculas, espacios).",
                "Si ves 'kit_legacy', la orden fue creada antes del refactor de kits — Pasos 1 y 2 sí aplicaron, solo se omitió el Paso 3.",
              ],
            }
          }, { headers: corsHeaders });
        } catch (e) {
          console.error("[StockAudit] Error:", e);
          return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
        }
      }

      // ---- MÉTRICAS DEL DASHBOARD ----
      // Acepta ?from=YYYY-MM-DD&to=YYYY-MM-DD (o startDate/endDate) opcionales.
      // Sin params devuelve histórico completo.
      if (url.pathname === "/api/admin/metrics" && request.method === "GET") {
        try {
          // ── Normalización de fecha ──────────────────────────────────────────
          // Acepta tanto ?from/to como ?startDate/endDate (alias legacy).
          // Convierte DD-MM-YYYY → YYYY-MM-DD si el frontend lo envía invertido.
          // SQLite strftime() falla silenciosamente con formato no ISO.
          const normDate = raw => {
            if (!raw) return null;
            const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
            return m ? `${m[3]}-${m[2]}-${m[1]}` : raw;       // → YYYY-MM-DD
          };
          const from = normDate(url.searchParams.get('from') || url.searchParams.get('startDate'));
          const to = normDate(url.searchParams.get('to') || url.searchParams.get('endDate'));
          console.log(`[Metrics] Fechas recibidas → from="${url.searchParams.get('from') || url.searchParams.get('startDate')}" to="${url.searchParams.get('to') || url.searchParams.get('endDate')}" | Normalizadas → from="${from}" to="${to}"`);

          // ── Detección automática de nombres de columna de Orders ────────
          // Soporta esquemas en español (estado / fecha_creacion) e inglés
          // (status / created_at). PRAGMA devuelve el esquema real de D1.
          // Prioridad: nombre confirmado por el usuario → fallback alternativo.
          const { results: ordersSchema } = await env.DB.prepare("PRAGMA table_info(Orders)").all();
          const colNames = (ordersSchema || []).map(c => c.name);
          const estadoCol = colNames.includes('estado') ? 'estado' : 'status';
          const fechaCol = colNames.includes('created_at') ? 'created_at' : 'fecha_creacion';

          // ── Columnas de Products — nombres confirmados en schema.sql ───────
          // precio_normal: definida en schema.sql línea 29 (REAL NOT NULL)
          // visible: definida en schema.sql línea 34 (BOOLEAN DEFAULT 1)
          // stock: definida en schema.sql línea 31 (INTEGER DEFAULT 0)
          const precioCol = 'precio_normal';
          const hasVisible = true;

          // ── Helper: sólo llama .bind() si hay parámetros ─────────────────
          // D1 puede lanzar un error si se llama .bind() sin argumentos
          // en una query que no tiene placeholders '?'.
          const exec = (stmt, params) => params.length ? stmt.bind(...params) : stmt;

          // ── Filtro de fechas usando strftime() ────────────────────────────
          // Patrón confirmado en producción por el endpoint hermano
          // /api/admin/orders (línea ~1223). strftime('%Y-%m-%d', col) extrae
          // SOLO la parte de fecha del timestamp → la comparación es contra
          // 'YYYY-MM-DD' puro (sin hora). El día final queda incluido
          // automáticamente porque '2026-05-24' <= '2026-05-24' es TRUE para
          // toda orden de ese día, sin importar la hora real guardada.
          // Mantengo los nombres sqlFrom/sqlTo solo para el log de debug.
          const sqlFrom = from || null;
          const sqlTo = to || null;

          const { utcFrom, utcTo } = getUtcBounds(from, to);

          // ── Helper: construye cláusula AND para filtro de fechas ─────────
          // Comparación directa de strings UTC: la BD almacena 'YYYY-MM-DD HH:MM:SS' en UTC,
          // y utcFrom/utcTo son también strings UTC. No se necesita ningún wrapper datetime().
          const buildFilter = (col) => {
            const conds = [], params = [];
            if (utcFrom) { conds.push(`${col} >= ?`); params.push(utcFrom); }
            if (utcTo) { conds.push(`${col} <= ?`); params.push(utcTo); }
            return { clause: conds.length ? 'AND ' + conds.join(' AND ') : '', params };
          };

          // Una sola variante de filtro: cláusula SIN alias sobre la tabla
          // Orders desnuda. Se usa tanto en las queries de tabla única como
          // DENTRO de las subqueries de las queries con JOIN (top_products y
          // category_distribution). Al estar Orders sola en ese scope,
          // 'created_at' nunca es ambigua.
          const f = buildFilter(fechaCol);

          // Ingresos totales: suma todo lo que ya generó ingreso real (pagado + en proceso).
          // LOWER() garantiza coincidencia aunque el valor en BD tenga distinta capitalización.
          const ingresosRow = await exec(
            env.DB.prepare(
              `SELECT COALESCE(SUM(total), 0) AS valor, COUNT(*) AS cantidad
               FROM Orders
               WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}`
            ), f.params
          ).first();

          // Pendientes por enviar: pre-despacho (estado actual, sin filtro de fecha)
          const pendientesRow = await env.DB.prepare(
            `SELECT COUNT(*) AS cantidad FROM Orders WHERE LOWER(${estadoCol}) IN ('pagado','preparando')`
          ).first();

          // Total órdenes en el rango (excluyendo abandonados y rechazados)
          const totalesRow = await exec(
            env.DB.prepare(`SELECT COUNT(*) AS cantidad FROM Orders WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}`),
            f.params
          ).first();

          // Métricas logísticas: estado actual, sin filtro de fecha
          const enviadosRow = await env.DB.prepare(
            `SELECT COUNT(*) AS cantidad FROM Orders WHERE LOWER(${estadoCol}) = 'enviado'`
          ).first();

          const recibidosRow = await env.DB.prepare(
            `SELECT COUNT(*) AS cantidad FROM Orders WHERE LOWER(${estadoCol}) IN ('recibido','entregado')`
          ).first();

          const totalIngresos = Number(ingresosRow?.valor) || 0;
          const totalPagados = Number(ingresosRow?.cantidad) || 0;
          const aov = totalPagados > 0 ? Math.round(totalIngresos / totalPagados) : 0;

          // ── Comparación con el período anterior ─────────────────────────
          // Solo si hay rango completo (from + to). El período previo es el
          // bloque inmediatamente anterior, de exactamente la misma duración.
          let comparison = { has_comparison: false };
          if (from && to) {
            const d1 = new Date(from + 'T00:00:00');
            const d2 = new Date(to + 'T00:00:00');
            const days = Math.round((d2 - d1) / 86400000) + 1;
            if (days > 0 && !isNaN(days)) {
              const prevTo = new Date(d1.getTime() - 86400000);
              const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000);
              const pf = prevFrom.toISOString().slice(0, 10);
              const pt = prevTo.toISOString().slice(0, 10);

              const { utcFrom: prevUtcFrom, utcTo: prevUtcTo } = getUtcBounds(pf, pt);

              const prevIngresos = await env.DB.prepare(
                `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
                 FROM Orders
                 WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado')
                 AND ${fechaCol} >= ?
                 AND ${fechaCol} <= ?`
              ).bind(prevUtcFrom, prevUtcTo).first();

              const prevTotales = await env.DB.prepare(
                `SELECT COUNT(*) AS c FROM Orders
                 WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado')
                 AND ${fechaCol} >= ?
                 AND ${fechaCol} <= ?`
              ).bind(prevUtcFrom, prevUtcTo).first();

              const pIng = prevIngresos?.total || 0;
              const pPag = prevIngresos?.count || 0;
              comparison = {
                has_comparison: true,
                period: { from: pf, to: pt },
                prev_ingresos: pIng,
                prev_ordenes: prevTotales?.c || 0,
                prev_aov: pPag > 0 ? Math.round(pIng / pPag) : 0,
              };
            }
          }

          // Ventas agrupadas por día para el gráfico de líneas (convirtiendo a hora local de Chile UTC-4 para la agrupación)
          const { results: salesByDay } = await exec(
            env.DB.prepare(
              `SELECT strftime('%Y-%m-%d', datetime(${fechaCol}, '-4 hours')) AS dia, COALESCE(SUM(total), 0) AS total
               FROM Orders WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}
               GROUP BY strftime('%Y-%m-%d', datetime(${fechaCol}, '-4 hours')) ORDER BY dia ASC`
            ), f.params
          ).all();

          // Top 5 productos más vendidos.
          // El filtro (estado + fecha) se aplica DENTRO de la subquery sobre
          // Orders sola → 'created_at' inequívoca. El JOIN externo solo ve la
          // subquery 'o', que expone 'id'.
          const { results: topProducts } = await exec(
            env.DB.prepare(
              `SELECT oi.product_name, oi.product_id,
                      SUM(oi.cantidad) AS total_unidades,
                      SUM(oi.cantidad * oi.precio_unitario) AS total_recaudado
               FROM OrderItems oi
               JOIN (SELECT id FROM Orders
                     WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}) o
                 ON oi.order_id = o.id
               GROUP BY oi.product_id, oi.product_name
               ORDER BY total_unidades DESC LIMIT 5`
            ), f.params
          ).all();

          // Distribución de ventas por categoría.
          // Mismo patrón: Orders se filtra dentro de la subquery 'o'; el JOIN
          // externo encadena OrderItems → Products → Categories sin tocar
          // ninguna columna ambigua.
          const { results: categoryDistribution } = await exec(
            env.DB.prepare(
              `SELECT COALESCE(c.nombre, 'Sin categoría') AS categoria,
                      COUNT(DISTINCT o.id) AS ordenes,
                      SUM(oi.cantidad * oi.precio_unitario) AS total
               FROM OrderItems oi
               JOIN (SELECT id FROM Orders
                     WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}) o
                 ON oi.order_id = o.id
               LEFT JOIN Products p ON oi.product_id = p.id
               LEFT JOIN Categories c ON p.categoria_id = c.id
               GROUP BY c.id, c.nombre
               ORDER BY total DESC`
            ), f.params
          ).all();

          // Distribución de pedidos por estado (sujeta al filtro de fecha)
          const { results: statusDistribution } = await exec(
            env.DB.prepare(
              `SELECT ${estadoCol} AS estado, COUNT(*) AS count
               FROM Orders WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}
               GROUP BY ${estadoCol} ORDER BY count DESC`
            ), f.params
          ).all();

          // Costo total de envíos en órdenes pagadas — inversión logística real
          // COALESCE por compatibilidad: si shipping_cost es NULL en órdenes
          // anteriores a la migración, cuenta como 0 sin romper la suma.
          const shippingRow = await exec(
            env.DB.prepare(
              `SELECT COALESCE(SUM(shipping_cost), 0) AS valor
               FROM Orders WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}`
            ), f.params
          ).first();

          // Métricas de inventario — estado actual sin filtro de fecha
          const inventoryWhere = hasVisible ? 'WHERE visible = 1' : '';
          const inventoryRow = await env.DB.prepare(
            `SELECT COALESCE(SUM(${precioCol} * stock), 0)                      AS stock_value,
                    SUM(CASE WHEN stock > 0 AND stock < 5 THEN 1 ELSE 0 END)   AS low_stock,
                    SUM(CASE WHEN stock = 0 OR stock IS NULL THEN 1 ELSE 0 END) AS out_of_stock
             FROM Products ${inventoryWhere}`
          ).first();

          // Diagnóstico: distribución real de estados SIN ningún filtro.
          // Permite ver exactamente qué valores existen en la BD → aparece en console.log del frontend.
          const { results: allStatusDebug } = await env.DB.prepare(
            `SELECT ${estadoCol} AS estado, COUNT(*) AS count FROM Orders GROUP BY ${estadoCol} ORDER BY count DESC`
          ).all();

          // Diagnóstico: rango real de fechas en BD (sin filtro). Si el filtro
          // del dashboard cae fuera de [min, max], las métricas darán 0 — y
          // este campo lo hace evidente en la consola del navegador.
          const dateRangeDebug = await env.DB.prepare(
            `SELECT
                MIN(${fechaCol}) AS oldest,
                MAX(${fechaCol}) AS newest,
                COUNT(*) AS total_rows,
                SUM(CASE WHEN ${fechaCol} IS NULL THEN 1 ELSE 0 END) AS null_dates
             FROM Orders`
          ).first();

          // Diagnóstico: 3 muestras del valor exacto almacenado en fecha_creacion.
          // Útil para detectar formato inesperado (ej. ISO con 'T', timezone, etc.)
          const { results: dateSamples } = await env.DB.prepare(
            `SELECT id, ${fechaCol} AS fecha_raw, datetime(${fechaCol}) AS fecha_normalizada, ${estadoCol} AS estado, total
             FROM Orders ORDER BY id DESC LIMIT 3`
          ).all();

          // Diagnóstico extra: conteo de órdenes dentro del rango usando el MISMO
          // helper buildFilter — si esto es 0 mientras total_rows > 0, el problema
          // es 100% el rango de fechas (no la columna ni la query).
          const inRangeRow = await exec(
            env.DB.prepare(`SELECT COUNT(*) AS n FROM Orders WHERE LOWER(${estadoCol}) IN ('pagado','preparando','enviado','recibido','entregado') ${f.clause}`),
            f.params
          ).first();

          console.log('[Metrics] Debug fechas →',
            JSON.stringify({
              schema: { estadoCol, fechaCol },
              params: { from: sqlFrom, to: sqlTo, utcFrom, utcTo },
              bd: { total_rows: dateRangeDebug?.total_rows, oldest: dateRangeDebug?.oldest, newest: dateRangeDebug?.newest, null_dates: dateRangeDebug?.null_dates },
              filtered: inRangeRow?.n,
              samples: dateSamples,
            })
          );

          return Response.json({
            success: true,
            data: {
              _schema: { estadoCol, fechaCol, precioCol, hasVisible },
              _debug: {
                sql_from: sqlFrom,
                sql_to: sqlTo,
                utc_from: utcFrom,
                utc_to: utcTo,
                date_range_bd: dateRangeDebug,
                date_samples: dateSamples || [],
                rows_in_range: inRangeRow?.n ?? 0,
              },
              debug_status_counts_all: allStatusDebug || [],
              ingresos: Number(ingresosRow?.valor) || 0,
              pendientes: Number(pendientesRow?.cantidad) || 0,
              enviados: Number(enviadosRow?.cantidad) || 0,
              recibidos: Number(recibidosRow?.cantidad) || 0,
              ordenes: Number(totalesRow?.cantidad) || 0,
              ticket: aov,
              shipping: Number(shippingRow?.valor) || 0,
              comparison,
              sales_by_day: salesByDay || [],
              top_products: topProducts || [],
              category_distribution: categoryDistribution || [],
              status_distribution: statusDistribution || [],
              total_stock_value: inventoryRow?.stock_value || 0,
              low_stock_items: inventoryRow?.low_stock || 0,
              out_of_stock_count: inventoryRow?.out_of_stock || 0,
            }
          }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({
            success: false,
            error: error.message,
            hint: "Revisa la consola del Worker en Cloudflare Dashboard para el stack trace completo."
          }, { status: 500, headers: corsHeaders });
        }
      }

      // ---- CUPONES DE DESCUENTO (ADMIN) ----
      if (url.pathname === "/api/admin/coupons" && request.method === "GET") {
        try {
          const { results } = await env.DB.prepare("SELECT * FROM Coupons ORDER BY id DESC").all();
          return Response.json({ success: true, data: results }, { headers: corsHeaders });
        } catch (error) { 
          return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); 
        }
      }

      if (url.pathname === "/api/admin/coupons" && request.method === "POST") {
        try {
          const body = await request.json();
          if (!body.codigo || !body.descuento_porcentaje) {
            return Response.json({ success: false, error: "Código y porcentaje de descuento son obligatorios." }, { status: 400, headers: corsHeaders });
          }

          const existing = await env.DB.prepare("SELECT id FROM Coupons WHERE codigo = ?").bind(body.codigo.trim().toUpperCase()).first();
          if (existing) {
            return Response.json({ success: false, error: "Ya existe un cupón con este código." }, { status: 400, headers: corsHeaders });
          }

          const info = await env.DB.prepare(
            `INSERT INTO Coupons (codigo, descuento_porcentaje, activo, mostrar_en_banner, fecha_inicio, fecha_fin, productos_ids) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            body.codigo.trim().toUpperCase(),
            Number(body.descuento_porcentaje),
            body.activo !== undefined ? Number(body.activo) : 1,
            body.mostrar_en_banner !== undefined ? Number(body.mostrar_en_banner) : 0,
            body.fecha_inicio || null,
            body.fecha_fin || null,
            body.productos_ids ? JSON.stringify(body.productos_ids) : null
          ).run();

          ctx.waitUntil(logActivity(env, adminName, 'CREAR', 'Cupon', info.meta.last_row_id, body.codigo));
          return Response.json({ success: true, message: "Cupón creado exitosamente", id: info.meta.last_row_id }, { status: 201, headers: corsHeaders });
        } catch (error) { 
          return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); 
        }
      }

      const couponMatch = url.pathname.match(/^\/api\/admin\/coupons\/(\d+)$/);
      if (couponMatch) {
        const couponId = parseInt(couponMatch[1], 10);
        
        if (request.method === "GET") {
          try {
            const coupon = await env.DB.prepare("SELECT * FROM Coupons WHERE id = ?").bind(couponId).first();
            if (!coupon) {
              return Response.json({ success: false, error: "El cupón no existe." }, { status: 404, headers: corsHeaders });
            }
            return Response.json({ success: true, data: coupon }, { headers: corsHeaders });
          } catch (error) {
            return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
          }
        }

        if (request.method === "PUT") {
          try {
            const body = await request.json();
            
            if (Object.keys(body).length <= 2 && (body.activo !== undefined || body.mostrar_en_banner !== undefined)) {
              if (body.activo !== undefined) {
                await env.DB.prepare("UPDATE Coupons SET activo = ? WHERE id = ?").bind(Number(body.activo), couponId).run();
                ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Cupon', couponId, `Estado de cupón ID ${couponId} cambiado a: ${body.activo ? 'activo' : 'inactivo'}`));
              }
              if (body.mostrar_en_banner !== undefined) {
                await env.DB.prepare("UPDATE Coupons SET mostrar_en_banner = ? WHERE id = ?").bind(Number(body.mostrar_en_banner), couponId).run();
                ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Cupon', couponId, `Visibilidad en banner de cupón ID ${couponId} cambiada a: ${body.mostrar_en_banner ? 'visible' : 'oculto'}`));
              }
              return Response.json({ success: true, message: "Cupón actualizado" }, { headers: corsHeaders });
            }

            if (!body.codigo || !body.descuento_porcentaje) {
              return Response.json({ success: false, error: "Código y porcentaje de descuento son obligatorios." }, { status: 400, headers: corsHeaders });
            }

            const existing = await env.DB.prepare("SELECT id FROM Coupons WHERE codigo = ? AND id != ?").bind(body.codigo.trim().toUpperCase(), couponId).first();
            if (existing) {
              return Response.json({ success: false, error: "Ya existe otro cupón con este código." }, { status: 400, headers: corsHeaders });
            }

            await env.DB.prepare(
              `UPDATE Coupons SET 
                codigo = ?, 
                descuento_porcentaje = ?, 
                activo = ?, 
                mostrar_en_banner = ?, 
                fecha_inicio = ?, 
                fecha_fin = ?, 
                productos_ids = ?
               WHERE id = ?`
            ).bind(
              body.codigo.trim().toUpperCase(),
              Number(body.descuento_porcentaje),
              body.activo !== undefined ? Number(body.activo) : 1,
              body.mostrar_en_banner !== undefined ? Number(body.mostrar_en_banner) : 0,
              body.fecha_inicio || null,
              body.fecha_fin || null,
              body.productos_ids ? JSON.stringify(body.productos_ids) : null,
              couponId
            ).run();

            ctx.waitUntil(logActivity(env, adminName, 'EDITAR', 'Cupon', couponId, `Cupón actualizado: ${body.codigo}`));
            return Response.json({ success: true, message: "Cupón actualizado exitosamente" }, { headers: corsHeaders });
          } catch (error) { 
            return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); 
          }
        }

        if (request.method === "DELETE") {
          try {
            const coupon = await env.DB.prepare("SELECT codigo FROM Coupons WHERE id = ?").bind(couponId).first();
            await env.DB.prepare("DELETE FROM Coupons WHERE id = ?").bind(couponId).run();
            ctx.waitUntil(logActivity(env, adminName, 'ELIMINAR', 'Cupon', couponId, `Cupón eliminado: ${coupon?.codigo || couponId}`));
            return Response.json({ success: true, message: "Cupón eliminado exitosamente" }, { headers: corsHeaders });
          } catch (error) { 
            return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders }); 
          }
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

          // Validación de campos obligatorios
          if (!body.nombre || !body.email || !body.password) {
            return Response.json({ success: false, error: "Nombre, correo y contraseña son obligatorios." }, { status: 400, headers: corsHeaders });
          }

          // Evitar correos duplicados (la BD no debe perder ni pisar registros)
          const existing = await env.DB.prepare("SELECT id FROM Admins WHERE email = ?").bind(body.email).first();
          if (existing) {
            return Response.json({ success: false, error: "Ya existe un administrador con ese correo." }, { status: 400, headers: corsHeaders });
          }

          const hashedPass = await hashPassword(body.password);
          // fecha_creacion explícita para que el frontend la muestre correctamente al recargar
          const fechaCreacion = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const info = await env.DB.prepare(
            "INSERT INTO Admins (nombre, email, rol, password_hash, fecha_creacion) VALUES (?, ?, ?, ?, ?)"
          ).bind(body.nombre, body.email, body.rol || 'agente', hashedPass, fechaCreacion).run();

          ctx.waitUntil(logActivity(env, adminName, 'CREAR', 'Admin', info.meta.last_row_id, body.nombre));
          return Response.json({ success: true, message: "Usuario creado", id: info.meta.last_row_id }, { status: 201, headers: corsHeaders });
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

    return new Response(JSON.stringify({ success: false, error: "Ruta en construcción o no encontrada." }), { status: 404, headers: corsHeaders });
  }
};

// =============================================================================
// ⚠️  MIGRACIONES DE BASE DE DATOS REQUERIDAS
// Ejecuta estos comandos en la terminal ANTES de hacer deploy.
// Puedes encadenarlos uno por uno o con --command por separado.
//
// ENTORNO REMOTO (producción):
//   npx wrangler d1 execute mathsoluis-db --remote --command="ALTER TABLE Products ADD COLUMN isOffer INTEGER DEFAULT 0;"
//   npx wrangler d1 execute mathsoluis-db --remote --command="ALTER TABLE Products ADD COLUMN description TEXT;"
//   npx wrangler d1 execute mathsoluis-db --remote --command="ALTER TABLE Products ADD COLUMN tags TEXT;"
//   npx wrangler d1 execute mathsoluis-db --remote --command="ALTER TABLE Products ADD COLUMN offerPrice INTEGER DEFAULT 0;"
//
// ENTORNO LOCAL (dev):
//   npx wrangler d1 execute mathsoluis-db --local --command="ALTER TABLE Products ADD COLUMN isOffer INTEGER DEFAULT 0;"
//   npx wrangler d1 execute mathsoluis-db --local --command="ALTER TABLE Products ADD COLUMN description TEXT;"
//   npx wrangler d1 execute mathsoluis-db --local --command="ALTER TABLE Products ADD COLUMN tags TEXT;"
//   npx wrangler d1 execute mathsoluis-db --local --command="ALTER TABLE Products ADD COLUMN offerPrice INTEGER DEFAULT 0;"
//
// NOTA: Si la columna ya existe, el comando dará un error "duplicate column" — es seguro ignorarlo.
// =============================================================================
