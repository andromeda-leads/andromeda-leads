/* События и запуск приложения */
"use strict";

/* ---------- модальное окно ---------- */
function openModal(title, bodyHtml, onSave, saveLabel) {
  closeModal();
  var wrap = document.createElement("div");
  wrap.id = "modal";
  wrap.style.cssText = "position:fixed;inset:0;z-index:30;background:rgba(70,34,58,.45);display:flex;align-items:flex-end;justify-content:center;padding:0";
  wrap.innerHTML = '<div style="background:#fff;border-radius:20px 20px 0 0;padding:18px;width:100%;max-width:560px;max-height:86vh;overflow:auto">' +
    '<h2 style="margin:0 0 12px;font-size:17px">' + esc(title) + '</h2>' + bodyHtml +
    '<div class="row" style="margin-top:14px"><button class="primary" id="m-save">' + esc(saveLabel || "Сохранить") + '</button>' +
    '<button class="ghost" id="m-cancel">Отмена</button></div></div>';
  document.body.appendChild(wrap);
  $("#m-cancel").addEventListener("click", closeModal);
  wrap.addEventListener("click", function (e) { if (e.target === wrap) closeModal(); });
  if (onSave) $("#m-save").addEventListener("click", function () { if (onSave() !== false) closeModal(); });
}
function closeModal() { var m = $("#modal"); if (m) m.parentNode.removeChild(m); }

/* ---------- события ---------- */
function bindEvents() {
  $("#tabbar").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    UI.tab = b.getAttribute("data-tab"); renderAll();
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute("data-task")) {
      var id = t.getAttribute("data-task"), date = id.split("|")[0];
      var rec = STATE.checks[date] || (STATE.checks[date] = { items: {} });
      rec.items = rec.items || {};
      if (t.checked) rec.items[id] = true; else delete rec.items[id];
      if (rec.status === "skipped" && t.checked) rec.status = "";
      saveState(); renderHeader(); if (UI.tab === "today") renderToday(); else renderPlan();
      checkAchievements(); renderHeader();
    }
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-go],[data-month],[data-day],[data-scope],[data-delsick],[data-tsave],button");
    if (!el) return;
    var go = el.getAttribute("data-go"), mon = el.getAttribute("data-month"), d = el.getAttribute("data-day"),
        sc = el.getAttribute("data-scope"), ds = el.getAttribute("data-delsick"), ts = el.getAttribute("data-tsave");
    if (go) { UI.tab = go; renderAll(); return; }
    if (mon) { UI.planMonth = mon; renderPlan(); return; }
    if (d) { UI.planDay = d; renderPlan(); window.scrollTo(0, 400); return; }
    if (sc) { UI.reportScope = sc; renderReport(); return; }
    if (ds != null) { STATE.sick.splice(+ds, 1); saveState(); renderDiary(); return; }
    if (ts) { saveTest(ts); return; }
    switch (el.id) {
      case "btn-diary-today": case "btn-diary-diary": saveDiary(); break;
      case "btn-day-note-today": case "btn-day-note-diary": noteDialog(); break;
      case "btn-skip": skipDay($("#skip-reason") ? $("#skip-reason").value : ""); break;
      case "btn-unskip": unskipDay(); break;
      case "btn-sick": case "btn-sick2": sickDialog(); break;
      case "btn-share": shareReport(); break;
      case "btn-copy": copyReport(); break;
      case "btn-pdf": window.print(); break;
      case "btn-save-topic": STATE.settings.ntfyTopic = ($("#st-topic").value || "").trim(); saveState(true); toast("Тема напоминаний сохранена"); break;
      case "btn-copy-topic": copyText(STATE.settings.ntfyTopic, "Тема скопирована"); break;
      case "btn-ntfy-open": window.open("https://ntfy.sh/" + encodeURIComponent(STATE.settings.ntfyTopic), "_blank"); break;
      case "btn-save-sync":
        STATE.settings.syncUrl = ($("#st-sync").value || "").trim();
        STATE.settings.syncToken = ($("#st-token").value || "").trim();
        saveState(true); pushSync(true); break;
      case "btn-pull-sync": pullSync(true); break;
      case "btn-save-profile":
        STATE.profile.name = ($("#st-name").value || "").trim();
        STATE.profile.cycleTracking = $("#st-cycle").value === "1";
        STATE.settings.iceTime = ($("#st-icetime").value || "").trim();
        STATE.settings.powerTime = ($("#st-powertime").value || "").trim();
        saveState(); renderAll(); toast("Настройки сохранены"); break;
      case "btn-export": exportJson(); break;
      case "btn-import": $("#file-import").click(); break;
      case "btn-reset":
        openModal("Сбросить все данные?", '<div class="muted">Отметки тренировок, дневник и тесты будут удалены на этом устройстве. Резервную копию лучше сохранить заранее.</div>', function () {
          var keepUrl = STATE.settings.syncUrl, keepTok = STATE.settings.syncToken, keepTopic = STATE.settings.ntfyTopic;
          STATE = defState(); STATE.settings.syncUrl = keepUrl; STATE.settings.syncToken = keepTok; STATE.settings.ntfyTopic = keepTopic;
          saveState(true); renderAll(); toast("Данные сброшены");
        }, "Сбросить");
        break;
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "file-import" && e.target.files && e.target.files[0]) importJson(e.target.files[0]);
  });
}

/* ---------- действия дня ---------- */
function skipDay(reason) {
  var t = today(), day = planDay(t); if (!day) return;
  var rec = STATE.checks[t] || (STATE.checks[t] = { items: {} });
  rec.status = "skipped"; rec.skipReason = reason || "";
  rec.items = {}; saveState(); renderAll(); toast("День отмечен как пропуск");
}
function unskipDay() {
  var t = today();
  delete STATE.checks[t]; saveState(); renderAll(); toast("Отметки дня сняты");
}
function noteDialog() {
  var t = today(), rec = STATE.checks[t] || {};
  openModal("Заметка о тренировке", '<label class="fld"><span>Что получилось, что нет, что болело</span><textarea id="m-note" rows="4">' + esc(rec.note || "") + '</textarea></label>' +
    '<label class="fld"><span>Тяжесть тренировки (RPE 1–10)</span><input id="m-rpe" type="number" inputmode="numeric" value="' + ((STATE.diary[t] || {}).rpe || "") + '"></label>',
    function () {
      var rec2 = STATE.checks[t] || (STATE.checks[t] = { items: {} });
      rec2.note = $("#m-note").value;
      var rpe = num($("#m-rpe").value);
      if (rpe) { var dd = STATE.diary[t] || (STATE.diary[t] = {}); dd.rpe = clamp(rpe, 1, 10); }
      saveState(); toast("Заметка сохранена");
    });
}
function sickDialog() {
  var t = today();
  openModal("Отметить болезнь", '<div class="muted">Дни болезни не считаются пропусками. После выздоровления возвращаемся по протоколу: 50% → 75% → полный объём.</div>' +
    '<div class="grid2" style="margin-top:10px"><label class="fld"><span>С</span><input id="m-sick-from" type="date" value="' + t + '"></label>' +
    '<label class="fld"><span>По</span><input id="m-sick-to" type="date" value="' + t + '"></label></div>' +
    '<label class="fld"><span>Что случилось</span><input id="m-sick-note" placeholder="например, температура 38"></label>',
    function () {
      var f = $("#m-sick-from").value, to = $("#m-sick-to").value;
      if (!f || !to || to < f) { toast("Проверьте даты"); return false; }
      STATE.sick.push({ from: f, to: to, note: $("#m-sick-note").value });
      saveState(); renderAll(); toast("Период болезни отмечен");
    });
}

/* ---------- дневник и тесты ---------- */
function saveDiary() {
  var t = today();
  var d = {
    hr: num($("#d-hr") ? $("#d-hr").value : null),
    sleep: num($("#d-sleep") ? $("#d-sleep").value : null),
    sleepQ: num($("#d-sleepq") ? $("#d-sleepq").value : null),
    fatigue: num($("#d-fatigue") ? $("#d-fatigue").value : null),
    sore: num($("#d-sore") ? $("#d-sore").value : null),
    mood: num($("#d-mood") ? $("#d-mood").value : null),
    weight: num($("#d-weight") ? $("#d-weight").value : null),
    rpe: num($("#d-rpe") ? $("#d-rpe").value : null),
    cycle: num($("#d-cycle") ? $("#d-cycle").value : null),
    note: $("#d-note") ? $("#d-note").value : ""
  };
  STATE.diary[t] = d;
  saveState(); renderAll();
  toast("Самочувствие сохранено");
}
function saveTest(id) {
  var v = num(($("[data-tval='" + id + "']") || {}).value);
  var dt = ($("[data-tdate='" + id + "']") || {}).value || today();
  if (v == null) { toast("Введите значение"); return; }
  var def = testDef(id);
  STATE.tests[id] = STATE.tests[id] || [];
  STATE.tests[id] = STATE.tests[id].filter(function (x) { return x.date !== dt; });
  STATE.tests[id].push({ date: dt, value: v });
  STATE.tests[id].sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  saveState(); renderTests(); checkAchievements(); renderHeader();
  toast("Записано: " + def.name + " — " + v + " " + def.unit);
}

/* ---------- отчёт ---------- */
function shareReport() {
  var cur = currentReport();
  var text = reportText(cur.rep, cur.label);
  if (navigator.share) {
    navigator.share({ title: "Хоккей: " + cur.label, text: text }).catch(function () { });
  } else { copyText(text, "Текст отчёта скопирован"); }
}
function copyReport() { var cur = currentReport(); copyText(reportText(cur.rep, cur.label), "Текст отчёта скопирован"); }
function copyText(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast("Не удалось скопировать"); });
  } else {
    var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(msg); } catch (e) { toast("Не удалось скопировать"); }
    document.body.removeChild(ta);
  }
}

/* ---------- отрисовка ---------- */
function renderHeader() {
  syncXp();
  var lv = levelProgress(STATE.xp);
  var b = $("#level-badge"); if (b) b.textContent = "Ур. " + lv.lv;
  var f = $("#xpfill"); if (f) f.style.width = lv.pct + "%";
  var sub = $("#brand-sub");
  if (sub) {
    var d = planDay(today());
    sub.textContent = d ? ("неделя " + d.w + " · " + mesoOfWeek(d.w).name + " · " + STATE.xp + " XP") : (STATE.profile.name ? STATE.profile.name + " · " + STATE.xp + " XP" : "программа, дневник и прогресс");
  }
}
function renderAll() {
  var map = { today: "s-today", plan: "s-plan", tests: "s-tests", diary: "s-diary", report: "s-report", info: "s-info" };
  for (var k in map) {
    var el = document.getElementById(map[k]);
    if (el) el.classList.toggle("hidden", k !== UI.tab);
  }
  $$("#tabbar button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === UI.tab); });
  if (UI.tab === "today") renderToday();
  if (UI.tab === "plan") renderPlan();
  if (UI.tab === "tests") renderTests();
  if (UI.tab === "diary") renderDiary();
  if (UI.tab === "report") renderReport();
  if (UI.tab === "info") renderInfo();
  renderHeader();
  window.scrollTo(0, 0);
}

/* ---------- лепестки сакуры ---------- */
function petals() {
  var box = $("#petals"); if (!box) return;
  var chars = ["🌸", "💗", "🌸", "🤍"];
  for (var i = 0; i < 12; i++) {
    var p = document.createElement("div");
    p.className = "petal";
    p.textContent = chars[i % chars.length];
    p.style.left = Math.round(Math.random() * 96) + "%";
    p.style.animationDuration = (9 + Math.random() * 10).toFixed(1) + "s";
    p.style.animationDelay = (-Math.random() * 12).toFixed(1) + "s";
    p.style.fontSize = (10 + Math.random() * 8).toFixed(0) + "px";
    box.appendChild(p);
  }
}

/* ---------- запуск ---------- */
function boot() {
  fetch("./plan.json?t=" + Date.now()).then(function (r) { return r.json(); }).then(function (plan) {
    PLAN = plan;
    loadState();
    UI.planDay = today();
    bindEvents();
    petals();
    syncXp();
    renderAll();
    checkAchievements();
    renderHeader();
    if (STATE.settings.syncUrl) pullSync(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(function () { });
    }
  }).catch(function () {
    document.getElementById("s-today").innerHTML = '<div class="card"><h2>Не удалось загрузить план</h2><div class="muted">Проверьте интернет и обновите страницу.</div></div>';
  });
}
document.addEventListener("DOMContentLoaded", boot);
