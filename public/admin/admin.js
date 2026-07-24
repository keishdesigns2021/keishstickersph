(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // ---------- Login page ----------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageBox = document.getElementById('form-message');
      messageBox.className = 'form-message';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: loginForm.username.value.trim(),
            password: loginForm.password.value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        window.location.href = '/admin/dashboard.html';
      } catch (err) {
        messageBox.className = 'form-message error';
        messageBox.textContent = err.message;
      }
    });
  }

  // ---------- Dashboard page ----------
  const dashboard = document.getElementById('product-rows');
  if (!dashboard) return;

  fetch('/api/auth/me')
    .then((r) => r.json())
    .then((data) => {
      if (!data.loggedIn) {
        window.location.href = '/admin/login.html';
        return;
      }
      document.getElementById('whoami').textContent = `Logged in as ${data.username}`;
      loadProducts();
      loadInquiries();
      loadServices();
      loadSettings();
    });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  // Tabs
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // ---------- Products ----------
  const productForm = document.getElementById('product-form');
  const productFormTitle = document.getElementById('product-form-title');
  const productSubmitBtn = document.getElementById('product-submit-btn');
  const productCancelBtn = document.getElementById('product-cancel-btn');
  const productFormMessage = document.getElementById('product-form-message');

  function resetProductForm() {
    productForm.reset();
    document.getElementById('product-id').value = '';
    productFormTitle.textContent = 'Add Product';
    productSubmitBtn.textContent = 'Add Product';
    productCancelBtn.style.display = 'none';
  }

  productCancelBtn.addEventListener('click', resetProductForm);

  function updateCategorySuggestions(products) {
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    const datalist = document.getElementById('category-suggestions');
    datalist.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}">`).join('');
  }

  function loadProducts() {
    fetch('/api/products')
      .then((r) => r.json())
      .then((products) => {
        updateCategorySuggestions(products);
        const rows = document.getElementById('product-rows');
        if (!products.length) {
          rows.innerHTML = '<tr><td colspan="6">No products yet. Add your first one!</td></tr>';
          return;
        }
        rows.innerHTML = products
          .map(
            (p) => `
            <tr>
              <td>${p.imagePath ? `<img class="admin-thumb" src="${escapeHtml(p.imagePath)}" alt="">` : '<div class="admin-thumb"></div>'}</td>
              <td>${escapeHtml(p.name)} ${p.featured ? '<span class="badge featured">Featured</span>' : ''}</td>
              <td>${escapeHtml(p.category)}</td>
              <td>₱${Number(p.price).toFixed(2)}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>
                </div>
              </td>
              <td>
                <button class="btn btn-danger btn-sm" data-delete="${p.id}">Delete</button>
              </td>
            </tr>
          `
          )
          .join('');

        rows.querySelectorAll('[data-edit]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const product = products.find((p) => p.id === Number(btn.dataset.edit));
            if (!product) return;
            document.getElementById('product-id').value = product.id;
            document.getElementById('p-name').value = product.name;
            document.getElementById('p-category').value = product.category;
            document.getElementById('p-price').value = product.price;
            document.getElementById('p-description').value = product.description;
            document.getElementById('p-featured').checked = product.featured;
            productFormTitle.textContent = `Edit: ${product.name}`;
            productSubmitBtn.textContent = 'Save Changes';
            productCancelBtn.style.display = 'inline-flex';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        });

        rows.querySelectorAll('[data-delete]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const product = products.find((p) => p.id === Number(btn.dataset.delete));
            if (!product) return;
            if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
            const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
            if (res.ok) loadProducts();
          });
        });
      });
  }

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    productFormMessage.className = 'form-message';
    const id = document.getElementById('product-id').value;
    const formData = new FormData(productForm);
    formData.set('featured', document.getElementById('p-featured').checked ? '1' : '');

    try {
      const res = await fetch(id ? `/api/products/${id}` : '/api/products', {
        method: id ? 'PUT' : 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save product');
      productFormMessage.className = 'form-message success';
      productFormMessage.textContent = `Saved "${data.name}".`;
      resetProductForm();
      loadProducts();
    } catch (err) {
      productFormMessage.className = 'form-message error';
      productFormMessage.textContent = err.message;
    }
  });

  // ---------- Inquiries ----------
  function loadInquiries() {
    fetch('/api/contact')
      .then((r) => r.json())
      .then((inquiries) => {
        const rows = document.getElementById('inquiry-rows');
        const unread = inquiries.filter((i) => !i.read).length;
        const badge = document.getElementById('inquiry-count');
        if (unread > 0) {
          badge.textContent = unread;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }

        if (!inquiries.length) {
          rows.innerHTML = '<tr><td colspan="5">No inquiries yet.</td></tr>';
          return;
        }

        rows.innerHTML = inquiries
          .map(
            (i) => `
            <tr style="${i.read ? '' : 'font-weight: 600;'}">
              <td>${escapeHtml(i.name)} ${i.read ? '' : '<span class="badge unread">New</span>'}</td>
              <td>${escapeHtml(i.email)}${i.phone ? `<br>${escapeHtml(i.phone)}` : ''}</td>
              <td style="max-width: 320px; white-space: pre-wrap;">${escapeHtml(i.message)}</td>
              <td>${escapeHtml(i.created_at)}</td>
              <td>
                <div class="row-actions">
                  ${i.read ? '' : `<button class="btn btn-outline btn-sm" data-read="${i.id}">Mark Read</button>`}
                  <button class="btn btn-danger btn-sm" data-remove="${i.id}">Delete</button>
                </div>
              </td>
            </tr>
          `
          )
          .join('');

        rows.querySelectorAll('[data-read]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            await fetch(`/api/contact/${btn.dataset.read}/read`, { method: 'PUT' });
            loadInquiries();
          });
        });
        rows.querySelectorAll('[data-remove]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            if (!confirm('Delete this inquiry?')) return;
            await fetch(`/api/contact/${btn.dataset.remove}`, { method: 'DELETE' });
            loadInquiries();
          });
        });
      });
  }

  // ---------- Services ----------
  const serviceForm = document.getElementById('service-form');
  const serviceFormTitle = document.getElementById('service-form-title');
  const serviceSubmitBtn = document.getElementById('service-submit-btn');
  const serviceCancelBtn = document.getElementById('service-cancel-btn');
  const serviceFormMessage = document.getElementById('service-form-message');

  function resetServiceForm() {
    serviceForm.reset();
    document.getElementById('s-id').value = '';
    serviceFormTitle.textContent = 'Add Service';
    serviceSubmitBtn.textContent = 'Add Service';
    serviceCancelBtn.style.display = 'none';
  }

  serviceCancelBtn.addEventListener('click', resetServiceForm);

  function loadServices() {
    fetch('/api/services')
      .then((r) => r.json())
      .then((services) => {
        const rows = document.getElementById('service-rows');
        if (!services.length) {
          rows.innerHTML = '<tr><td colspan="5">No services yet. Add your first one!</td></tr>';
          return;
        }
        rows.innerHTML = services
          .map(
            (s) => `
            <tr>
              <td>${s.imagePath ? `<img class="admin-thumb" src="${escapeHtml(s.imagePath)}" alt="">` : '<div class="admin-thumb"></div>'}</td>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.price)}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-outline btn-sm" data-edit="${s.id}">Edit</button>
                </div>
              </td>
              <td>
                <button class="btn btn-danger btn-sm" data-delete="${s.id}">Delete</button>
              </td>
            </tr>
          `
          )
          .join('');

        rows.querySelectorAll('[data-edit]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const service = services.find((s) => s.id === Number(btn.dataset.edit));
            if (!service) return;
            document.getElementById('s-id').value = service.id;
            document.getElementById('s-name').value = service.name;
            document.getElementById('s-price').value = service.price;
            document.getElementById('s-description').value = service.description;
            serviceFormTitle.textContent = `Edit: ${service.name}`;
            serviceSubmitBtn.textContent = 'Save Changes';
            serviceCancelBtn.style.display = 'inline-flex';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        });

        rows.querySelectorAll('[data-delete]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const service = services.find((s) => s.id === Number(btn.dataset.delete));
            if (!service) return;
            if (!confirm(`Delete "${service.name}"? This cannot be undone.`)) return;
            const res = await fetch(`/api/services/${service.id}`, { method: 'DELETE' });
            if (res.ok) loadServices();
          });
        });
      });
  }

  serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    serviceFormMessage.className = 'form-message';
    const id = document.getElementById('s-id').value;
    const formData = new FormData(serviceForm);

    try {
      const res = await fetch(id ? `/api/services/${id}` : '/api/services', {
        method: id ? 'PUT' : 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save service');
      serviceFormMessage.className = 'form-message success';
      serviceFormMessage.textContent = `Saved "${data.name}".`;
      resetServiceForm();
      loadServices();
    } catch (err) {
      serviceFormMessage.className = 'form-message error';
      serviceFormMessage.textContent = err.message;
    }
  });

  // ---------- Site Settings ----------
  const settingsForm = document.getElementById('settings-form');
  const settingsFormMessage = document.getElementById('settings-form-message');
  const logoPreview = document.getElementById('logo-preview');

  function loadSettings() {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((settings) => {
        document.getElementById('set-catalog-tag').value = settings.catalogTag;
        document.getElementById('set-catalog-heading').value = settings.catalogHeading;
        document.getElementById('set-catalog-description').value = settings.catalogDescription;
        if (settings.logoImage) {
          logoPreview.src = settings.logoImage;
          logoPreview.style.display = 'block';
        } else {
          logoPreview.style.display = 'none';
        }
      });
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsFormMessage.className = 'form-message';
    const formData = new FormData(settingsForm);
    formData.set('clearLogo', document.getElementById('set-clear-logo').checked ? '1' : '');

    try {
      const res = await fetch('/api/settings', { method: 'PUT', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save settings');
      settingsFormMessage.className = 'form-message success';
      settingsFormMessage.textContent = 'Settings saved.';
      document.getElementById('set-clear-logo').checked = false;
      document.getElementById('set-logo').value = '';
      loadSettings();
    } catch (err) {
      settingsFormMessage.className = 'form-message error';
      settingsFormMessage.textContent = err.message;
    }
  });
})();
