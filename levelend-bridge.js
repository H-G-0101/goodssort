/*
 * levelend-bridge.js  -  PONTE DO "LEVEL CLEARED" + "TIME'S UP"
 * Cena "LevelEnd" trata vitoria E derrota. Distintivo: levelConfig.result ('win' | 'lost').
 *   result==='win'  -> overlay "Level Completed!" (score + ad multiplicador + continue)
 *   result==='lost' -> overlay "Time's up!" (add time via ad + home + restart)
 */
(function () {
  var winUI = null, lostUI = null, shown = false, cycleTimer = null, cycleIdx = 0, applied = false;
  var OPTIONS = [2, 3, 4, 5, 6, 7];

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function save() {
    try { if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; } } catch (e) {}
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }
  function scene() { try { return g().scene.getScene('LevelEnd'); } catch (e) { return null; } }
  function levelConfig() { var sc = scene(); return sc && sc.levelConfig; }
  function result() { var lc = levelConfig(); return lc && lc.result; }
  function isLost() { return result() === 'lost'; }
  function rewardAmount() { var sc = scene(); return (sc && typeof sc.rewardAmount === 'number') ? sc.rewardAmount : 0; }
  function rewardSeconds() { try { var v = g().GlobalVariables.RewardTimeInSeconds; return (typeof v === 'number') ? v : 15; } catch (e) { return 15; } }
  function mode() { var lc = levelConfig(); return (lc && lc.mode) ? lc.mode : 'Level'; }
  function hidePhaser(hideIt) { try { var sc = scene(); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!hideIt); } catch (e) {} }

  function injectCSS() {
    if (document.getElementById('lebg-css')) return;
    var st = document.createElement('style'); st.id = 'lebg-css';
    st.textContent = '@keyframes lebg-arrow{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}';
    document.head.appendChild(st);
  }

  /* ---------- navegacao comum ---------- */
  function goRestart() {
    try {
      var gm = g(), sc = scene(), m = mode();
      hidePhaser(false);
      try { gm.scene.stop('LevelEnd'); } catch (e) {}
      var lvl = gm.scene.getScene(m); if (lvl && lvl.scene && lvl.scene.restart) lvl.scene.restart();
    } catch (e) { console.warn('[LEVELEND-BRIDGE] restart', e); }
    hide();
  }
  function goHome() {
    try {
      var gm = g(), m = mode();
      hidePhaser(false);
      try { gm.scene.stop('LevelEnd'); } catch (e) {}
      try { gm.scene.stop(m); } catch (e) {}
      var menu = gm.scene.getScene('Menu'); if (menu && menu.scene && menu.scene.restart) menu.scene.restart();
    } catch (e) { console.warn('[LEVELEND-BRIDGE] home', e); }
    hide();
  }

  /* ========== WIN: Level Completed ========== */
  function coinStack() {
    return '<div style="position:relative;width:46px;height:48px;">' +
      '<div style="position:absolute;left:0;bottom:0;width:46px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#b58bff,#6d3fd6);box-shadow:inset 0 -3px 4px rgba(50,15,110,0.5);"></div>' +
      '<div style="position:absolute;left:0;bottom:9px;width:46px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#b58bff,#6d3fd6);box-shadow:inset 0 -3px 4px rgba(50,15,110,0.5);"></div>' +
      '<div style="position:absolute;left:0;bottom:18px;width:46px;height:18px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#c9a6ff,#7b4fe0);box-shadow:inset 0 -3px 4px rgba(50,15,110,0.45),inset 0 2px 3px rgba(255,255,255,0.5);"></div></div>';
  }
  function buildWin() {
    if (winUI) return; injectCSS();
    var root = document.createElement('div'); root.id = 'lebg-win';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 30%,rgba(74,63,110,0.92),rgba(29,23,48,0.94));font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:340px;max-width:100%;">' +
        '<div style="position:relative;z-index:2;margin-top:34px;padding:64px 26px 34px;border-radius:28px;background:linear-gradient(#e9e2fb,#ddd2f5);border:2px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.4);overflow:hidden;">' +
          '<div style="position:relative;z-index:1;text-align:center;margin-bottom:22px;">' +
            '<div id="lebg-score" style="font-weight:800;font-size:38px;color:#4a4060;line-height:1.1;">Score : 0</div>' +
            '<div style="font-weight:800;font-size:38px;color:#4a4060;line-height:1.1;">Bonus :</div>' +
          '</div>' +
          '<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:18px;padding:22px;border-radius:20px;background:rgba(255,255,255,0.45);border:1.5px solid rgba(255,255,255,0.7);box-shadow:inset 0 1px 0 rgba(255,255,255,0.8);">' +
            '<span id="lebg-badge" style="position:absolute;top:-14px;right:-10px;transform:rotate(8deg);display:flex;align-items:center;justify-content:center;height:34px;padding:0 12px;border-radius:17px;border:2px solid #fff;background:linear-gradient(#ffd24d,#f5a623);box-shadow:0 3px 7px rgba(180,120,10,0.4);font-weight:800;font-size:20px;color:#7a4a00;">\u00D72</span>' +
            '<span id="lebg-bonus" style="font-weight:800;font-size:48px;color:#4a4060;line-height:1;">+0</span>' + coinStack() +
          '</div>' +
          '<div style="position:relative;z-index:1;display:flex;gap:14px;margin-top:34px;">' +
            '<button id="lebg-ad" style="display:flex;align-items:center;justify-content:center;gap:8px;min-width:104px;height:58px;padding:0 16px;border-radius:18px;cursor:pointer;font-family:inherit;border:2px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 4px 10px rgba(30,140,98,0.35);">' +
              '<span style="display:inline-flex;align-items:center;justify-content:center;background:#3f6fe0;border:2px solid #fff;border-radius:7px;font-size:12px;font-weight:800;color:#fff;padding:2px 7px;letter-spacing:.5px;">AD</span>' +
              '<span id="lebg-admult" style="font-weight:800;font-size:24px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">\u00D72</span>' +
            '</button>' +
            '<button id="lebg-cont" style="display:flex;align-items:center;justify-content:center;gap:8px;flex:1;height:58px;border-radius:18px;cursor:pointer;font-family:inherit;border:2px solid #4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:0 4px 10px rgba(70,55,150,0.35);">' +
              '<span style="font-weight:800;font-size:21px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">Continue</span>' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" style="display:block;filter:drop-shadow(0 2px 1px rgba(0,0,0,0.2));animation:lebg-arrow 1s ease-in-out infinite;"><polygon points="4 5 12 12 4 19"></polygon><polygon points="12 5 20 12 12 19"></polygon></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div style="position:absolute;z-index:4;top:0;left:-18px;right:-18px;display:flex;align-items:center;justify-content:center;">' +
          '<div style="position:relative;width:100%;height:70px;border-radius:16px;background:linear-gradient(#7a6ee0,#5246c4 60%,#4438ad);border:2px solid #3a2f8c;box-shadow:inset 0 3px 0 rgba(220,214,255,0.5),inset 0 -5px 0 rgba(0,0,0,0.15),0 5px 10px rgba(40,28,80,0.35);display:flex;align-items:center;justify-content:center;">' +
            '<span style="white-space:nowrap;font-weight:800;font-size:30px;color:#fff;-webkit-text-stroke:4px #4438ad;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,0.18);">Level Completed!</span>' +
            '<div style="position:absolute;left:-8px;top:46px;width:0;height:0;border-top:14px solid #3a2f8c;border-left:10px solid transparent;"></div>' +
            '<div style="position:absolute;right:-8px;top:46px;width:0;height:0;border-top:14px solid #3a2f8c;border-right:10px solid transparent;"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root); winUI = root;
    root.querySelector('#lebg-ad').onclick = onWinAd;
    root.querySelector('#lebg-cont').onclick = onContinue;
  }
  function renderWin() {
    var lc = levelConfig(); var sc = (lc && typeof lc.earnedScore === 'number') ? lc.earnedScore : 0;
    var mult = OPTIONS[cycleIdx]; var bonus = rewardAmount() * mult;
    winUI.querySelector('#lebg-score').textContent = 'Score : ' + sc;
    winUI.querySelector('#lebg-bonus').textContent = '+' + bonus;
    winUI.querySelector('#lebg-badge').textContent = '\u00D7' + mult;
    var adm = winUI.querySelector('#lebg-admult'); adm.textContent = applied ? '\u2713' : '\u00D7' + mult;
    winUI.querySelector('#lebg-ad').style.filter = applied ? 'grayscale(0.35)' : '';
  }
  function startCycle() { stopCycle(); cycleTimer = setInterval(function () { if (applied) return; cycleIdx = (cycleIdx + 1) % OPTIONS.length; renderWin(); }, 90); }
  function stopCycle() { if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } }
  function onWinAd() {
    if (applied) return; stopCycle(); applied = true;
    var st = stats(); var bonus = rewardAmount() * OPTIONS[cycleIdx];
    if (st) { st.coins = (st.coins || 0) + bonus; save(); }
    renderWin();
  }
  function onContinue() {
    try {
      var gm = g(), sc = scene(), lc = levelConfig(), st = stats(), m = mode();
      var ln = (lc && typeof lc.levelNumber === 'number') ? lc.levelNumber : 0;
      if (st) { if (m === 'LevelRelax') st.currentRelaxLevel = ln + 1; else st.currentCommonLevel = ln + 1; save(); }
      hidePhaser(false);
      var sp = sc && sc.scene;
      if (sp && sp.start) { if (st && st.currentCommonLevel < 2) sp.start('MenuTutorial'); else sp.start(m); }
    } catch (e) { console.warn('[LEVELEND-BRIDGE] continue', e); }
    hide();
  }

  /* ========== LOST: Time's up! ========== */
  function buildLost() {
    if (lostUI) return; injectCSS();
    var root = document.createElement('div'); root.id = 'lebg-lost';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 30%,rgba(74,63,110,0.92),rgba(29,23,48,0.94));font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:320px;max-width:100%;">' +
        '<div style="position:relative;z-index:3;margin:0 6px -26px;height:72px;border-radius:20px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(220,214,255,0.4),0 4px 12px rgba(40,28,80,0.25);border:1.5px solid #3a2f8c;display:flex;align-items:center;justify-content:center;">' +
          '<span style="font-weight:800;font-size:32px;color:#fff;-webkit-text-stroke:3px #4438ad;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,0.18);">Time\'s up!</span>' +
        '</div>' +
        '<div style="position:relative;z-index:2;padding:50px 26px 30px;border-radius:26px;background:linear-gradient(#efebff,#e4def8);border:1.5px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.35);text-align:center;">' +
          '<div style="font-weight:800;font-size:26px;color:#4a4060;line-height:1.25;margin-bottom:20px;">You were close.<br>Add some time?</div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px 16px 18px;border-radius:20px;background:rgba(255,255,255,0.5);border:1.5px solid rgba(255,255,255,0.7);box-shadow:inset 0 1px 0 rgba(255,255,255,0.8);">' +
            '<span id="lebg-secs" style="font-weight:800;font-size:40px;color:#4a4060;line-height:1;">+0 Sec.</span>' +
            '<button id="lebg-addtime" aria-label="Watch ad to add time" style="display:flex;align-items:center;justify-content:center;gap:9px;min-width:150px;height:50px;padding:0 22px;border-radius:25px;cursor:pointer;font-family:inherit;border:2px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 4px 10px rgba(30,140,98,0.35);">' +
              '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="14" height="14" rx="3" fill="#fff"></rect><polygon points="7.5 9 7.5 15 12 12" fill="#2bb583"></polygon><path d="M16.5 9.5 21 7v10l-4.5-2.5z" fill="#fff"></path></svg>' +
            '</button>' +
          '</div>' +
          '<div style="display:flex;justify-content:center;gap:18px;margin-top:26px;">' +
            '<button id="lebg-lhome" aria-label="Home" style="display:flex;align-items:center;justify-content:center;width:62px;height:62px;border-radius:16px;cursor:pointer;font-family:inherit;border:1.5px solid #4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:0 3px 8px rgba(70,55,150,0.3);">' +
              '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10v9.5h13V10"></path><path d="M9.5 19.5v-5.5h5v5.5"></path></svg>' +
            '</button>' +
            '<button id="lebg-lrestart" aria-label="Restart" style="display:flex;align-items:center;justify-content:center;width:62px;height:62px;border-radius:16px;cursor:pointer;font-family:inherit;border:1.5px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 3px 8px rgba(30,140,98,0.3);">' +
              '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6v5h-5"></path><path d="M19 11a7.5 7.5 0 1 0-1.6 5"></path></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root); lostUI = root;
    root.querySelector('#lebg-addtime').onclick = onAddTime;
    root.querySelector('#lebg-lhome').onclick = goHome;
    root.querySelector('#lebg-lrestart').onclick = goRestart;
  }
  function renderLost() { lostUI.querySelector('#lebg-secs').textContent = '+' + rewardSeconds() + ' Sec.'; }
  function onAddTime() {
    // Offline (sem ad real): reinicia o nivel com tempo cheio. Trocar por CiDi rewarded + retomar com +tempo.
    goRestart();
  }

  /* ---------- hook anti-flash + ciclo ---------- */
  var hooked = false;
  function tryHook() {
    if (hooked) return;
    try {
      var sc = scene();
      if (sc && sc.events) {
        var h = function () { try { sc.sys.setVisible(false); } catch (e) {} };
        sc.events.on('start', h); sc.events.on('wake', h); hooked = true;
      }
    } catch (e) {}
  }

  function show() {
    if (isLost()) { buildLost(); renderLost(); lostUI.style.display = 'flex'; }
    else { buildWin(); applied = false; cycleIdx = 0; renderWin(); startCycle(); winUI.style.display = 'flex'; }
    shown = true; hidePhaser(true);
  }
  function hide() { stopCycle(); if (winUI) winUI.style.display = 'none'; if (lostUI) lostUI.style.display = 'none'; shown = false; }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false;
    try { active = gm.scene.isActive('LevelEnd'); } catch (e) {}
    if (active && !shown) show();
    else if (!active && shown) hide();
  }, 30);

  console.log('%c[LEVELEND-BRIDGE]', 'color:#2bb583', 'ativo (win + time\'s up).');
})();
