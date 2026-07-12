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
      ['Game', 'LevelTutorial'].forEach(function (n) {
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

  /* ---------- ALERTA VISUAL: o WIDGET do timer pisca em vermelho aos 15s finais ---------- */
  var WARN_AT = 15, TINT = 0xff3b30;
  var blinkOn = false, blinkPhase = false, savedTextColor = null;

  function timerParts(t) {
    // reune tudo que da pra tingir: filhos do container do timer + o texto
    var sprites = [];
    try {
      var box = t.container || t;
      if (box && box.list && box.list.length) {
        box.list.forEach(function (o) { if (o && typeof o.setTint === 'function') sprites.push(o); });
      }
      ['frame', 'icon', 'image', 'bg'].forEach(function (k) {
        if (t[k] && typeof t[k].setTint === 'function' && sprites.indexOf(t[k]) < 0) sprites.push(t[k]);
      });
    } catch (e) {}
    return { sprites: sprites, text: (t.text && typeof t.text.setColor === 'function') ? t.text : null };
  }

  function applyBlink(t, on) {
    var p = timerParts(t);
    if (on && blinkPhase) {
      p.sprites.forEach(function (o) { try { o.setTint(TINT); } catch (e) {} });
      if (p.text) { if (savedTextColor === null) savedTextColor = p.text.style && p.text.style.color; try { p.text.setColor('#ff3b30'); } catch (e) {} }
    } else {
      p.sprites.forEach(function (o) { try { o.clearTint(); } catch (e) {} });
      if (p.text && savedTextColor !== null) { try { p.text.setColor(savedTextColor); } catch (e) {} }
      if (!on) savedTextColor = null;
    }
  }

  setInterval(function () {
    try {
      var gm = g();
      if (!gm || !gm.scene) return;
      blinkPhase = !blinkPhase;                          // alterna a cada tick (400ms)
      ['Game', 'LevelTutorial'].forEach(function (n) {
        if (!gm.scene.isActive(n)) return;
        var sc = gm.scene.getScene(n);
        var t = sc && sc.LevelManager && sc.LevelManager.timer;
        if (!t) return;
        var on = !gm.scene.isPaused(n) &&
                 typeof t.timeLeft === 'number' && t.timeLeft > 0 && t.timeLeft <= WARN_AT;
        applyBlink(t, on);
        blinkOn = on;
      });
    } catch (e) {}
  }, 400);
  console.log('[TIMER-TUNE] ativo (-' + CUT + 's a partir da fase ' + FROM_LEVEL + ').');
})();
