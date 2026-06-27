/*
 * gameplay-score-bridge.js  -  pilula de SCORE na gameplay, ao lado/abaixo do timer
 * Mostra LevelManager.levelStars (o score que sobe em tempo real). Usa a textura da pilula
 * lavanda (frame-level) + texto, posicionada relativa ao container do timer.
 */
(function () {
  var OFFSET_X = 0;      // ajuste fino X (a partir da coluna do botao pause)
  var OFFSET_Y = 0;      // ajuste fino Y (a partir da linha do timer)
  var SCALE = 0.6;       // tamanho da pilula
  var SHOW_STAR = true;  // mostra um ★ antes do numero

  function g() { return window.__game; }
  function activeLevel() {
    try {
      var gm = g();
      if (gm.scene.isActive('Level')) return gm.scene.getScene('Level');
      if (gm.scene.isActive('LevelRelax')) return gm.scene.getScene('LevelRelax');
    } catch (e) {}
    return null;
  }

  function tick() {
    var sc = activeLevel(); if (!sc) return;
    var lm = sc.LevelManager; if (!lm || !lm.timer || !lm.timer.container) return;
    var tc = lm.timer.container;
    // ancora: X do botao pause (coluna esquerda), Y do timer (mesma linha)
    var pause = sc.settingsButton;
    var pcont = (pause && pause.container) ? pause.container : null;
    var ax = pcont ? pcont.x : (tc.x - 320);
    var ay = tc.y;
    if (!sc.__scorePill || !sc.__scorePill.scene) {
      try {
        var cont = sc.add.container(ax + OFFSET_X, ay + OFFSET_Y).setDepth(99999);
        var pill = sc.add.image(0, 0, 'atlas', 'frame-level').setOrigin(0.5).setScale(SCALE);
        var txt = sc.add.text(0, 0, '0', {
          fontFamily: 'inter', fontSize: '52px', color: '#3a3358', align: 'center',
          stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5).setScale(0.62);
        cont.add([pill, txt]);
        sc.__scorePill = cont; sc.__scoreTxt = txt;
      } catch (e) { console.warn('[SCORE-BRIDGE]', e); return; }
    } else {
      sc.__scorePill.setPosition(ax + OFFSET_X, ay + OFFSET_Y);   // mantem alinhado
    }
    var v = (typeof lm.levelStars === 'number') ? lm.levelStars : 0;
    sc.__scoreTxt.setText((SHOW_STAR ? '\u2605 ' : '') + v);
  }

  setInterval(tick, 80);
  console.log('%c[SCORE-BRIDGE]', 'color:#5246c4', 'ativo (score na gameplay).');
})();
