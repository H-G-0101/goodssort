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
  // Alinha os elementos do tutorial (spotlight/mascara/mao) ao shop, que nos movemos.
  // Sem isso o quadrado de luz fica na posicao ORIGINAL do botao.
  function alignTutorialToShop(m) {
    try {
      var sc = m.shopButton && m.shopButton.container;
      if (!sc) return;
      var x = sc.x, y = sc.y;
      ['hintRectangle', 'spotlight', 'tutorialRect', 'maskRect'].forEach(function (k) {
        var o = m[k];
        if (o && typeof o.setPosition === 'function') o.setPosition(x, y);
        else if (o && 'x' in o) { o.x = x; o.y = y; }
      });
      // a mao fica logo abaixo/direita do icone, como no original
      if (m.hand) {
        if (typeof m.hand.setPosition === 'function') m.hand.setPosition(x + 18, y + 34);
        else { m.hand.x = x + 18; m.hand.y = y + 34; }
      }
    } catch (e) {}
  }

  setInterval(function () {
    menus().forEach(function (m) {
    try {
      hideBtn(m.leaderboardButton);                 // esconde ranking (medalha)
      if (m.dailyButton && m.dailyButton.container) m.dailyButton.container.x = -SPACING;
      if (m.shopButton  && m.shopButton.container)  m.shopButton.container.x  =  SPACING;
      alignTutorialToShop(m);                       // spotlight + mao seguem o shop
    } catch (e) {}
    });
  }, 60);
  console.log('%c[HOME-LAYOUT]', 'color:#888', 'ranking oculto; daily+shop centralizados.');
})();
