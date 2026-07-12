/*
 * timer-tune-bridge.js - ajuste de dificuldade do TEMPO.
 *
 * O bundle calcula o tempo inicial como clamp(60s, 300s, tileCount*2.5).
 * A pedido: a partir da FASE 15, reduzimos 30s do tempo inicial (o jogador
 * estava vencendo folgado sem usar boosters). Piso de seguranca de 45s.
 * Aplica uma vez por timer criado (start e restart recriam o timer -> reaplica).
 */
(function () {
  var FROM_LEVEL = 15, CUT = 50, FLOOR = 45;   // corte ampliado 30->50s (pedido: -20s extras)
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
        if (lvl >= FROM_LEVEL && typeof timer.timeLeft === 'number') {
          var before = timer.timeLeft;
          timer.timeLeft = Math.max(FLOOR, timer.timeLeft - CUT);
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
  console.log('[TIMER-TUNE] ativo (-' + CUT + 's a partir da fase ' + FROM_LEVEL + ').');
})();
