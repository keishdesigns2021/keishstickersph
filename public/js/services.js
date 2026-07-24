(function () {
  const container = document.getElementById('service-catalog');
  if (!container) return;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function serviceCard(s) {
    const thumb = s.imagePath
      ? `<img class="product-thumb" src="${escapeHtml(s.imagePath)}" alt="${escapeHtml(s.name)}">`
      : `<div class="product-thumb">${escapeHtml(s.name.charAt(0))}</div>`;
    const inquireHref = `/contact.html?product=${encodeURIComponent(s.name)}`;
    return `
      <article class="product-card">
        ${thumb}
        <div class="product-body">
          <h3>${escapeHtml(s.name)}</h3>
          <p class="product-desc">${escapeHtml(s.description)}</p>
          <div class="product-footer">
            <span class="price">${s.price ? escapeHtml(s.price) : ''}</span>
            <a class="btn btn-outline btn-sm" href="${inquireHref}">Inquire</a>
          </div>
        </div>
      </article>
    `;
  }

  fetch('/api/services')
    .then((r) => r.json())
    .then((services) => {
      container.innerHTML = services.length
        ? services.map(serviceCard).join('')
        : '<p class="empty-state">Services coming soon — check back shortly!</p>';
    })
    .catch(() => {
      container.innerHTML = '<p class="empty-state">Couldn\'t load services right now.</p>';
    });
})();
