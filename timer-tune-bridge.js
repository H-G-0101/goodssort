/*
 * timer-tune-bridge.js - ajuste de dificuldade do TEMPO.
 *
 * O bundle calcula o tempo inicial como clamp(60s, 300s, tileCount*2.5).
 * Como o tempo nasce do numero de pecas, nivel maior ganha tempo proporcional e a
 * pressao do relogio nunca sobe sozinha (fica ~1,95s por peca da fase 16 a 120).
 * Por isso cortamos o tempo inicial em DEGRAUS:
 *   fases  1-14 : sem corte (aprendizado)
 *   fases 15-24 : -50s
 *   fases 25-35 : -70s
 *   fases 36+   : -90s   (ainda estava facil sem booster; -20s extras da fase 25 p/ cima)
 * Piso de seguranca de 45s. Aplica uma vez por timer criado (start/restart recriam).
 */
(function () {
  // degraus de corte: {a partir da fase, segundos a cortar} - do maior para o menor
  var TIERS = [ { from: 36, cut: 90 }, { from: 25, cut: 70 }, { from: 15, cut: 50 } ];
  var FLOOR = 45;
  function cutFor(lvl) {
    for (var i = 0; i < TIERS.length; i++) { if (lvl >= TIERS[i].from) return TIERS[i].cut; }
    return 0;
  }
  function g() { return window.__game; }
  setInterval(function () {
    try {
      var gm = g(); if (!gm || !gm.scene) return;
      ['Level', 'LevelTutorial'].forEach(function (n) {
        if (!gm.scene.isActive(n)) return;
        var sc = gm.scene.getScene(n);
        var LM = sc && sc.LevelManager;
        var timer = LM && LM.timer;
        if (!timer || timer.__tuned) return;
        timer.__tuned = 1;
        var lvl = 0;
        try { lvl = gm.data.stats.currentCommonLevel || 0; } catch (e) {}
        var cut = cutFor(lvl);
        if (cut > 0 && typeof timer.timeLeft === 'number') {
          var before = timer.timeLeft;
          timer.timeLeft = Math.max(FLOOR, timer.timeLeft - cut);
          console.log('[TIMER-TUNE] fase ' + lvl + ': ' + before + 's -> ' + timer.timeLeft + 's (-' + (before - timer.timeLeft) + ')');
        }
      });
    } catch (e) {}
  }, 200);

  /* ---------- ALERTA VISUAL: o WIDGET do timer pisca em vermelho aos 15s finais ----------
     Robusto contra ofuscacao: varre TODAS as props do timer e coleta qualquer objeto
     tingivel (setTint) ou texto (setColor), incluindo filhos de containers (.list). */
  var WARN_AT = 15, TINT = 0xff3b30, TXT_RED = '#ff3b30';
  var blinkPhase = false;

  function collect(t) {
    var sprites = [], texts = [];
    function grab(o) {
      if (!o || typeof o !== 'object') return;
      if (typeof o.setColor === 'function' && o.style) { if (texts.indexOf(o) < 0) texts.push(o); return; }
      if (typeof o.setTint === 'function') { if (sprites.indexOf(o) < 0) sprites.push(o); }
      if (o.list && o.list.length) o.list.forEach(grab);       // containers
    }
    try { Object.keys(t).forEach(function (k) { grab(t[k]); }); } catch (e) {}
    return { sprites: sprites, texts: texts };
  }

  function applyBlink(t, on) {
    var p = t.__parts || (t.__parts = collect(t));
    var red = on && blinkPhase;
    p.sprites.forEach(function (o) {
      try { red ? o.setTint(TINT) : o.clearTint(); } catch (e) {}
    });
    p.texts.forEach(function (o) {
      try {
        if (o.__origColor === undefined) o.__origColor = (o.style && o.style.color) || '#4a4060';
        o.setColor(red ? TXT_RED : o.__origColor);
      } catch (e) {}
    });
  }

  function scenePaused(gm, n) {
    try { if (typeof gm.scene.isPaused === 'function') return gm.scene.isPaused(n); } catch (e) {}
    try { var sc = gm.scene.getScene(n); return !!(sc && sc.sys && sc.sys.isPaused && sc.sys.isPaused()); } catch (e) {}
    return false;
  }

  setInterval(function () {
    try {
      var gm = g();
      if (!gm || !gm.scene) return;
      blinkPhase = !blinkPhase;
      ['Level', 'LevelTutorial'].forEach(function (n) {
        var sc;
        try { if (!gm.scene.isActive(n)) return; sc = gm.scene.getScene(n); } catch (e) { return; }
        var t = sc && sc.LevelManager && sc.LevelManager.timer;
        if (!t) return;
        var on = !scenePaused(gm, n) &&
                 typeof t.timeLeft === 'number' && t.timeLeft > 0 && t.timeLeft <= WARN_AT;
        applyBlink(t, on);
      });
    } catch (e) {}
  }, 400);
  console.log('[TIMER-TUNE] ativo (degraus: -50s da fase 15, -70s da 25, -90s da 36).');
})();
