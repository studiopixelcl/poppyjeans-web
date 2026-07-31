/* ==========================================================================
   PoppyJeans · Pagination renderer
   API:
     renderPagination(paginationData, containerId, callback)
       paginationData = { total, page, limit, totalPages }
       containerId    = id del <div> donde se inyecta la UI
       callback(opts) = se invoca con { page, limit } al cambiar
   Pintar arriba+abajo: pasar 2 containerIds y compartir el mismo callback.
   ========================================================================== */
(function (global) {
  const LIMIT_OPTIONS = [20, 50, 100];

  function clampPage(page, totalPages) {
    if (!Number.isFinite(page) || page < 1) return 1;
    if (page > totalPages) return totalPages || 1;
    return page;
  }

  function buildPageList(current, total) {
    // Devuelve array con números y '…' para representar el rango visible.
    if (total <= 7) {
      const out = [];
      for (let i = 1; i <= total; i++) out.push(i);
      return out;
    }
    const pages = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 4)             [2, 3, 4, 5].forEach(p => pages.add(p));
    if (current >= total - 3)     [total - 4, total - 3, total - 2, total - 1].forEach(p => pages.add(p));
    const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, idx) => {
      if (idx > 0 && p - sorted[idx - 1] > 1) out.push('…');
      out.push(p);
    });
    return out;
  }

  function renderPagination(paginationData, containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total      = Number(paginationData?.total) || 0;
    const limit      = Number(paginationData?.limit) || 20;
    const totalPages = Math.max(1, Number(paginationData?.totalPages) || Math.ceil(total / limit));
    const page       = clampPage(Number(paginationData?.page) || 1, totalPages);

    if (total === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    const start = (page - 1) * limit + 1;
    const end   = Math.min(page * limit, total);

    const limitOpts = LIMIT_OPTIONS
      .map(n => `<option value="${n}" ${n === limit ? 'selected' : ''}>${n}</option>`)
      .join('');

    const pageItems = buildPageList(page, totalPages).map(item => {
      if (item === '…') {
        return `<button type="button" class="ms-pagination__btn ms-pagination__btn--ellipsis" disabled aria-hidden="true">…</button>`;
      }
      const isActive = item === page;
      return `<button type="button" class="ms-pagination__btn ${isActive ? 'is-active' : ''}" data-page="${item}" aria-label="Página ${item}" ${isActive ? 'aria-current="page"' : ''}>${item}</button>`;
    }).join('');

    container.innerHTML = `
      <div class="ms-pagination" role="navigation" aria-label="Paginación">
        <div class="ms-pagination__nav">
          <button type="button" class="ms-pagination__btn ms-pagination__btn--arrow" data-action="prev" aria-label="Página anterior" ${page <= 1 ? 'disabled' : ''}>‹</button>
          <div class="ms-pagination__pages">${pageItems}</div>
          <button type="button" class="ms-pagination__btn ms-pagination__btn--arrow" data-action="next" aria-label="Página siguiente" ${page >= totalPages ? 'disabled' : ''}>›</button>
        </div>
        <div class="ms-pagination__meta">
          <div class="ms-pagination__summary">
            Mostrando <strong>${start}</strong> a <strong>${end}</strong> de <strong>${total}</strong> resultados
          </div>
          <label class="ms-pagination__limit">
            Mostrar
            <select aria-label="Resultados por página">${limitOpts}</select>
            por página
          </label>
        </div>
      </div>
    `;

    // Eventos
    const onClick = (e) => {
      const btn = e.target.closest('button[data-page], button[data-action]');
      if (!btn || btn.disabled) return;
      let nextPage = page;
      if (btn.dataset.action === 'prev') nextPage = Math.max(1, page - 1);
      else if (btn.dataset.action === 'next') nextPage = Math.min(totalPages, page + 1);
      else if (btn.dataset.page) nextPage = parseInt(btn.dataset.page, 10);
      if (nextPage !== page && typeof callback === 'function') callback({ page: nextPage, limit });
    };
    container.querySelector('.ms-pagination').addEventListener('click', onClick);

    const select = container.querySelector('.ms-pagination__limit select');
    select.addEventListener('change', (e) => {
      const newLimit = parseInt(e.target.value, 10) || 20;
      if (typeof callback === 'function') callback({ page: 1, limit: newLimit });
    });

    // Auto-scroll horizontal para que la página activa quede visible.
    const activeBtn = container.querySelector('.ms-pagination__btn.is-active');
    const pagesBox  = container.querySelector('.ms-pagination__pages');
    if (activeBtn && pagesBox) {
      const target = activeBtn.offsetLeft - (pagesBox.clientWidth / 2) + (activeBtn.clientWidth / 2);
      pagesBox.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
    }
  }

  /** Helper: renderiza en múltiples contenedores con el mismo callback. */
  function renderPaginationMulti(paginationData, containerIds, callback) {
    (containerIds || []).forEach(id => renderPagination(paginationData, id, callback));
  }

  global.renderPagination       = renderPagination;
  global.renderPaginationMulti  = renderPaginationMulti;
})(window);
