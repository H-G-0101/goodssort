/*
 * hide-relax-bridge.js  -  remove o modo RELAX ("No Timer") da home.
 * A classe de botao guarda o visual em this.container (NAO e Phaser GameObject),
 * entao escondemos o container + o icone zzz. Reforca a cada 60ms. Sem tocar no bundle.
 */
(function () {
  function g() { return window.__game; }
  // a cena do tutorial (MenuTutorial) recria os botoes -> tratar as DUAS cenas
  var SCENES = ['Menu', 'MenuTutorial'];
  function menus() {
    var out = [];
    try { SCENES.forEach(function (n) { if (g().scene.isActive(n)) out.push(g().scene.getScene(n)); }); } catch (e) {}
    return out;
  }
  function killBtn(b) {
    if (!b) return;
    if (b.container) { b.container.visible = false; if (b.container.setActive) b.container.setActive(false); }
    b.canBePressed = false;
    if (b.textObject && b.textObject.setVisible) b.textObject.setVisible(false);
  }
  setInterval(function () {
    menus().forEach(function (m) {
      try {
        killBtn(m.relaxButton);
        if (m.iconzzz && m.iconzzz.setVisible) m.iconzzz.setVisible(false);
        killBtn(m.leaderboardButton);                 // ranking (medalha) tambem no tutorial
        if (m.iconLeaderboard && m.iconLeaderboard.setVisible) m.iconLeaderboard.setVisible(false);
        // mao do tutorial apontando p/ o shop (hand / handTween)
        if (m.hand && m.hand.setVisible) m.hand.setVisible(false);
        if (m.handTween && m.handTween.stop) { try { m.handTween.stop(); } catch (e) {} }
      } catch (e) {}
    });
  }, 60);
  console.log('%c[HIDE-RELAX]', 'color:#888', 'modo relax (No Timer) oculto na home.');
})();
