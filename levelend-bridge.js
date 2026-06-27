/*
 * levelend-bridge.js  -  PONTE DO "LEVEL CLEARED"
 * Carrega DEPOIS do shop-bridge.js (reusa window.__game).
 * Cena "LevelEnd" = tela de nivel concluido (cena lancada, gatilho limpo).
 * Score exibido = levelConfig.earnedScore (o score cumulativo ja e somado no create nativo).
 * Continuar = currentCommonLevel/currentRelaxLevel = levelNumber+1 + save + scene.start(mode).
 * Assistir ad = credita coins += rewardAmount * multiplicador + save (offline aplica direto).
 */
(function () {
  var ui = null, shown = false, cycleTimer = null, cycleIdx = 0, applied = false;
  var OPTIONS = [2, 3, 4, 5, 6, 7];

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function save() {
    try { if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; } } catch (e) {}
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }
  function scene() { try { return g().scene.getScene('LevelEnd'); } catch (e) { return null; } }
  function levelConfig() { var sc = scene(); return sc && sc.levelConfig; }
  function rewardAmount() { var sc = scene(); return (sc && typeof sc.rewardAmount === 'number') ? sc.rewardAmount : 0; }

  function hidePhaser(hideIt) {
    try { var sc = scene(); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!hideIt); } catch (e) {}
  }

  function buildUI() {
    if (ui) return;
    var root = document.createElement('div');
    root.id = 'lebg-overlay';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(20,15,40,0.6);font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:340px;max-width:100%;">' +
        '<div style="position:relative;z-index:3;margin:0 6px -26px;height:74px;border-radius:22px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(220,214,255,0.4),0 4px 12px rgba(40,28,80,0.3);border:1.5px solid #3a2f8c;display:flex;align-items:center;justify-content:center;">' +
          '<span style="font-weight:800;font-size:28px;color:#fff;-webkit-text-stroke:3px #4438ad;paint-order:stroke fill;white-space:nowrap;">Level Completed!</span>' +
        '</div>' +
        '<div style="position:relative;z-index:2;padding:54px 24px 26px;border-radius:26px;background:radial-gradient(circle at 50% 30%,#4a3f6e 0%,#2c2440 70%,#1d1730 100%);border:1.5px solid #6a5fc8;box-shadow:0 10px 30px rgba(20,12,45,0.5);text-align:center;">' +
          '<div id="lebg-score" style="font-weight:800;font-size:34px;color:#fff;line-height:1.1;margin-bottom:6px;"></div>' +
          '<div id="lebg-bonus" style="font-weight:700;font-size:18px;color:#ffd75e;min-height:22px;margin-bottom:18px;"></div>' +
          '<div style="display:flex;gap:12px;">' +
            '<button id="lebg-ad" style="flex:1.2;height:58px;border-radius:18px;cursor:pointer;font-family:inherit;font-weight:800;font-size:18px;color:#fff;border:2px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 4px 10px rgba(30,140,98,0.35);"></button>' +
            '<button id="lebg-cont" style="flex:1;height:58px;border-radius:18px;cursor:pointer;font-family:inherit;font-weight:800;font-size:18px;color:#fff;border:2px solid #4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:0 4px 10px rgba(70,55,150,0.35);">Continue</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    ui = root;
    root.querySelector('#lebg-ad').onclick = onWatchAd;
    root.querySelector('#lebg-cont').onclick = onContinue;
  }

  function renderAd() {
    var ad = ui.querySelector('#lebg-ad');
    if (applied) { ad.textContent = '\u2713 x' + OPTIONS[cycleIdx]; ad.style.filter = 'grayscale(0.3)'; return; }
    ad.style.filter = '';
    ad.textContent = '\u{1F4FA} x' + OPTIONS[cycleIdx];
  }
  function renderScore() {
    var lc = levelConfig();
    var sc = (lc && typeof lc.earnedScore === 'number') ? lc.earnedScore : 0;
    ui.querySelector('#lebg-score').textContent = 'Score : ' + sc;
  }

  function startCycle() {
    stopCycle();
    cycleTimer = setInterval(function () { if (applied) return; cycleIdx = (cycleIdx + 1) % OPTIONS.length; renderAd(); }, 90);
  }
  function stopCycle() { if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } }

  function onWatchAd() {
    if (applied) return;
    stopCycle();
    applied = true;
    var st = stats();
    var bonus = rewardAmount() * OPTIONS[cycleIdx];
    if (st) { st.coins = (st.coins || 0) + bonus; save(); }
    ui.querySelector('#lebg-bonus').textContent = '+' + bonus + ' \u{1FA99}';
    renderAd();
  }

  function onContinue() {
    try {
      var gm = g(), sc = scene(), lc = levelConfig(), st = stats();
      var mode = (lc && lc.mode) ? lc.mode : 'Level';
      var ln = (lc && typeof lc.levelNumber === 'number') ? lc.levelNumber : 0;
      if (st) {
        if (mode === 'LevelRelax') st.currentRelaxLevel = ln + 1;
        else st.currentCommonLevel = ln + 1;
        save();
      }
      hidePhaser(false);
      var sp = sc && sc.scene;
      if (sp && sp.start) {
        if (st && st.currentCommonLevel < 2) sp.start('MenuTutorial');
        else sp.start(mode);
      }
    } catch (e) { console.warn('[LEVELEND-BRIDGE] continue', e); }
    hide();
  }

  var hooked = false;
  function tryHook() {
    if (hooked) return;
    try {
      var sc = scene();
      if (sc && sc.events) {
        var h = function () { try { sc.sys.setVisible(false); } catch (e) {} };
        sc.events.on('start', h);
        sc.events.on('wake', h);
        hooked = true;
      }
    } catch (e) {}
  }

  function show() {
    buildUI(); applied = false; cycleIdx = 0;
    ui.querySelector('#lebg-bonus').textContent = '';
    renderScore(); renderAd(); startCycle();
    ui.style.display = 'flex'; shown = true; hidePhaser(true);
  }
  function hide() { stopCycle(); if (ui) ui.style.display = 'none'; shown = false; }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false;
    try { active = gm.scene.isActive('LevelEnd'); } catch (e) {}
    if (active && !shown) show();
    else if (!active && shown) hide();
  }, 30);

  console.log('%c[LEVELEND-BRIDGE]', 'color:#2bb583', 'ativo (LevelEnd).');
})();
