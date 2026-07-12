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
  console.log('[TIMER-TUNE] ativo (-' + CUT + 's a partir da fase ' + FROM_LEVEL + ').');
})();
