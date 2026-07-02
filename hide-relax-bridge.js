/*
 * hide-relax-bridge.js  -  remove o modo RELAX ("No Timer") da home.
 * Esconde relaxButton (com o texto "No Timer") + o icone iconzzz e desativa o clique.
 * Reforca a cada frame porque a cena Menu re-exibe em updateScene. Sem tocar no bundle.
 * Para reverter: apague este arquivo e a linha dele no index.html.
 */
(function () {
  function g() { return window.__game; }
  function menu() { try { return g().scene.isActive('Menu') ? g().scene.getScene('Menu') : null; } catch (e) { return null; } }

  setInterval(function () {
    var m = menu(); if (!m) return;
    try {
      var rb = m.relaxButton;
      if (rb) {
        if (rb.setVisible) rb.setVisible(false);
        rb.canBePressed = false;                 // trava o clique
        if (rb.textObject && rb.textObject.setVisible) rb.textObject.setVisible(false);
        if (rb.disableInteractive) { try { rb.disableInteractive(); } catch (e) {} }
      }
      if (m.iconzzz && m.iconzzz.setVisible) m.iconzzz.setVisible(false);  // icone zzz do relax
    } catch (e) {}
  }, 60);

  console.log('%c[HIDE-RELAX]', 'color:#888', 'modo relax (No Timer) oculto na home.');
})();
