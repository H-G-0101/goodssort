/*
 * cidi-console-bridge.js  -  CONSOLE visivel na tela dos reports do SDK CiDi.
 * Faz "wrap" em client.auth.login e client.report.* (medal, medalOwnership, gameTask,
 * gameTaskResult, tournamentScore) e loga: chamada + argumentos + retorno/erro.
 * Assim da pra ver EXATAMENTE o que sai e o que o servidor responde, sem vConsole.
 * Botao "LOG" fixo (canto inf. direito). Para remover: apague o arquivo + a linha no index.
 */
(function () {
  var lines = [], MAX = 200, wrapped = false, panel = null, btn = null, open = false;

  function ts() { return new Date().toTimeString().slice(0, 8); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }
  function push(kind, msg) {
    lines.unshift({ k: kind, t: ts(), m: msg });
    if (lines.length > MAX) lines.pop();
    render();
    try { console.log('[CiDi-Console]', kind, msg); } catch (e) {}
  }
  function safe(v) { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return '' + v; } }

  function build() {
    if (btn) return;
    btn = document.createElement('button');
    btn.textContent = 'LOG';
    btn.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:80000;width:56px;height:34px;border-radius:10px;' +
      'border:2px solid #fa4488;background:rgba(40,20,40,0.92);color:#ffd0e4;font-family:monospace;font-weight:800;font-size:13px;cursor:pointer;';
    btn.onclick = function () { open = !open; panel.style.display = open ? 'flex' : 'none'; };
    document.body.appendChild(btn);

    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:8px;bottom:52px;z-index:80000;display:none;flex-direction:column;width:360px;max-width:94vw;' +
      'height:60vh;background:rgba(16,12,22,0.97);border:2px solid #fa4488;border-radius:12px;overflow:hidden;' +
      'font-family:monospace;font-size:11px;color:#eee;';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(250,68,136,0.15);">' +
        '<b style="color:#ff9ec4;">CiDi report console</b>' +
        '<span><button id="cc-clear" style="margin-right:6px;border:1px solid #fa4488;background:none;color:#ff9ec4;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:monospace;">limpar</button>' +
        '<button id="cc-copy" style="margin-right:6px;border:1px solid #fa4488;background:none;color:#ff9ec4;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:monospace;">copiar</button>' +
        '<button id="cc-x" style="border:none;background:none;color:#fff;font-size:16px;cursor:pointer;">&times;</button></span>' +
      '</div>' +
      '<div id="cc-body" style="flex:1;overflow:auto;padding:8px 10px;line-height:1.5;"></div>';
    document.body.appendChild(panel);
    panel.querySelector('#cc-x').onclick = function () { open = false; panel.style.display = 'none'; };
    panel.querySelector('#cc-clear').onclick = function () { lines = []; render(); };
    panel.querySelector('#cc-copy').onclick = function () {
      var txt = lines.slice().reverse().map(function (l) { return '[' + l.t + '] ' + l.m; }).join('\n');
      try { navigator.clipboard.writeText(txt); push('info', 'log copiado.'); } catch (e) { push('erro', 'copiar falhou'); }
    };
  }
  function render() {
    if (!panel) return;
    var body = panel.querySelector('#cc-body'); if (!body) return;
    body.innerHTML = lines.map(function (l) {
      var col = l.k === 'ok' ? '#7ee2a8' : l.k === 'erro' ? '#ff8d84' : l.k === 'call' ? '#ffd479' : '#9ecbff';
      return '<div style="color:' + col + ';border-bottom:1px solid rgba(255,255,255,0.06);padding:2px 0;">[' + l.t + '] ' + esc(l.m) + '</div>';
    }).join('');
  }

  // envolve um metodo async, logando args e retorno/erro
  function wrap(obj, name, label) {
    if (!obj || typeof obj[name] !== 'function' || obj['__cc_' + name]) return;
    var orig = obj[name].bind(obj);
    obj['__cc_' + name] = true;
    obj[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      push('call', label + '(' + args.map(safe).join(', ') + ')');
      var p;
      try { p = orig.apply(null, args); } catch (e) { push('erro', label + ' throw: ' + (e && e.message)); throw e; }
      return Promise.resolve(p).then(function (r) {
        push('ok', label + ' -> ' + safe(r));
        return r;
      }, function (err) {
        push('erro', label + ' FALHOU -> code=' + (err && (err.code || err.error)) + ' msg=' + (err && err.message) + ' ' + safe(err));
        throw err;
      });
    };
  }

  function tryWrap() {
    var c = window.__cidiClient;
    if (!c || wrapped) return;
    if (c.auth) wrap(c.auth, 'login', 'auth.login');
    if (c.report) {
      wrap(c.report, 'medal', 'report.medal');
      wrap(c.report, 'medalOwnership', 'report.medalOwnership');
      wrap(c.report, 'gameTask', 'report.gameTask');
      wrap(c.report, 'gameTaskResult', 'report.gameTaskResult');
      wrap(c.report, 'tournamentScore', 'report.tournamentScore');
    }
    wrapped = true;
    push('info', 'console ligado - interceptando client.report.* e auth.login');
  }

  // espelha logs de persistencia/storage na tela (diagnostico iOS)
  (function hookConsole() {
    ['log', 'warn', 'error'].forEach(function (m) {
      var orig = console[m] ? console[m].bind(console) : function () {};
      console[m] = function () {
        try {
          var a = Array.prototype.slice.call(arguments);
          var s = a.map(function (x) { return typeof x === 'string' ? x : safe(x); }).join(' ');
          if (/\[CiDi-(Persist|Storage|Login|Ad)\]/.test(s)) {
            var kind = /PERSISTIU|OK|resolvido: true|restaurado/.test(s) ? 'ok'
                     : /NAO|FALHOU|falhou|erro/.test(s) ? 'erro' : 'info';
            push(kind, s.replace(/%c/g, '').replace(/color:[^;]+;?(font-weight:bold)?/g, '').trim());
          }
        } catch (e) {}
        return orig.apply(null, arguments);
      };
    });
  })();

  build();
  var iv = setInterval(function () { tryWrap(); if (wrapped) clearInterval(iv); }, 200);
  setTimeout(function () { clearInterval(iv); }, 30000);

  // tambem loga o resultado do login automatico do boot
  try { (window.__cidiLogin || Promise.resolve(false)).then(function (ok) { push(ok ? 'ok' : 'erro', 'boot login resolvido: ' + ok); }); } catch (e) {}

  console.log('%c[CiDi-Console]', 'color:#fa4488', 'console de reports ativo (botao LOG).');
})();
