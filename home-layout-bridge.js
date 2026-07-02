/*
 * home-layout-bridge.js  -  ajustes de layout da HOME (cena Menu):
 *   - esconde o botao de RANKING (leaderboardButton) e trava o clique;
 *   - alinha DAILY (dailyButton) e SHOP (shopButton) lado a lado, centralizados.
 * Nativo posiciona daily=-200, shop=0, leaderboard=+200 (em updateScene, todo frame),
 * por isso reforcamos a cada tick. Sem tocar no bundle. Reverter: apagar arquivo + linha no index.
 */
(function () {
  var SPACING = 120;   // metade da distancia entre daily e shop (x = -SPACING e +SPACING)

  function g() { return window.__game; }
  function menu() { try { return g().scene.isActive('Menu') ? g().scene.getScene('Menu') : null; } catch (e) { return null; } }

  setInterval(function () {
    var m = menu(); if (!m) return;
    try {
      // 1) esconde ranking
      var lb = m.leaderboardButton;
      if (lb) {
        if (lb.setVisible) lb.setVisible(false);
        lb.canBePressed = false;
        if (lb.disableInteractive) { try { lb.disableInteractive(); } catch (e) {} }
      }
      // 2) alinha daily + shop centralizados (mantem o Y que o jogo definiu)
      var daily = m.dailyButton, shop = m.shopButton;
      if (daily) daily.x = -SPACING;
      if (shop)  shop.x  =  SPACING;
    } catch (e) {}
  }, 60);

  console.log('%c[HOME-LAYOUT]', 'color:#888', 'ranking oculto; daily+shop centralizados.');
})();
