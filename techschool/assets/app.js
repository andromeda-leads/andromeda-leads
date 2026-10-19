/* Андромеда Техспейс — общие скрипты лендинга */
(function () {
  'use strict';

  var REVEAL_SELECTORS = [
    '.card', '.program', '.review', '.proof .item', '.faq details',
    '.price-card', '.doodle', '.link-card', '.member', '.gallery img',
    'section h2', 'section .lead'
  ];

  function initNav() {
    var burger = document.querySelector('.burger');
    var links = document.querySelector('.nav-links');
    if (burger && links) {
      burger.addEventListener('click', function () {
        links.classList.toggle('open');
      });
      var items = links.querySelectorAll('a');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function () { links.classList.remove('open'); });
      }
    }
    /* плавный переход по анкорам с учётом липкого меню */
    try {
      document.documentElement.style.scrollBehavior = 'smooth';
    } catch (e) {}
  }

  function initReveal() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    var nodes = [];
    for (var s = 0; s < REVEAL_SELECTORS.length; s++) {
      var found = document.querySelectorAll(REVEAL_SELECTORS[s]);
      for (var k = 0; k < found.length; k++) {
        if (nodes.indexOf(found[k]) === -1) nodes.push(found[k]);
      }
    }

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting) continue;
        var el = entry.target;
        observer.unobserve(el);
        var siblings = el.parentNode ? el.parentNode.children : [];
        var idx = Array.prototype.indexOf.call(siblings, el);
        var delay = Math.min(Math.max(idx, 0) * 70, 350);
        el.style.animationDelay = delay + 'ms';
        el.classList.add('reveal-anim');
        (function (node) {
          var done = false;
          function cleanup() {
            if (done) return;
            done = true;
            node.classList.remove('reveal-anim');
            node.style.animationDelay = '';
          }
          node.addEventListener('animationend', cleanup);
          setTimeout(cleanup, 1600);
        })(el);
      }
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });

    for (var n = 0; n < nodes.length; n++) observer.observe(nodes[n]);
  }

  /* слайдер отзывов: стрелки, точки, счётчик */
  function initReviews() {
    var wraps = document.querySelectorAll('[data-reviews]');
    for (var w = 0; w < wraps.length; w++) {
      (function (wrap) {
        var track = wrap.querySelector('.rev-slider');
        if (!track) return;
        var prev = wrap.querySelector('[data-rev-prev]');
        var next = wrap.querySelector('[data-rev-next]');
        var dotsBox = wrap.querySelector('.rev-dots');
        var counter = wrap.querySelector('[data-rev-counter]');
        var cards = track.querySelectorAll('.review');
        if (!cards.length) return;

        function step() {
          if (cards.length > 1) return cards[1].offsetLeft - cards[0].offsetLeft;
          return track.clientWidth;
        }
        function perView() {
          var s = step();
          return s > 0 ? Math.max(1, Math.round(track.clientWidth / s)) : 1;
        }
        function pageCount() {
          return Math.max(1, Math.ceil(cards.length / perView()));
        }
        function pageWidth() {
          return step() * perView();
        }
        function buildDots() {
          if (!dotsBox) return;
          dotsBox.innerHTML = '';
          var n = pageCount();
          if (n < 2) return;
          for (var p = 0; p < n; p++) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'rev-dot';
            b.setAttribute('aria-label', 'Страница ' + (p + 1));
            (function (idx) {
              b.addEventListener('click', function () {
                track.scrollTo({ left: idx * pageWidth(), behavior: 'smooth' });
              });
            })(p);
            dotsBox.appendChild(b);
          }
        }
        function sync() {
          var pw = pageWidth();
          var idx = pw > 0 ? Math.round(track.scrollLeft / pw) : 0;
          var maxScroll = track.scrollWidth - track.clientWidth - 4;
          if (prev) prev.disabled = track.scrollLeft <= 4;
          if (next) next.disabled = track.scrollLeft >= maxScroll;
          if (counter) counter.textContent = (idx + 1) + ' / ' + pageCount();
          if (dotsBox) {
            var ds = dotsBox.querySelectorAll('.rev-dot');
            for (var i = 0; i < ds.length; i++) {
              if (i === idx) ds[i].classList.add('active');
              else ds[i].classList.remove('active');
            }
          }
        }
        if (prev) prev.addEventListener('click', function () {
          track.scrollBy({ left: -pageWidth(), behavior: 'smooth' });
        });
        if (next) next.addEventListener('click', function () {
          track.scrollBy({ left: pageWidth(), behavior: 'smooth' });
        });
        track.addEventListener('scroll', function () {
          window.clearTimeout(track._revT);
          track._revT = window.setTimeout(sync, 90);
        });
        track.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' && next) { e.preventDefault(); next.click(); }
          if (e.key === 'ArrowLeft' && prev) { e.preventDefault(); prev.click(); }
        });
        window.addEventListener('resize', function () { buildDots(); sync(); });
        buildDots();
        sync();
      })(wraps[w]);
    }
  }

  /* согласие на cookie */
  function initCookie() {
    var bar = document.getElementById('cookieBar');
    if (!bar) return;
    var KEY = 'andromeda_cookie_ok';
    var agreed = false;
    try { agreed = window.localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (agreed) return;
    window.setTimeout(function () { bar.classList.add('show'); }, 600);
    var btn = bar.querySelector('[data-cookie-ok]');
    if (btn) btn.addEventListener('click', function () {
      try { window.localStorage.setItem(KEY, '1'); } catch (e) {}
      bar.classList.remove('show');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
    initReviews();
    initCookie();
  });
})();
