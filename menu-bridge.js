/*
 * menu-bridge.js  -  substitui a legenda "Play" pelo NIVEL ATUAL ("Level N")
 * O botao Play e o "commonButton" (cena Menu). O jogo cria a legenda "Play" via
 * addTextFit, guardada em commonButton.textObject. Reuso esse mesmo objeto e troco
 * o texto pra "Level N" (mantem cor/contorno/fonte do original). N = currentCommonLevel.
 */
(function () {
  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function levelNum() {
    var st = stats(); var n = st && st.currentCommonLevel;
    return (typeof n === 'number' && n >= 1) ? n : 1;
  }
  function menuActive() {
    try { return g().scene.isActive('Menu') ? g().scene.getScene('Menu') : null; } catch (e) { return null; }
  }

  function tick() {
    var menu = menuActive(); if (!menu) return;
    var btn = menu.commonButton; if (!btn) return;
    var to = btn.textObject; if (!to || !to.scene) return;     // a legenda "Play"
    var label = 'Level ' + levelNum();
    if (to.text === label && btn.__lvlDone) return;            // ja trocado

    // guarda a escala original da legenda (1a vez) pra usar de base
    if (typeof btn.__baseScale !== 'number') btn.__baseScale = (typeof to.scaleX === 'number' && to.scaleX) ? to.scaleX : 0.42;
    var base = btn.__baseScale;
    try {
      to.setText(label);
      to.setScale(base);
      // encolhe se "Level N" ficar mais largo que o botao
      var maxW = (btn.image && btn.image.displayWidth ? btn.image.displayWidth : 185) * 0.82;
      var dw = to.displayWidth;
      if (dw > maxW && dw > 0) to.setScale(base * maxW / dw);
      btn.__lvlDone = true;
    } catch (e) { console.warn('[MENU-BRIDGE]', e); }
  }

  setInterval(tick, 120);
  console.log('%c[MENU-BRIDGE]', 'color:#5246c4', 'ativo (Play -> Level N).');
})();
