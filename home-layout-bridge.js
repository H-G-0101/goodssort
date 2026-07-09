/*
 * home-layout-bridge.js  -  layout da HOME (cena Menu):
 *   - esconde o RANKING (leaderboardButton) via seu container;
 *   - centraliza DAILY + SHOP lado a lado (define container.x; mantem o Y do jogo).
 * A classe de botao expoe this.container (o visual). Reforca a cada 60ms. Sem tocar no bundle.
 */
(function () {
  var SPACING = 120;   // x = -SPACING (daily) e +SPACING (shop)
  function g() { return window.__game; }
  // MenuTutorial recria os botoes -> aplicar o layout nas DUAS cenas
  var SCENES = ['Menu', 'MenuTutorial'];
  function menus() {
    var out = [];
    try { SCENES.forEach(function (n) { if (g().scene.isActive(n)) out.push(g().scene.getScene(n)); }); } catch (e) {}
    return out;
  }
  function hideBtn(b) {
    if (!b) return;
    if (b.container) { b.container.visible = false; }
    b.canBePressed = false;
  }
  setInterval(function () {
    menus().forEach(function (m) {
    try {
      hideBtn(m.leaderboardButton);                 // esconde ranking (medalha)
      if (m.dailyButton && m.dailyButton.container) m.dailyButton.container.x = -SPACING;
      if (m.shopButton  && m.shopButton.container)  m.shopButton.container.x  =  SPACING;
    } catch (e) {}
    });
  }, 60);
  console.log('%c[HOME-LAYOUT]', 'color:#888', 'ranking oculto; daily+shop centralizados.');
})();
