/*
 * cidi-storage-bridge.js  -  persistencia robusta CiDi (Storage SDK) - foco iOS/Pi Browser.  [v2]
 *
 * PROBLEMA (iOS): localStorage so persiste DEPOIS de CiDiSDK.init() resolver (doc CiDi).
 * O jogo le o save no BOOT; se isso acontece antes do init -> carrega DEFAULTS. E se ele
 * SALVAR esses defaults depois do init -> SOBRESCREVE o save real (clobber) e o progresso some.
 *
 * Esta ponte resolve com 3 camadas, sem tocar no bundle e sem injetar o game (tela branca):
 *  1) SNAPSHOT: assim que o init resolve, guarda o save real do disco (antes de qualquer clobber).
 *  2) RESTORE: quando o jogo existe e esta em estado "fresco" mas ha save com MAIS progresso,
 *     reaplica game.data = save (cenas leem game.data ao vivo) e re-persiste.
 *  3) ANTI-CLOBBER: embrulha game.saveUserData - se for salvar defaults por cima de um save real,
 *     restaura em vez de salvar. A cada save legitimo, atualiza o snapshot.
 *
 * Comparacao por "progresso" (nao depende de firstLoad, que no iOS pode nunca virar false).
 */
(function () {
  var SAVE_KEY = 'grocery-store_sgk';
  var PERSISTED = null;     // snapshot do save real
  var restored = false;
  var sawReal = false;      // true quando o jogo teve estado NAO-fresco nesta sessao (progresso ou restore)

  function g() { return window.__game; }

  function findKey() {
    try {
      if (localStorage.getItem(SAVE_KEY) != null) return SAVE_KEY;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.slice(-4) === '_sgk') return k;
      }
    } catch (e) {}
    return SAVE_KEY;
  }
  function readSaved() {
    try { var r = localStorage.getItem(findKey()); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function writeSave(data) {
    try { localStorage.setItem(findKey(), JSON.stringify(data)); } catch (e) {}
  }
  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; } }

  // "quanto progresso" um save representa (maior = mais avancado)
  function prog(o) {
    if (!o) return -1;
    var s = o.stats || o; if (!s) return -1;
    return (s.currentCommonLevel || 0) + (s.currentRelaxLevel || 0)
      + (s.coins || 0) / 10 + (s.score || 0) / 100
      + ((s.productsOpened || []).length) + ((s.backgroundsOpened || []).length) + ((s.shelfsOpened || []).length)
      + (s.hintCount || 0) + (s.freezeCount || 0) + (s.mixCount || 0)
      + (s.lastRewardDate ? 1 : 0);
  }
  // estado "fresco" (defaults do boot): nivel 1, sem moeda/score, firstLoad
  function isFresh(o) {
    if (!o || !o.stats) return true;
    var s = o.stats;
    return (s.currentCommonLevel || 1) <= 1 && (s.currentRelaxLevel || 1) <= 1
      && !(s.coins > 0) && !(s.score > 0);
  }
  function best() {
    var d = readSaved();
    return (prog(PERSISTED) >= prog(d)) ? PERSISTED : d;
  }

  function refresh() {
    try {
      var gm = g(); if (!gm || !gm.scene || !gm.scene.scenes) return;
      gm.scene.scenes.forEach(function (sc) {
        try {
          if (sc.sys && sc.sys.isActive && sc.sys.isActive()) {
            if (typeof sc.updateInfo === 'function') sc.updateInfo();
            if (sc.LevelManager && typeof sc.LevelManager.updateBoosters === 'function') sc.LevelManager.updateBoosters();
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  // (1)+(2) restaura o save real se o jogo bootou fresco
  function restore() {
    if (restored) return;
    var gm = g(); if (!gm || !gm.data || !gm.data.stats) return;
    if (!isFresh(gm.data)) { sawReal = true; return; }   // ja tem dado real, nada a restaurar
    var b = best();
    if (b && prog(b) > prog(gm.data)) {
      gm.data = b; restored = true; sawReal = true; PERSISTED = clone(b);
      writeSave(b);            // garante o real no store persistente (pos-init)
      refresh();
      console.log('[CiDi-Storage] progresso restaurado pos-init (iOS-safe).');
    }
  }

  // (3) anti-clobber: nao deixa defaults sobrescreverem save real
  function hookSave() {
    var gm = g();
    if (!gm || gm.__ccSaveHook || typeof gm.saveUserData !== 'function') return;
    var orig = gm.saveUserData.bind(gm);
    gm.__ccSaveHook = true;
    gm.saveUserData = function () {
      try {
        if (!isFresh(gm.data)) sawReal = true;      // jogo progrediu de verdade
        var b = best();
        // SO bloqueia o caso iOS-boot: nunca vimos dado real E ha save real no disco.
        // Se o jogador ja progrediu antes (sawReal) e agora esta fresco = RESET intencional -> deixa salvar.
        if (!sawReal && isFresh(gm.data) && b && prog(b) > prog(gm.data)) {
          gm.data = b; restored = true; sawReal = true; PERSISTED = clone(b);
          writeSave(b); refresh();
          console.log('[CiDi-Storage] clobber de boot evitado: save real preservado.');
          return;                       // NAO salva defaults por cima
        }
      } catch (e) {}
      var r = orig.apply(null, arguments);
      PERSISTED = clone(gm.data);        // snapshot do ultimo save legitimo
      return r;
    };
  }

  // instala hook o mais cedo possivel (independente do init)
  var h = setInterval(function () { hookSave(); if (g() && g().__ccSaveHook) clearInterval(h); }, 50);
  setTimeout(function () { clearInterval(h); }, 20000);

  // no init: snapshot do disco + restore em loop curto
  (window.__cidiReady || Promise.resolve(false)).then(function () {
    PERSISTED = readSaved();             // captura o save real logo apos o storage ficar pronto
    var t = 0, iv = setInterval(function () {
      t += 100; hookSave(); restore();
      if (restored || t > 15000) clearInterval(iv);
    }, 100);
  });

  console.log('%c[CiDi-Storage]', 'color:#2bb583', 'persistencia v2 (iOS-safe: snapshot+restore+anti-clobber).');
})();
