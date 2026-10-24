/* Хоккей: 8 месяцев - ядро приложения (состояние, расчёты, синхронизация) */
"use strict";

var DEFAULT_TOPIC = "hockey-8m-7q2xk4";
var LS_KEY = "hockey_state_v1";
var PLAN = null;
var STATE = null;
var UI = { tab: "today", planMonth: null, planDay: null, reportMonth: null, reportScope: "month" };

var MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
var MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
var DOW_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

/* ---------- утилиты ---------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function iso(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function parseIso(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function today() { return iso(new Date()); }
function addDays(s, n) { var d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); }
function fmtDate(s) { var d = parseIso(s); return d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear(); }
function fmtShort(s) { var d = parseIso(s); return d.getDate() + " " + MONTHS_SHORT[d.getMonth()]; }
function dowRu(s) { return DOW_SHORT[parseIso(s).getDay() === 0 ? 6 : parseIso(s).getDay() - 1]; }
function monthKey(s) { return s.slice(0, 7); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
function avg(a) { if (!a.length) return null; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
function round(v, k) { var m = Math.pow(10, k || 0); return Math.round(v * m) / m; }
function toast(msg) {
  var t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
}

/* ---------- состояние ---------- */
function defState() {
  return {
    v: 1,
    updated: new Date().toISOString(),
    profile: { name: "Арина", cycleTracking: false },
    settings: {
      ntfyTopic: (window.CFG && window.CFG.topic) || DEFAULT_TOPIC,
      remindHour: "8:00",
      syncUrl: (window.CFG && window.CFG.syncUrl) || "",
      syncToken: (window.CFG && window.CFG.syncToken) || "",
      iceTime: "18:30", powerTime: "18:30"
    },
    checks: {},
    diary: {},
    tests: {},
    sick: [],
    xp: 0,
    xpLog: {},
    achievements: []
  };
}
function loadState() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    STATE = raw ? JSON.parse(raw) : defState();
  } catch (e) { STATE = defState(); }
  var d = defState();
  for (var k in d) if (!(k in STATE)) STATE[k] = d[k];
  if (!STATE.settings.ntfyTopic) STATE.settings.ntfyTopic = DEFAULT_TOPIC;
}
function saveState(silent) {
  STATE.updated = new Date().toISOString();
  try { localStorage.setItem(LS_KEY, JSON.stringify(STATE)); } catch (e) { toast("Не удалось сохранить данные"); }
  if (!silent) { scheduleSync(); }
}
function scheduleSync() {
  if (!STATE.settings.syncUrl) return;
  clearTimeout(scheduleSync._h);
  scheduleSync._h = setTimeout(pushSync, 4000);
}

/* ---------- план ---------- */
function planDay(date) {
  if (!PLAN) return null;
  for (var i = 0; i < PLAN.days.length; i++) if (PLAN.days[i].date === date) return PLAN.days[i];
  return null;
}
function mesoOfWeek(w) {
  if (w < PLAN.meso[0].from) return PLAN.meso[0];
  for (var i = 0; i < PLAN.meso.length; i++) if (w >= PLAN.meso[i].from && w <= PLAN.meso[i].to) return PLAN.meso[i];
  return PLAN.meso[PLAN.meso.length - 1];
}
function kindRu(k) {
  return { ice: "Лёд", power_a: "Сила", power_b: "Мощность", home: "Домашний блок", recovery: "Восстановление", rest: "Отдых", test: "Тест" }[k] || k;
}
function kindIcon(k) {
  return { ice: "⛸️", power_a: "💪", power_b: "⚡", home: "🏠", recovery: "🌿", rest: "😴", test: "📏" }[k] || "•";
}
function taskId(day, bi, ii) { return day.date + "|" + bi + "|" + ii; }
function dayTasks(day) {
  var out = [];
  for (var b = 0; b < day.blocks.length; b++) {
    var bl = day.blocks[b];
    for (var i = 0; i < bl.items.length; i++) out.push({ id: taskId(day, b, i), block: bl.t, text: bl.items[i] });
  }
  return out;
}
function dayChecked(date) { return (STATE.checks[date] || {}).items || {}; }
function isSick(date) {
  for (var i = 0; i < STATE.sick.length; i++) if (date >= STATE.sick[i].from && date <= STATE.sick[i].to) return true;
  return false;
}
function dayStatus(day) {
  if (!day) return "";
  var rec = STATE.checks[day.date] || {};
  if (isSick(day.date)) return "sick";
  if (rec.status === "skipped") return "skipped";
  var tasks = dayTasks(day), done = 0, ch = dayChecked(day.date);
  for (var i = 0; i < tasks.length; i++) if (ch[tasks[i].id]) done++;
  if (day.kind === "rest") return rec.status === "done" ? "done" : "";
  if (day.kind === "test") return done > 0 ? (done === tasks.length ? "done" : "partial") : "";
  if (done === 0) return "";
  return done === tasks.length ? "done" : "partial";
}
function dayProgress(day) {
  var tasks = dayTasks(day), ch = dayChecked(day.date), done = 0;
  for (var i = 0; i < tasks.length; i++) if (ch[tasks[i].id]) done++;
  return { done: done, total: tasks.length, pct: tasks.length ? Math.round(done * 100 / tasks.length) : 0 };
}
function xpForDay(day) {
  return { ice: 30, power_a: 25, power_b: 25, home: 12, recovery: 8, test: 15, rest: 5 }[day.kind] || 0;
}
function syncXp() {
  var total = 0;
  for (var i = 0; i < PLAN.days.length; i++) {
    var d = PLAN.days[i], st = dayStatus(d);
    if (st === "done") total += xpForDay(d);
    else if (st === "partial") total += Math.round(xpForDay(d) * dayProgress(d).pct / 100 * 0.6);
  }
  for (var t in STATE.tests) total += (STATE.tests[t] || []).length * 3;
  total += Object.keys(STATE.diary).length * 2;
  if (STATE.xp !== total) { STATE.xp = total; }
  return total;
}
function levelOf(xp) { return clamp(1 + Math.floor(xp / 150), 1, 30); }
function levelProgress(xp) { var lv = levelOf(xp); var base = (lv - 1) * 150; return { lv: lv, pct: clamp(Math.round((xp - base) * 100 / 150), 0, 100), toNext: base + 150 - xp }; }

/* ---------- достижения ---------- */
function checkAchievements() {
  var got = [], done = 0, ice = 0, power = 0, partial = 0, testsN = 0, diaryN = 0;
  var dates = Object.keys(STATE.checks).sort();
  for (var i = 0; i < PLAN.days.length; i++) {
    var d = PLAN.days[i], st = dayStatus(d);
    if (st === "done") { done++; if (d.kind === "ice") ice++; if (d.kind === "power_a" || d.kind === "power_b") power++; }
    if (st === "partial") partial++;
  }
  for (var t in STATE.tests) testsN += (STATE.tests[t] || []).length;
  diaryN = Object.keys(STATE.diary).length;
  var streak = 0, best = 0;
  for (var j = 0; j < PLAN.days.length; j++) {
    if (dayStatus(PLAN.days[j]) === "done") { streak++; best = Math.max(best, streak); } else streak = 0;
  }
  var pr = false, t;
  for (t in STATE.tests) {
    var arr = (STATE.tests[t] || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var def = testDef(t);
    if (arr.length > 1 && def) {
      var first = arr[0].value, last = arr[arr.length - 1].value;
      if (def.dir === "up" && last > first) pr = true;
      if (def.dir === "down" && last < first) pr = true;
    }
  }
  var m80 = false;
  var months = monthList();
  for (var m = 0; m < months.length; m++) if (monthReport(months[m].key).pct >= 80) m80 = true;
  var sickReturn = false;
  for (var s = 0; s < STATE.sick.length; s++) {
    var after = addDays(STATE.sick[s].to, 1);
    for (var k = 0; k < 4; k++) { var d2 = planDay(addDays(after, k)); if (d2 && dayStatus(d2) === "done") { sickReturn = true; break; } }
  }
  var rules = {
    first: done >= 1, s10: done >= 10, s50: done >= 50, s100: done >= 100,
    streak7: best >= 7, streak30: best >= 30, ice20: ice >= 20, power20: power >= 20,
    test1: testsN >= 1, pr: pr, diary7: diaryN >= 7, month80: m80, sick_return: sickReturn,
    level5: levelOf(syncXp()) >= 5
  };
  for (var id in rules) {
    if (rules[id] && STATE.achievements.indexOf(id) < 0) { STATE.achievements.push(id); got.push(id); }
  }
  if (got.length) {
    var names = got.map(function (x) { return achDef(x).name; }).join(", ");
    setTimeout(function () { toast("Новое достижение: " + names); }, 400);
  }
  return STATE.achievements;
}
function achDef(id) { for (var i = 0; i < PLAN.achievements.length; i++) if (PLAN.achievements[i].id === id) return PLAN.achievements[i]; return { id: id, name: id, icon: "🏅", d: "" }; }

/* ---------- тесты ---------- */
function testDef(id) { for (var i = 0; i < PLAN.tests.length; i++) if (PLAN.tests[i].id === id) return PLAN.tests[i]; return null; }
function testValues(id) { return (STATE.tests[id] || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
function testTarget(def) {
  if (!def) return null;
  return def.dir === "up" ? round(def.base * (1 + def.w34 / 100), def.unit === "с" ? 2 : 0) : round(def.base * (1 - def.w34 / 100), def.unit === "с" ? 2 : 0);
}
function testBest(def, values) {
  if (!values.length) return null;
  var v = values.map(function (x) { return x.value; });
  return def.dir === "up" ? Math.max.apply(null, v) : Math.min.apply(null, v);
}

/* ---------- дневник и готовность ---------- */
function diaryOf(date) { return STATE.diary[date] || null; }
function lastDiaryBefore(date) {
  var keys = Object.keys(STATE.diary).filter(function (k) { return k < date; }).sort();
  return keys.length ? STATE.diary[keys[keys.length - 1]] : null;
}
function hrBaseline(date) {
  var keys = Object.keys(STATE.diary).filter(function (k) { return k < date; }).sort().slice(-14);
  var arr = keys.map(function (k) { return STATE.diary[k].hr; }).filter(function (v) { return v; });
  return arr.length >= 3 ? avg(arr) : null;
}
function readiness(date) {
  var d = diaryOf(date);
  if (!d) return null;
  var s = 62;
  if (d.sleep) s += clamp((d.sleep - 7) * 9, -22, 18);
  if (d.sleepQ) s += (d.sleepQ - 3) * 7;
  if (d.fatigue) s -= (d.fatigue - 3) * 8;
  if (d.sore) s -= (d.sore - 3) * 6;
  if (d.mood) s += (d.mood - 3) * 5;
  var b = hrBaseline(date);
  if (b && d.hr && d.hr > b + 6) s -= 14;
  s = clamp(Math.round(s), 5, 100);
  var zone = s >= 80 ? "ok" : (s >= 62 ? "mid" : "bad");
  var advice = {
    ok: "Зелёная зона. Можно полную нагрузку, включая спринты и прыжки.",
    mid: "Жёлтая зона. Тренировку делаем, но без максимума: спринты короче, прыжков меньше.",
    bad: "Красная зона. Только восстановление: мобильность, дыхание, лёгкая ходьба. Максимумы отменяются."
  }[zone];
  return { score: s, zone: zone, advice: advice };
}
function sickProtocol() { return PLAN.sick_protocol; }

/* ---------- отчёты ---------- */
function monthList() {
  var out = [], seen = {};
  for (var i = 0; i < PLAN.days.length; i++) {
    var k = monthKey(PLAN.days[i].date);
    if (!seen[k]) { seen[k] = 1; out.push({ key: k, label: MONTHS[+k.slice(5, 7) - 1] + " " + k.slice(0, 4) }); }
  }
  return out;
}
function monthReport(key) {
  var days = PLAN.days.filter(function (d) { return monthKey(d.date) === key; });
  var done = 0, partial = 0, missed = 0, sick = 0, rest = 0, mins = 0, planned = 0, doneByKind = {};
  var missedList = [], testsIn = {}, diaryDays = [], xpMonth = 0;
  for (var i = 0; i < days.length; i++) {
    var d = days[i], st = dayStatus(d);
    if (d.kind !== "rest") planned++;
    if (st === "done") { done++; mins += d.min; xpMonth += xpForDay(d); doneByKind[d.kind] = (doneByKind[d.kind] || 0) + 1; }
    else if (st === "partial") { partial++; missedList.push({ date: d.date, day: d, why: "выполнено частично: " + dayProgress(d).done + " из " + dayProgress(d).total }); }
    else if (st === "sick") { sick++; }
    else if (st === "skipped") { missed = 1; missedList.push({ date: d.date, day: d, why: "пропуск: " + ((STATE.checks[d.date] || {}).skipReason || "без причины") }); }
    else if (d.kind === "rest") rest++;
  }
  var t;
  for (t in STATE.tests) {
    var vals = STATE.tests[t].filter(function (v) { return monthKey(v.date) === key; });
    if (vals.length) testsIn[t] = vals;
  }
  for (var k in STATE.diary) if (monthKey(k) === key) diaryDays.push(k);
  var dkeys = diaryDays.sort();
  var well = {
    sleep: avg(dkeys.map(function (k) { return STATE.diary[k].sleep; }).filter(function (v) { return v; })),
    hr: avg(dkeys.map(function (k) { return STATE.diary[k].hr; }).filter(function (v) { return v; })),
    fatigue: avg(dkeys.map(function (k) { return STATE.diary[k].fatigue; }).filter(function (v) { return v; })),
    mood: avg(dkeys.map(function (k) { return STATE.diary[k].mood; }).filter(function (v) { return v; })),
    sore: avg(dkeys.map(function (k) { return STATE.diary[k].sore; }).filter(function (v) { return v; }))
  };
  var wts = dkeys.map(function (k) { return STATE.diary[k].weight; }).filter(function (v) { return v; });
  var pct = planned ? Math.round(done * 100 / planned) : 0;
  var con = conclusions(pct, well, missedList.length, sick, doneByKind);
  return { key: key, days: days, planned: planned, done: done, partial: partial, missedCount: missedList.length, sick: sick,
    mins: mins, pct: pct, missedList: missedList, tests: testsIn, well: well, diaryCount: dkeys.length,
    weightFirst: wts.length ? wts[0] : null, weightLast: wts.length ? wts[wts.length - 1] : null,
    xp: xpMonth, doneByKind: doneByKind, conclusions: con };
}
function conclusions(pct, well, missedN, sick, byKind) {
  var out = [];
  if (pct >= 85) out.push("Месяц закрыт почти идеально: " + pct + "% тренировок выполнено. Можно смело двигаться к следующему мезоциклу.");
  else if (pct >= 65) out.push("Основной объём выполнен (" + pct + "%). Оставшиеся пропуски - не критично, план продолжается по календарю.");
  else out.push("Выполнено только " + pct + "% плана. Стоит понять причину: расписание, усталость или мотивация - и упростить неделю.");
  if (well.fatigue && well.fatigue >= 3.6) out.push("Средняя усталость высокая (" + round(well.fatigue, 1) + " из 5). Добавляем лишний день отдыха и следим за утренним пульсом.");
  if (well.sleep && well.sleep < 7.2) out.push("Сон в среднем " + round(well.sleep, 1) + " ч - это главный ограничитель роста мощности. Цель: 8-9 часов.");
  if (well.hr && well.hr > 0) out.push("Средний утренний пульс " + Math.round(well.hr) + " уд/мин. Резкий рост на 7+ удара - сигнал недосыпа или болезни.");
  if (missedN >= 4) out.push("Пропусков много - проверьте, не слишком ли плотно стоят силовые сессии. Допустимо переносить, но не «догонять» объём.");
  if (sick) out.push("Были дни болезни - они не считаются пропусками, но возвращение к нагрузке делаем по протоколу: 50% → 75% → полный объём.");
  if ((byKind.ice || 0) >= 8) out.push("Ледовая работа стабильная, это главный фактор переноса мощности на игру.");
  return out;
}
function reportText(rep, scopeLabel) {
  var L = [];
  L.push("Хоккей: " + scopeLabel);
  L.push("Выполнено тренировок: " + rep.done + " из " + rep.planned + " (" + rep.pct + "%)");
  if (rep.partial) L.push("Частично выполнено: " + rep.partial);
  if (rep.missedCount) L.push("Пропущено дней: " + rep.missedCount);
  if (rep.sick) L.push("Дней болезни: " + rep.sick);
  L.push("Время тренировок: " + Math.round(rep.mins / 60) + " ч (" + rep.mins + " мин)");
  var kinds = { ice: "лёд", power_a: "силовая", power_b: "мощность", home: "домашние", test: "тесты", recovery: "восстановление" };
  var kb = [];
  for (var k in rep.doneByKind) kb.push((kinds[k] || k) + ": " + rep.doneByKind[k]);
  if (kb.length) L.push("По видам - " + kb.join(", "));
  if (rep.well.sleep) L.push("Сон: " + round(rep.well.sleep, 1) + " ч в среднем");
  if (rep.well.hr) L.push("Утренний пульс: " + Math.round(rep.well.hr) + " уд/мин");
  if (rep.well.fatigue) L.push("Усталость: " + round(rep.well.fatigue, 1) + " из 5, самочувствие: " + (rep.well.mood ? round(rep.well.mood, 1) : "-") + " из 5");
  if (rep.weightLast) L.push("Вес: " + rep.weightLast + " кг" + (rep.weightFirst && rep.weightFirst !== rep.weightLast ? " (было " + rep.weightFirst + ")" : ""));
  var t, arr, def;
  var tlines = [];
  for (t in rep.tests) {
    def = testDef(t); arr = rep.tests[t];
    if (!def) continue;
    tlines.push(def.name + ": " + arr.map(function (x) { return x.value + " " + def.unit; }).join(" → "));
  }
  if (tlines.length) { L.push(""); L.push("Тесты:"); tlines.forEach(function (x) { L.push("• " + x); }); }
  if (rep.missedList.length) {
    L.push("");
    L.push("Что не получилось:");
    rep.missedList.slice(0, 12).forEach(function (m) { L.push("• " + fmtShort(m.date) + " - " + m.why); });
  }
  if (rep.conclusions.length) { L.push(""); L.push("Выводы:"); rep.conclusions.forEach(function (x) { L.push("• " + x); }); }
  var lv = levelProgress(syncXp());
  L.push("");
  L.push("Опыт: " + syncXp() + " XP, уровень " + lv.lv + ". Достижений: " + STATE.achievements.length + " из " + PLAN.achievements.length + ".");
  return L.join("\n");
}

/* ---------- синхронизация ---------- */
function pushSync(silent) {
  if (!STATE.settings.syncUrl) { if (!silent) toast("Синхронизация не подключена"); return; }
  syncXp();
  var payload = JSON.stringify({ token: STATE.settings.syncToken, state: STATE });
  fetch(STATE.settings.syncUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: payload })
    .then(function (r) { return r.json(); })
    .then(function (j) { if (!silent) toast(j && j.ok ? "Данные сохранены в облаке" : "Сервер ответил ошибкой"); })
    .catch(function () { if (!silent) toast("Не удалось связаться с облаком"); });
}
function pullSync(silent) {
  if (!STATE.settings.syncUrl) { if (!silent) toast("Синхронизация не подключена"); return; }
  fetch(STATE.settings.syncUrl + "?token=" + encodeURIComponent(STATE.settings.syncToken) + "&mode=get")
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.state && j.state.updated && (!STATE.updated || j.state.updated > STATE.updated)) {
        var keep = { syncUrl: STATE.settings.syncUrl, syncToken: STATE.settings.syncToken };
        STATE = j.state;
        STATE.settings.syncUrl = keep.syncUrl; STATE.settings.syncToken = keep.syncToken;
        saveState(true); renderAll();
        toast("Данные подтянуты из облака");
      } else if (!silent) toast("В облаке нет данных новее");
    })
    .catch(function () { if (!silent) toast("Не удалось связаться с облаком"); });
}

/* ---------- экспорт / импорт ---------- */
function exportJson() {
  var blob = new Blob([JSON.stringify(STATE, null, 1)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "hockey-backup-" + today() + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast("Файл резервной копии сохранён");
}
function importJson(file) {
  var fr = new FileReader();
  fr.onload = function () {
    try {
      var j = JSON.parse(fr.result);
      if (!j || !j.checks) throw 0;
      var keep = { syncUrl: STATE.settings.syncUrl, syncToken: STATE.settings.syncToken };
      STATE = j; STATE.settings.syncUrl = keep.syncUrl; STATE.settings.syncToken = keep.syncToken;
      saveState(true); renderAll(); toast("Данные загружены из файла");
    } catch (e) { toast("Файл не подошёл"); }
  };
  fr.readAsText(file);
}
