/*
 * combo-legend-bridge.js  -  combo "BONUS xN" so a LEGENDA (sem barra azul/verde/raio),
 * posicionada acima das prateleiras. Esconde multBase/multLine/multSign e mantem multText.
 */
(function () {
  var OFFSET_ABOVE = 70;   // distancia acima do topo das prateleiras
  var FALLBACK_Y = -120;   // y usado se nao achar as prateleiras
  var STROKE = '#4438ad';  // contorno do texto (contraste no fundo claro)

  function g() { return window.__game; }
  function activeLevel() {
    try {
      var gm = g();
      if (gm.scene.isActive('Level')) return gm.scene.getScene('Level');
      if (gm.scene.isActive('LevelRelax')) return gm.scene.getScene('LevelRelax');
    } catch (e) {}
    return null;
  }
  function yOf(o) {
    if (!o) return null;
    if (typeof o.y === 'number') return o.y;
    if (o.container && typeof o.container.y === 'number') return o.container.y;
    if (o.image && typeof o.image.y === 'number') return o.image.y;
    return null;
  }
  function shelfTop(lm) {
    var arr = lm.shelfArray;
    if (arr && arr.length) {
      var m = Infinity;
      for (var i = 0; i < arr.length; i++) { var y = yOf(arr[i]); if (y != null && y < m) m = y; }
      if (m !== Infinity) return m;
    }
    return null;
  }

  function tick() {
    var sc = activeLevel(); if (!sc) return;
    var lm = sc.LevelManager; if (!lm) return;
    // esconde a barra (base azul, preenchimento verde, raio)
    [lm.multBase, lm.multLine, lm.multSign].forEach(function (o) { try { if (o && o.setVisible) o.setVisible(false); } catch (e) {} });
    var txt = lm.multText; if (!txt) return;
    // garante legibilidade
    if (!txt.__styled) { try { txt.setStroke(STROKE, 10); txt.setDepth(99999); txt.__styled = true; } catch (e) {} }
    // posiciona a legenda acima das prateleiras (move o multContainer)
    var cont = lm.multContainer;
    if (cont && cont.setPosition) {
      var top = shelfTop(lm); var ty = (top != null) ? (top - OFFSET_ABOVE) : FALLBACK_Y;
      var lx = (typeof txt.x === 'number') ? txt.x : 0;
      var ly = (typeof txt.y === 'number') ? txt.y : 0;
      cont.setPosition(0 - lx, ty - ly);
    }
  }

  setInterval(tick, 80);
  console.log('%c[COMBO-LEGEND]', 'color:#7b4fe0', 'ativo (so legenda BONUS).');
})();
