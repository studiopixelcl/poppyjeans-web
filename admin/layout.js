// Poppy Jeans - Administración Centralizada (Sidebar, Modo Oscuro y Sesión)
// Este script se carga en todas las páginas de la administración para unificar el comportamiento.

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8788'
    : 'https://api.poppyjeans.cl';

function getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function adminFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...getAuthHeaders(), ...(options.headers || {}) }
    });
    if (response.status === 401) {
        if (localStorage.getItem('admin_token') !== null) {
            localStorage.clear();
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            window.location.href = 'index.html?expired=true';
        }
        return null;
    }
    return response;
}

(function () {
    // --- 1. Estilos para Modo Oscuro y Utilidades Comunes ---
    const darkThemeStyles = `
        /* Variables y Clases de Modo Oscuro */
        body.dark-theme {
            background-color: #121010 !important;
            color: #eedfdd !important;
        }
        body.dark-theme .card,
        body.dark-theme .modal-content,
        body.dark-theme .ticket-header,
        body.dark-theme .financial-breakdown,
        body.dark-theme .variant-card,
        body.dark-theme .kpi-card,
        body.dark-theme .customer-card,
        body.dark-theme table {
            background-color: #1e1818 !important;
            color: #eedfdd !important;
            border-color: #382c2b !important;
        }
        body.dark-theme tr:hover {
            background-color: #2b2020 !important;
        }
        body.dark-theme th {
            border-bottom: 2px solid #382c2b !important;
            color: #bfa3a1 !important;
        }
        body.dark-theme td {
            border-bottom: 1px solid #382c2b !important;
            color: #eedfdd !important;
        }
        body.dark-theme input,
        body.dark-theme select,
        body.dark-theme textarea {
            background-color: #2b2020 !important;
            border-color: #4f3d3c !important;
            color: #ffffff !important;
        }
        body.dark-theme input:focus,
        body.dark-theme select:focus,
        body.dark-theme textarea:focus {
            border-color: #8a4d4e !important;
            box-shadow: 0 0 0 3px rgba(138, 77, 78, 0.4) !important;
        }
        body.dark-theme .btn-secondary {
            background: #382c2b !important;
            color: #eedfdd !important;
        }
        body.dark-theme .btn-secondary:hover {
            background: #4f3d3c !important;
        }
        body.dark-theme .text-secondary,
        body.dark-theme p.text-muted,
        body.dark-theme span.text-muted {
            color: #bfa3a1 !important;
        }
        
        /* Contenedor de KPIs en el Inventario */
        .kpis-wrapper {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .kpi-card {
            background: #FFFFFF;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(30, 30, 36, 0.04);
            border: 1px solid #eedfdd;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.3s ease;
        }
        .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(30, 30, 36, 0.08);
        }
        .kpi-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        .kpi-data h4 {
            font-size: 0.8rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .kpi-data p {
            font-size: 1.6rem;
            font-weight: 800;
            color: #211a19;
            font-family: 'Playfair Display', serif;
        }
        body.dark-theme .kpi-data p {
            color: #ffffff !important;
        }
        body.dark-theme .kpi-data h4 {
            color: #bfa3a1 !important;
        }
        
        /* Botón de Exportar */
        .btn-export-excel {
            background: #1d6f42 !important;
            color: white !important;
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 50px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-export-excel:hover {
            background: #145532 !important;
            transform: translateY(-2px);
        }

        /* Estilos Generales de la Barra Lateral Unificada */
        .sidebar {
            width: 250px;
            background: #211a19 !important;
            color: #ffffff !important;
            position: fixed;
            height: 100vh;
            top: 0;
            left: 0;
            padding: 2rem 1.5rem;
            z-index: 100;
            display: flex;
            flex-direction: column;
            border-right: 1px solid rgba(255,255,255,0.05);
        }
        .sidebar-logo {
            font-family: 'Playfair Display', serif;
            font-size: 1.5rem;
            font-weight: 800;
            margin-bottom: 2.5rem;
            color: #ffffff !important;
        }
        .sidebar-logo span {
            color: #8a4d4e !important;
        }
        .nav-menu {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            height: calc(100% - 80px);
        }
        .nav-link {
            display: block;
            color: #bfa3a1 !important;
            text-decoration: none;
            padding: 0.8rem 1rem;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .nav-link:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            transform: translateX(3px);
        }
        .nav-link.active {
            background: rgba(138, 77, 78, 0.18) !important;
            color: #ffdad9 !important;
            font-weight: 600;
            border-left: 3px solid #8a4d4e;
        }
        body.dark-theme .nav-link.active {
            background: rgba(138, 77, 78, 0.28) !important;
            color: #ffdad9 !important;
        }
    `;

    // Inyectar estilos globales comunes
    const styleEl = document.createElement('style');
    styleEl.innerHTML = darkThemeStyles;
    document.head.appendChild(styleEl);

    // --- 2. Validación de Sesión ---
    const token = localStorage.getItem('admin_token');
    const pathname = window.location.pathname;
    
    // Evitar bucle si ya estamos en index.html
    if (!token && !pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
        return;
    }

    // --- 3. Inicialización cuando el DOM esté listo ---
    document.addEventListener('DOMContentLoaded', () => {
        if (pathname.endsWith('index.html')) return; // No renderizar layout en el login

        // Renderizar la barra lateral
        renderSidebar();

        // Configurar nombre de usuario
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = localStorage.getItem('admin_name') || 'Administrador';
        }

        // Configurar tema guardado
        if (localStorage.getItem('admin_theme') === 'dark') {
            document.body.classList.add('dark-theme');
            const toggleBtn = document.getElementById('darkModeToggle');
            if (toggleBtn) toggleBtn.textContent = '🌙';
        }
    });

    // --- 4. Renderizador Dinámico de la Barra Lateral ---
    function renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Determinar qué enlace está activo
        const currentFile = pathname.substring(pathname.lastIndexOf('/') + 1) || 'inventario.html';

        sidebar.innerHTML = `
            <div class="sidebar-logo" style="cursor: pointer; margin-bottom: 2.5rem; display: flex; align-items: center; gap: 0.6rem;" onclick="window.location.href='inventario.html'">
                <img src="../poppyjeanslogo.png" alt="Poppy Jeans Emblem" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(138,77,78,0.5);">
                <img src="../media/poppyjeans_logo_script.png" alt="Poppy Jeans" style="height: 22px; object-fit: contain;">
            </div>
            <ul class="nav-menu" style="list-style: none; display: flex; flex-direction: column; gap: 0.4rem; height: calc(100% - 120px);">
                <li class="nav-item">
                    <a href="inventario.html" class="nav-link ${currentFile === 'inventario.html' || currentFile === 'producto.html' ? 'active' : ''}">📦 Inventario</a>
                </li>
                <li class="nav-item">
                    <a href="pedidos.html" class="nav-link ${currentFile === 'pedidos.html' || currentFile === 'pedido.html' ? 'active' : ''}">🛒 Pedidos</a>
                </li>
                <li class="nav-item">
                    <a href="clientes.html" class="nav-link ${currentFile === 'clientes.html' ? 'active' : ''}">👥 Clientes</a>
                </li>
                <li class="nav-item">
                    <a href="descuentos.html" class="nav-link ${currentFile === 'descuentos.html' || currentFile === 'cupon.html' ? 'active' : ''}">🏷️ Descuentos</a>
                </li>
                <li class="nav-item">
                    <a href="metricas.html" class="nav-link ${currentFile === 'metricas.html' ? 'active' : ''}">📈 Métricas</a>
                </li>
                <li class="nav-item">
                    <a href="actividades.html" class="nav-link ${currentFile === 'actividades.html' ? 'active' : ''}" id="admin-only-nav">🕵️ Caja Negra</a>
                </li>
                <li class="nav-item">
                    <a href="configuracion.html" class="nav-link ${currentFile === 'configuracion.html' ? 'active' : ''}">⚙️ Configuración</a>
                </li>
                <li class="nav-item">
                    <a href="migracion.html" class="nav-link ${currentFile === 'migracion.html' ? 'active' : ''}">☁️ Migración R2</a>
                </li>
                
                <!-- Toggle de Modo Oscuro al final del Sidebar -->
                <li style="margin-top: auto; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: #aaa;">
                    <span>Modo Oscuro</span>
                    <button id="darkModeToggle" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; outline: none; transition: all 0.3s ease;" onclick="toggleDarkMode()">☀️</button>
                </li>
            </ul>
        `;

        // Control de visibilidad del botón de Caja Negra para agentes no autorizados
        const adminOnlyNav = document.getElementById('admin-only-nav');
        if (adminOnlyNav && localStorage.getItem('admin_rol') !== 'superadmin') {
            adminOnlyNav.parentElement.style.display = 'none';
        }
    }
})();

// --- 5. Funciones Globales de Utilidad ---

// Toggle de Modo Oscuro
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('admin_theme', isDark ? 'dark' : 'light');
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? '🌙' : '☀️';
    }
}

// Cierre de Sesión Universal
async function logout() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/api/admin/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e) {
            console.error('Error al revocar token de sesión:', e);
        }
    }
    localStorage.clear();
    window.location.href = 'index.html?logout=true';
}

// Toast de Notificaciones
function showToast(msg, type = 'success') {
    const existing = document.getElementById('adminToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.right = '2rem';
    toast.style.padding = '1rem 2rem';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.zIndex = '9999';
    toast.style.transition = 'all 0.3s ease';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';

    if (type === 'success') {
        toast.style.backgroundColor = '#8a4d4e';
        toast.textContent = `✨ ${msg}`;
    } else {
        toast.style.backgroundColor = '#ba1a1a';
        toast.textContent = `⚠️ ${msg}`;
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
