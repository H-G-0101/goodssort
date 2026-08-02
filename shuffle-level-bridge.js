/*
 * shuffle-level-bridge.js - embaralha o nivel a cada tentativa, SEM quebrar a solucao.
 *
 * Por que existe: o jogo so troca a ordem dos produtos DENTRO de cada prateleira
 * (os 3 slots), entao ao perder/reiniciar os mesmos produtos ficam nas mesmas
 * prateleiras e o jogador decora o layout.
 *
 * ATENCAO (bug corrigido - nivel 62): varios niveis nascem com prateleiras TRANCADAS
 * (chainsArray; chainNumber = quantas trincas para destravar). O design original
 * garante que, entre as prateleiras JA destrancadas, exista uma trinca de abertura.
 * A versao anterior embaralhava as texturas entre TODAS as prateleiras por camada,
 * ignorando os cadeados -> as acessiveis ficavam com itens unicos e o nivel travava
 * (23 dos 120 niveis quebravam).
 *
 * Regra atual:
 *   1) cada prateleira recebe um ESTAGIO: 0 = destrancada, senao o chainNumber;
 *   2) as texturas so sao permutadas dentro do mesmo (estagio, camada) -> o conjunto
 *      de produtos disponivel em cada etapa do nivel e identico ao original;
 *   3) valida se existe trinca na camada da frente das prateleiras destrancadas;
 *      tenta ate 20x e, se nao conseguir, RESTAURA o layout original (fail-safe).
 * Nivel 1 (tutorial) nunca e embaralhado. Niveis pos-120 sao procedurais e nao entram.
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

  function r3(n) { return Math.round(n * 1000) / 1000; }

  // estagio de cada prateleira: 0 = destrancada desde o inicio
  function stageMap(cfg) {
    var chains = {};
    (cfg.chainsArray || []).forEach(function (ch) {
      chains[r3(ch.x) + '|' + r3(ch.y)] = ch.chainNumber || 1;
    });
    return cfg.shelfArray.map(function (s) {
      return chains[r3(s.x) + '|' + r3(s.y)] || 0;
    });
  }

  // existe trinca na camada da frente das prateleiras destrancadas?
  function firstMoveOk(cfg, stages) {
    var cnt = {};
    cfg.shelfArray.forEach(function (s, i) {
      if (stages[i] !== 0) return;
      var tiles = s.tilesArray || [];
      if (!tiles.length) return;
      var lmin = tiles[0].layer || 0;
      tiles.forEach(function (t) { if ((t.layer || 0) < lmin) lmin = t.layer || 0; });
      tiles.forEach(function (t) {
        if ((t.layer || 0) !== lmin) return;
        cnt[t.texture] = (cnt[t.texture] || 0) + 1;
      });
    });
    for (var k in cnt) { if (cnt[k] >= 3) return true; }
    return false;
  }

  function shuffleLevel(lvl) {
    try {
      if (!lvl || lvl <= 1) return;
      var cfgs = findConfigs(); if (!cfgs) return;
      var cfg = cfgs[String(lvl)]; if (!cfg || !cfg.shelfArray) return;

      var stages = stageMap(cfg);
      // guarda o layout original (uma vez) para poder reverter
      var backup = cfg.shelfArray.map(function (s) {
        return (s.tilesArray || []).map(function (t) { return t.texture; });
      });

      for (var attempt = 1; attempt <= 20; attempt++) {
        var groups = {};
        cfg.shelfArray.forEach(function (s, i) {
          (s.tilesArray || []).forEach(function (t) {
            var key = stages[i] + ':' + (t.layer || 0);
            (groups[key] = groups[key] || []).push(t);
          });
        });
        Object.keys(groups).forEach(function (k) {
          var refs = groups[k];
          var tex = shuffleArray(refs.map(function (t) { return t.texture; }));
          refs.forEach(function (t, i) { t.texture = tex[i]; });
        });
        if (firstMoveOk(cfg, stages)) {
          console.log('[SHUFFLE-LEVEL] nivel ' + lvl + ' embaralhado (tentativa ' + attempt + ')');
          return;
        }
      }
      // fail-safe: nao conseguiu layout valido -> volta ao original
      cfg.shelfArray.forEach(function (s, i) {
        (s.tilesArray || []).forEach(function (t, j) { t.texture = backup[i][j]; });
      });
      console.warn('[SHUFFLE-LEVEL] nivel ' + lvl + ': layout original restaurado (fail-safe)');
    } catch (e) { console.warn('[SHUFFLE-LEVEL]', e); }
  }

  function currentLevel() {
    try { return g().data.stats.currentCommonLevel || 0; } catch (e) { return 0; }
  }

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
      if (key === 'Level') shuffleLevel(currentLevel());
      return origStart.call(this, key, data);
    };
    if (typeof proto.restart === 'function') {
      var origRestart = proto.restart;
      proto.restart = function (data) {
        try {
          if (this.scene && this.scene.sys && this.scene.sys.settings &&
              this.scene.sys.settings.key === 'Level') shuffleLevel(currentLevel());
        } catch (e) {}
        return origRestart.call(this, data);
      };
    }
    console.log('[SHUFFLE-LEVEL] ativo (respeita cadeados + valida jogada inicial).');
  }, 30);
  setTimeout(function () { clearInterval(iv); }, 20000);
})();
