/*
 * cidi-debug-bridge.js  -  painel DEBUG estilo Bus Jam: STATUS ao vivo + LOG corrido.
 * (sem grade de botoes). Mostra o estado da persistencia continuamente pra diagnosticar
 * o "nao salva". Captura linhas [CiDi-*] do console + envolve client.report.* / auth.login.
 * Toggle: pequeno botao 'dbg' no canto. Para remover na final: comentar a linha no index.html.
 */
(function () {
  var SAVE_KEY = 'grocery-store_sgk', PROBE_KEY = '__cidi_persist_probe';
  var lines = [], MAX = 250, open = false, panel = null, toggle = null, statusEl = null, logEl = null;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function readSaved() {
    try {
      // tenta pelo storage que o JOGO usa: se o Phaser expoe, usa o mesmo objeto global do bundle
      var r = window.localStorage.getItem(SAVE_KEY);
      return r ? JSON.parse(r) : null;
    } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }
  function safe(v) { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return '' + v; } }

  function push(kind, msg) {
    var t = new Date().toTimeString().slice(0, 8);
    lines.unshift({ k: kind, t: t, m: msg });
    if (lines.length > MAX) lines.pop();
    renderLog();
  }

  // ---- STATUS ao vivo ----
  function row(ok, label, val) {
    var c = ok === true ? '#5fe39b' : ok === false ? '#ff8d9b' : '#ffd24a';
    return '<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;">' +
      '<span style="color:#9fb0d8;">' + label + '</span>' +
      '<span style="color:' + c + ';font-weight:700;text-align:right;">' + esc(val) + '</span></div>';
  }
  function writeReadTest() {
    try { var k = '__cidi_wr', v = '' + Date.now(); localStorage.setItem(k, v); var r = localStorage.getItem(k); localStorage.removeItem(k); return r === v; }
    catch (e) { return false; }
  }
  function renderStatus() {
    if (!statusEl) return;
    var s = stats(), disk = readSaved(), m = window.__mirror || {};
    var hasSDK = !!(window.CiDiSDK);
    var wr = writeReadTest();
    var probe = null; try { probe = localStorage.getItem(PROBE_KEY); } catch (e) {}
    statusEl.innerHTML =
      row(!!window.__BUILD__, 'BUILD', window.__BUILD__ || 'OLD/unknown') +
      row(hasSDK, 'CiDiSDK loaded', hasSDK ? 'yes' : 'NO') +
      row(window.__cidiInitState === 'ok' ? true : (window.__cidiInitState === 'pending' || !window.__cidiInitState) ? null : false, 'CiDi init()', window.__cidiInitState || 'pending') +
      row(wr, 'localStorage write/read', wr ? 'OK' : 'FAILED') +
      row(!!probe, 'persist probe', probe ? 'survived' : 'none') +
      row(!!disk, 'disk save exists', disk ? 'yes' : 'no') +
      row(disk ? null : false, 'DISK  lvl / coins', disk && disk.stats ? ('lvl ' + disk.stats.currentCommonLevel + ' \u00b7 ' + disk.stats.coins + 'c') : '-') +
      row(s ? null : false, 'GAME  lvl / coins', s ? ('lvl ' + s.currentCommonLevel + ' \u00b7 ' + s.coins + 'c') : '-') +
      row((window.__saves||0) > 0, 'saves feitos', String(window.__saves || 0)) +
      row(window.__saveOk === 'MATCH', 'save verify', (window.__saveOk || '-') + (window.__saveBytes ? (' ' + window.__saveBytes + 'b') : '')) +
      row(window.__saveErr ? false : null, 'save error', window.__saveErr || 'none') +
      row(null, 'CENAS', (function () {
        try {
          var gm = window.__game;
          return gm.scene.scenes.map(function (sc) {
            var k = sc.sys.settings.key;
            var a = ''; try { if (gm.scene.isActive(k)) a = '*'; } catch (e) {}
            var lm = sc.LevelManager ? '+LM' : '';
            return k + a + lm;
          }).join(' ');
        } catch (e) { return 'err'; }
      })()) +
      row(null, 'Game keys', (function () {
        try {
          var gm = window.__game;
          if (!gm || !gm.scene.isActive('Level')) return 'cena inativa';
          var sc = gm.scene.getScene('Level');
          return Object.keys(sc).filter(function (k) { return !/^(sys|game|scene|children|data|events|cameras|add|make|input|load|time|tweens|anims|cache|registry|textures|sound|plugins|renderer|physics|lights)$/.test(k); }).join(',').slice(0, 90);
        } catch (e) { return 'err'; }
      })()) +
      row(null, 'LM keys', (function () {
        try {
          var gm = window.__game;
          var sc = gm.scene.getScene('Level');
          var lm = sc && sc.LevelManager;
          if (!lm) return 'LevelManager AUSENTE';
          return Object.keys(lm).join(',').slice(0, 90);
        } catch (e) { return 'err'; }
      })()) +
      row(null, 'timer info', (function () {
        try {
          var gm = window.__game;
          var sc = gm.scene.getScene('Level');
          var lm = sc && sc.LevelManager;
          var t = lm && lm.timer;
          if (!t) return 'timer AUSENTE';
          return 'timeLeft=' + t.timeLeft + ' keys=' + Object.keys(t).join(',').slice(0, 60);
        } catch (e) { return 'err'; }
      })()) +
      row(null, 'CiDiSDK API', (function(){ try { return Object.keys(window.CiDiSDK||{}).join(',').slice(0,70) || 'none'; } catch(e){ return 'err'; } })()) +
      row(null, 'LS keys', (function(){ try { var a=[]; for (var i=0;i<localStorage.length;i++) a.push(localStorage.key(i)); return a.join(',').slice(0,60) || 'none'; } catch(e){ return 'err'; } })()) +
      row(window.__cidiLoggedIn === true, 'login', window.__cidiLoggedIn === true ? 'SIM' : 'no') +
      row(typeof window.__cidiAdShow === 'function', 'ad funnel', typeof window.__cidiAdShow === 'function' ? 'ready' : 'no');
  }
  function renderLog() {
    if (!logEl) return;
    logEl.innerHTML = lines.map(function (l) {
      var col = l.k === 'ok' ? '#7ee2a8' : l.k === 'bad' ? '#ff8d84' : l.k === 'evt' ? '#ffd479' : '#9ecbff';
      return '<div style="color:' + col + ';border-bottom:1px solid rgba(255,255,255,.06);padding:1px 0;">[' + l.t + '] ' + esc(l.m) + '</div>';
    }).join('');
  }

  function build() {
    if (toggle) return;
    toggle = document.createElement('button');
    toggle.textContent = 'dbg';
    toggle.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:90000;width:52px;height:32px;border-radius:9px;' +
      'background:rgba(16,20,40,.92);border:1.5px solid #3fd0ff;color:#aef3ff;font-family:ui-monospace,monospace;font-weight:800;font-size:12px;cursor:pointer;';
    toggle.onclick = function () { open = !open; panel.style.display = open ? 'flex' : 'none'; if (open) { renderStatus(); renderLog(); } };
    document.body.appendChild(toggle);

    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:50px;z-index:90000;display:none;flex-direction:column;max-height:72vh;' +
      'background:linear-gradient(180deg,rgba(16,20,40,.98),rgba(8,10,22,.99));border:1px solid rgba(63,208,255,.4);border-radius:14px;' +
      'font-family:ui-monospace,Menlo,monospace;overflow:hidden;box-shadow:0 14px 44px rgba(0,0,0,.7);';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(63,208,255,.1);border-bottom:1px solid rgba(255,255,255,.1);">' +
        '<b style="color:#aef3ff;font-size:13px;">CiDi debug</b>' +
        '<span><button id="cd-adtest" style="margin-right:6px;border:1px solid #ffd24a;background:none;color:#ffd24a;border-radius:6px;padding:3px 8px;font-family:inherit;cursor:pointer;">test ad</button>' +
        '<button id="cd-copy" style="margin-right:6px;border:1px solid #3fd0ff;background:none;color:#aef3ff;border-radius:6px;padding:3px 8px;font-family:inherit;cursor:pointer;">copy</button>' +
        '<button id="cd-clear" style="margin-right:6px;border:1px solid #3fd0ff;background:none;color:#aef3ff;border-radius:6px;padding:3px 8px;font-family:inherit;cursor:pointer;">clear</button>' +
        '<button id="cd-x" style="border:none;background:none;color:#fff;font-size:15px;cursor:pointer;">&times;</button></span></div>' +
      '<div id="cd-status" style="padding:8px 12px;font-size:11.5px;border-bottom:1px solid rgba(255,255,255,.08);"></div>' +
      '<div id="cd-log" style="flex:1;overflow:auto;padding:8px 12px;font-size:11px;line-height:1.5;"></div>';
    document.body.appendChild(panel);
    statusEl = panel.querySelector('#cd-status'); logEl = panel.querySelector('#cd-log');
    panel.querySelector('#cd-x').onclick = function () { open = false; panel.style.display = 'none'; };
    panel.querySelector('#cd-clear').onclick = function () { lines = []; renderLog(); };
    panel.querySelector('#cd-copy').onclick = function () {
      var txt = lines.slice().reverse().map(function (l) { return '[' + l.t + '] ' + l.m; }).join('\n');
      try { navigator.clipboard.writeText(txt); push('info', 'log copied'); } catch (e) {}
    };
    // TESTE DIRETO DE PERSISTENCIA na chave do save
    var tb = document.createElement('button');
    tb.textContent = 'test save';
    tb.style.cssText = 'margin-right:6px;border:1px solid #7ee2a8;background:none;color:#7ee2a8;border-radius:6px;padding:3px 8px;font-family:inherit;cursor:pointer;';
    panel.querySelector('#cd-adtest').parentNode.insertBefore(tb, panel.querySelector('#cd-adtest'));
    tb.onclick = function () {
      try {
        var probe = { stats: { currentCommonLevel: 99, coins: 12345, firstLoad: false } };
        localStorage.setItem(SAVE_KEY, JSON.stringify(probe));
        push('evt', 'wrote lvl99 c12345 to ' + SAVE_KEY);
        function chk(ms) {
          setTimeout(function () {
            try {
              var r = localStorage.getItem(SAVE_KEY);
              var lv = r ? (JSON.parse(r).stats || {}).currentCommonLevel : null;
              push(lv === 99 ? 'ok' : 'bad', '+' + ms + 'ms read -> lvl' + lv);
            } catch (e) { push('bad', '+' + ms + 'ms read error'); }
          }, ms);
        }
        chk(0); chk(1000); chk(3000);
        push('info', 'agora FECHE e reabra: se voltar lvl99, o storage persiste');
      } catch (e) { push('bad', 'test save error: ' + (e && e.message)); }
    };
    panel.querySelector('#cd-adtest').onclick = function () {
      // Chama o rewarded do CiDi DIRETO p/ capturar o codigo de erro exato (doc: AD_NOT_CERTIFIED,
      // AD_NOT_AVAILABLE, PI_ADS_NOT_AVAILABLE, USER_UNAUTHENTICATED, TIMEOUT, etc).
      if (!(window.CiDiSDK && typeof CiDiSDK.showRewardedAd === 'function')) { push('bad', 'ad test: CiDiSDK.showRewardedAd ABSENT'); return; }
      push('evt', 'CiDiSDK.showRewardedAd({timeout:300000}) ...');
      try {
        CiDiSDK.showRewardedAd({ timeout: 300000 })
          .then(function (r) {
            var ok = !!(r && r.success === true);
            push(ok ? 'ok' : 'bad', 'ad -> success=' + (r && r.success) + ' ' + safe(r));
          })
          .catch(function (err) {
            push('bad', 'ad FAILED -> error=' + (err && (err.error || err.code)) + ' | msg=' + (err && err.message) + ' | ' + safe(err));
          });
      } catch (e) { push('bad', 'ad threw: ' + (e && e.message)); }
    };
  }

  // captura console [CiDi-*]
  ['log', 'warn', 'error'].forEach(function (m) {
    var orig = console[m] ? console[m].bind(console) : function () {};
    console[m] = function () {
      try {
        var s = Array.prototype.slice.call(arguments).map(function (x) { return typeof x === 'string' ? x : safe(x); }).join(' ');
        if (/\[CiDi-(Persist|Storage|Login|Ad|Report)\]/.test(s)) {
          var kind = /PERSISTED|OK|resolved: true| YES|restored|saved -> |FLUSH/.test(s) ? 'ok'
                   : /did NOT|FAILED|failed|error|bad/.test(s) ? 'bad' : 'evt';
          push(kind, s.replace(/%c/g, '').replace(/color:[^;]+;?(font-weight:bold)?/g, '').trim());
        }
      } catch (e) {}
      return orig.apply(null, arguments);
    };
  });

  // envolve report.* + auth.login (loga chamada/retorno)
  var wrapped = false;
  function wrap(o, n, label) {
    if (!o || typeof o[n] !== 'function' || o['__cd_' + n]) return;
    var orig = o[n].bind(o); o['__cd_' + n] = true;
    o[n] = function () {
      var args = [].slice.call(arguments);
      push('evt', label + '(' + args.map(safe).join(', ') + ')');
      return Promise.resolve(orig.apply(null, args)).then(function (r) { push('ok', label + ' -> ' + safe(r)); return r; },
        function (e) { push('bad', label + ' FAILED -> ' + (e && (e.code || e.error)) + ' ' + (e && e.message)); throw e; });
    };
  }
  function tryWrap() {
    var c = window.__cidiClient; if (!c || wrapped) return;
    if (c.auth) wrap(c.auth, 'login', 'auth.login');
    if (c.report) { ['medal', 'medalOwnership', 'gameTask', 'gameTaskResult', 'tournamentScore'].forEach(function (n) { wrap(c.report, n, 'report.' + n); }); }
    wrapped = true; push('info', 'debug ready - watching persistence + CiDi reports');
  }

  build();
  // drena os logs capturados antes do painel existir (boot/mirror)
  try {
    (window.__cidiEarlyLogs || []).forEach(function (s) {
      var kind = /PERSISTED|OK|resolved: true|restored|saved -> |WRITTEN/.test(s) ? 'ok'
               : /did NOT|FAILED|MISSING|failed|error/.test(s) ? 'bad' : 'evt';
      push(kind, s);
    });
    window.__cidiEarlyLogs = { push: function (s) { var k = /saved -> |WRITTEN|PERSISTED/.test(s) ? 'ok' : /MISSING|FAILED|did NOT/.test(s) ? 'bad' : 'evt'; push(k, s); } };
  } catch (e) {}
  setInterval(function () { if (g()) { build(); tryWrap(); if (open) renderStatus(); } }, 1000);
  console.log('%c[CiDi-Debug]', 'color:#3fd0ff', 'Bus Jam-style status+log panel ready.');
})();
