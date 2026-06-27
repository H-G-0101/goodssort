/*
 * menu-bridge.js  -  mostra o NIVEL ATUAL no botao Play (home)
 * O botao Play e o "commonButton" (cena Menu), um wrapper com .container (Phaser Container)
 * e .image (o triangulo). Adiciono um texto "Level N" dentro do container, abaixo do triangulo.
 * N = stats.currentCommonLevel (o nivel que vai ser jogado). Atualiza sozinho.
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
    var btn = menu.commonButton; if (!btn || !btn.container) return;
    var label = 'Level ' + levelNum();
    // ja existe e valido -> so atualiza
    if (btn.__lvlText && btn.__lvlText.scene) { try { btn.__lvlText.setText(label); } catch (e) { btn.__lvlText = null; } if (btn.__lvlText) return; }
    try {
      var img = btn.image;
      var oy = (img && img.displayHeight) ? (img.displayHeight * 0.5 + 30) : 78;
      var t = menu.add.text(0, oy, label, {
        fontFamily: 'inter', fontSize: '44px', color: '#ffffff',
        stroke: '#4438ad', strokeThickness: 9, align: 'center'
      }).setOrigin(0.5);
      t.setScale(1);
      btn.container.add(t);
      btn.__lvlText = t;
    } catch (e) { console.warn('[MENU-BRIDGE]', e); }
  }

  setInterval(tick, 200);
  console.log('%c[MENU-BRIDGE]', 'color:#5246c4', 'ativo (nivel no Play).');
})();
