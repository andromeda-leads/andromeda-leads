(function () {
  'use strict';

  // мобильное меню
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      mnav.classList.toggle('open');
    });
  }

  // появление блоков
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // счётчики-цифры в полосе статистики
  function animate(el) {
    var raw = el.getAttribute('data-to');
    if (!raw) return;
    var suffix = el.getAttribute('data-suffix') || '';
    var target = parseInt(raw, 10);
    if (isNaN(target)) { el.textContent = raw + suffix; return; }
    var start = performance.now();
    var dur = 900;
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var v = Math.round(target * (p < 1 ? 1 - Math.pow(1 - p, 3) : 1));
      el.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var nums = [].slice.call(document.querySelectorAll('[data-to]'));
  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); io2.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io2.observe(el); });
  }

  // форма заявки
  var t0 = Date.now();
  var forms = [].slice.call(document.querySelectorAll('form.lead'));
  forms.forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = form.querySelector('.form-msg');
      var btn = form.querySelector('button[type=submit]');
      var name = (form.querySelector('[name=name]') || {}).value || '';
      var phone = (form.querySelector('[name=phone]') || {}).value || '';
      var email = (form.querySelector('[name=email]') || {}).value || '';
      var company = (form.querySelector('[name=company]') || {}).value || '';
      var task = (form.querySelector('[name=comment]') || {}).value || '';
      var robot = form.querySelector('[name=robot_ok]');
      var hp = form.querySelector('[name=hp]');

      function fail(text) {
        if (msg) { msg.className = 'form-msg err'; msg.textContent = text; }
      }
      if (!name.trim()) { fail('Укажите имя'); return; }
      if (phone.replace(/\D/g, '').length < 10) { fail('Проверьте номер телефона'); return; }
      if (email && email.indexOf('@') < 1) { fail('Проверьте адрес почты'); return; }

      var payload = {
        kind: form.getAttribute('data-kind') || 'Заявка с сайта',
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        company: company.trim(),
        comment: task.trim(),
        page: location.pathname,
        hp: hp ? hp.value : '',
        robot_ok: robot ? (robot.checked ? '1' : '') : '1',
        elapsed: Math.round((Date.now() - t0) / 1000)
      };

      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Отправляем'; }
      if (msg) { msg.className = 'form-msg'; msg.textContent = ''; }

      fetch(form.getAttribute('data-url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return { ok: r.ok }; });
      }).then(function (data) {
        var ok = data && (data.ok !== false);
        if (msg) {
          msg.className = 'form-msg ' + (ok ? 'ok' : 'err');
          msg.textContent = ok
            ? 'Заявка принята. Номер ' + (data.number || data.id || '') + '. Свяжемся в рабочее время.'
            : 'Не удалось отправить. Позвоните по телефону в контактах.';
        }
        if (ok) { form.reset(); }
      }).catch(function () {
        if (msg) {
          msg.className = 'form-msg err';
          msg.textContent = 'Нет связи с сервером. Позвоните по телефону в контактах.';
        }
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Отправить заявку'; }
      });
    });
  });
})();
