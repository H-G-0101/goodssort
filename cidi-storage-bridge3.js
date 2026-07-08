/*
 * cidi-storage-bridge.js  -  persistencia robusta CiDi (Storage SDK) - iOS/Pi Browser.  [v3]
 *
 * A CiDi reportou reset no iOS mesmo apos v2. Isso indica que o save NAO persiste (nao e so
 * timing de leitura). Duas causas possiveis: (a) CiDiSDK.init() nao resolve no iOS -> localStorage
 * fica efemero; (b) os writes do jogo nao chegam ao store persistente.
 *
 * v3 faz:
 *  - AUTO-TESTE de persistencia: loga se um valor gravado numa sessao anterior sobreviveu
 *    (prova, no aparelho, se o localStorage persiste apos relaunch).
 *  - MIRROR proprio: pos-init, grava game.data no localStorage por conta propria (a cada save
 *    e periodicamente) - nao depende do timing/alias interno do jogo.
 *  - RESTORE pos-init (game.data = save do disco se tiver mais progresso).
 *  - ANTI-CLOBBER (nao deixa defaults sobrescreverem real; nao briga com reset intencional).
 */
(function () {
  var SAVE_KEY = 'grocery-store_sgk';
  var PROBE_KEY = '__cidi_persist_probe';
  var PERSISTED = null, restored = false, sawReal = false, initDone = false;

  function g() { return window.__game; }
  function findKey() {
    try {
      if (localStorage.getItem(SAVE_KEY) != null) return SAVE_KEY;
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.slice(-4) === '_sgk') return k; }
    } catch (e) {}
    return SAVE_KEY;
  }
  function readSaved() { try { var r = localStorage.getItem(findKey()); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function writeSave(d) { try { localStorage.setItem(findKey(), JSON.stringify(d)); return true; } catch (e) { return false; } }
  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }
  function prog(o) {
    if (!o) return -1; var s = o.stats || o; if (!s) return -1;
    return (s.currentCommonLevel || 0) + (s.currentRelaxLevel || 0) + (s.coins || 0) / 10 + (s.score || 0) / 100
      + ((s.productsOpened || []).length) + ((s.backgroundsOpened || []).length) + ((s.shelfsOpened || []).length)
      + (s.hintCount || 0) + (s.freezeCount || 0) + (s.mixCount || 0) + (s.lastRewardDate ? 1 : 0);
  }
  function isFresh(o) {
    if (!o || !o.stats) return true; var s = o.stats;
    return (s.currentCommonLevel || 1) <= 1 && (s.currentRelaxLevel || 1) <= 1 && !(s.coins > 0) && !(s.score > 0);
  }
  function best() { var d = readSaved(); return (prog(PERSISTED) >= prog(d)) ? PERSISTED : d; }
  function refresh() {
    try {
      var gm = g(); if (!gm || !gm.scene || !gm.scene.scenes) return;
      gm.scene.scenes.forEach(function (sc) {
        try { if (sc.sys && sc.sys.isActive && sc.sys.isActive()) {
          if (typeof sc.updateInfo === 'function') sc.updateInfo();
          if (sc.LevelManager && typeof sc.LevelManager.updateBoosters === 'function') sc.LevelManager.updateBoosters();
        } } catch (e) {}
      });
    } catch (e) {}
  }

  // AUTO-TESTE: prova se localStorage persiste no aparelho
  function persistProbe() {
    try {
      var prev = localStorage.getItem(PROBE_KEY);
      if (prev) console.log('%c[CiDi-Persist] localStorage PERSISTED (previous probe found: ' + prev + ')', 'color:#2bb583;font-weight:bold');
      else console.warn('[CiDi-Persist] NO previous probe -> localStorage did NOT persist (or first run).');
      localStorage.setItem(PROBE_KEY, new Date().toISOString());
      var chk = localStorage.getItem(PROBE_KEY);
      console.log('[CiDi-Persist] immediate write/read: ' + (chk ? 'OK' : 'FAILED') + ' | save key: ' + findKey() + ' | save exists? ' + (readSaved() ? 'YES' : 'no'));
    } catch (e) { console.warn('[CiDi-Persist] probe error', e); }
  }

  function restore() {
    if (restored) return;
    var gm = g(); if (!gm || !gm.data || !gm.data.stats) return;
    if (!isFresh(gm.data)) { sawReal = true; return; }
    var b = best();
    if (b && prog(b) > prog(gm.data)) {
      gm.data = b; restored = true; sawReal = true; PERSISTED = clone(b);
      writeSave(b); refresh();
      console.log('[CiDi-Storage] progress restored after init.');
    }
  }
  // MIRROR: grava o estado atual no store persistente (pos-init, so se ha dado real)
  function mirror() {
    if (!initDone) return;
    var gm = g(); if (!gm || !gm.data || !gm.data.stats) return;
    if (isFresh(gm.data)) return;           // nunca espelha defaults por cima
    sawReal = true;
    if (writeSave(gm.data)) PERSISTED = clone(gm.data);
  }

  function hookSave() {
    var gm = g();
    if (!gm || gm.__ccSaveHook || typeof gm.saveUserData !== 'function') return;
    var orig = gm.saveUserData.bind(gm); gm.__ccSaveHook = true;
    gm.saveUserData = function () {
      try {
        if (!isFresh(gm.data)) sawReal = true;
        var b = best();
        if (!sawReal && isFresh(gm.data) && b && prog(b) > prog(gm.data)) {   // clobber de boot iOS
          gm.data = b; restored = true; sawReal = true; PERSISTED = clone(b);
          writeSave(b); refresh();
          console.log('[CiDi-Storage] boot clobber prevented (real save kept).');
          return;
        }
      } catch (e) {}
      var r = orig.apply(null, arguments);
      try { if (initDone && !isFresh(gm.data)) { writeSave(gm.data); PERSISTED = clone(gm.data); } } catch (e) {}
      return r;
    };
  }

  // hook cedo (independe do init)
  var h = setInterval(function () { hookSave(); if (g() && g().__ccSaveHook) clearInterval(h); }, 50);
  setTimeout(function () { clearInterval(h); }, 20000);

  (window.__cidiReady || Promise.resolve(false)).then(function (ok) {
    initDone = true;
    console.log('[CiDi-Persist] init resolved: ' + ok);
    persistProbe();                          // <<< prova de persistencia no aparelho
    PERSISTED = readSaved();
    var t = 0, iv = setInterval(function () { t += 100; hookSave(); restore(); if (restored || t > 15000) clearInterval(iv); }, 100);
    setInterval(mirror, 1500);               // espelha a cada 1.5s (pos-init)

    // FLUSH IMEDIATO ao sair/minimizar/fechar: garante que a ULTIMA acao (fase concluida etc)
    // seja persistida antes do Pi Browser fechar. Resolve "voltou pra fase anterior".
    function flush() {
      try {
        var gm = g();
        if (initDone && gm && gm.data && !isFresh(gm.data)) { sawReal = true; writeSave(gm.data); PERSISTED = clone(gm.data); }
      } catch (e) {}
    }
    ['pagehide', 'beforeunload', 'blur', 'freeze'].forEach(function (ev) {
      try { window.addEventListener(ev, flush, { capture: true }); } catch (e) {}
    });
    try { document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); }, { capture: true }); } catch (e) {}
  });

  console.log('%c[CiDi-Storage]', 'color:#2bb583', 'persistence v3 (probe + mirror + restore + anti-clobber).');
})();
