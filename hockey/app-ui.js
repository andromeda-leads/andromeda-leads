/* Экраны: Сегодня, План, Дневник */
"use strict";

function ringSvg(pct, label, big) {
  var r = 42, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  var col = pct >= 80 ? "#38b26a" : (pct >= 50 ? "#f2a33c" : "#ff5c8a");
  return '<div class="ring"><svg width="96" height="96" viewBox="0 0 96 96">' +
    '<circle cx="48" cy="48" r="' + r + '" fill="none" stroke="#ffe3ee" stroke-width="9"/>' +
    '<circle cx="48" cy="48" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '"/></svg>' +
    '<div class="val"><b>' + (big == null ? pct + "%" : big) + '</b><span>' + esc(label) + '</span></div></div>';
}
function statPill(label, value, cls) {
  return '<div class="tcard" style="flex:1;min-width:104px;margin:0"><div class="tiny">' + esc(label) + '</div><div class="t-value" style="font-size:17px;font-weight:800" class="' + (cls || "") + '">' + esc(value) + '</div></div>';
}
function achRow() {
  var h = '<div class="row" style="gap:12px;overflow-x:auto;flex-wrap:nowrap">';
  for (var i = 0; i < PLAN.achievements.length; i++) {
    var a = PLAN.achievements[i], on = STATE.achievements.indexOf(a.id) >= 0;
    h += '<div class="badge ' + (on ? "on" : "") + '" title="' + esc(a.d) + '"><div class="ic">' + a.icon + '</div>' + esc(a.name) + '</div>';
  }
  return h + '</div>';
}

/* ---------- Сегодня ---------- */
function renderToday() {
  var el = $("#s-today");
  var t = today();
  var day = planDay(t);
  var h = "";

  h += '<div class="muted" style="padding:0 4px 10px;font-weight:700;font-size:14px">Привет, Арина 🌸</div>';

  if (!day) {
    var first = PLAN.days[0].date, last = PLAN.days[PLAN.days.length - 1].date;
    if (t < first) {
      var daysLeft = Math.round((parseIso(first) - parseIso(t)) / 86400000);
      h += '<div class="card hero"><h2>До старта ' + daysLeft + ' ' + plural(daysLeft, "день", "дня", "дней") + '</h2>' +
        '<div class="muted">План начинается ' + fmtDate(first) + ' и идёт 34 недели - до ' + fmtDate(last) + '.</div></div>';
      h += '<div class="card"><h2>🌱 Что сделать до старта</h2><ul class="muted">' +
        '<li>Пройти нулевое тестирование ' + fmtDate(PLAN.baseline_date) + ' - это точка отсчёта, без неё не будет видно прогресса.</li>' +
        '<li>Собрать минимальный инвентарь: резинки разной жёсткости, гантели 5-10 кг, пояс или жилет 3-4,5 кг.</li>' +
        '<li>Записать себя на видео в старте и спринте на льду - сбоку и сзади.</li>' +
        '<li>Проверить клюшку: длина до подбородка, жёсткость 65-75, удобный загиб.</li></ul></div>';
      h += '<div class="card"><h2>📏 Нулевые тесты</h2><div class="muted">Открой вкладку «Тесты» и внеси первые значения - все 15 показателей, включая два ледовых.</div>' +
        '<div class="sep"></div><button class="primary wide" data-go="tests">Открыть тесты</button></div>';
      el.innerHTML = h;
      return;
    }
    h += '<div class="card hero"><h2>Программа завершена 🏆</h2><div class="muted">34 недели позади. Смотрите итоговый отчёт и итоговое тестирование.</div></div>';
    el.innerHTML = h;
    return;
  }

  var prog = dayProgress(day), st = dayStatus(day);
  var ms = mesoOfWeek(day.w);
  var rd = readiness(t);
  var dd = diaryOf(t);

  h += '<div class="card hero"><div class="row"><div style="min-width:0">' +
    '<h2>' + esc(fmtDate(t)) + ' · ' + esc(dowRu(t)) + '</h2>' +
    (day.w === 0 ? '<div class="muted">Старт программы · замеры и первые тесты</div></div>' :
     '<div class="muted">Неделя ' + day.w + ' из ' + PLAN.weeks + ' · ' + esc(ms.name) + ' · ' + esc(day.title) + '</div></div>') +
    '<div class="spacer"></div><span class="chip ' + day.kind + '">' + (day.w === 0 ? "🌸 Старт" : kindIcon(day.kind) + ' ' + esc(kindRu(day.kind))) + '</span>' +
    '</div>' + (day.deload ? '<div class="muted" style="margin-top:6px">Разгрузочная неделя: объём минус 40-50%, интенсивность сохраняем.</div>' : '') + '</div>';

  h += '<div class="card"><div class="row">' + ringSvg(prog.pct, "выполнено") +
    '<div style="flex:1;min-width:150px">' +
    '<div class="kv"><span>Заданий</span><b>' + prog.done + ' из ' + prog.total + '</b>' +
    '<span>План на день</span><b>' + (day.min ? day.min + " мин" : "-") + '</b>' +
    '<span>Статус</span><b>' + statusRu(st) + '</b>' +
    '<span>Опыт за день</span><b>' + xpForDay(day) + ' XP</b></div></div></div></div>';

  if (st === "sick") {
    h += '<div class="card"><h2>🌷 Болею</h2><div class="muted">День отмечен как болезнь - тренировка не считается пропуском. Возвращение к нагрузке делаем по протоколу.</div>' +
      '<div class="sep"></div><ul class="muted">' + PLAN.sick_protocol.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul></div>';
  }

  h += '<div class="card"><h2>' + kindIcon(day.kind) + ' Что делаем</h2>';
  for (var b = 0; b < day.blocks.length; b++) {
    h += '<h3>' + esc(day.blocks[b].t) + '</h3>';
    for (var i = 0; i < day.blocks[b].items.length; i++) {
      var id = taskId(day, b, i), on = !!dayChecked(t)[id];
      h += '<div class="task ' + (on ? "done" : "") + '"><input type="checkbox" data-task="' + esc(id) + '"' + (on ? " checked" : "") + '>' +
        '<div class="t-txt">' + esc(day.blocks[b].items[i]) + '</div></div>';
    }
  }
  h += '</div>';

  if (day.kind === "test") h += '<div class="card"><h2>📏 Тестирование</h2><div class="muted">' + (day.w === 0 ? "Нулевые тесты: все 15 показателей." : (PLAN.test_weeks.indexOf(day.w) >= 0 ? "Полный блок из 15 показателей." : "Прыжок вверх (CMJ) - 3 попытки и один показатель техники.")) + '</div><div class="sep"></div><button class="primary wide" data-go="tests">Внести результаты</button></div>';

  h += '<div class="card"><h2>💗 Самочувствие</h2>';
  if (rd) h += '<div class="gauge">' + ringSvg(rd.score, "готовность", rd.score) + '<div><span class="pill ' + rd.zone + '">' + (rd.zone === "ok" ? "зелёная зона" : rd.zone === "mid" ? "жёлтая зона" : "красная зона") + '</span><div class="muted" style="margin-top:6px">' + esc(rd.advice) + '</div></div></div><div class="sep"></div>';
  else h += '<div class="muted">Заполни дневник - приложение посчитает индекс готовности и подскажет, можно ли грузить на полную.</div><div class="sep"></div>';
  h += diaryFormHtml(dd, "today");
  h += '</div>';

  h += '<div class="card"><h2>⚙️ Управление днём</h2>' +
    '<label class="fld"><span>Причина пропуска (если день не получился)</span><select id="skip-reason">' +
    ["нет времени", "не смогла по расписанию", "устала", "плохое самочувствие", "поездка", "другое"].map(function (r) { return '<option>' + r + '</option>'; }).join("") + '</select></label>' +
    '<div class="row"><button class="ghost" id="btn-skip">Пропустить день</button>' +
    '<button class="ghost" id="btn-sick">Болею</button>' +
    '<button class="ghost" id="btn-unskip">Снять отметки</button></div></div>';

  h += '<div class="card"><h2>🏅 Достижения</h2>' + achRow() +
    '<div class="tiny" style="margin-top:8px">Открыто ' + STATE.achievements.length + ' из ' + PLAN.achievements.length + '</div></div>';

  el.innerHTML = h;
}
function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b; return c; }
function statusRu(s) {
  return { done: "выполнено", partial: "выполнено частично", skipped: "пропуск", sick: "болею" }[s] || "не отмечено";
}
function diaryFormHtml(dd, where) {
  dd = dd || {};
  function sel(id, v, labels) {
    var h = '<select id="' + id + '"><option value="">-</option>';
    for (var i = 0; i < labels.length; i++) {
      var val = i + 1;
      h += '<option value="' + val + '"' + (String(v) === String(val) ? " selected" : "") + '>' + esc(labels[i]) + '</option>';
    }
    return h + '</select>';
  }
  var s5 = ["очень плохо", "плохо", "средне", "хорошо", "отлично"];
  var f5 = ["нет", "лёгкая", "средняя", "сильная", "очень сильная"];
  var h = '<div class="grid2">' +
    '<label class="fld"><span>Пульс утром, уд/мин</span><input id="d-hr" type="number" inputmode="numeric" value="' + (dd.hr || "") + '"></label>' +
    '<label class="fld"><span>Сон, часов</span><input id="d-sleep" type="number" step="0.5" inputmode="decimal" value="' + (dd.sleep || "") + '"></label>' +
    '<label class="fld"><span>Качество сна</span>' + sel("d-sleepq", dd.sleepQ, s5) + '</label>' +
    '<label class="fld"><span>Усталость</span>' + sel("d-fatigue", dd.fatigue, f5) + '</label>' +
    '<label class="fld"><span>Крепатура</span>' + sel("d-sore", dd.sore, f5) + '</label>' +
    '<label class="fld"><span>Настроение</span>' + sel("d-mood", dd.mood, s5) + '</label>' +
    '<label class="fld"><span>Вес, кг</span><input id="d-weight" type="number" step="0.1" inputmode="decimal" value="' + (dd.weight || "") + '"></label>' +
    '<label class="fld"><span>Тяжесть тренировки (RPE 1-10)</span><input id="d-rpe" type="number" inputmode="numeric" value="' + (dd.rpe || "") + '"></label>' +
    (STATE.profile.cycleTracking ? '<label class="fld"><span>День цикла</span><input id="d-cycle" type="number" inputmode="numeric" value="' + (dd.cycle || "") + '"></label>' : "") +
    '</div><label class="fld"><span>Заметка</span><textarea id="d-note" rows="2">' + esc(dd.note || "") + '</textarea></label>' +
    '<button class="primary wide" id="btn-diary-' + where + '">Сохранить самочувствие</button> ' +
    '<button class="ghost wide" style="margin-top:8px" id="btn-day-note-' + where + '">Заметка о тренировке</button>';
  return h;
}

/* ---------- План ---------- */
function renderPlan() {
  var el = $("#s-plan");
  var months = monthList();
  if (!UI.planMonth) UI.planMonth = monthKey(today()) && months.some(function (m) { return m.key === monthKey(today()); }) ? monthKey(today()) : months[0].key;
  var h = '<div class="card"><h2>📅 План на 34 недели</h2><div class="muted">' + fmtDate(PLAN.start) + ' - ' + fmtDate(PLAN.days[PLAN.days.length - 1].date) + '. Разгрузочные недели: каждая четвёртая. Нажми на день, чтобы открыть его задания.</div></div>';
  h += '<div class="tabs">' + months.map(function (m) {
    return '<button data-month="' + m.key + '"' + (m.key === UI.planMonth ? ' class="active"' : "") + '>' + esc(m.label) + '</button>';
  }).join("") + '</div>';

  var mk = UI.planMonth, y = +mk.slice(0, 4), mo = +mk.slice(5, 7) - 1;
  var first = new Date(y, mo, 1), lastDay = new Date(y, mo + 1, 0).getDate();
  var lead = (first.getDay() === 0 ? 6 : first.getDay() - 1);
  h += '<div class="card"><h2>' + MONTHS[mo] + ' ' + y + '</h2><div class="cal">';
  for (var dw = 0; dw < 7; dw++) h += '<div class="dow">' + DOW_SHORT[dw] + '</div>';
  for (var e = 0; e < lead; e++) h += '<div class="cell empty"></div>';
  var mrep = monthReport(mk);
  for (var d = 1; d <= lastDay; d++) {
    var dstr = mk + "-" + pad2(d);
    var pd = planDay(dstr);
    if (!pd) { h += '<div class="cell empty"></div>'; continue; }
    var st = dayStatus(pd);
    var cls = "cell " + (st === "sick" ? "sick" : (pd.kind === "power_a" || pd.kind === "power_b" ? "power" : pd.kind)) + (st ? " " + st : "") + (dstr === today() ? " today" : "");
    var mk2 = st === "done" ? "✓" : st === "partial" ? "◐" : st === "skipped" ? "✕" : st === "sick" ? "🤒" : "";
    h += '<div class="' + cls + '" data-day="' + dstr + '"><span class="mk">' + mk2 + '</span>' + d + '</div>';
  }
  h += '</div><div class="legend">' +
    '<span><i style="background:#e8f3ff"></i>лёд</span><span><i style="background:#fff2e6"></i>сила</span>' +
    '<span><i style="background:#ffeef5"></i>домашние</span><span><i style="background:#f0f8ec"></i>восстановление</span>' +
    '<span><i style="background:#f5eaff"></i>тесты</span><span>✓ выполнено</span><span>◐ частично</span><span>✕ пропуск</span></div>' +
    '<div class="sep"></div><div class="kv"><span>Выполнено в месяце</span><b>' + mrep.done + ' из ' + mrep.planned + ' (' + mrep.pct + '%)</b>' +
    '<span>Время тренировок</span><b>' + Math.round(mrep.mins / 60) + ' ч</b>' +
    '<span>Дней болезни</span><b>' + mrep.sick + '</b></div></div>';

  var w = planDay(UI.planDay || today());
  if (w) {
    h += '<div class="card"><h2>' + esc(fmtDate(w.date)) + ' · ' + esc(kindRu(w.kind)) + '</h2>' +
      (w.w === 0 ? '<div class="muted">' + esc(w.title) + (w.min ? " · " + w.min + " мин" : "") + '</div><div class="sep"></div>'
                 : '<div class="muted">Неделя ' + w.w + ' · ' + esc(mesoOfWeek(w.w).name) + ' · ' + esc(w.title) + (w.min ? " · " + w.min + " мин" : "") + '</div><div class="sep"></div>');
    for (var b2 = 0; b2 < w.blocks.length; b2++) {
      h += '<h3>' + esc(w.blocks[b2].t) + '</h3><ul class="muted">';
      for (var i2 = 0; i2 < w.blocks[b2].items.length; i2++) h += '<li>' + esc(w.blocks[b2].items[i2]) + '</li>';
      h += '</ul>';
    }
    h += '<div class="sep"></div><div class="tiny">Статус: ' + statusRu(dayStatus(w)) + '</div></div>';
  }

  h += '<div class="card"><h2>🎯 Мезоциклы и контрольные точки</h2>';
  for (var m2 = 0; m2 < PLAN.meso.length; m2++) {
    var mm = PLAN.meso[m2];
    h += '<details><summary>' + mm.n + '. ' + esc(mm.name) + ' · недели ' + mm.from + '-' + mm.to + '</summary><p>' + esc(mm.accent) + '</p></details>';
  }
  for (var c = 0; c < PLAN.checkpoints.length; c++) {
    var cp = PLAN.checkpoints[c];
    h += '<div class="kv"><span>' + esc(cp.when) + ' - ' + esc(cp.what) + '</span><b>' + esc(cp.expect) + '</b></div>';
  }
  h += '</div>';
  el.innerHTML = h;
}

/* ---------- Дневник ---------- */
function renderDiary() {
  var el = $("#s-diary");
  var t = today();
  var h = '<div class="card"><h2>💗 Дневник самочувствия</h2><div class="muted">Пульс утром, сон, усталость и крепатура - главные признаки перетренированности. Заполняется за минуту.</div></div>';
  h += '<div class="card"><h2>Сегодня, ' + esc(fmtDate(t)) + '</h2>' + diaryFormHtml(diaryOf(t), "diary") + '</div>';

  var rd = readiness(t);
  if (rd) {
    h += '<div class="card"><h2>Индекс готовности</h2><div class="gauge">' + ringSvg(rd.score, "из 100", rd.score) +
      '<div><span class="pill ' + rd.zone + '">' + (rd.zone === "ok" ? "зелёная" : rd.zone === "mid" ? "жёлтая" : "красная") + '</span>' +
      '<div class="muted" style="margin-top:6px">' + esc(rd.advice) + '</div></div></div></div>';
  }

  h += '<div class="card"><h2>Последние записи</h2>';
  var keys = Object.keys(STATE.diary).sort().reverse().slice(0, 14);
  if (!keys.length) h += '<div class="muted">Пока пусто. Первая запись - хороший старт.</div>';
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], e = STATE.diary[k];
    h += '<div class="tcard"><div class="t-head"><b>' + esc(fmtShort(k)) + '</b><span class="tiny">' + esc(dowRu(k)) + '</span></div>' +
      '<div class="tiny" style="margin-top:4px">Сон ' + (e.sleep || "-") + ' ч · качество ' + (e.sleepQ || "-") + '/5 · усталость ' + (e.fatigue || "-") + '/5 · крепатура ' + (e.sore || "-") + '/5 · настроение ' + (e.mood || "-") + '/5' +
      (e.hr ? ' · пульс ' + e.hr : '') + (e.rpe ? ' · RPE ' + e.rpe : '') + (e.weight ? ' · вес ' + e.weight + ' кг' : '') + '</div>' +
      (e.note ? '<div class="tiny" style="margin-top:4px">' + esc(e.note) + '</div>' : '') + '</div>';
  }
  h += '</div>';

  h += '<div class="card"><h2>🌷 Периоды болезни</h2>';
  if (!STATE.sick.length) h += '<div class="muted">Отметок о болезни нет.</div>';
  for (var s = STATE.sick.length - 1; s >= 0; s--) {
    var sk = STATE.sick[s];
    h += '<div class="tcard"><div class="t-head"><b>' + esc(fmtDate(sk.from)) + ' - ' + esc(fmtDate(sk.to)) + '</b>' +
      '<button class="small ghost" data-delsick="' + s + '">удалить</button></div>' +
      '<div class="tiny">' + esc(sk.note || "без комментария") + '</div></div>';
  }
  h += '<div class="sep"></div><div class="row"><button class="primary" id="btn-sick2">Отметить болезнь</button></div></div>';
  el.innerHTML = h;
}
