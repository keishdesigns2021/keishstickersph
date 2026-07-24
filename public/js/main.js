(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.main-nav a[data-nav]').forEach((a) => {
    if (a.getAttribute('data-nav') === path) a.classList.add('active');
  });

  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      document.querySelectorAll('[data-config="email"]').forEach((el) => {
        el.textContent = cfg.email;
        if (el.tagName === 'A') el.href = `mailto:${cfg.email}`;
      });
      document.querySelectorAll('[data-config="phone"]').forEach((el) => {
        el.textContent = cfg.phone;
        if (el.tagName === 'A') el.href = `tel:${cfg.phone.replace(/\s+/g, '')}`;
      });
      document.querySelectorAll('[data-config="address"]').forEach((el) => {
        el.textContent = cfg.address;
      });
      document.querySelectorAll('[data-config="address-link"]').forEach((el) => {
        el.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.address)}`;
      });
      document.querySelectorAll('[data-config="facebook"]').forEach((el) => {
        el.href = cfg.facebook;
      });
      document.querySelectorAll('[data-config="shopName"]').forEach((el) => {
        el.textContent = cfg.shopName;
      });
    })
    .catch(() => {});

  fetch('/api/settings')
    .then((r) => r.json())
    .then((settings) => {
      if (settings.logoImage) {
        document.querySelectorAll('.logo .blob').forEach((blob) => {
          const img = document.createElement('img');
          img.src = settings.logoImage;
          img.alt = '';
          img.className = 'logo-img';
          blob.replaceWith(img);
        });
      }
      document.querySelectorAll('[data-settings="catalogTag"]').forEach((el) => {
        el.textContent = settings.catalogTag;
      });
      document.querySelectorAll('[data-settings="catalogHeading"]').forEach((el) => {
        el.textContent = settings.catalogHeading;
      });
      document.querySelectorAll('[data-settings="catalogDescription"]').forEach((el) => {
        el.textContent = settings.catalogDescription;
      });
    })
    .catch(() => {});
})();
