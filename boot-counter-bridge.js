/*
 * boot-counter-bridge.js  -  contador 1->100 no lugar da barra de loading (cena Preloader)
 * A barra (loader-progressbar-*) foi apagada do splash.png. Aqui adiciono um texto na
 * posicao da barra (this.progressBase) e atualizo com this.load.progress (0..1 -> 1..100).
 */
(function () {
  var FONT_SIZE = 96;   // tamanho do numero (ajustavel)
  var txt = null;

  function g() { return window.__game; }
  function pre() { try { return g().scene.getScene('Preloader'); } catch (e) { return null; } }
  function active() { try { return g() && g().scene && g().scene.isActive('Preloader'); } catch (e) { return false; } }

  function tick() {
    if (!active()) return;
    var sc = pre(); if (!sc || !sc.add) return;
    if (!txt || !txt.scene) {
      var base = sc.progressBase || sc.progress;
      var x = (base && typeof base.x === 'number') ? base.x : 0;
      var y = (base && typeof base.y === 'number') ? base.y : 150;
      txt = sc.add.text(x, y, '1', {
        fontFamily: 'inter', fontSize: FONT_SIZE + 'px', color: '#ffffff',
        stroke: '#4438ad', strokeThickness: 10, align: 'center'
      }).setOrigin(0.5).setDepth(1e7);
    }
    var p = (sc.load && typeof sc.load.progress === 'number') ? sc.load.progress : 0;
    var n = Math.max(1, Math.min(100, Math.round(p * 100)));
    txt.setText(String(n));
  }

  setInterval(tick, 30);
  console.log('%c[BOOT-COUNTER]', 'color:#5246c4', 'ativo (1-100).');
})();
