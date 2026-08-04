// ============================================================================
// CLOUDFLARE PAGES FUNCTION: OPEN GRAPH DINÁMICO PARA PRODUCTOS
// Inyecta automáticamente el título, descripción y foto de variante para WhatsApp
// ============================================================================

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const productId = parseInt(url.searchParams.get("id"), 10);
  const requestedVariant = url.searchParams.get("variant") || url.searchParams.get("v") || url.searchParams.get("color");

  // Obtener el HTML estático de Cloudflare Pages
  const response = await env.ASSETS.fetch(request);

  if (!productId || !env.DB || !response.ok) {
    return response;
  }

  try {
    // 1. Obtener datos del producto desde D1
    const product = await env.DB.prepare("SELECT * FROM Products WHERE id = ?").bind(productId).first();
    if (!product) return response;

    // 2. Obtener variantes del producto desde D1
    const variantsRes = await env.DB.prepare("SELECT * FROM ProductVariants WHERE product_id = ? ORDER BY id ASC").bind(productId).all();
    const variants = (variantsRes && variantsRes.results) ? variantsRes.results : [];

    let selectedVariant = null;
    if (variants.length > 0) {
      if (requestedVariant) {
        selectedVariant = variants.find(v => (v.color_name && v.color_name.toLowerCase() === requestedVariant.toLowerCase()) || String(v.id) === requestedVariant);
      }
      if (!selectedVariant) selectedVariant = variants[0];
    }

    // 3. Determinar la primera foto de la variante o producto
    let ogImg = null;
    if (selectedVariant) {
      ogImg = selectedVariant.imagen_1 || selectedVariant.imagen_2 || selectedVariant.imagen_3 || selectedVariant.imagen_4 || selectedVariant.imagen_5;
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

    // 4. Inyectar los meta tags en tiempo real con HTMLRewriter
    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(pageTitle); } })
      .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', pageTitle); } })
      .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', pageTitle); } })
      .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', pageDesc); } })
      .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', pageDesc); } })
      .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', ogImg); } })
      .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', ogImg); } })
      .on('meta[property="og:url"]', { element(e) { e.setAttribute('content', request.url); } })
      .on('meta[name="twitter:url"]', { element(e) { e.setAttribute('content', request.url); } })
      .transform(response);
  } catch (err) {
    console.error("Error in Cloudflare Pages OG function:", err);
    return response;
  }
}
