/* ===== 意大利语声乐术语与对话 ===== */
(function () {
  "use strict";

  var META = window.BOOK_META || { title: "", author: "", grupos: [], totalAll: 0 };
  var DATA = {};            // gid -> 分册数据
  var AUDIO = "audio/";
  var LS_DONE = "svocal_done", LS_THEME = "svocal_theme", LS_POS = "svocal_pos";
  var LS_SRS = "svocal_srs", LS_DETAIL = "svocal_detail";
  var SRS_INT = [0, 10 * 60 * 1000, 60 * 60 * 1000, 864e5, 3 * 864e5, 7 * 864e5];
  var study = { active: false, mode: "card", scope: "sec", items: [], i: 0, total: 0,
                known: 0, unknown: 0, cur: null, dueOnly: false, srs: {} };

  var state = { g: 0, p: 0, s: 0, done: {}, theme: "light" };
  var FLAT = [];
  var el = function (id) { return document.getElementById(id); };
  var content = el("content");

  function buildFlat() {
    FLAT = [];
    META.grupos.forEach(function (gr, gi) {
      gr.partes.forEach(function (pt, pi) {
        pt.secs.forEach(function (s) {
          FLAT.push({ g: gi, p: pi, gid: pt.gid, no: s.no, name: s.name, type: s.type, gname: gr.name });
        });
      });
    });
  }
  function curParte() { return META.grupos[state.g].partes[state.p]; }
  function curSec() { return curParte().secs[state.s]; }
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function roleClass(role) {
    var r = role || "";
    var teach = ["老师", "大师", "医", "录", "制作", "导", "指挥", "接待", "主持", "艺术指导", "钢伴"];
    for (var i = 0; i < teach.length; i++) if (r.indexOf(teach[i]) >= 0) return "teacher";
    return "student";
  }

  /* ---------- localStorage ---------- */
  function loadLS() {
    try { state.done = JSON.parse(localStorage.getItem(LS_DONE) || "{}"); } catch (e) { state.done = {}; }
    state.theme = localStorage.getItem(LS_THEME) || "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    try {
      var pos = JSON.parse(localStorage.getItem(LS_POS) || "null");
      if (pos && META.grupos.length) {
        state.g = pos.g || 0; state.p = pos.p || 0; state.s = pos.s || 0;
        if (!META.grupos[state.g]) { state.g = 0; state.p = 0; state.s = 0; }
        else if (!META.grupos[state.g].partes[state.p]) { state.p = 0; state.s = 0; }
        else if (!curParte().secs[state.s]) state.s = 0;
      }
    } catch (e) { }
    if (localStorage.getItem(LS_DETAIL) === "0") document.body.classList.add("hide-detail");
  }
  function saveDone() { try { localStorage.setItem(LS_DONE, JSON.stringify(state.done)); } catch (e) { } }
  function savePos() { try { localStorage.setItem(LS_POS, JSON.stringify({ g: state.g, p: state.p, s: state.s })); } catch (e) { } }

  /* ---------- 数据加载 ---------- */
  function loadParte(gid, cb) {
    if (DATA[gid]) { cb(DATA[gid]); return; }
    var s = document.createElement("script");
    s.src = "data/sec/" + gid + ".js";
    s.onload = function () {
      var d = (window.BOOK_DATA || {})[gid] || null;
      if (d) DATA[gid] = d;
      s.remove(); cb(d);
    };
    s.onerror = function () { s.remove(); cb(null); };
    document.head.appendChild(s);
  }
  function loadAll(cb) {
    var rest = FLAT.filter(function (f) { return !DATA[f.gid]; });
    if (!rest.length) { cb(); return; }
    var n = rest.length;
    rest.forEach(function (f) {
      loadParte(f.gid, function () { if (--n <= 0) cb(); });
    });
  }

  /* ---------- 目录 ---------- */
  function renderToc() {
    var toc = el("toc"), h = "";
    META.grupos.forEach(function (gr, gi) {
      var openG = (gi === state.g);
      h += '<div class="grupo' + (openG ? " open" : "") + '" data-g="' + gi + '">'
        + '<div class="grupo-hd" data-g="' + gi + '"><span class="caret">▶</span>'
        + '<span class="gname">' + esc(gr.name) + '</span>'
        + '<span class="gcount">' + gr.partes.length + '</span></div><div class="parte-list">';
      gr.partes.forEach(function (pt, pi) {
        var openP = openG && pi === state.p;
        h += '<div class="parte-item' + (openP ? " open" : "") + '" data-g="' + gi + '" data-p="' + pi + '">'
          + '<div class="parte-hd" data-g="' + gi + '" data-p="' + pi + '">'
          + '<span class="caret">▶</span><span class="pno">' + pt.no + '</span>'
          + '<span class="pname">' + esc(pt.name) + '</span></div><div class="sec-list">';
        pt.secs.forEach(function (s, si) {
          var act = (gi === state.g && pi === state.p && si === state.s);
          h += '<div class="sec-item' + (act ? " active" : "") + '" data-g="' + gi
            + '" data-p="' + pi + '" data-s="' + si + '">'
            + '<span class="sno">' + s.no + '</span>'
            + '<span class="sname">' + esc(s.name) + '</span>'
            + '<span class="stype' + (s.type === "dialogue" ? " d" : "") + '">'
            + (s.type === "dialogue" ? "对" : "词") + '</span>'
            + (state.done[pt.gid + "-" + s.no] ? '<span class="sdot"></span>' : '')
            + '</div>';
        });
        h += '</div></div>';
      });
      h += '</div></div>';
    });
    toc.innerHTML = h;
    var ns = 0, nd = 0;
    META.grupos.forEach(function (gr) {
      gr.partes.forEach(function (pt) {
        ns += pt.secs.length;
        pt.secs.forEach(function (s) { if (state.done[pt.gid + "-" + s.no]) nd++; });
      });
    });
    el("sideCount").textContent = META.grupos.length + " 篇 · " + FLAT.length
      + " 小节 · 已学 " + nd;
  }

  /* ---------- 内容 ---------- */
  function render() {
    var pm = curParte(), sm = curSec();
    if (!pm || !sm) return;
    loadParte(pm.gid, function (d) {
      if (!d) { content.innerHTML = '<div class="empty">加载失败</div>'; return; }
      var sec = null;
      for (var i = 0; i < d.secs.length; i++) if (d.secs[i].no === sm.no) sec = d.secs[i];
      if (!sec) { content.innerHTML = '<div class="empty">未找到该小节</div>'; return; }

      var gr = META.grupos[state.g];
      var key = pm.gid + "-" + sm.no, isDone = !!state.done[key];
      var h = '<div class="crumb">' + esc(gr.name) + ' › Parte ' + pm.no
        + ' <b>' + esc(pm.name) + '</b> · Sezione ' + sm.no + '</div>'
        + '<h1 class="sec-title">' + esc(sm.name) + '</h1>'
        + '<div class="sec-meta">'
        + (sec.type === "terms"
            ? '<span>术语 ' + sec.w.length + ' 条</span>'
            : '<span>对话 ' + sec.d.length + ' 组</span>')
        + '<button class="btn-done' + (isDone ? " on" : "") + '" id="doneBtn">'
        + (isDone ? "✓ 已学完" : "标记学完") + '</button></div>';

      if (sec.type === "terms") {
        if (sec.w.length) h += blockTerms(sec);
        else h += '<div class="empty">本节暂无术语</div>';
      } else {
        if (sec.note) h += '<div class="sec-note">' + esc(sec.note) + '</div>';
        if (sec.d.length) h += blockDialogue(sec);
        else h += '<div class="empty">本节暂无对话</div>';
      }
      h += navRow();

      content.innerHTML = h;
      window.scrollTo(0, 0);
      bindContent();
      stopPlay();
      renderToc();
    });
  }

  function navRow() {
    var prev = '<button data-nav="prev">← 上一节</button>';
    var next = '<button data-nav="next">下一节 →</button>';
    var fi = flatIndex();
    if (fi <= 0 && state.s <= 0) prev = '<button disabled>← 上一节</button>';
    if (fi >= FLAT.length - 1 && state.s >= curParte().secs.length - 1)
      next = '<button disabled>下一节 →</button>';
    return '<div class="nav-row">' + prev + next + '</div>';
  }
  function flatIndex() {
    for (var i = 0; i < FLAT.length; i++)
      if (FLAT[i].g === state.g && FLAT[i].p === state.p) return i;
    return 0;
  }

  function uid(gid, sno, kind, i) { return "u" + gid + "_" + sno + "_" + kind + "_" + i; }

  function blockTerms(sec) {
    if (sec.kind === "composer") return blockComposer(sec);
    var gid = curParte().gid, sno = sec.no, kind = "w";
    var h = '<div class="block"><div class="block-hd"><h3>术语</h3>'
      + '<span class="tag">' + sec.w.length + '</span>'
      + '<button class="mini-play" data-playblock="' + kind + '">▶ 连播本组</button></div>';
    sec.w.forEach(function (it, i) {
      var id = uid(gid, sno, kind, i);
      h += '<div class="row" id="' + id + '"><span class="idx">' + (i + 1) + '</span>'
        + '<div class="body"><div class="line-es">'
        + '<span class="es" data-a="' + AUDIO + it[5] + '">' + esc(it[0]) + '</span>'
        + (it[1] ? '<span class="pos">' + esc(it[1]) + '</span>' : '')
        + '</div>'
        + (it[2] ? '<div class="zh" data-a="' + AUDIO + it[6] + '">' + esc(it[2]) + '</div>' : '')
        + (it[3] ? '<div class="ex"><span class="ex-lbl">例句</span>' + esc(it[3]) + '</div>' : '')
        + (it[4] ? '<div class="note"><span class="note-lbl">备注</span>' + esc(it[4]) + '</div>' : '')
        + '</div>'
        + '<div class="spk-grp">'
        + '<button class="spk" data-a="' + AUDIO + it[5] + '" title="意语发音">🔊</button>'
        + '<button class="spk" data-a="' + AUDIO + it[6] + '" title="中文发音">汉</button>'
        + '</div></div>';
    });
    return h + '</div>';
  }

  function blockComposer(sec) {
    var gid = curParte().gid, sno = sec.no, kind = "w";
    var h = '<div class="block"><div class="block-hd"><h3>作曲家与代表作</h3>'
      + '<span class="tag">' + sec.w.length + '</span>'
      + '<button class="mini-play" data-playblock="' + kind + '">▶ 连播本组</button></div>';
    sec.w.forEach(function (it, i) {
      var id = uid(gid, sno, kind, i);
      var works = it[9] || [];
      h += '<div class="row composer-row" id="' + id + '"><span class="idx">' + (i + 1) + '</span>'
        + '<div class="body">'
        + '<div class="line-es">'
        + '<span class="es" data-a="' + AUDIO + it[5] + '">' + esc(it[0]) + '</span>'
        + (it[1] ? '<span class="pos">' + esc(it[1]) + '</span>' : '')
        + '</div>'
        + '<div class="zh" data-a="' + AUDIO + it[6] + '">' + esc(it[2]) + '</div>'
        + '<div class="work-list"><span class="work-lbl">代表作</span>';
      works.forEach(function (w) {
        h += '<span class="work-item">'
          + '<span class="work-it" data-a="' + AUDIO + w.aIt + '">' + esc(w.it) + '</span>'
          + (w.zh ? '<span class="work-zh">' + esc(w.zh) + '</span>' : '')
          + '<button class="spk work-spk" data-a="' + AUDIO + w.aIt + '" title="代表作意语发音">🎵</button>'
          + '</span>';
      });
      h += '</div>'
        + (it[4] ? '<div class="note"><span class="note-lbl">备注</span>' + esc(it[4]) + '</div>' : '')
        + '</div>'
        + '<div class="spk-grp">'
        + '<button class="spk" data-a="' + AUDIO + it[5] + '" title="姓名意语发音">🔊</button>'
        + '<button class="spk" data-a="' + AUDIO + it[6] + '" title="中文名发音">汉</button>'
        + '</div></div>';
    });
    return h + '</div>';
  }

  function blockDialogue(sec) {
    var gid = curParte().gid, sno = sec.no, kind = "d";
    var h = '<div class="block"><div class="block-hd"><h3>师生对话</h3>'
      + '<span class="tag">' + sec.d.length + '</span>'
      + '<button class="mini-play" data-playblock="' + kind + '">▶ 连播本组</button></div>';
    var curSub = null;
    sec.d.forEach(function (t, i) {
      if (t.sub && t.sub !== curSub) { curSub = t.sub; h += '<div class="sub-hd">' + esc(t.sub) + '</div>'; }
      var id = uid(gid, sno, kind, i);
      var rc = roleClass(t.role);
      h += '<div class="turn" id="' + id + '">'
        + '<div class="body">'
        + '<div class="turn-hd"><span class="role ' + rc + '">' + esc(t.role) + '</span></div>'
        + '<div class="t-es" data-a="' + AUDIO + t.ait + '">' + esc(t.it) + '</div>'
        + '<div class="t-zh" data-a="' + AUDIO + t.azh + '">' + esc(t.zh) + '</div>'
        + '</div>'
        + '<div class="spk-grp">'
        + '<button class="spk" data-a="' + AUDIO + t.ait + '" title="意语发音">🔊</button>'
        + '<button class="spk" data-a="' + AUDIO + t.azh + '" title="中文发音">汉</button>'
        + '</div></div>';
    });
    return h + '</div>';
  }

  function bindContent() {
    var db = el("doneBtn");
    if (db) db.onclick = function () {
      var k = curParte().gid + "-" + curSec().no;
      if (state.done[k]) delete state.done[k]; else state.done[k] = 1;
      saveDone(); render();
    };
    content.querySelectorAll("[data-nav]").forEach(function (b) {
      b.onclick = function () { navigate(b.getAttribute("data-nav")); };
    });
    content.querySelectorAll(".mini-play").forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute("data-playblock");
        buildUnits("sec", function () {
          P.units = P.units.filter(function (u) { return u.kind === kind; });
          P.dirty = true; expand(); doStart();
        });
      };
    });
  }

  function navigate(dir) {
    if (dir === "prev") {
      if (state.s > 0) state.s--;
      else {
        var fi = flatIndex();
        if (fi > 0) { var pv = FLAT[fi - 1]; state.g = pv.g; state.p = pv.p; state.s = META.grupos[pv.g].partes[pv.p].secs.length - 1; }
        else return;
      }
    } else {
      if (state.s < curParte().secs.length - 1) state.s++;
      else {
        var fi2 = flatIndex();
        if (fi2 < FLAT.length - 1) { var nx = FLAT[fi2 + 1]; state.g = nx.g; state.p = nx.p; state.s = 0; }
        else return;
      }
    }
    savePos(); render();
  }

  /* ================= 播放引擎 ================= */
  var P = {
    units: [], list: [], i: 0, playing: false, dirty: true,
    players: [new Audio(), new Audio()],
    pre: null, cur: 0, timer: null, busy: false, err: 0
  };
  function rate() { return parseFloat(el("rateSel").value) || 1; }
  function gapMs() { return parseInt(el("gapSel").value, 10) || 0; }
  function loopOn() { return el("loopChk").checked; }
  function shuffleOn() { return el("shuffleChk").checked; }
  function mode() { return el("modeSel").value; }

  function unitsOf(gid, sec) {
    var out = [];
    if (sec.type === "terms") {
      sec.w.forEach(function (it, i) {
        out.push({ id: uid(gid, sec.no, "w", i), kind: "w", es: it[0], zh: it[2], ae: it[5], az: it[6] });
        if (sec.kind === "composer" && it[9] && it[9].length) {
          it[9].forEach(function (w, wi) {
            out.push({ id: uid(gid, sec.no, "w", i) + "_work" + wi, kind: "w", es: w.it, zh: w.zh, ae: w.aIt, az: w.aZh || "" });
          });
        }
      });
    } else {
      sec.d.forEach(function (t, i) {
        out.push({ id: uid(gid, sec.no, "d", i), kind: "d", es: t.it, zh: t.zh, ae: t.ait, az: t.azh });
      });
    }
    return out;
  }

  function collect(scope, cb) {
    if (scope === "sec") {
      loadParte(curParte().gid, function (d) {
        if (!d) { cb([]); return; }
        var sno = curSec().no, sec = null;
        for (var i = 0; i < d.secs.length; i++) if (d.secs[i].no === sno) sec = d.secs[i];
        cb(sec ? unitsOf(curParte().gid, sec) : []);
      });
    } else if (scope === "parte") {
      loadParte(curParte().gid, function (d) {
        if (!d) { cb([]); return; }
        var out = [];
        d.secs.forEach(function (s) { out = out.concat(unitsOf(d.gid, s)); });
        cb(out);
      });
    } else {
      loadAll(function () {
        var out = [];
        FLAT.forEach(function (f) {
          var d = DATA[f.gid]; if (!d) return;
          d.secs.forEach(function (s) { out = out.concat(unitsOf(f.gid, s)); });
        });
        cb(out);
      });
    }
  }

  function expand() {
    var m = mode(), L = [], U = P.units;
    if (shuffleOn()) U = U.slice();
    if (m === "it-zh") {
      U.forEach(function (u) {
        L.push({ src: AUDIO + u.ae, uid: u.id, lang: "it" });
        L.push({ src: AUDIO + u.az, uid: u.id, lang: "zh" });
      });
    } else if (m === "all-it-zh") {
      U.forEach(function (u) { L.push({ src: AUDIO + u.ae, uid: u.id, lang: "it" }); });
      U.forEach(function (u) { L.push({ src: AUDIO + u.az, uid: u.id, lang: "zh" }); });
    } else if (m === "it-only") {
      U.forEach(function (u) { L.push({ src: AUDIO + u.ae, uid: u.id, lang: "it" }); });
    } else {
      U.forEach(function (u) { L.push({ src: AUDIO + u.az, uid: u.id, lang: "zh" }); });
    }
    P.list = L.filter(function (x) { return x.src && x.src !== AUDIO; }); P.i = 0;
  }

  function buildUnits(scope, cb) { collect(scope, function (u) { P.units = u; if (cb) cb(); }); }

  function updateProgress() {
    var it = P.list[P.i];
    if (!it || !P.units.length) { el("plLabel").textContent = "未播放"; el("plBar").style.width = "0%"; return; }
    var ui = 0;
    for (var k = 0; k < P.units.length; k++) if (P.units[k].id === it.uid) { ui = k; break; }
    el("plBar").style.width = ((P.i + 1) / P.list.length * 100).toFixed(1) + "%";
    el("plLabel").textContent = "第 " + (ui + 1) + "/" + P.units.length + " 条 · "
      + (it.lang === "it" ? "意语" : "中文");
  }

  function highlight(uidStr) {
    clearHL();
    var t = document.getElementById(uidStr);
    if (!t) return;
    t.classList.add("cur");
    var r = t.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 130) {
      try { t.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { }
    }
  }
  function clearHL() {
    var old = document.querySelectorAll(".cur");
    for (var i = 0; i < old.length; i++) old[i].classList.remove("cur");
  }

  function preloadNext() {
    var nx = P.list[P.i + 1];
    if (!nx) return;
    try {
      if (!P.pre) P.pre = new Audio();
      P.pre.preload = "auto";
      P.pre.src = nx.src;
    } catch (e) { }
  }

  function step() {
    if (!P.playing) return;
    if (P.i >= P.list.length) {
      if (loopOn()) P.i = 0; else { stopPlay(true); return; }
    }
    var it = P.list[P.i];
    if (!it) { stopPlay(true); return; }
    var a = P.players[P.cur];
    P.busy = false;
    try { a.pause(); } catch (e) { }
    a.src = it.src;
    a.playbackRate = rate();
    a.onended = function () { if (P.busy) return; P.busy = true; advance(); };
    a.onerror = function () { P.err++; if (P.busy) return; P.busy = true; advance(); };
    var pr = a.play();
    if (pr && pr.catch) pr.catch(function () { if (!P.busy) { P.busy = true; advance(); } });
    highlight(it.uid);
    updateProgress();
    preloadNext();
  }

  function advance() {
    P.i++; P.cur ^= 1;
    clearTimeout(P.timer);
    P.timer = setTimeout(step, gapMs());
  }

  function doStart() {
    if (!P.list.length) return;
    if (P.i >= P.list.length) P.i = 0;
    P.playing = true;
    el("playBtn").classList.add("playing");
    clearTimeout(P.timer);
    step();
  }

  function startPlay() {
    if (P.dirty || !P.list.length) {
      var sc = el("scopeSel").value;
      el("plLabel").textContent = sc === "all" ? "正在准备全书播放…"
        : sc === "parte" ? "正在准备本大类播放…" : "准备中…";
      buildUnits(sc, function () { P.dirty = false; expand(); doStart(); });
    } else doStart();
  }

  function pausePlay() {
    P.playing = false;
    el("playBtn").classList.remove("playing");
    clearTimeout(P.timer);
    P.players.forEach(function (a) { try { a.pause(); } catch (e) { } });
  }

  function stopPlay(finished) {
    pausePlay();
    P.i = 0; P.dirty = true;
    el("plBar").style.width = finished ? "100%" : "0%";
    el("plLabel").textContent = "未播放";
    clearHL();
  }

  function togglePlay() { if (P.playing) pausePlay(); else startPlay(); }

  function jumpUnit(delta) {
    if (!P.units.length || !P.list.length || P.dirty) {
      buildUnits(el("scopeSel").value, function () {
        P.dirty = false; expand(); jumpUnit(delta);
      });
      return;
    }
    var curUid = P.list[P.i] ? P.list[P.i].uid : null, ui = 0;
    for (var k = 0; k < P.units.length; k++) if (P.units[k].id === curUid) { ui = k; break; }
    ui = Math.max(0, Math.min(P.units.length - 1, ui + delta));
    var target = P.units[ui].id, ni = -1;
    for (var j = 0; j < P.list.length; j++) if (P.list[j].uid === target) { ni = j; break; }
    if (ni < 0) return;
    P.i = ni;
    if (P.playing) { clearTimeout(P.timer); step(); }
    else { highlight(target); updateProgress(); }
  }

  function say(src, btn) {
    var a = new Audio(src);
    a.playbackRate = rate();
    if (btn) {
      btn.classList.add("on");
      a.onended = a.onerror = function () { btn.classList.remove("on"); };
    }
    var pr = a.play();
    if (pr && pr.catch) pr.catch(function () { if (btn) btn.classList.remove("on"); });
  }

  /* 点读（事件委托） */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-a]") : null;
    if (!t) return;
    var src = t.getAttribute("data-a");
    if (!src) return;
    if (t.classList.contains("spk")) { e.stopPropagation(); say(src, t); }
    else say(src, null);
  });

  /* ---------- 搜索 ---------- */
  var searchTimer = null;
  function doSearch(q) {
    q = (q || "").trim().toLowerCase();
    var box = el("searchResults");
    if (!q) { box.classList.add("hidden"); content.classList.remove("hidden"); return; }
    loadAll(function () {
      var res = [], seen = {};
      FLAT.forEach(function (f) {
        var d = DATA[f.gid]; if (!d) return;
        d.secs.forEach(function (s) {
          var push = function (es, zh, pos, isD) {
            var k = es + "|" + zh;
            if (seen[k]) return; seen[k] = 1;
            if (es.toLowerCase().indexOf(q) >= 0 || zh.toLowerCase().indexOf(q) >= 0)
              res.push({ es: es, zh: zh, pos: pos, f: f, isD: isD });
          };
          if (s.type === "terms") {
            s.w.forEach(function (x) { push(x[0], x[2], x[1], false); });
          } else if (s.d) {
            s.d.forEach(function (x) { push(x.it, x.zh, x.role, true); });
          }
        });
      });
      var h = '<div class="sr-head">找到 ' + res.length + ' 条'
        + (res.length > 300 ? "（仅显示前 300 条）" : "") + '</div>';
      res.slice(0, 300).forEach(function (r) {
        h += '<div class="sr-item" data-gid="' + r.f.gid + '" data-sno="' + r.f.no + '">'
          + '<span class="sr-es">' + esc(r.es) + '</span>'
          + '<span class="sr-zh">' + esc(r.zh) + '</span>'
          + '<span class="sr-pos' + (r.isD ? " d" : "") + '">'
          + (r.isD ? "对话 · " : "术语 · ") + esc(r.f.gname || "") + ' › ' + esc(r.f.name) + '</span></div>';
      });
      if (!res.length) h += '<div class="empty">没有匹配的词条</div>';
      box.innerHTML = h;
      box.classList.remove("hidden");
      content.classList.add("hidden");
      box.querySelectorAll(".sr-item").forEach(function (it) {
        it.onclick = function () {
          gotoSec(parseInt(it.getAttribute("data-gid"), 10),
                  parseInt(it.getAttribute("data-sno"), 10));
        };
      });
    });
  }

  function gotoSec(gid, sno) {
    for (var i = 0; i < FLAT.length; i++) {
      if (FLAT[i].gid !== gid) continue;
      var secs = META.grupos[FLAT[i].g].partes[FLAT[i].p].secs;
      for (var j = 0; j < secs.length; j++) {
        if (secs[j].no === sno) {
          state.g = FLAT[i].g; state.p = FLAT[i].p; state.s = j; savePos();
          el("search").value = "";
          el("searchResults").classList.add("hidden");
          content.classList.remove("hidden");
          render(); return;
        }
      }
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    buildFlat();
    loadLS();
    el("bookTitle").textContent = META.title || "意大利语钢琴课术语与对话";
    el("bookAuthor").textContent = META.author || "";
    renderToc();

    el("toc").addEventListener("click", function (e) {
      if (!e.target.closest) return;
      var gh = e.target.closest(".grupo-hd");
      if (gh) {
        var gi = parseInt(gh.getAttribute("data-g"), 10);
        var item = gh.parentElement;
        item.classList.toggle("open");
        if (item.classList.contains("open") && gi !== state.g) {
          state.g = gi; state.p = 0; state.s = 0; savePos(); render();
        }
        return;
      }
      var ph = e.target.closest(".parte-hd");
      if (ph) {
        var pgi = parseInt(ph.getAttribute("data-g"), 10);
        var ppi = parseInt(ph.getAttribute("data-p"), 10);
        var pitem = ph.parentElement;
        var wasOpen = pitem.classList.contains("open");
        var allP = pitem.parentElement.querySelectorAll(".parte-item");
        for (var k = 0; k < allP.length; k++) allP[k].classList.remove("open");
        if (!wasOpen || !(pgi === state.g && ppi === state.p)) {
          pitem.classList.add("open");
          state.g = pgi; state.p = ppi; state.s = 0; savePos(); render();
        }
        return;
      }
      var si = e.target.closest(".sec-item");
      if (si) {
        state.g = parseInt(si.getAttribute("data-g"), 10);
        state.p = parseInt(si.getAttribute("data-p"), 10);
        state.s = parseInt(si.getAttribute("data-s"), 10);
        savePos(); render(); closeSide();
      }
    });

    el("playBtn").onclick = togglePlay;
    el("prevBtn").onclick = function () { jumpUnit(-1); };
    el("nextBtn").onclick = function () { jumpUnit(1); };
    el("modeSel").onchange = function () { P.dirty = true; expand(); P.i = 0; updateProgress(); };
    el("scopeSel").onchange = function () { P.dirty = true; pausePlay(); P.i = 0; updateProgress(); };
    el("shuffleChk").onchange = function () { P.dirty = true; pausePlay(); P.i = 0; updateProgress(); };
    el("rateSel").onchange = function () {
      P.players.forEach(function (a) { a.playbackRate = rate(); });
    };
    el("plBar").parentElement.onclick = function (e) {
      if (!P.list.length) return;
      var r = this.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      P.i = Math.min(P.list.length - 1, Math.floor(pct * P.list.length));
      if (P.playing) { clearTimeout(P.timer); step(); } else updateProgress();
    };

    el("search").addEventListener("input", function () {
      clearTimeout(searchTimer);
      var v = this.value;
      searchTimer = setTimeout(function () { doSearch(v); }, 220);
    });
    el("searchClear").onclick = function () {
      el("search").value = "";
      el("searchResults").classList.add("hidden");
      content.classList.remove("hidden");
    };

    el("themeBtn").onclick = function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", state.theme);
      localStorage.setItem(LS_THEME, state.theme);
    };
    el("detailBtn").onclick = function () {
      var on = document.body.classList.toggle("hide-detail");
      localStorage.setItem(LS_DETAIL, on ? "0" : "1");
    };
    el("helpBtn").onclick = function () { el("helpModal").classList.remove("hidden"); };
    el("helpClose").onclick = function () { el("helpModal").classList.add("hidden"); };
    el("helpModal").onclick = function (e) { if (e.target === this) this.classList.add("hidden"); };
    el("exportBtn").onclick = exportProgress;
    el("importFile").onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importProgress(f);
      e.target.value = "";
    };

    var openSide = function () { el("sidebar").classList.add("show"); el("scrim").classList.remove("hidden"); };
    function closeSide() { el("sidebar").classList.remove("show"); el("scrim").classList.add("hidden"); }
    window.closeSide = closeSide;
    el("menuBtn").onclick = openSide;
    el("menuBtn2").onclick = openSide;
    el("scrim").onclick = closeSide;

    document.addEventListener("keydown", function (e) {
      if (study.active) {
        if (study.mode === "card") {
          var back = el("studyBody").querySelector(".back");
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (back) { grade(true); renderStudy(); }
            else if (study.cur) flipCard(study.cur, el("studyBody"), el("studyFoot"));
          } else if (e.key === "ArrowRight") {
            e.preventDefault(); if (back) { grade(true); renderStudy(); }
          } else if (e.key === "ArrowLeft") {
            e.preventDefault(); if (back) { grade(false); renderStudy(); }
          }
        }
        return;
      }
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); jumpUnit(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); jumpUnit(1); }
      else if (e.key === "/") { e.preventDefault(); el("search").focus(); }
    });

    setTimeout(function () {
      var fi = flatIndex();
      for (var k = 1; k <= 2; k++) if (FLAT[fi + k]) loadParte(FLAT[fi + k].gid, function () { });
    }, 1200);

    initStudy();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* ============ 学习模式：闪卡 / 测验 + SRS ============ */
  function loadSRS() { try { study.srs = JSON.parse(localStorage.getItem(LS_SRS) || "{}"); } catch (e) { study.srs = {}; } }
  function saveSRS() { try { localStorage.setItem(LS_SRS, JSON.stringify(study.srs)); } catch (e) { } }
  function srsUpdate(u, known) {
    var r = study.srs[u] || { b: 0, due: 0, reps: 0, lap: 0 };
    r.reps = (r.reps || 0) + 1;
    if (known) { r.b = Math.min((r.b || 0) + 1, SRS_INT.length - 1); r.lap = 0; }
    else { r.lap = (r.lap || 0) + 1; r.b = 0; }
    r.due = Date.now() + (SRS_INT[r.b] || 0);
    study.srs[u] = r; saveSRS();
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function studySections(scope, cb) {
    if (scope === "sec") {
      loadParte(curParte().gid, function (d) {
        if (!d) { cb([]); return; }
        var sec = null;
        for (var i = 0; i < d.secs.length; i++) if (d.secs[i].no === curSec().no) sec = d.secs[i];
        cb(sec ? [{ gid: curParte().gid, sec: sec }] : []);
      });
    } else if (scope === "parte") {
      loadParte(curParte().gid, function (d) {
        cb(d ? d.secs.map(function (s) { return { gid: curParte().gid, sec: s }; }) : []);
      });
    } else {
      loadAll(function () {
        var list = [];
        FLAT.forEach(function (f) {
          var d = DATA[f.gid]; if (!d) return;
          d.secs.forEach(function (s) { list.push({ gid: f.gid, sec: s }); });
        });
        cb(list);
      });
    }
  }
  function buildStudyItems(scope, cb) {
    studySections(scope, function (pairs) {
      var out = [];
      pairs.forEach(function (p) {
        var sec = p.sec;
        if (sec.type === "terms") {
          sec.w.forEach(function (it, i) {
            out.push({ uid: uid(p.gid, sec.no, "w", i), kind: "w",
              es: it[0], zh: it[2], ae: it[5], az: it[6], role: "" });
          });
        } else if (sec.d) {
          sec.d.forEach(function (t, i) {
            out.push({ uid: uid(p.gid, sec.no, "d", i), kind: "d",
              es: t.it, zh: t.zh, ae: t.ait, az: t.azh, role: t.role });
          });
        }
      });
      cb(out);
    });
  }

  function startStudy() {
    stopPlay();
    study.active = true;
    study.scope = el("studyScope").value;
    study.mode = (document.querySelector(".stab.active") || { getAttribute: function () { return "card"; } })
      .getAttribute("data-smode");
    study.dueOnly = el("studyDue").checked;
    el("study").classList.remove("hidden");
    document.body.classList.add("study-on");
    buildStudyItems(study.scope, function (items) {
      if (study.mode === "quiz") items = items.filter(function (x) { return x.kind === "w"; });
      if (study.dueOnly) {
        var due = items.filter(function (it) { var r = study.srs[it.uid]; return !r || r.due <= Date.now(); });
        if (due.length) items = due;
      }
      if (el("studyShuffle").checked) shuffle(items);
      study.items = items; study.i = 0; study.total = items.length;
      study.known = 0; study.unknown = 0; study.cur = null;
      if (!items.length) {
        el("studyBody").innerHTML = '<div class="empty">本节暂无可学习词条</div>';
        el("studyFoot").innerHTML = "";
        return;
      }
      renderStudy();
    });
  }

  function renderStudy() {
    if (study.i >= study.items.length) { renderStudyDone(); return; }
    study.cur = study.items[study.i];
    if (study.mode === "card") renderCard(study.cur, el("studyBody"), el("studyFoot"));
    else renderQuiz(study.cur, el("studyBody"), el("studyFoot"));
  }

  function renderCard(it, body, foot) {
    body.innerHTML = '<div class="card-face front">'
      + '<div class="cf-es">' + esc(it.es) + '</div>'
      + '<button class="cf-spk spk" data-a="' + AUDIO + it.ae + '" title="意语发音">🔊 意语</button>'
      + '<div class="cf-hint">点击卡片或按空格翻面</div></div>';
    body.onclick = function (e) { if (e.target.closest(".spk")) return; flipCard(it, body, foot); };
    foot.innerHTML = '<div class="study-prog">' + (study.i + 1) + ' / ' + study.total + '</div>'
      + '<button class="btn primary" id="sFlip">翻面看中文</button>';
    el("sFlip").onclick = function (e) { e.stopPropagation(); flipCard(it, body, foot); };
  }
  function flipCard(it, body, foot) {
    body.onclick = null;
    body.innerHTML = '<div class="card-face back">'
      + '<div class="cf-zh">' + esc(it.zh) + '</div>'
      + (it.role ? '<div class="cf-role">— ' + esc(it.role) + '</div>' : '')
      + '<button class="cf-spk spk" data-a="' + AUDIO + it.az + '" title="中文发音">🔊 中文</button>'
      + '</div>';
    foot.innerHTML = '<div class="study-prog">' + (study.i + 1) + ' / ' + study.total + '</div>'
      + '<button class="btn s-unknown" id="sUnknown">不认识</button>'
      + '<button class="btn primary s-known" id="sKnown">认识</button>';
    el("sKnown").onclick = function () { grade(true); renderStudy(); };
    el("sUnknown").onclick = function () { grade(false); renderStudy(); };
  }

  function renderQuiz(it, body, foot) {
    body.onclick = null;
    var pool = study.items.filter(function (x) { return x.uid !== it.uid && x.kind === "w"; });
    shuffle(pool);
    var seen = {}, opts = [];
    function add(o) { if (!seen[o]) { seen[o] = 1; opts.push(o); } }
    add(it.es);
    for (var k = 0; k < pool.length && opts.length < 4; k++) add(pool[k].es);
    shuffle(opts);
    body.innerHTML = '<div class="quiz-prompt"><div class="qp-zh">' + esc(it.zh) + '</div>'
      + (it.role ? '<div class="qp-py">— ' + esc(it.role) + '</div>' : '')
      + '<button class="cf-spk spk" data-a="' + AUDIO + it.az + '" title="中文发音">🔊 中文</button></div>'
      + '<div class="quiz-opts">' + opts.map(function (o) {
        return '<button class="qopt" data-es="' + esc(o) + '">' + esc(o) + '</button>';
      }).join("") + '</div>';
    body.querySelectorAll(".qopt").forEach(function (b) {
      b.onclick = function () {
        var chosen = b.getAttribute("data-es"), correct = (chosen === it.es);
        body.querySelectorAll(".qopt").forEach(function (x) {
          x.disabled = true;
          if (x.getAttribute("data-es") === it.es) x.classList.add("correct");
          else if (x === b) x.classList.add("wrong");
        });
        say(AUDIO + it.ae, null);
        grade(correct);
        setTimeout(renderStudy, 1200);
      };
    });
    foot.innerHTML = '<div class="study-prog">' + (study.i + 1) + ' / ' + study.total + '</div>';
  }

  function grade(known) {
    var it = study.items[study.i];
    if (!it) return;
    srsUpdate(it.uid, known);
    if (known) study.known++; else study.unknown++;
    study.i++;
  }

  function renderStudyDone() {
    var body = el("studyBody"), foot = el("studyFoot");
    body.innerHTML = '<div class="study-done"><div class="sd-title">本轮完成 🎉</div>'
      + '<div class="sd-stat">共 ' + study.total + ' 张 · 认识 ' + study.known
      + ' · 待巩固 ' + study.unknown + '</div></div>';
    foot.innerHTML = '<button class="btn primary" id="sAgain">再来一轮</button>'
      + '<button class="btn" id="sClose2">退出</button>';
    el("sAgain").onclick = startStudy;
    el("sClose2").onclick = closeStudy;
  }
  function closeStudy() {
    study.active = false; study.cur = null;
    el("study").classList.add("hidden");
    document.body.classList.remove("study-on");
  }

  function exportProgress() {
    var data = { v: 1, ts: Date.now(),
      done: localStorage.getItem(LS_DONE) || "{}",
      srs: localStorage.getItem(LS_SRS) || "{}" };
    try {
      var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "vocal-progress.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    } catch (e) { alert("导出失败：" + e.message); }
  }
  function importProgress(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (d.done) localStorage.setItem(LS_DONE, d.done);
        if (d.srs) localStorage.setItem(LS_SRS, d.srs);
        state.done = JSON.parse(localStorage.getItem(LS_DONE) || "{}");
        study.srs = JSON.parse(localStorage.getItem(LS_SRS) || "{}");
        renderToc(); render();
        alert("进度已导入（" + Object.keys(state.done).length + " 个小节 + 复习记录）");
      } catch (e) { alert("导入失败：文件格式不正确"); }
    };
    r.readAsText(file);
  }

  function initStudy() {
    loadSRS();
    el("studyBtn").onclick = startStudy;
    el("studyClose").onclick = closeStudy;
    document.querySelectorAll(".stab").forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll(".stab").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        startStudy();
      };
    });
    el("studyScope").onchange = startStudy;
    el("studyShuffle").onchange = startStudy;
    el("studyDue").onchange = startStudy;
  }

  window.__SVOCAL = { state: state, P: P, DATA: DATA, META: META, FLAT: FLAT, study: study };
})();
