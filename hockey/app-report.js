/* Экраны: Тесты, Итоги, Программа + события и запуск */
"use strict";

/* ---------- Тесты ---------- */
function sparkline(values, dir) {
  if (values.length < 2) return "";
  var vs = values.map(function (v) { return v.value; });
  var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
  if (mx === mn) { mx = mn + 1; }
  var w = 300, h = 34, pts = [];
  for (var i = 0; i < vs.length; i++) {
    var x = values.length === 1 ? 0 : i * w / (values.length - 1);
    var y = h - ((vs[i] - mn) / (mx - mn)) * (h - 6) - 3;
    pts.push(round(x, 1) + "," + round(y, 1));
  }
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#ff5c8a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function renderTests() {
  var el = $("#s-tests");
  var t = today(), h = "";
  var groups = {};
  for (var i = 0; i < PLAN.tests.length; i++) {
    var g = PLAN.tests[i].group;
    (groups[g] = groups[g] || []).push(PLAN.tests[i]);
  }
  h += '<div class="card"><h2>📏 Тесты и контроль прогресса</h2><div class="muted">Замеры делаем в один день недели, в свежем состоянии — не после льда. Полный блок из 15 показателей: недели 0, 6, 14, 22, 34. Промежуточный: недели 10, 18, 26, 30. Еженедельно — прыжок вверх и один технический показатель.</div></div>';
  var filled = 0, tt;
  for (tt in STATE.tests) if ((STATE.tests[tt] || []).length) filled++;
  h += '<div class="card"><div class="kv"><span>Показателей с данными</span><b>' + filled + ' из ' + PLAN.tests.length + '</b>' +
    '<span>Всего замеров</span><b>' + Object.keys(STATE.tests).reduce(function (a, k) { return a + STATE.tests[k].length; }, 0) + '</b></div></div>';

  for (var gname in groups) {
    h += '<div class="card"><h2>' + esc(gname.charAt(0).toUpperCase() + gname.slice(1)) + '</h2>';
    for (var j = 0; j < groups[gname].length; j++) {
      var def = groups[gname][j], vals = testValues(def.id);
      var last = vals.length ? vals[vals.length - 1] : null, prev = vals.length > 1 ? vals[vals.length - 2] : null;
      var best = testBest(def, vals), target = testTarget(def);
      var delta = last && prev ? round(last.value - prev.value, def.unit === "с" ? 2 : 1) : null;
      var good = delta != null && ((def.dir === "up" && delta > 0) || (def.dir === "down" && delta < 0));
      var pctToTarget = last ? clamp(Math.round((def.dir === "up" ? last.value / target : target / last.value) * 100), 0, 130) : 0;
      h += '<div class="tcard" data-tcard="' + def.id + '"><div class="t-head"><div><b>' + esc(def.name) + '</b><div class="tiny">цель к неделе 34: ' + target + ' ' + esc(def.unit) + (def.dir === "down" ? " (меньше — лучше)" : "") + '</div></div>' +
        '<div style="text-align:right"><div class="t-val">' + (last ? last.value + " " + esc(def.unit) : "—") + '</div>' +
        (delta != null ? '<div class="tiny" style="color:' + (good ? "#26794a" : "#b32b45") + '">' + (delta > 0 ? "+" : "") + delta + '</div>' : '<div class="tiny">' + (last ? esc(fmtShort(last.date)) : "нет данных") + '</div>') + '</div></div>' +
        (vals.length ? sparkline(vals.slice(-10), def.dir) : "") +
        (best != null ? '<div class="tiny" style="margin-top:4px">лучший результат: ' + best + ' ' + esc(def.unit) + ' · замеров: ' + vals.length + '</div>' : "") +
        '<div class="bar" style="margin-top:8px"><i style="width:' + pctToTarget + '%"></i></div>' +
        '<div class="row" style="margin-top:10px"><input type="date" value="' + t + '" data-tdate="' + def.id + '" style="flex:1;min-width:130px"><input type="number" step="0.01" inputmode="decimal" placeholder="значение" data-tval="' + def.id + '" style="flex:1;min-width:90px"><button class="primary small" data-tsave="' + def.id + '">Записать</button></div></div>';
    }
    h += '</div>';
  }
  el.innerHTML = h;
}

/* ---------- Итоги ---------- */
function mergeReports(reps) {
  var out = { key: "__all", planned: 0, done: 0, partial: 0, missedCount: 0, sick: 0, mins: 0, tests: {}, missedList: [], diaryCount: 0, xp: 0, doneByKind: {}, weightFirst: null, weightLast: null, well: {} };
  var wells = [];
  for (var i = 0; i < reps.length; i++) {
    var r = reps[i];
    out.planned += r.planned; out.done += r.done; out.partial += r.partial; out.missedCount += r.missedCount;
    out.sick += r.sick; out.mins += r.mins; out.diaryCount += r.diaryCount; out.xp += r.xp;
    out.missedList = out.missedList.concat(r.missedList);
    if (r.weightLast) { if (out.weightFirst == null) out.weightFirst = r.weightFirst; out.weightLast = r.weightLast; }
    for (var k in r.doneByKind) out.doneByKind[k] = (out.doneByKind[k] || 0) + r.doneByKind[k];
    for (var t in r.tests) out.tests[t] = (out.tests[t] || []).concat(r.tests[t]);
    if (r.diaryCount) wells.push(r.well);
  }
  ["sleep", "hr", "fatigue", "mood", "sore"].forEach(function (f) {
    var arr = wells.map(function (w) { return w[f]; }).filter(function (v) { return v; });
    out.well[f] = arr.length ? avg(arr) : null;
  });
  out.pct = out.planned ? Math.round(out.done * 100 / out.planned) : 0;
  out.conclusions = conclusions(out.pct, out.well, out.missedCount, out.sick, out.doneByKind);
  return out;
}
function currentReport() {
  if (UI.reportScope === "__all") return { rep: mergeReports(monthList().map(function (m) { return monthReport(m.key); })), label: "итог за 8 месяцев" };
  var key = UI.reportScope || monthKey(today());
  var label = MONTHS[+key.slice(5, 7) - 1] + " " + key.slice(0, 4);
  return { rep: monthReport(key), label: label };
}
function renderReport() {
  var el = $("#s-report");
  if (!UI.reportScope) UI.reportScope = monthKey(today()) && monthList().some(function (m) { return m.key === monthKey(today()); }) ? monthKey(today()) : monthList()[0].key;
  var months = monthList();
  var h = '<div class="card"><h2>📄 Итоги</h2><div class="muted">Отчёт формируется автоматически из отметок и дневника. Его можно отправить родителям или тренеру — кнопкой «Поделиться».</div></div>';
  h += '<div class="tabs">' + months.map(function (m) {
    return '<button data-scope="' + m.key + '"' + (m.key === UI.reportScope ? ' class="active"' : "") + '>' + esc(m.label) + '</button>';
  }).join("") + '<button data-scope="__all"' + (UI.reportScope === "__all" ? ' class="active"' : "") + '>Итог за 8 месяцев</button></div>';

  var cur = currentReport(), rep = cur.rep;
  h += '<div class="card" id="report-body"><h2>' + esc(cur.label.charAt(0).toUpperCase() + cur.label.slice(1)) + '</h2>';
  h += '<div class="row" style="align-items:stretch">' +
    statPill("выполнено", rep.pct + "%", "") + statPill("тренировок", rep.done + " из " + rep.planned, "") +
    statPill("время", Math.round(rep.mins / 60) + " ч", "") + '</div>';
  h += '<div class="sep"></div><div class="kv">' +
    '<span>Частично выполнено</span><b>' + rep.partial + '</b>' +
    '<span>Пропущено дней</span><b>' + rep.missedCount + '</b>' +
    '<span>Дней болезни</span><b>' + rep.sick + '</b>' +
    '<span>Записей в дневнике</span><b>' + rep.diaryCount + '</b>' +
    '<span>Опыт за период</span><b>' + rep.xp + ' XP</b></div>';
  var kinds = { ice: "лёд", power_a: "силовая", power_b: "мощность", home: "домашние", test: "тесты" };
  var kb = [];
  for (var k in rep.doneByKind) kb.push((kinds[k] || k) + " — " + rep.doneByKind[k]);
  if (kb.length) h += '<div class="tiny" style="margin-top:8px">По видам: ' + esc(kb.join(", ")) + '</div>';

  if (rep.well && (rep.well.sleep || rep.well.hr)) {
    h += '<div class="sep"></div><h3>Самочувствие</h3><div class="kv">' +
      (rep.well.sleep ? '<span>Сон в среднем</span><b>' + round(rep.well.sleep, 1) + ' ч</b>' : "") +
      (rep.well.hr ? '<span>Утренний пульс</span><b>' + Math.round(rep.well.hr) + '</b>' : "") +
      (rep.well.fatigue ? '<span>Усталость</span><b>' + round(rep.well.fatigue, 1) + ' из 5</b>' : "") +
      (rep.well.sore ? '<span>Крепатура</span><b>' + round(rep.well.sore, 1) + ' из 5</b>' : "") +
      (rep.well.mood ? '<span>Настроение</span><b>' + round(rep.well.mood, 1) + ' из 5</b>' : "") +
      (rep.weightLast ? '<span>Вес</span><b>' + rep.weightLast + ' кг</b>' : "") + '</div>';
  }
  var tkeys = Object.keys(rep.tests);
  if (tkeys.length) {
    h += '<div class="sep"></div><h3>Тесты за период</h3><div class="kv">';
    for (var ti = 0; ti < tkeys.length; ti++) {
      var def = testDef(tkeys[ti]); if (!def) continue;
      var arr = rep.tests[tkeys[ti]].slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      h += '<span>' + esc(def.name) + '</span><b>' + arr.map(function (x) { return x.value; }).join(" → ") + ' ' + esc(def.unit) + '</b>';
    }
    h += '</div>';
  }
  if (rep.missedList && rep.missedList.length) {
    h += '<div class="sep"></div><h3>Что не получилось</h3><ul class="muted">';
    rep.missedList.slice(0, 14).forEach(function (m) { h += '<li>' + esc(fmtShort(m.date)) + ' — ' + esc(m.why) + '</li>'; });
    h += '</ul>';
  }
  h += '<div class="sep"></div><h3>Выводы</h3><ul class="muted">' + rep.conclusions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul></div>';

  h += '<div class="card noprint"><h2>Отправить</h2><div class="row">' +
    '<button class="primary" id="btn-share">Поделиться отчётом</button>' +
    '<button class="ghost" id="btn-copy">Скопировать текст</button>' +
    '<button class="ghost" id="btn-pdf">Сохранить в PDF</button></div>' +
    '<div class="tiny" style="margin-top:8px">«Сохранить в PDF» — на iPhone: кнопка «Поделиться» → «Печать» → развести два пальца на превью → сохранить в Файлы.</div></div>';
  el.innerHTML = h;
}

/* ---------- Программа и настройки ---------- */
function renderInfo() {
  var el = $("#s-info");
  var s = STATE.settings;
  var h = '<div class="card"><h2>⛸️ Программа 1. Мощность и скорость</h2><div class="muted">34 недели, лёд 2 раза в неделю, мощностных сессий не больше двух в неделю, инвентарь — резинки, гантели, при прогрессировании пояс или жилет 3–4,5 кг. Между двумя мощностными сессиями минимум 48 часов.</div>' +
    '<div class="sep"></div><div class="kv"><span>Старт программы</span><b>' + esc(fmtDate(PLAN.start)) + '</b>' +
    '<span>Финиш</span><b>' + esc(fmtDate(PLAN.days[PLAN.days.length - 1].date)) + '</b>' +
    '<span>Ледовых тренировок</span><b>' + PLAN.days.filter(function (d) { return d.kind === "ice"; }).length + '</b>' +
    '<span>Силовых и мощностных</span><b>' + PLAN.days.filter(function (d) { return d.kind === "power_a" || d.kind === "power_b"; }).length + '</b>' +
    '<span>Тестовых дней</span><b>' + PLAN.days.filter(function (d) { return d.kind === "test"; }).length + '</b></div></div>';

  h += '<div class="card"><h2>🏒 Программа 2. Клюшка и шайба</h2><div class="muted">Ежедневная микро-доза 10 минут плюс основная сессия по субботам 25–35 минут. В дни льда — только 5–10 минут лёгкого владения. Работаем до лёгкой усталости кистей, а не до отказа: техника разрушается от усталости.</div>' +
    '<div class="sep"></div><div class="muted">Условия: 1 м² искусственного льда, клюшка, обычные и специальные шайбы, отбойник или бортик, мишени. Суммарно около 100–130 минут в неделю.</div></div>';

  h += '<div class="card"><h2>📈 Мезоциклы</h2>';
  for (var i = 0; i < PLAN.meso.length; i++) {
    var m = PLAN.meso[i];
    var cur = false;
    var td = planDay(today());
    if (td && td.w >= m.from && td.w <= m.to) cur = true;
    h += '<details' + (cur ? " open" : "") + '><summary>' + m.n + '. ' + esc(m.name) + ' · недели ' + m.from + '–' + m.to + (cur ? " · сейчас" : "") + '</summary><p>' + esc(m.accent) + '</p></details>';
  }
  h += '<div class="tiny">Каждая четвёртая неделя — разгрузочная: объём минус 40–50%, интенсивность сохраняется. Разгрузка не теряет результат, а создаёт его.</div></div>';

  h += '<div class="card"><h2>🎯 Контрольные точки</h2><div class="kv">';
  for (var c = 0; c < PLAN.checkpoints.length; c++) {
    var cp = PLAN.checkpoints[c];
    h += '<span>' + esc(cp.when) + ' — ' + esc(cp.what) + '</span><b>' + esc(cp.expect) + '</b>';
  }
  h += '</div></div>';

  h += '<div class="card"><h2>🛒 Что докупить</h2><div class="kv">';
  for (var g = 0; g < PLAN.gear.length; g++) {
    var it = PLAN.gear[g];
    h += '<span>' + esc(it[1]) + '<div class="tiny">' + esc(it[0]) + ' · ' + esc(it[2]) + '</div></span><b>' + esc(it[3]) + '</b>';
  }
  h += '</div><div class="tiny" style="margin-top:8px">Минимальный набор — первые три строки. Всё остальное расширяет возможности, но не заменяет их.</div></div>';

  h += '<div class="card"><h2>🌷 Протокол возвращения после болезни</h2><ul class="muted">' + PLAN.sick_protocol.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul></div>';

  h += '<div class="card noprint"><h2>🔔 Напоминания на телефон</h2>' +
    '<div class="muted">Приложение ntfy присылает пуш-уведомления о тренировках. Тема-подписка:</div>' +
    '<label class="fld"><span>Тема ntfy</span><input id="st-topic" value="' + esc(s.ntfyTopic) + '"></label>' +
    '<div class="row"><button class="ghost small" id="btn-copy-topic">Скопировать тему</button>' +
    '<button class="ghost small" id="btn-ntfy-open">Открыть ntfy</button>' +
    '<button class="primary small" id="btn-save-topic">Сохранить</button></div>' +
    '<details style="margin-top:10px"><summary>Как подключить (один раз, 2 минуты)</summary><ol class="muted">' +
    '<li>Установите из App Store приложение <b>ntfy</b>.</li>' +
    '<li>Нажмите «+», введите тему из поля выше — ровно так, как написано.</li>' +
    '<li>Разрешите уведомления. Всё, дальше напоминания приходят сами.</li></ol></details>' +
    '<div class="sep"></div><h3>Календарь</h3><div class="muted">Все 228 тренировок, тестов и итогов месяца — одним файлом с напоминанием за час до тренировки.</div>' +
    '<div class="row" style="margin-top:8px"><a class="chip" href="./hockey-plan.ics" download>Скачать календарь (.ics)</a></div>' +
    '<details style="margin-top:10px"><summary>Как подписаться на календарь в iPhone</summary><ol class="muted">' +
    '<li>Скачайте файл по кнопке выше.</li>' +
    '<li>Откройте его — iPhone предложит добавить события в календарь.</li>' +
    '<li>Напоминание о каждой тренировке придёт автоматически.</li></ol></details></div>';

  h += '<div class="card noprint"><h2>☁️ Синхронизация</h2>' +
    '<div class="muted">Чтобы данные не терялись при смене телефона и чтобы родители видели отчёт, подключаем сохранение в Google-таблицу. Адрес веб-приложения (Apps Script) и код доступа заполняются один раз.</div>' +
    '<label class="fld"><span>Адрес веб-приложения</span><input id="st-sync" value="' + esc(s.syncUrl) + '" placeholder="https://script.google.com/macros/s/…/exec"></label>' +
    '<label class="fld"><span>Код доступа</span><input id="st-token" value="' + esc(s.syncToken) + '" placeholder="секретный код"></label>' +
    '<div class="row"><button class="primary small" id="btn-save-sync">Сохранить и отправить</button>' +
    '<button class="ghost small" id="btn-pull-sync">Забрать из облака</button></div>' +
    '<div class="tiny" style="margin-top:8px">Отправка происходит автоматически после каждой отметки, если адрес заполнен.</div></div>';

  h += '<div class="card noprint"><h2>👤 Профиль и настройки</h2>' +
    '<label class="fld"><span>Имя на главном экране</span><input id="st-name" value="' + esc(STATE.profile.name) + '" placeholder="например, Лера"></label>' +
    '<label class="fld"><span>Отслеживание цикла</span><select id="st-cycle"><option value="0"' + (!STATE.profile.cycleTracking ? " selected" : "") + '>выключено</option><option value="1"' + (STATE.profile.cycleTracking ? " selected" : "") + '>включено</option></select></label>' +
    '<div class="grid2"><label class="fld"><span>Время ледовых тренировок</span><input id="st-icetime" value="' + esc(s.iceTime) + '"></label>' +
    '<label class="fld"><span>Время силовых</span><input id="st-powertime" value="' + esc(s.powerTime) + '"></label></div>' +
    '<button class="primary wide" id="btn-save-profile">Сохранить настройки</button></div>';

  h += '<div class="card noprint"><h2>💾 Данные</h2><div class="row">' +
    '<button class="ghost" id="btn-export">Сохранить копию файлом</button>' +
    '<button class="ghost" id="btn-import">Загрузить из файла</button></div>' +
    '<input type="file" id="file-import" accept="application/json" style="display:none">' +
    '<details style="margin-top:10px"><summary>Установка на iPhone</summary><ol class="muted">' +
    '<li>Откройте страницу в Safari.</li><li>Кнопка «Поделиться» → «На экран „Домой“».</li>' +
    '<li>Приложение откроется как обычное, работает без интернета.</li></ol></details>' +
    '<div class="sep"></div><button class="ghost wide" id="btn-reset">Сбросить все данные</button>' +
    '<div class="tiny" style="margin-top:6px">Кнопка удаляет отметки, дневник и тесты на этом устройстве.</div></div>';
  el.innerHTML = h;
}
