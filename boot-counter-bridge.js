/*
 * boot-counter-bridge.js  -  legenda "Loading" no lugar da barra (cena Preloader)
 * A barra foi apagada do splash.png. Mostro "Loading" com pontinhos animados e seguro a
 * troca de cena da Preloader por um tempo minimo (MINTIME) pra a legenda aparecer.
 */
(function () {
  var FONT_SIZE = 84;     // tamanho da legenda
  var MINTIME = 1500;     // tempo minimo (ms) que o splash fica visivel
  var LABEL = 'Loading';

  var txt = null, t0 = 0, patched = false, finishing = false, pendingArgs = null;

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function g() { return window.__game; }
  function pre() { try { return g().scene.getScene('Preloader'); } catch (e) { return null; } }
  function inSplash(sc) {
    if (!sc || !sc.load || typeof sc.load.progress !== 'number') return false;
    var st = (sc.sys && sc.sys.settings) ? sc.sys.settings.status : null;
    if (st === 8 || st === 9) return false;                 // SHUTDOWN/DESTROYED
    return finishing || sc.load.progress < 1 || st === 3 || st === 4 || st === 5;
  }

  function ensureTxt(sc) {
    if (txt && txt.scene) return;
    var base = sc.progressBase || sc.progress;
    var x = (base && typeof base.x === 'number') ? base.x : 0;
    var y = (base && typeof base.y === 'number') ? base.y : 150;
    try {
      txt = sc.add.text(x, y, LABEL, {
        fontFamily: 'inter', fontSize: FONT_SIZE + 'px', color: '#4438ad',
        stroke: '#ffffff', strokeThickness: 8, align: 'center'
      }).setOrigin(0.5).setDepth(1e7);
    } catch (e) { txt = null; }
  }

  function tick() {
    var sc = pre();
    if (!inSplash(sc)) { if (txt && !txt.scene) txt = null; return; }
    if (!sc.add) return;
    if (!t0) t0 = now();
    ensureTxt(sc);

    // pontinhos animados: Loading / . / .. / ...
    if (txt) {
      var dots = (Math.floor((now() - t0) / 350) % 4);
      txt.setText(LABEL + '....'.slice(0, dots));
    }

    // segura a troca de cena da Preloader por MINTIME (uma vez)
    if (!patched && sc.scene && typeof sc.scene.start === 'function') {
      patched = true;
      var orig = sc.scene.start.bind(sc.scene);
      sc.scene.start = function () {
        pendingArgs = arguments;
        if (!finishing) {
          finishing = true;
          var remaining = Math.max(0, MINTIME - (now() - t0));
          setTimeout(function () {
            var a = pendingArgs || [];
            try { orig.apply(null, a); } catch (e) { try { orig(a[0]); } catch (_) {} }
          }, remaining);
        }
        return sc.scene;
      };
    }
  }

  setInterval(tick, 60);
  console.log('%c[BOOT-LOADING]', 'color:#5246c4', 'ativo (legenda Loading).');
})();
