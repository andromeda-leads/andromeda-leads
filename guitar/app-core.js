/* Песенник Андрея - данные и логика. Файл личный, не для поисковиков. */
"use strict";

var CHORD_RE = /^[A-H](?:#|b)?(?:maj|min|m|dim|aug|sus|add|no)?\d*(?:sus\d|add\d+)?(?:\/[A-H](?:#|b)?)?$/;

var CHORDS = {
  "C": { f: "x32010", b: 1 }, "Cm": { f: "x35543", b: 3 }, "C7": { f: "x32310", b: 1 },
  "Cm7": { f: "x35343", b: 3 }, "Cmaj7": { f: "x32000", b: 1 }, "Cadd9": { f: "x32030", b: 1 },
  "C#m": { f: "x46654", b: 4 }, "C#m7": { f: "x46454", b: 4 }, "Cmsus2": { f: "x35533", b: 3 },
  "Cmsus4": { f: "x35563", b: 3 },
  "D": { f: "xx0232", b: 1 }, "Dm": { f: "xx0231", b: 1 }, "Dm7": { f: "xx0211", b: 1 },
  "D7": { f: "xx0212", b: 1 }, "D/C": { f: "x30232", b: 1 }, "Dm/C": { f: "x30231", b: 1 },
  "Dm/A": { f: "x00231", b: 1 },
  "E": { f: "022100", b: 1 }, "Em": { f: "022000", b: 1 }, "Em7": { f: "020000", b: 1 },
  "Eb": { f: "x68886", b: 6 }, "Ebmaj": { f: "x68886", b: 6 }, "Ebsus2": { f: "x68866", b: 6 },
  "F": { f: "133211", b: 1 }, "Fmaj7": { f: "xx3210", b: 1 }, "F6": { f: "1x3231", b: 1 },
  "F#m": { f: "244222", b: 2 }, "Fsus4": { f: "133311", b: 1 }, "F/C": { f: "133211", b: 1 },
  "G": { f: "320003", b: 1 }, "G7": { f: "320001", b: 1 }, "Gm": { f: "355333", b: 3 },
  "Gm7": { f: "353333", b: 3 }, "Gm6": { f: "3x2333", b: 3 }, "G#m": { f: "466444", b: 4 },
  "G/B": { f: "x20033", b: 1 }, "G/A": { f: "320003", b: 1 },
  "A": { f: "x02220", b: 1 }, "Am": { f: "x02210", b: 1 }, "A7": { f: "x02020", b: 1 },
  "Am7": { f: "x02010", b: 1 }, "A#": { f: "x13331", b: 1 },
  "B": { f: "x24442", b: 2 }, "Bm": { f: "x24432", b: 2 }, "Bm7": { f: "x20202", b: 1 },
  "B7": { f: "x21202", b: 1 }, "Bb": { f: "x13331", b: 1 }, "Bbmaj7": { f: "x13231", b: 1 },
  "Bb/F": { f: "x13331", b: 1 }
};

var SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
var NOTE_INDEX = {};
SHARP.forEach(function (n, i) { NOTE_INDEX[n] = i; });
FLAT.forEach(function (n, i) { if (NOTE_INDEX[n] === undefined) NOTE_INDEX[n] = i; });
NOTE_INDEX["E#"] = 5;
NOTE_INDEX["B#"] = 0;
NOTE_INDEX["Cb"] = 11;
NOTE_INDEX["Fb"] = 4;

function chordShape(ch) {
  if (CHORDS[ch]) return CHORDS[ch];
  var m = /^([A-H](?:#|b)?)(.*)$/.exec(ch);
  if (!m) return null;
  var root = m[1], rest = m[2].replace(/\/.*$/, "");
  var probes = [root + rest, root + (/^m(?!aj)/.test(rest) ? "m" : ""), root];
  for (var i = 0; i < probes.length; i++) if (CHORDS[probes[i]]) return CHORDS[probes[i]];
  return null;
}

function transposeChord(ch, semi) {
  if (!semi) return ch;
  var m = /^([A-H](?:#|b)?)([^\/]*)(?:\/([A-H](?:#|b)?))?$/.exec(ch);
  if (!m) return ch;
  var table = ch.indexOf("b") > 0 ? FLAT : SHARP;
  var root = NOTE_INDEX[m[1]];
  if (root === undefined) return ch;
  var out = table[(root + semi + 120) % 12] + m[2];
  if (m[3]) {
    var bass = NOTE_INDEX[m[3]];
    if (bass !== undefined) out += "/" + table[(bass + semi + 120) % 12];
  }
  return out;
}

function lineKind(line) {
  var s = line.trim();
  if (!s) return "empty";
  if (/^\[[^\]]+\]:?$/.test(s)) return "label";
  if (/:$/.test(s) && s.length < 26 && !/[a-hj-z]{3,}/i.test(s)) return "label";
  var toks = s.split(/\s+/).filter(function (t) { return t && t !== "|"; });
  if (!toks.length) return "empty";
  var allChords = toks.every(function (t) {
    return CHORD_RE.test(t) || /^x\d+$/i.test(t);
  });
  return allChords ? "chords" : "text";
}

function isChordLine(line) {
  var k = lineKind(line);
  return k === "chords";
}

function transposeText(text, semi) {
  if (!semi) return text;
  return text.split("\n").map(function (line) {
    if (!isChordLine(line)) return line;
    return line.replace(/\S+/g, function (tok) {
      return CHORD_RE.test(tok) ? transposeChord(tok, semi) : tok;
    });
  }).join("\n");
}

function songSections(text) {
  var lines = text.split("\n");
  var secs = [], cur = { title: "", lines: [] };
  lines.forEach(function (line) {
    var s = line.trim();
    if (lineKind(line) === "label") {
      if (cur.lines.some(function (l) { return l.trim(); })) secs.push(cur);
      cur = { title: s.replace(/[\[\]:]/g, "").trim(), lines: [] };
      return;
    }
    cur.lines.push(line);
  });
  if (cur.lines.some(function (l) { return l.trim(); })) secs.push(cur);
  if (!secs.length) secs = [{ title: "Песня", lines: lines }];
  return secs;
}

function songBlocks(text) {
  var blocks = [];
  songSections(text).forEach(function (sec) {
    var chunk = [];
    var flush = function () {
      while (chunk.length && !chunk[chunk.length - 1].trim()) chunk.pop();
      if (chunk.some(function (l) { return l.trim(); })) blocks.push({ title: sec.title, lines: chunk.slice() });
      chunk = [];
    };
    sec.lines.forEach(function (line) {
      if (!line.trim()) { if (chunk.length) flush(); return; }
      chunk.push(line);
      if (chunk.length >= 6) flush();
    });
    flush();
  });
  return blocks;
}

var STORE_KEY = "pesennik.v1";

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { return {}; }
}

function saveState(st) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) {}
}

var Store = {
  data: loadState(),
  song: function (id) {
    if (!this.data[id]) {
      this.data[id] = { mark: "", note: "", weak: [], known: [], mode: "play", font: 0, trans: 0, capo: 0, speed: 45 };
    }
    var s = this.data[id];
    if (!s.weak) s.weak = [];
    if (!s.known) s.known = [];
    return s;
  },
  patch: function (id, obj) {
    var s = this.song(id);
    for (var k in obj) if (obj.hasOwnProperty(k)) s[k] = obj[k];
    saveState(this.data);
  },
  hasNote: function (id) {
    var s = this.data[id];
    return !!(s && s.note && s.note.trim());
  }
};

var App = {
  song: null, state: null, mode: "list", playing: false, wakeLock: null,
  show: function (msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(App._tt);
    App._tt = setTimeout(function () { t.classList.remove("on"); }, 1600);
  }
};
