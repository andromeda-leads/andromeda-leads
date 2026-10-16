/* Хоккей равных возможностей — скрипты сайта: анимация появления, счётчики, меню, форма */
(function () {
  "use strict";

  /* ---------- появление блоков при прокрутке ---------- */
  var revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* каскадная задержка внутри групп */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    var step = parseFloat(group.getAttribute("data-stagger")) || 90;
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.transitionDelay = i * step + "ms";
    });
  });

  /* красная черта под заголовком */
  var rules = document.querySelectorAll(".rule");
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    rules.forEach(function (el) { ro.observe(el); });
  } else {
    rules.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- счётчики ---------- */
  function format(n, dec, group) {
    var s = dec ? n.toFixed(dec).replace(".", ",") : String(Math.round(n));
    if (group) {
      var parts = s.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      s = parts.join(",");
    }
    return s;
  }

  function runCounter(el) {
    var to = parseFloat(el.getAttribute("data-count-to"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var group = el.getAttribute("data-group") === "1";
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400, start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + format(to * eased, dec, group) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + format(to, dec, group) + suffix;
    }
    requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll("[data-count-to]");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    counters.forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count-to"));
      var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
      el.textContent = (el.getAttribute("data-prefix") || "") +
        format(to, dec, el.getAttribute("data-group") === "1") + (el.getAttribute("data-suffix") || "");
    });
  } else if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.55 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- шапка и прогресс чтения ---------- */
  var header = document.querySelector(".site-header");
  var bar = document.querySelector(".progress");
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- мобильное меню ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.querySelector(".nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.innerWidth <= 860) {
        nav.classList.remove("is-open");
        burger.classList.remove("is-open");
      }
    });
  }

  /* ---------- плавная прокрутка к якорям ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href"));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  });

  /* ---------- анкеты: партнёрская и заявка в команду ---------- */
  document.querySelectorAll("form[data-partner-form], form[data-team-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var ok = true;
      form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("error"); });
      form.querySelectorAll("[required]").forEach(function (input) {
        if (input.type === "checkbox" && !input.checked) {
          ok = false;
          var fc0 = input.closest(".check");
          if (fc0) fc0.classList.add("error");
        } else if (input.type !== "checkbox" && !String(input.value).trim()) {
          ok = false;
          var f = input.closest(".field");
          if (f) f.classList.add("error");
        } else if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          ok = false;
          var f2 = input.closest(".field");
          if (f2) f2.classList.add("error");
        }
      });
      if (!ok) {
        e.preventDefault();
        var firstBad = form.querySelector(".field.error, .check.error");
        if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Отправляем…"; }
    });
  });
})();
