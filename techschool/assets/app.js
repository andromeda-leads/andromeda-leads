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

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
  });
})();
