(function() {
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
        ? 'http://localhost:8788'
        : 'https://api.poppyjeans.cl';

    async function loadPromoBanner() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/coupons/banner`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.success && data.coupon) {
                const coupon = data.coupon;
                renderBanner(coupon);
            }
        } catch (err) {
            console.error('[PromoBanner] Error loading banner coupon:', err);
        }
    }

    function renderBanner(coupon) {
        // Eliminar banner existente si lo hay
        const existing = document.getElementById('promoBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'promoBanner';
        banner.className = 'w-full bg-[#8a4d4e] text-white text-center py-2 px-4 text-xs font-semibold fixed top-0 left-0 z-[60] flex items-center justify-center transition-all duration-300';
        banner.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        banner.style.height = '40px';

        let timerHTML = '';
        if (coupon.fecha_fin) {
            timerHTML = `<span id="promoBannerTimer" class="ml-2 bg-black/20 px-2 py-0.5 rounded text-[10px] font-bold border border-white/10 animate-pulse">⏳ 00:00:00</span>`;
        }

        let scopeText = '';
        if (coupon.productos_ids) {
            try {
                const pids = JSON.parse(coupon.productos_ids);
                if (Array.isArray(pids) && pids.length > 0) {
                    scopeText = ' (en productos seleccionados)';
                }
            } catch (e) {}
        }

        banner.innerHTML = `
            <div class="w-full max-w-[1280px] mx-auto flex items-center justify-between gap-4">
                <div class="flex-1 text-center flex items-center justify-center flex-wrap gap-1">
                    <span>✨ ¡Descuento Especial! Usa el cupón <strong class="bg-white text-[#8a4d4e] px-1.5 py-0.5 rounded font-extrabold text-[11px] tracking-wide" style="margin: 0 2px;">${coupon.codigo}</strong> y obtén un <strong class="font-extrabold text-[13px]">${coupon.descuento_porcentaje}%</strong> de descuento${scopeText}!</span>
                    ${timerHTML}
                </div>
                <button id="closePromoBannerBtn" class="text-white hover:text-white/80 font-bold text-sm" style="background: none; border: none; cursor: pointer; outline: none;">✕</button>
            </div>
        `;

        document.body.prepend(banner);

        // Ajustar header fijo y padding del body
        adjustLayout(true);

        // Manejar el botón de cerrar
        document.getElementById('closePromoBannerBtn').addEventListener('click', () => {
            banner.remove();
            adjustLayout(false);
            sessionStorage.setItem('promo_banner_dismissed', '1');
        });

        // Inicializar Temporizador si corresponde
        if (coupon.fecha_fin) {
            startCountdown(coupon.fecha_fin);
        }
        
        // Escuchar redimensionamiento para ajustar altura
        window.addEventListener('resize', () => {
            if (document.getElementById('promoBanner')) {
                adjustLayout(true);
            }
        });
    }

    function adjustLayout(active) {
        const header = document.querySelector('header');
        if (!header) return;

        if (active && sessionStorage.getItem('promo_banner_dismissed') !== '1') {
            header.style.top = '40px';
            document.body.style.paddingTop = window.innerWidth >= 768 ? 'calc(5rem + 40px)' : 'calc(4rem + 40px)';
        } else {
            header.style.top = '0px';
            document.body.style.paddingTop = '';
            
            // Eliminar banner si existe
            const banner = document.getElementById('promoBanner');
            if (banner) banner.remove();
        }
    }

    function startCountdown(endDateStr) {
        const timerSpan = document.getElementById('promoBannerTimer');
        if (!timerSpan) return;

        const endDate = new Date(endDateStr).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                // ¡Expiró! Quitar banner
                adjustLayout(false);
                clearInterval(interval);
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                let parts = [];
                if (days > 0) parts.push(`${days}d`);
                parts.push(String(hours).padStart(2, '0') + 'h');
                parts.push(String(minutes).padStart(2, '0') + 'm');
                parts.push(String(seconds).padStart(2, '0') + 's');

                timerSpan.textContent = `⏳ Termina en: ${parts.join(' ')}`;
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (sessionStorage.getItem('promo_banner_dismissed') !== '1') {
                loadPromoBanner();
            }
        });
    } else {
        if (sessionStorage.getItem('promo_banner_dismissed') !== '1') {
            loadPromoBanner();
        }
    }
})();
