/*
 * cidi-debug-bridge.js  -  painel DEBUG dos SDKs CiDi (so na HOME/cena Menu).
 * Mostra status ao vivo: Storage(init), Login, Ad, Task, Tournament, Medal + flags locais.
 * Botoes de teste executam chamadas REAIS (ad conta como ad; task/tournament reportam mesmo).
 * Para remover na versao final: apague este arquivo e a linha dele no index.html.
 */
(function () {
  var FLAGS_KEY = 'grocery-store_cidi', SAVE_KEY = 'grocery-store_sgk', MEDAL_LEVEL = 100;
  var btn = null, panel = null, open = false, readyState = 'pendente';

  // registra resultado do init (promise exposta no <head>)
  try { (window.__cidiReady || Promise.resolve(false)).then(function (ok) { readyState = ok ? 'OK' : 'falhou/ausente'; }); } catch (e) {}

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function onHome() { try { return g().scene.isActive('Menu'); } catch (e) { return false; } }
  function levelsDone() { var s = stats(); if (!s) return 0;
    return Math.max(0, (s.currentCommonLevel || 1) - 1) + Math.max(0, (s.currentRelaxLevel || 1) - 1); }
  function flags() { try { return JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}'); } catch (e) { return {}; } }
  function dot(ok) { // verde / vermelho / amarelo(null=parcial)
    var c = ok === true ? '#3ddc84' : ok === false ? '#ff5a4e' : '#ffc93d';
    return '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:' + c + ';margin-right:8px;flex:0 0 auto;"></span>';
  }
  function esc(s) { return String(s).replace(/</g, '&lt;'); }
  function logln(msg, ok) {
    var el = panel && panel.querySelector('#cdbg-log'); if (!el) return;
    var t = new Date().toTimeString().slice(0, 8);
    el.innerHTML = '<div style="color:' + (ok === false ? '#ff8d84' : ok === true ? '#7ee2a8' : '#ddd') + '">[' + t + '] ' + esc(msg) + '</div>' + el.innerHTML;
  }

  function rows() {
    var s = stats(), f = flags();
    var hasSDK = !!(window.CiDiSDK && typeof CiDiSDK.showRewardedAd === 'function');
    var hasProxy = (typeof window.CidiProxySDK !== 'undefined');
    var cli = !!window.__cidiClient;
    var logged = window.__cidiLoggedIn === true;
    var lv = levelsDone();
    function row(ok, name, detail, btnId, btnTxt) {
      return '<div style="display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.08);">' +
        dot(ok) + '<div style="flex:1;min-width:0;"><b>' + name + '</b>' +
        '<div style="font-size:11px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + detail + '</div></div>' +
        (btnId ? '<button id="' + btnId + '" style="flex:0 0 auto;padding:6px 10px;border-radius:10px;border:1px solid #7d5fe2;background:#4a3f6e;color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">' + btnTxt + '</button>' : '') +
        '</div>';
    }
    return row(readyState === 'OK' ? true : (readyState === 'pendente' ? null : false),
               'Storage (init)', 'CiDiSDK: ' + (window.CiDiSDK ? 'carregado' : 'AUSENTE') + ' &middot; init: ' + readyState, 'cdbg-t-sto', 'testar') +
           row(cli && logged ? true : (cli ? null : false),
               'Login', 'proxy: ' + (hasProxy ? 'ok' : 'AUSENTE') + ' &middot; client: ' + (cli ? 'ok' : 'nao') + ' &middot; logado: ' + (logged ? 'SIM' : 'nao'), 'cdbg-t-log', 'login') +
           row(hasSDK ? true : false,
               'Ad (rewarded)', 'funil: ' + (typeof window.__cidiAdShow === 'function' ? 'ok' : 'AUSENTE') + ' &middot; CiDiSDK.showRewardedAd: ' + (hasSDK ? 'ok' : 'nao'), 'cdbg-t-ad', 'testar ad') +
           row(cli ? (f.taskDate ? true : null) : false,
               'Task (diaria)', 'reportada hoje: ' + (f.taskDate || 'nao') + (f.taskPending ? ' &middot; PENDENTE ' + f.taskPending : ''), 'cdbg-t-task', 'checar') +
           row(cli ? ((f.tournPending || 0) > 0 ? null : true) : false,
               'Tournament', 'score atual: ' + (s ? (s.score || 0) : '?') + ' &middot; pendente: ' + (f.tournPending || 0), 'cdbg-t-tour', 'reportar') +
           row(cli ? (f.medalClaimed ? true : null) : false,
               'Medal', 'niveis: ' + lv + '/' + MEDAL_LEVEL + ' &middot; claim local: ' + (f.medalClaimed ? 'SIM' : 'nao'), 'cdbg-t-med', 'ownership');
  }

  function build() {
    if (btn) return;
    btn = document.createElement('button');
    btn.textContent = 'SDK';
    btn.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:70000;display:none;width:52px;height:34px;' +
      'border-radius:10px;border:2px solid #7d5fe2;background:rgba(40,32,70,0.92);color:#cfc3ff;' +
      'font-family:"Baloo 2",monospace;font-weight:800;font-size:13px;letter-spacing:1px;cursor:pointer;';
    btn.onclick = function () { open = !open; panel.style.display = open ? 'block' : 'none'; if (open) refresh(); };
    document.body.appendChild(btn);

    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;left:10px;bottom:52px;z-index:70000;display:none;width:320px;max-width:92vw;' +
      'max-height:70vh;overflow:auto;padding:12px 14px;border-radius:14px;border:2px solid #7d5fe2;' +
      'background:rgba(24,19,44,0.96);color:#eee;font-family:"Baloo 2",system-ui,sans-serif;font-size:13px;';
    document.body.appendChild(panel);
  }

  function refresh() {
    if (!panel) return;
    var old = panel.querySelector('#cdbg-log');
    var oldLog = old ? old.innerHTML : '';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
        '<b style="font-size:15px;color:#cfc3ff;">CiDi SDKs - debug</b>' +
        '<button id="cdbg-x" style="border:none;background:none;color:#fff;font-size:18px;cursor:pointer;font-weight:800;">&times;</button></div>' +
      rows() +
      '<div style="margin-top:8px;font-size:11px;opacity:.7;">log key: ' + FLAGS_KEY + ' &middot; save: ' + SAVE_KEY + '</div>' +
      '<div id="cdbg-log" style="margin-top:6px;max-height:130px;overflow:auto;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.3);border-radius:8px;padding:6px;">' + oldLog + '</div>';
    panel.querySelector('#cdbg-x').onclick = function () { open = false; panel.style.display = 'none'; };
    bindTests();
  }

  function bindTests() {
    var cli = window.__cidiClient;
    function bind(id, fn) { var b = panel.querySelector('#' + id); if (b) b.onclick = fn; }
    bind('cdbg-t-sto', function () {   // roundtrip de localStorage
      try { var k = '__cidi_dbg', v = String(Date.now());
        localStorage.setItem(k, v); var r = localStorage.getItem(k); localStorage.removeItem(k);
        logln('storage roundtrip: ' + (r === v ? 'OK' : 'FALHOU'), r === v);
      } catch (e) { logln('storage erro: ' + e.message, false); }
    });
    bind('cdbg-t-log', function () {
      if (!cli) { logln('sem client (proxy nao carregou?)', false); return; }
      logln('login()...');
      cli.auth.login().then(function () { window.__cidiLoggedIn = true; logln('login OK', true); refresh(); })
        .catch(function (e) { logln('login falhou: ' + (e && e.code) + ' ' + (e && e.message), false); });
    });
    bind('cdbg-t-ad', function () {
      var fn = window.__cidiAdShow; if (!fn) { logln('funil de ad ausente', false); return; }
      logln('showRewardedAd()...');
      fn().then(function (ok) { logln('ad resultado: ' + ok, ok); });
    });
    bind('cdbg-t-task', function () {
      if (!cli) { logln('sem client', false); return; }
      var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
      var bd = '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
      logln('gameTaskResult(' + bd + ')...');
      cli.report.gameTaskResult({ bizDate: bd })
        .then(function (r) { logln('task hoje: ' + JSON.stringify(r), true); })
        .catch(function (e) { logln('taskResult falhou: ' + (e && e.code) + ' ' + (e && e.message), false); });
    });
    bind('cdbg-t-tour', function () {
      if (!cli) { logln('sem client', false); return; }
      var s = stats(); var sc = s ? (s.score || 0) : 0;
      logln('tournamentScore(' + sc + ')...');
      cli.report.tournamentScore({ score: String(sc), reportedAt: Math.floor(Date.now() / 1000) })
        .then(function (r) { logln('tournament: ' + r, r === true); })
        .catch(function (e) { logln('tournament falhou: ' + (e && e.code) + ' ' + (e && e.message), false); });
    });
    bind('cdbg-t-med', function () {
      if (!cli) { logln('sem client', false); return; }
      logln('medalOwnership()...');
      cli.report.medalOwnership()
        .then(function (r) { logln('medal: ' + JSON.stringify(r), true); })
        .catch(function (e) { logln('medal falhou: ' + (e && e.code) + ' ' + (e && e.message), false); });
    });
  }

  setInterval(function () {
    if (!g()) return;
    build();
    var home = onHome();
    btn.style.display = home ? 'block' : 'none';
    if (!home && open) { open = false; panel.style.display = 'none'; }
    if (open) refresh();
  }, 1000);

  console.log('%c[CiDi-Debug]', 'color:#ffc93d', 'painel SDK ativo (botao na home).');
})();
