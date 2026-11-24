/* САНТЕХДЕТАЛЬ-М - интерфейс: появление блоков, счётчики, анимация раскроя, лайтбокс, форма */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?flat=1 - служебный режим: все блоки сразу видимы (снимок страницы целиком)
  if (/[?&]flat=1/.test(location.search)) reduce = true;

  /* ---------- прогресс чтения + фон шапки ---------- */
  var prog = document.getElementById('prog');
  var hdr = document.querySelector('.hdr');
  function onScroll() {
    var h = document.documentElement;
    var top = h.scrollTop || document.body.scrollTop;
    var max = h.scrollHeight - h.clientHeight;
    if (prog) prog.style.width = (max > 0 ? (top / max) * 100 : 0) + '%';
    if (hdr) hdr.classList.toggle('on', top > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = mnav.classList.toggle('on');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { mnav.classList.remove('on'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- появление секций ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          var d = parseFloat(el.getAttribute('data-d') || '0');
          setTimeout(function () { el.classList.add('in'); }, d * 1000);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- счётчики ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-to'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var suffix = el.getAttribute('data-suf') || '';
    var start = performance.now();
    var dur = 1300;
    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      var txt = dec > 0 ? val.toFixed(dec) : Math.round(val).toString();
      el.textContent = txt.replace('.', ',') + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-to]');
  if (counters.length) {
    if ('IntersectionObserver' in window && !reduce) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { animateCount(en.target); io2.unobserve(en.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { io2.observe(el); });
    } else {
      counters.forEach(function (el) {
        var t = el.getAttribute('data-to');
        var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
        el.textContent = (dec > 0 ? parseFloat(t).toFixed(dec) : t).replace('.', ',') + (el.getAttribute('data-suf') || '');
      });
    }
  }

  /* ---------- анимация: луч плазменного раскроя по контуру детали ---------- */
  var cv = document.getElementById('plasma');
  if (cv) {
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var sparks = [];
    var path = [];
    var total = 0;
    var head = 0;
    var rot = 0;

    function buildGear() {
      // контур шестерни: 12 зубцов
      var pts = [];
      var cx = 0, cy = 0;
      var teeth = 12;
      var rOut = 1, rIn = 0.8;
      for (var i = 0; i < teeth; i++) {
        var a0 = (i / teeth) * Math.PI * 2;
        var step = (Math.PI * 2) / teeth;
        pts.push([Math.cos(a0 - step * 0.18) * rIn, Math.sin(a0 - step * 0.18) * rIn]);
        pts.push([Math.cos(a0 - step * 0.10) * rOut, Math.sin(a0 - step * 0.10) * rOut]);
        pts.push([Math.cos(a0 + step * 0.10) * rOut, Math.sin(a0 + step * 0.10) * rOut]);
        pts.push([Math.cos(a0 + step * 0.18) * rIn, Math.sin(a0 + step * 0.18) * rIn]);
      }
      path = pts;
      total = 0;
      for (var j = 0; j < path.length; j++) {
        var p = path[j], q = path[(j + 1) % path.length];
        total += Math.hypot(q[0] - p[0], q[1] - p[1]);
      }
    }

    function resize() {
      var r = cv.parentNode.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pointAt(dist) {
      // точка на контуре по длине
      var d = dist % total;
      for (var i = 0; i < path.length; i++) {
        var p = path[i], q = path[(i + 1) % path.length];
        var seg = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d <= seg) {
          var t = seg === 0 ? 0 : d / seg;
          return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, (q[0] - p[0]) / seg, (q[1] - p[1]) / seg];
        }
        d -= seg;
      }
      return [path[0][0], path[0][1], 0, 0];
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2;
      var R = Math.min(W, H) * 0.36;
      rot += reduce ? 0 : 0.0012;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(R, R);

      // контур-основа
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (var i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
      ctx.closePath();
      ctx.lineWidth = 1.2 / R;
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.stroke();

      // внутренние окружности детали
      ctx.beginPath();
      ctx.arc(0, 0, 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.stroke();

      // разрезы
      for (var k = 0; k < 6; k++) {
        var a = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2);
        ctx.lineTo(Math.cos(a) * 0.52, Math.sin(a) * 0.52);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.stroke();
      }

      // пройденный лучом участок
      var back = reduce ? 0 : 1.5;
      ctx.beginPath();
      for (var s = 0; s <= 44; s++) {
        var dpos = head - back * (1 - s / 44);
        var pp = pointAt(((dpos % total) + total) % total);
        if (s === 0) ctx.moveTo(pp[0], pp[1]); else ctx.lineTo(pp[0], pp[1]);
      }
      ctx.lineWidth = 2.6 / R;
      ctx.strokeStyle = 'rgba(230,17,126,0.95)';
      ctx.shadowColor = 'rgba(230,17,126,0.9)';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // точка реза
      var hp = pointAt(head % total);
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], 5 / R, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], 11 / R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,92,181,0.28)';
      ctx.fill();

      ctx.restore();

      // искры
      if (!reduce) {
        head += total * 0.0032;
        if (Math.random() < 0.55 && sparks.length < 90) {
          var sp = pointAt(head % total);
          var ang = Math.atan2(sp[1], sp[0]);
          sparks.push({
            x: cx + sp[0] * R, y: cy + sp[1] * R,
            vx: (Math.random() - 0.5) * 1.6 - Math.sin(ang) * 1.2,
            vy: (Math.random() - 0.5) * 1.6 + Math.cos(ang) * 1.2,
            life: 1, r: Math.random() * 1.6 + 0.5
          });
        }
      }
      for (var n = sparks.length - 1; n >= 0; n--) {
        var q = sparks[n];
        q.x += q.vx; q.y += q.vy; q.vy += 0.045; q.vx *= 0.985; q.life -= 0.018;
        if (q.life <= 0) { sparks.splice(n, 1); continue; }
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,' + Math.round(120 + 120 * q.life) + ',200,' + (q.life * 0.85) + ')';
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    buildGear();
    resize();
    window.addEventListener('resize', function () { resize(); });
    draw();
  }

  /* ---------- лайтбокс ---------- */
  var lb = document.getElementById('lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.cap');
    document.querySelectorAll('[data-zoom]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        lbImg.src = a.getAttribute('href') || a.querySelector('img').src;
        lbCap.textContent = a.getAttribute('data-cap') || '';
        lb.classList.add('on');
      });
    });
    function closeLb() { lb.classList.remove('on'); lbImg.src = ''; }
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('x')) closeLb();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
  }

  /* ---------- форма заявки ---------- */
  var form = document.getElementById('leadForm');
  if (form) {
    var t0 = Date.now();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.msg');
      var btn = form.querySelector('button[type="submit"]');
      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var email = form.email.value.trim();
      if (name.length < 2) { msg.className = 'msg err'; msg.textContent = 'Укажите имя.'; return; }
      if (phone.replace(/\D/g, '').length < 10) { msg.className = 'msg err'; msg.textContent = 'Укажите телефон.'; return; }
      if (email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) { msg.className = 'msg err'; msg.textContent = 'Проверьте адрес почты.'; return; }
      var robot = form.querySelector('.lead-check');
      if (robot && !robot.checked) { msg.className = 'msg err'; msg.textContent = 'Отметьте, что вы не робот.'; return; }

      var body = {
        kind: 'Заявка с сайта stdm-ural',
        name: name,
        phone: phone,
        email: email,
        company: (form.company && form.company.value.trim()) || '',
        comment: (form.comment && form.comment.value.trim()) || '',
        page: 'stdm-ural · ' + location.pathname,
        hp: (form.querySelector('.lead-hp input') || {}).value || '',
        robot_ok: true,
        elapsed: Math.round((Date.now() - t0) / 1000)
      };
      btn.disabled = true;
      var old = btn.textContent;
      btn.textContent = 'Отправляем...';
      fetch('https://agrosignal.mypetlab.org/contracts/andromeda.site-lead-api/1.0/lead?key=0bc512399e2f6838846f71c8e679dd9db9d7b847510da086463c8aeabb06b2fd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
        msg.className = 'msg ok';
        msg.textContent = 'Заявка принята. Номер ' + (res.number || res.id || 'присвоен') + '. Свяжемся в рабочее время.';
        form.reset();
      }).catch(function () {
        msg.className = 'msg err';
        msg.textContent = 'Не удалось отправить. Позвоните: 8 (35134) 4-62-73.';
      }).then(function () {
        btn.disabled = false;
        btn.textContent = old;
      });
    });
  }

  /* ---------- год в подвале ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
