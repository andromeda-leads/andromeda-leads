/* Песенник Андрея - интерфейс. Файл личный, не для поисковиков. */
"use strict";

(function () {
  var elList = document.getElementById("list");
  var elMain = document.getElementById("main");
  var elTop = document.getElementById("topBar");
  var elSub = document.getElementById("topSub");
  var sheet = document.getElementById("sheet");
  var sheetCard = document.getElementById("sheetCard");
  var CHAR_RATIO = 0.6;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function markIcon(id) {
    var m = Store.data[id] && Store.data[id].mark;
    if (m === "know") return '<span class="m">✓</span>';
    if (m === "learn") return '<span class="m learn">•</span>';
    return "";
  }

  /* ---------- список ---------- */

  function renderList() {
    App.mode = "list";
    App.song = null;
    App.state = null;
    stopScroll();
    elTop.style.display = "flex";
    elMain.style.overflowY = "auto";
    elSub.textContent = SONGS.length + " песен · аккорды, транспонирование, режим «учу»";
    var html = '<div class="hint">Нажми на песню. Внутри: «Играю» - текст сам едет, «Учу» - по блокам.</div>';
    if (App.installEvent) {
      html += '<div class="song" id="installBtn" style="border-top-color:#6ec08a"><div class="txt"><div class="t">Поставить на телефон</div>' +
        '<div class="a">иконка на экране, работает без интернета</div></div><span class="m">↓</span></div>';
    }
    SONGS.forEach(function (s) {
      var n = Store.hasNote(s.id) ? ' <span class="badge">заметка</span>' : "";
      html += '<div class="song" data-id="' + s.id + '">' +
        '<div class="txt"><div class="t">' + esc(s.title) + (s.fresh ? '<span class="badge">новая</span>' : "") + n + '</div>' +
        '<div class="a">' + esc(s.artist) + '</div></div>' + markIcon(s.id) + '</div>';
    });
    elList.innerHTML = html;
    var ib = document.getElementById("installBtn");
    if (ib) ib.addEventListener("click", function () {
      if (!App.installEvent) return;
      App.installEvent.prompt();
      App.installEvent = null;
    });
  }

  elList.addEventListener("click", function (e) {
    var row = e.target.closest(".song");
    if (row) openSong(row.getAttribute("data-id"));
  });

  /* ---------- песня ---------- */

  function currentText() {
    var st = App.state;
    var semi = (st.trans || 0) - (st.capo || 0);
    return transposeText(App.song.text, semi);
  }

  function keyName() {
    var st = App.state;
    var semi = (st.trans || 0) - (st.capo || 0);
    return semi ? (semi > 0 ? "+" + semi : String(semi)) : "0";
  }

  function openSong(id) {
    var s = SONGS.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    App.song = s;
    App.state = Store.song(id);
    if (history.pushState) history.pushState({ song: id }, "", "#" + id);
    renderSong();
  }

  function renderSong() {
    App.mode = App.state.mode === "learn" ? "learn" : "play";
    stopScroll();
    elTop.style.display = "none";
    elMain.style.overflowY = "hidden";
    var st = App.state, s = App.song;
    var mark = st.mark === "know" ? "✓ выучил" : st.mark === "learn" ? "• учу" : "не отмечено";
    var html = '<div class="song-view">' +
      '<div class="bar">' +
      '<button class="icon" id="backBtn">‹</button>' +
      '<div class="title"><div class="t">' + esc(s.title) + '</div><div class="a">' + esc(s.artist) + '</div></div>' +
      '<div class="modes"><button data-mode="play" class="' + (App.mode === "play" ? "on" : "") + '">Играю</button>' +
      '<button data-mode="learn" class="' + (App.mode === "learn" ? "on" : "") + '">Учу</button></div>' +
      '</div>' +
      '<div class="tools">' +
      '<div class="grp"><button id="fontMinus">A−</button><span class="val">' + (14 + (st.font || 0)) + '</span><button id="fontPlus">A+</button></div>' +
      '<div class="grp"><span class="lbl">тон</span><button id="transMinus">−</button><span class="val">' + keyName() + '</span><button id="transPlus">+</button></div>' +
      '<div class="grp"><span class="lbl">капо</span><button id="capoMinus">−</button><span class="val">' + (st.capo || 0) + '</span><button id="capoPlus">+</button></div>' +
      (App.mode === "play"
        ? '<div class="grp"><span class="lbl">скорость</span><button id="spdMinus">−</button><span class="val">' + (st.speed || 45) + '</span><button id="spdPlus">+</button></div>'
        : "") +
      '<div class="grp"><button id="markBtn">' + mark + '</button></div>' +
      '<div class="grp"><button id="noteBtn">✎ заметка</button></div>' +
      '</div>';
    if (App.mode === "play") {
      html += '<div class="text autoscroll" id="textArea"></div>' +
        '<div class="paused-pill" id="pill" style="display:none">пауза - нажми на текст</div>';
    } else {
      html += '<div class="blocks" id="blocks"></div>';
    }
    html += '</div>';
    elMain.innerHTML = html;

    if (App.mode === "play") renderPlayText();
    else renderBlocks();
    bindSongEvents();
  }

  function fitSize(lines, width, base, userSet) {
    if (userSet) return base;
    var max = 0;
    lines.forEach(function (l) { if (l.length > max) max = l.length; });
    if (!max) return base;
    var fit = Math.floor((width - 4) / (max * CHAR_RATIO));
    return Math.max(12, Math.min(base, fit));
  }

  function lineHTML(line) {
    var kind = lineKind(line);
    if (kind === "empty") return '<div class="empty"> </div>';
    if (kind === "label") return '<div class="lbl-line">' + esc(line) + '</div>';
    if (kind === "chords") {
      return '<div>' + esc(line).replace(/\S+/g, function (tok) {
        return CHORD_RE.test(tok) ? '<span class="ch" data-c="' + esc(tok) + '">' + esc(tok) + '</span>' : tok;
      }) + '</div>';
    }
    return '<div>' + esc(line) + '</div>';
  }

  function renderPlayText() {
    var area = document.getElementById("textArea");
    var text = currentText();
    var lines = text.split("\n");
    area.innerHTML = lines.map(lineHTML).join("");
    var base = 14 + (App.state.font || 0);
    var size = fitSize(lines, area.clientWidth || window.innerWidth - 24, base, (App.state.font || 0) > 0);
    area.style.fontSize = size + "px";
  }

  function renderBlocks() {
    var box = document.getElementById("blocks");
    var st = App.state;
    var blocks = songBlocks(currentText());
    var base = 14 + (st.font || 0);
    var width = box.clientWidth || window.innerWidth - 24;
    var html = "";
    var weakNames = [];
    blocks.forEach(function (b, i) {
      var weak = st.weak.indexOf(i) >= 0;
      var known = st.known.indexOf(i) >= 0;
      var hidden = known && !weak;
      if (weak) weakNames.push(i + 1);
      var lines = b.lines;
      var size = fitSize(lines, width - 24, base, (st.font || 0) > 0);
      html += '<div class="block' + (weak ? " weak" : "") + (hidden ? " hidden" : "") + '" data-i="' + i + '">' +
        '<div class="head"><span class="n">Блок ' + (i + 1) + (b.title ? " · " + esc(b.title) : "") + '</span><span class="sp"></span>' +
        '<button class="' + (weak ? "weak" : "") + '" data-act="weak">слабо</button>' +
        '<button class="' + (known ? "known" : "") + '" data-act="known">выучил</button>' +
        '<button data-act="peek">' + (hidden ? "показать" : "скрыть") + '</button></div>' +
        '<div class="body" style="font-size:' + size + 'px">' + lines.map(lineHTML).join("") + '</div>' +
        '<div class="peek">Текст скрыт - вспомни сам, потом открой.</div>' +
        '</div>';
    });
    if (weakNames.length) {
      html = '<div class="hint" style="padding:0 2px 10px">Вернуться к блокам: ' + weakNames.join(", ") + '</div>' + html;
    }
    box.innerHTML = html;
  }

  function bindBlockEvents() {
    var box = document.getElementById("blocks");
    box.addEventListener("click", function (e) {
      var ch = e.target.closest(".ch");
      if (ch) { showChord(ch.getAttribute("data-c")); return; }
      var btn = e.target.closest("button");
      var card = e.target.closest(".block");
      if (!card) return;
      var i = parseInt(card.getAttribute("data-i"), 10);
      var st = App.state;
      if (!btn) { card.classList.toggle("hidden"); return; }
      var act = btn.getAttribute("data-act");
      if (act === "weak") {
        var pw = st.weak.indexOf(i);
        if (pw >= 0) st.weak.splice(pw, 1); else st.weak.push(i);
        Store.patch(App.song.id, { weak: st.weak });
        renderBlocks();
      } else if (act === "known") {
        var pk = st.known.indexOf(i);
        if (pk >= 0) st.known.splice(pk, 1); else st.known.push(i);
        Store.patch(App.song.id, { known: st.known });
        renderBlocks();
      } else if (act === "peek") {
        card.classList.toggle("hidden");
      }
    });
  }

  function bindSongEvents() {
    document.getElementById("backBtn").addEventListener("click", backToList);
    var modes = document.querySelectorAll(".modes button");
    for (var i = 0; i < modes.length; i++) {
      modes[i].addEventListener("click", function (e) {
        var m = e.currentTarget.getAttribute("data-mode");
        Store.patch(App.song.id, { mode: m });
        App.state.mode = m;
        renderSong();
      });
    }
    document.getElementById("fontPlus").addEventListener("click", function () { setNum("font", 1, 0, 10); });
    document.getElementById("fontMinus").addEventListener("click", function () { setNum("font", -1, 0, 10); });
    document.getElementById("transPlus").addEventListener("click", function () { setNum("trans", 1, -11, 11); });
    document.getElementById("transMinus").addEventListener("click", function () { setNum("trans", -1, -11, 11); });
    document.getElementById("capoPlus").addEventListener("click", function () { setNum("capo", 1, 0, 9); });
    document.getElementById("capoMinus").addEventListener("click", function () { setNum("capo", -1, 0, 9); });
    var sp = document.getElementById("spdPlus");
    if (sp) {
      sp.addEventListener("click", function () { setNum("speed", 5, 15, 120); });
      document.getElementById("spdMinus").addEventListener("click", function () { setNum("speed", -5, 15, 120); });
    }
    document.getElementById("markBtn").addEventListener("click", cycleMark);
    document.getElementById("noteBtn").addEventListener("click", openNote);
    var blocks = document.getElementById("blocks");
    if (blocks) bindBlockEvents();
    var area = document.getElementById("textArea");
    if (area) {
      area.addEventListener("click", function (e) {
        var ch = e.target.closest(".ch");
        if (ch) { showChord(ch.getAttribute("data-c")); return; }
        toggleScroll();
      });
    }
  }

  function setNum(key, delta, min, max) {
    var v = (App.state[key] || 0) + delta;
    if (v < min) v = min;
    if (v > max) v = max;
    App.state[key] = v;
    var patch = {};
    patch[key] = v;
    Store.patch(App.song.id, patch);
    renderSong();
  }

  function cycleMark() {
    var cur = App.state.mark || "";
    var next = cur === "" ? "learn" : cur === "learn" ? "know" : "";
    App.state.mark = next;
    Store.patch(App.song.id, { mark: next });
    renderSong();
    App.show(next === "know" ? "Отмечено: выучил" : next === "learn" ? "Отмечено: учу" : "Метка снята");
  }

  function backToList() {
    if (history.replaceState) history.replaceState({}, "", location.pathname);
    renderList();
  }

  window.addEventListener("popstate", function () {
    if (App.mode !== "list") renderList();
  });

  /* ---------- автопрокрутка ---------- */

  var raf = 0, last = 0;

  function stopScroll() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    App.playing = false;
    releaseWake();
    var pill = document.getElementById("pill");
    if (pill) pill.style.display = "none";
  }

  function toggleScroll() {
    if (App.playing) {
      App.playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      releaseWake();
      var p = document.getElementById("pill");
      if (p) p.style.display = "block";
      return;
    }
    var area = document.getElementById("textArea");
    if (!area) return;
    App.playing = true;
    last = performance.now();
    requestWake();
    var pill = document.getElementById("pill");
    if (pill) { pill.textContent = "пауза - нажми на текст"; pill.style.display = "none"; }
    var tick = function (t) {
      if (!App.playing) return;
      var dt = (t - last) / 1000;
      last = t;
      area.scrollTop += (App.state.speed || 45) * dt;
      if (area.scrollTop + area.clientHeight >= area.scrollHeight - 2) {
        App.playing = false;
        releaseWake();
        var pp = document.getElementById("pill");
        if (pp) { pp.textContent = "конец - нажми, чтобы вернуться"; pp.style.display = "block"; }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function requestWake() {
    if (!navigator.wakeLock || App.wakeLock) return;
    navigator.wakeLock.request("screen").then(function (l) {
      App.wakeLock = l;
      l.addEventListener("release", function () { App.wakeLock = null; });
    }).catch(function () {});
  }

  function releaseWake() {
    if (App.wakeLock) { try { App.wakeLock.release(); } catch (e) {} App.wakeLock = null; }
  }

  /* ---------- шторки ---------- */

  function closeSheet() { sheet.classList.remove("on"); }

  sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });

  function openNote() {
    var st = App.state;
    sheetCard.innerHTML = '<h3>Заметка · ' + esc(App.song.title) + '</h3>' +
      '<div class="note">Что не получается, каким боем играть, с какого лада удобнее.</div>' +
      '<textarea id="noteText" placeholder="например: бой шестёрка, припев медленнее"></textarea>' +
      '<div class="row"><button id="noteCancel">Отмена</button><button class="primary" id="noteSave">Сохранить</button></div>';
    sheet.classList.add("on");
    var ta = document.getElementById("noteText");
    ta.value = st.note || "";
    document.getElementById("noteCancel").addEventListener("click", closeSheet);
    document.getElementById("noteSave").addEventListener("click", function () {
      Store.patch(App.song.id, { note: ta.value });
      closeSheet();
      App.show("Заметка сохранена");
    });
  }

  function chordSVG(shape, name) {
    var frets = shape.f.split(""), base = shape.b || 1;
    var W = 190, H = 230, left = 30, top = 46, sw = 22, fh = 30;
    var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="none"/>';
    for (var i = 0; i < 6; i++) {
      var x = left + i * sw;
      s += '<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + 5 * fh) + '" stroke="#6b6154" stroke-width="1"/>';
    }
    for (var f = 0; f <= 5; f++) {
      var y = top + f * fh;
      s += '<line x1="' + left + '" y1="' + y + '" x2="' + (left + 5 * sw) + '" y2="' + y + '" stroke="#6b6154" stroke-width="' + (f === 0 ? 3 : 1) + '"/>';
    }
    if (base > 1) {
      s += '<text x="' + (left - 8) + '" y="' + (top + fh * 0.7) + '" fill="#d9a441" font-size="13" text-anchor="end">' + base + '</text>';
    }
    for (var k = 0; k < 6; k++) {
      var c = frets[k];
      var cx = left + k * sw;
      if (c === "x" || c === "-1") {
        s += '<text x="' + cx + '" y="' + (top - 12) + '" fill="#a89a88" font-size="12" text-anchor="middle">x</text>';
        continue;
      }
      var n = parseInt(c, 10);
      if (n === 0) {
        s += '<circle cx="' + cx + '" cy="' + (top - 14) + '" r="4" fill="none" stroke="#a89a88" stroke-width="1.5"/>';
        continue;
      }
      var rel = n - base;
      if (rel < 0 || rel > 4) continue;
      s += '<circle cx="' + cx + '" cy="' + (top + rel * fh + fh / 2) + '" r="8" fill="#d9a441"/>';
    }
    s += '<text x="' + (W / 2) + '" y="22" fill="#f1eae0" font-size="17" text-anchor="middle" font-family="monospace">' + esc(name) + '</text>';
    s += "</svg>";
    return s;
  }

  function showChord(name) {
    var shape = chordShape(name);
    var bass = /\/[A-H]/.test(name) ? name.split("/")[1] : "";
    sheetCard.innerHTML = '<h3>' + esc(name) + '</h3>' +
      '<div class="note">' + (shape ? "аппликатура, шестая струна слева" : "точной аппликатуры нет - сыграй от базовой формы") + '</div>' +
      '<div class="diagram">' + (shape ? chordSVG(shape, name) : "") + '</div>' +
      (bass ? '<div class="note" style="margin-top:6px">басовая нота ' + esc(bass) + '</div>' : "") +
      '<div class="row"><button class="primary" id="chClose">Понятно</button></div>';
    sheet.classList.add("on");
    document.getElementById("chClose").addEventListener("click", closeSheet);
  }

  /* ---------- старт ---------- */

  document.getElementById("logoBtn").addEventListener("click", function () { if (App.mode !== "list") backToList(); });
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    App.installEvent = e;
    if (App.mode === "list") renderList();
  });
  window.addEventListener("resize", function () {
    if (App.mode === "play") renderPlayText();
  });

  if (location.hash.length > 1) {
    var id = location.hash.slice(1);
    if (SONGS.some(function (s) { return s.id === id; })) { openSong(id); return; }
  }
  renderList();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
