/* ПТ-полимер - анимация и мелкая механика страниц */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Появление блоков при прокрутке ---------- */
  function reveals() {
    var items = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var d = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(function () { el.classList.add('in'); }, d);
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. Счётчики ---------- */
  function counters() {
    var nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;
    function run(el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var dur = 1100, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var v = to * (1 - Math.pow(1 - p, 3));
        el.textContent = (to % 1 ? v.toFixed(1) : Math.round(v));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Схема в шапке: трубы, узлы, движущиеся точки ---------- */
  function blueprint() {
    var cv = document.getElementById('pipes');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, paths = [], dots = [], nodes = [], raf = null, tick = 0;

    function build() {
      var r = cv.getBoundingClientRect();
      W = Math.max(320, r.width); H = Math.max(320, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var u = Math.min(W, 900) / 900;
      function P(x, y) { return { x: x * W, y: y * H }; }

      paths = [
        { c: [P(-.05, .72), P(.18, .72), P(.28, .38), P(.52, .38)], w: 2.2, dots: 3 },
        { c: [P(.52, .38), P(.72, .38), P(.78, .62), P(1.05, .62)], w: 2.2, dots: 2 },
        { c: [P(.52, .38), P(.62, .12), P(.86, .12), P(1.02, .12)], w: 1.2, dots: 1 },
        { c: [P(-.02, .2), P(.2, .2), P(.26, .2), P(.42, .2)], w: 1, dots: 1 },
        { c: [P(.42, .2), P(.42, .2), P(.44, .38), P(.52, .38)], w: 1, dots: 1 }
      ];
      nodes = [
        { p: P(.52, .38), r: 5.5, lab: 'УЗЕЛ 01' },
        { p: P(.42, .2), r: 3.6, lab: '' },
        { p: P(.18, .72), r: 3.2, lab: '' }
      ];
      dots = [];
      paths.forEach(function (p, i) {
        var n = reduced ? 0 : (p.dots || 1);
        for (var k = 0; k < n; k++) {
          dots.push({ path: i, t: (k + i * 0.37) % 1, speed: 0.00013 + 0.00005 * ((i + k) % 3) });
        }
      });
      void u;
    }

    function bez(p, t) {
      var mt = 1 - t, c = p.c;
      return {
        x: mt * mt * mt * c[0].x + 3 * mt * mt * t * c[1].x + 3 * mt * t * t * c[2].x + t * t * t * c[3].x,
        y: mt * mt * mt * c[0].y + 3 * mt * mt * t * c[1].y + 3 * mt * t * t * c[2].y + t * t * t * c[3].y
      };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // опорные засечки по краю
      ctx.strokeStyle = 'rgba(113,202,239,0.13)';
      ctx.lineWidth = 1;
      var step = 56;
      for (var x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, 8); ctx.stroke();
      }
      for (var y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(8, y + .5); ctx.stroke();
      }

      // трубы
      paths.forEach(function (p) {
        ctx.beginPath();
        ctx.moveTo(p.c[0].x, p.c[0].y);
        ctx.bezierCurveTo(p.c[1].x, p.c[1].y, p.c[2].x, p.c[2].y, p.c[3].x, p.c[3].y);
        ctx.lineWidth = p.w + 5;
        ctx.strokeStyle = 'rgba(11,34,49,0.55)';
        ctx.stroke();
        ctx.lineWidth = p.w;
        ctx.strokeStyle = 'rgba(113,202,239,0.30)';
        ctx.stroke();
        if (!reduced) {
          ctx.save();
          ctx.setLineDash([3, 16]);
          ctx.lineDashOffset = -tick * 0.55;
          ctx.lineWidth = p.w;
          ctx.strokeStyle = 'rgba(230,120,24,0.55)';
          ctx.stroke();
          ctx.restore();
        }
      });

      // узлы
      nodes.forEach(function (n, i) {
        var pulse = reduced ? 0 : (Math.sin(tick / 34 + i) + 1) / 2;
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, n.r + 9 + pulse * 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(113,202,239,' + (0.16 - pulse * 0.09) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = '#0B2231';
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,120,24,0.9)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      // точки потока
      dots.forEach(function (d) {
        var pt = bez(paths[d.path], d.t);
        var grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 9);
        grd.addColorStop(0, 'rgba(255,170,80,0.95)');
        grd.addColorStop(1, 'rgba(230,120,24,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFC78A';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.1, 0, Math.PI * 2); ctx.fill();
      });
    }

    function loop() {
      tick++;
      dots.forEach(function (d) { d.t += d.speed * 16; if (d.t > 1) d.t -= 1; });
      draw();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (raf || reduced) return;
      raf = requestAnimationFrame(loop);
    }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { build(); if (reduced) draw(); }, 160);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    build();
    if (reduced) draw(); else start();
  }

  /* ---------- 4. Лайтбокс галереи ---------- */
  function lightbox() {
    var links = document.querySelectorAll('.gallery a');
    if (!links.length) return;
    var box = document.createElement('div');
    box.className = 'lb';
    box.innerHTML = '<button type="button" aria-label="Закрыть">×</button><img alt="">';
    document.body.appendChild(box);
    var img = box.querySelector('img');
    links.forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        img.src = a.getAttribute('href');
        box.classList.add('open');
      });
    });
    function close() { box.classList.remove('open'); img.removeAttribute('src'); }
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.tagName === 'BUTTON') close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------- 5. Меню на телефоне ---------- */
  function burger() {
    var b = document.querySelector('.burger');
    var nav = document.querySelector('.nav');
    if (!b || !nav) return;
    b.addEventListener('click', function () { nav.classList.toggle('open'); });
  }

  /* ---------- 6. Форма заявки ---------- */
  var API = 'https://agrosignal.mypetlab.org/contracts/andromeda.site-lead-api/1.0/lead';
  var KEY = '0bc512399e2f6838846f71c8e679dd9db9d7b847510da086463c8aeabb06b2fd';

  function forms() {
    document.querySelectorAll('form[data-lead]').forEach(function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var msg = f.querySelector('.form-msg');
        var data = {};
        new FormData(f).forEach(function (v, k) { data[k] = String(v).trim(); });
        if (!data.name || !(data.phone || data.email)) {
          if (msg) { msg.className = 'form-msg err'; msg.textContent = 'Укажите имя и телефон или e-mail.'; }
          return;
        }
        var btn = f.querySelector('button[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }
        var payload = {
          kind: 'Заявка с сайта pt-polimer.ru',
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          company: data.company || '',
          comment: data.comment || '',
          page: (data.page || location.pathname) + ' · ' + (data.subject || '')
        };
        fetch(API + '?key=' + encodeURIComponent(KEY), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json(); }).then(function (res) {
          if (msg) {
            msg.className = 'form-msg ok';
            msg.textContent = 'Заявка принята. Свяжемся в рабочее время: ' +
              (res && res.number ? 'номер ' + res.number + '. ' : '') +
              'Если срочно - звоните 8 (812) 906-74-64.';
          }
          f.reset();
        }).catch(function () {
          if (msg) {
            msg.className = 'form-msg err';
            msg.textContent = 'Не удалось отправить. Позвоните: 8 (812) 906-74-64 или напишите info@pt-polimer.ru';
          }
        }).then(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Отправить заявку'; }
        });
      });
    });
  }

  function boot() {
    reveals(); counters(); blueprint(); lightbox(); burger(); forms();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
