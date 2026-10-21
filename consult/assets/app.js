/* ANDROMEDA CONSULT — интерфейс */
(function () {
  'use strict';

  /* ——— мобильное меню ——— */
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
    });
  }

  /* ——— выпадающее меню «Услуги» ——— */
  document.querySelectorAll('.drop > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var d = btn.parentElement;
      document.querySelectorAll('.drop').forEach(function (x) { if (x !== d) x.classList.remove('open'); });
      d.classList.toggle('open');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.drop')) {
      document.querySelectorAll('.drop').forEach(function (d) { d.classList.remove('open'); });
    }
  });

  /* ——— cookie ——— */
  var ck = document.getElementById('cookieBar');
  if (ck) {
    var KEY = 'andromeda_consult_cookie_ok';
    try {
      if (!localStorage.getItem(KEY)) ck.classList.add('show');
    } catch (err) { ck.classList.add('show'); }
    var okBtn = ck.querySelector('[data-cookie-ok]');
    if (okBtn) okBtn.addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (err) {}
      ck.classList.remove('show');
    });
  }

  /* ——— калькулятор Сколково ——— */
  var calc = document.getElementById('skCalc');
  if (calc) {
    var num = function (id) {
      var el = document.getElementById(id);
      if (!el) return 0;
      var v = String(el.value).replace(/\s/g, '').replace(',', '.');
      var n = parseFloat(v);
      return isFinite(n) && n > 0 ? n : 0;
    };
    var fmt = function (v, dec) {
      if (!isFinite(v)) return '—';
      return v.toLocaleString('ru-RU', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
    };
    var el;
    var keys = ['rev', 'prof', 'payroll', 'growth', 'years'];
    keys.forEach(function (k) {
      el = document.getElementById(k);
      if (el) el.addEventListener('input', recalc);
      if (el) el.addEventListener('change', recalc);
    });

    function recalc() {
      var rev = num('rev');          // выручка, млн ₽
      var prof = num('prof');        // прибыль до налога, млн ₽
      var payroll = num('payroll');  // ФОТ, млн ₽
      var growth = num('growth');    // рост показателей, %
      var years = Math.min(15, Math.max(1, Math.round(num('years') || 10)));

      var profBefore = prof * 0.25;
      var profAfter = 0;
      var payBefore = payroll * 0.30;
      var payAfter = payroll * 0.15;
      var yearGain = (profBefore - profAfter) + (payBefore - payAfter);

      var total = 0, g = 1 + growth / 100;
      for (var i = 0; i < years; i++) { total += yearGain * Math.pow(g, i); }

      var taxNow = profBefore + payBefore;
      var taxAfter = profAfter + payAfter;
      var drop = taxNow > 0 ? (1 - taxAfter / taxNow) * 100 : 0;

      var setTxt = function (id, v) { var x = document.getElementById(id); if (x) x.textContent = v; };
      setTxt('outYear', fmt(yearGain, 1));
      setTxt('outTotal', fmt(total, 1));
      setTxt('outPerMln', rev > 0 ? fmt((yearGain * 1000) / rev, 1) : '—');
      setTxt('outProfNow', fmt(profBefore, 1));
      setTxt('outPayNow', fmt(payBefore, 1));
      setTxt('outProfAfter', fmt(profAfter, 1));
      setTxt('outPayAfter', fmt(payAfter, 1));
      setTxt('outDrop', fmt(drop, 0) + '%');
      setTxt('outYears', String(years));

      var flags = document.getElementById('calcFlags');
      if (flags) {
        var msgs = [];
        if (rev > 1000) {
          msgs.push('<div class="flag warn">Выручка больше 1 млрд ₽: прямые льготы резидента к такой компании не применяются (лимит по выручке — 1 млрд ₽, по чистой прибыли — 300 млн ₽). Для крупных компаний работает схема с отдельным научно-исследовательским центром — резидентом Сколково; расчёт для неё делается отдельно.</div>');
        }
        if (prof > 300) {
          msgs.push('<div class="flag warn">Чистая прибыль выше 300 млн ₽ — лимит по прибыли превышен. Нужна структура с отдельным юрлицом, где концентрируется профильная деятельность.</div>');
        }
        if (prof <= 0) {
          msgs.push('<div class="flag warn">Прибыли нет: экономия считается только по страховым взносам (30% → 15%). Налог на прибыль 0% даст эффект, когда компания выйдет в плюс.</div>');
        }
        if (rev > 0 && rev <= 1000 && prof <= 300 && prof > 0) {
          msgs.push('<div class="flag ok">Компания укладывается в лимиты участника Сколково: можно применять и 0% по налогу на прибыль, и 15% по страховым взносам.</div>');
        }
        flags.innerHTML = msgs.join('');
      }
    }
    recalc();
  }

  /* ——— формы заявок ——— */
  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      var msg = form.querySelector('.form-msg');
      var name = data.name || '';
      var phone = data.phone || '';
      if (name.length < 2) { return showMsg(msg, 'err', 'Укажите имя, пожалуйста.'); }
      if (phone.replace(/\D/g, '').length < 10) { return showMsg(msg, 'err', 'Проверьте номер телефона.'); }

      var kind = form.getAttribute('data-lead');
      var lines = ['Заявка с сайта: ' + kind];
      Object.keys(data).forEach(function (k) {
        if (data[k]) lines.push(labelOf(k) + ': ' + data[k]);
      });
      lines.push('Дата: ' + new Date().toLocaleString('ru-RU'));
      var text = lines.join('\n');

      try {
        var store = JSON.parse(localStorage.getItem('andromeda_leads') || '[]');
        store.push({ kind: kind, at: new Date().toISOString(), data: data });
        localStorage.setItem('andromeda_leads', JSON.stringify(store.slice(-20)));
      } catch (err) {}

      showMsg(msg, 'ok', 'Заявка сформирована. Сейчас откроется Telegram — отправьте её одним нажатием, и мы ответим в течение рабочего дня. Если Telegram не открылся, позвоните: 8 916 770-25-55.');

      var tg = 'https://t.me/andromedaconsult';
      var url = tg + '?text=' + encodeURIComponent(text);
      window.open(url, '_blank');
      form.reset();
    });
  });

  function labelOf(k) {
    var m = {
      name: 'Имя', phone: 'Телефон', email: 'E-mail', company: 'Компания',
      program: 'Программа', slot: 'Удобное время', topic: 'Тема', question: 'Вопрос',
      material: 'Материал', revenue: 'Выручка', comment: 'Комментарий'
    };
    return m[k] || k;
  }
  function showMsg(el, cls, text) {
    if (!el) return;
    el.className = 'form-msg ' + cls;
    el.textContent = text;
  }

  /* ——— «спроси про программу» на главной ——— */
  var askForm = document.getElementById('askForm');
  if (askForm) {
    askForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (document.getElementById('askInput') || {}).value || '';
      q = q.trim();
      if (q.length < 4) return;
      location.href = 'consultation.html?q=' + encodeURIComponent(q) + '#form';
    });
  }

  /* ——— год в подвале ——— */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
