(function () {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const messageBox = document.getElementById('form-message');
  const messageField = form.querySelector('[name="message"]');

  const params = new URLSearchParams(window.location.search);
  const product = params.get('product');
  if (product && messageField && !messageField.value) {
    messageField.value = `Hi! I'm interested in: ${product}. Could you share more details and pricing?`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageBox.className = 'form-message';
    messageBox.textContent = '';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      messageBox.className = 'form-message success';
      messageBox.textContent = "Thanks! We've got your message and will get back to you soon.";
      form.reset();
    } catch (err) {
      messageBox.className = 'form-message error';
      messageBox.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
