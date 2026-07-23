(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatPrice(price) {
    return `₱${Number(price).toFixed(2)}`;
  }

  function productCard(p) {
    const thumb = p.imagePath
      ? `<img class="product-thumb" src="${escapeHtml(p.imagePath)}" alt="${escapeHtml(p.name)}">`
      : `<div class="product-thumb">${escapeHtml(p.name.charAt(0))}</div>`;
    const inquireHref = `/contact.html?product=${encodeURIComponent(p.name)}`;
    return `
      <article class="product-card">
        ${thumb}
        <div class="product-body">
          <span class="product-category">${escapeHtml(p.category)}</span>
          <h3>${escapeHtml(p.name)}</h3>
          <p class="product-desc">${escapeHtml(p.description)}</p>
          <div class="product-footer">
            <span class="price">${formatPrice(p.price)}</span>
            <a class="btn btn-outline btn-sm" href="${inquireHref}">Inquire</a>
          </div>
        </div>
      </article>
    `;
  }

  window.ShopProducts = { productCard, formatPrice, escapeHtml };

  const featuredContainer = document.getElementById('featured-products');
  if (featuredContainer) {
    fetch('/api/products')
      .then((r) => r.json())
      .then((products) => {
        const featured = products.filter((p) => p.featured).slice(0, 4);
        const list = featured.length ? featured : products.slice(0, 4);
        featuredContainer.innerHTML = list.length
          ? list.map(productCard).join('')
          : '<p class="empty-state">Products coming soon — check back shortly!</p>';
      })
      .catch(() => {
        featuredContainer.innerHTML = '<p class="empty-state">Couldn\'t load products right now.</p>';
      });
  }

  const catalogContainer = document.getElementById('product-catalog');
  if (catalogContainer) {
    const pills = document.querySelectorAll('.filter-pills .pill');
    let allProducts = [];

    function render(category) {
      const filtered = category === 'All' ? allProducts : allProducts.filter((p) => p.category === category);
      catalogContainer.innerHTML = filtered.length
        ? filtered.map(productCard).join('')
        : '<p class="empty-state">No products in this category yet.</p>';
    }

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const category = pill.getAttribute('data-category');
        const url = new URL(window.location);
        if (category === 'All') url.searchParams.delete('category');
        else url.searchParams.set('category', category);
        window.history.replaceState({}, '', url);
        render(category);
      });
    });

    fetch('/api/products')
      .then((r) => r.json())
      .then((products) => {
        allProducts = products;
        const params = new URLSearchParams(window.location.search);
        const initialCategory = params.get('category') || 'All';
        pills.forEach((p) => {
          p.classList.toggle('active', p.getAttribute('data-category') === initialCategory);
        });
        render(initialCategory);
      })
      .catch(() => {
        catalogContainer.innerHTML = '<p class="empty-state">Couldn\'t load products right now.</p>';
      });
  }
})();
