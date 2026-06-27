/*
 * boot-counter-bridge.js  -  contador 1->100 no lugar da barra de loading (cena Preloader)
 * A barra foi apagada do splash.png. Aqui adiciono um texto na posicao dela e atualizo
 * com this.load.progress (0..1 -> 1..100). Durante o load a cena NAO esta "active",
 * por isso detecto pelo proprio load.progress (e status do ciclo), nao por isActive.
 */
(function () {
  var FONT_SIZE = 96;   // tamanho do numero (ajustavel)
  var txt = null;

  function g() { return window.__game; }
  function pre() { try { return g().scene.getScene('Preloader'); } catch (e) { return null; } }

  // a cena esta no ciclo do splash (init/preload/load/create/running) e nao encerrada?
  function inSplash(sc) {
    if (!sc || !sc.load || typeof sc.load.progress !== 'number') return false;
    var st = (sc.sys && sc.sys.settings) ? sc.sys.settings.status : null;
    if (st === 8 || st === 9) return false;          // SHUTDOWN / DESTROYED
    return sc.load.progress < 1 || st === 3 || st === 4 || st === 5; // LOADING/CREATING/RUNNING
  }

  function tick() {
    var sc = pre();
    if (!inSplash(sc)) {
      if (txt && !txt.scene) txt = null;             // foi destruido com a cena
      return;
    }
    if (!sc.add) return;
    if (!txt || !txt.scene) {
      var base = sc.progressBase || sc.progress;
      var x = (base && typeof base.x === 'number') ? base.x : 0;
      var y = (base && typeof base.y === 'number') ? base.y : 150;
      try {
        txt = sc.add.text(x, y, '1', {
          fontFamily: 'inter', fontSize: FONT_SIZE + 'px', color: '#4438ad',
          stroke: '#ffffff', strokeThickness: 8, align: 'center'
        }).setOrigin(0.5).setDepth(1e7);
      } catch (e) { return; }
    }
    var p = sc.load.progress;
    var n = Math.max(1, Math.min(100, Math.round(p * 100)));
    txt.setText(String(n));
  }

  setInterval(tick, 30);
  console.log('%c[BOOT-COUNTER]', 'color:#5246c4', 'ativo (1-100).');
})();
