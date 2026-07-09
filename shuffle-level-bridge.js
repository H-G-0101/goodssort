/*
 * shuffle-level-bridge.js - embaralha DE VERDADE o nivel a cada tentativa.
 *
 * O jogo so embaralha a ordem dos produtos DENTRO de cada prateleira (os 3 slots),
 * entao ao perder/reiniciar os mesmos produtos estao nas mesmas prateleiras - o
 * jogador decora o layout. Aqui, a cada start/restart da cena Game, trocamos as
 * TEXTURAS entre prateleiras (dentro do mesmo layer), preservando:
 *   - a estrutura (mesmo nº de tiles por prateleira/layer, chains, posicoes);
 *   - as contagens por textura (multiplos de 3) -> o nivel continua soluvel.
 * Nivel 1 (tutorial) nao e embaralhado, seguindo a regra do proprio jogo.
 */
(function () {
  function g() { return window.__game; }

  function shuffleArray(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // localiza (uma vez) o dicionario de configs {'1':{...},...} no cache JSON do Phaser
  var configsRef = null;
  function findConfigs() {
    if (configsRef) return configsRef;
    try {
      var gm = g(); if (!gm || !gm.cache || !gm.cache.json) return null;
      var entries = gm.cache.json.entries;
      var keys = (entries && typeof entries.keys === 'function') ? entries.keys() : [];
      for (var i = 0; i < keys.length; i++) {
        var v = gm.cache.json.get(keys[i]);
        if (v && v['1'] && v['1'].shelfArray) { configsRef = v; return v; }
      }
    } catch (e) {}
    return null;
  }

  function shuffleLevel(lvl) {
    try {
      if (!lvl || lvl <= 1) return;                     // tutorial fica fixo
      var cfgs = findConfigs(); if (!cfgs) return;
      var cfg = cfgs[String(lvl)]; if (!cfg || !cfg.shelfArray) return; // pos-120 = procedural
      // agrupa por layer: refs de todos os tiles + lista de texturas
      var byLayer = {};
      cfg.shelfArray.forEach(function (shelf) {
        (shelf.tilesArray || []).forEach(function (tile) {
          var L = tile.layer || 0;
          (byLayer[L] = byLayer[L] || { refs: [], tex: [] });
          byLayer[L].refs.push(tile);
          byLayer[L].tex.push(tile.texture);
        });
      });
      Object.keys(byLayer).forEach(function (L) {
        var grp = byLayer[L];
        shuffleArray(grp.tex);
        grp.refs.forEach(function (tile, i) { tile.texture = grp.tex[i]; });
      });
      console.log('[SHUFFLE-LEVEL] nivel ' + lvl + ' re-embaralhado (' +
        Object.keys(byLayer).map(function (L) { return 'layer' + L + ':' + byLayer[L].refs.length; }).join(' ') + ')');
    } catch (e) { console.warn('[SHUFFLE-LEVEL]', e); }
  }

  function currentLevel() {
    try { return g().data.stats.currentCommonLevel || 0; } catch (e) { return 0; }
  }

  // intercepta start/restart da cena Game (mesmo padrao do redirect de MenuTutorial)
  var iv = setInterval(function () {
    var gm = g();
    if (!gm || !gm.scene || !gm.scene.scenes || !gm.scene.scenes.length) return;
    var anySc = gm.scene.scenes[0];
    var proto = anySc && anySc.scene && Object.getPrototypeOf(anySc.scene);
    if (!proto || proto.__shufflePatched) { if (proto) clearInterval(iv); return; }
    clearInterval(iv);
    proto.__shufflePatched = 1;

    var origStart = proto.start;
    proto.start = function (key, data) {
      if (key === 'Game') shuffleLevel(currentLevel());
      return origStart.call(this, key, data);
    };
    if (typeof proto.restart === 'function') {
      var origRestart = proto.restart;
      proto.restart = function (data) {
        try { if (this.scene && this.scene.sys && this.scene.sys.settings && this.scene.sys.settings.key === 'Game') shuffleLevel(currentLevel()); } catch (e) {}
        return origRestart.call(this, data);
      };
    }
    console.log('[SHUFFLE-LEVEL] ativo (re-embaralha a cada start/restart do nivel).');
  }, 30);
  setTimeout(function () { clearInterval(iv); }, 20000);
})();
