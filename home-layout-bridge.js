/*
 * home-layout-bridge.js  -  layout da HOME (cena Menu):
 *   - esconde o RANKING (leaderboardButton) via seu container;
 *   - centraliza DAILY + SHOP lado a lado (define container.x; mantem o Y do jogo).
 * A classe de botao expoe this.container (o visual). Reforca a cada 60ms. Sem tocar no bundle.
 */
(function () {
  var SPACING = 120;   // x = -SPACING (daily) e +SPACING (shop)
  function g() { return window.__game; }
  function menu() { try { return g().scene.isActive('Menu') ? g().scene.getScene('Menu') : null; } catch (e) { return null; } }
  function hideBtn(b) {
    if (!b) return;
    if (b.container) { b.container.visible = false; }
    b.canBePressed = false;
  }
  setInterval(function () {
    var m = menu(); if (!m) return;
    try {
      hideBtn(m.leaderboardButton);                 // esconde ranking (medalha)
      if (m.dailyButton && m.dailyButton.container) m.dailyButton.container.x = -SPACING;
      if (m.shopButton  && m.shopButton.container)  m.shopButton.container.x  =  SPACING;
    } catch (e) {}
  }, 60);
  console.log('%c[HOME-LAYOUT]', 'color:#888', 'ranking oculto; daily+shop centralizados.');
})();
