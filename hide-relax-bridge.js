/*
 * hide-relax-bridge.js  -  remove o modo RELAX ("No Timer") da home.
 * A classe de botao guarda o visual em this.container (NAO e Phaser GameObject),
 * entao escondemos o container + o icone zzz. Reforca a cada 60ms. Sem tocar no bundle.
 */
(function () {
  function g() { return window.__game; }
  function menu() { try { return g().scene.isActive('Menu') ? g().scene.getScene('Menu') : null; } catch (e) { return null; } }
  function killBtn(b) {
    if (!b) return;
    if (b.container) { b.container.visible = false; if (b.container.setActive) b.container.setActive(false); }
    b.canBePressed = false;
    if (b.textObject && b.textObject.setVisible) b.textObject.setVisible(false);
  }
  setInterval(function () {
    var m = menu(); if (!m) return;
    try {
      killBtn(m.relaxButton);
      if (m.iconzzz && m.iconzzz.setVisible) m.iconzzz.setVisible(false);
    } catch (e) {}
  }, 60);
  console.log('%c[HIDE-RELAX]', 'color:#888', 'modo relax (No Timer) oculto na home.');
})();
