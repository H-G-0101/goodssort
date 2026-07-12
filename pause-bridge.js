/*
 * pause-bridge.js  -  PONTE DO PAUSE EM JOGO
 * Carrega DEPOIS do shop-bridge.js (reusa window.__game).
 * A cena "SettingsGame" e o menu de pause em jogo (abre so de Level/LevelRelax).
 * Mostra a overlay de pause por cima, com os handlers reais do jogo:
 *   Continuar = stop SettingsGame + resume(fromWhere)
 *   Reiniciar = stop SettingsGame + getScene(fromWhere).scene.restart()
 *   Home      = stop SettingsGame + stop(fromWhere) + getScene("Menu").scene.restart()
 *   Som/Musica= toggle stats.audio/music + saveUserData()
 */
(function () {
  var ui = null, shown = false;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function save() {
    try { if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; } } catch (e) {}
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }
  function applyMusic(on) {
    try { var sm = g().sound; if (sm && sm.sounds) sm.sounds.forEach(function (s) { if (s && s.loop && s.setMute) s.setMute(!on); }); } catch (e) {}
  }
  function fromWhere() {
    try { var sc = g().scene.getScene('SettingsGame'); return sc && sc.fromWhere; } catch (e) { return null; }
  }
  function hidePhaser(hideIt) {
    try { var sc = g().scene.getScene('SettingsGame'); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!hideIt); } catch (e) {}
  }

  function buildUI() {
    if (ui) return;
    var root = document.createElement('div');
    root.id = 'pbg-overlay';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(20,15,40,0.55);font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:300px;max-width:100%;">' +
        '<div style="position:relative;z-index:3;margin:0 6px -26px;height:78px;border-radius:22px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(220,214,255,0.4),0 4px 12px rgba(40,28,80,0.25);border:1.5px solid #3a2f8c;display:flex;align-items:center;justify-content:center;">' +
          '<span style="font-weight:800;font-size:38px;color:#fff;-webkit-text-stroke:3px #4438ad;paint-order:stroke fill;">Pause</span>' +
        '</div>' +
        '<button id="pbg-close" style="position:absolute;z-index:6;top:-14px;right:-14px;width:44px;height:44px;border:2px solid #fff;border-radius:50%;cursor:pointer;background:linear-gradient(#ff6f5e,#e8463a 60%,#d23528);color:#fff;font-size:22px;font-weight:800;">\u00D7</button>' +
        '<div style="position:relative;z-index:2;padding:50px 44px 46px;border-radius:26px;background:linear-gradient(#efebff,#e4def8);border:1.5px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.35);">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;justify-items:center;">' +
            '<button id="pbg-sound" style="width:78px;height:78px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:30px;"></button>' +
            '<button id="pbg-music" style="width:78px;height:78px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:30px;"></button>' +
            '<button id="pbg-home" style="width:78px;height:78px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:32px;border:1.5px solid #4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:0 3px 8px rgba(70,55,150,0.3);">\u{1F3E0}</button>' +
            '<button id="pbg-restart" style="width:78px;height:78px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:32px;border:1.5px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 3px 8px rgba(30,140,98,0.3);">\u{1F504}</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    ui = root;
    root.querySelector('#pbg-close').onclick = doContinue;
    root.querySelector('#pbg-home').onclick = doHome;
    root.querySelector('#pbg-restart').onclick = doRestart;
    root.querySelector('#pbg-sound').onclick = function () { var st = stats(); if (!st) return; st.audio = !st.audio; save(); render(); };
    root.querySelector('#pbg-music').onclick = function () { var st = stats(); if (!st) return; st.music = !st.music; applyMusic(st.music); save(); render(); };
  }

  function iconStyle(on) {
    var b = 'width:78px;height:78px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:30px;border:1.5px solid ';
    return on
      ? b + '#4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:0 3px 8px rgba(70,55,150,0.3);'
      : b + '#9aa1c0;background:linear-gradient(#dcd9ea,#bcb6d6);box-shadow:inset 0 2px 0 rgba(255,255,255,0.5);';
  }
  function render() {
    var st = stats(); if (!st) return;
    var s = ui.querySelector('#pbg-sound'); s.style.cssText = iconStyle(!!st.audio); s.textContent = st.audio ? '\u{1F50A}' : '\u{1F507}';
    var m = ui.querySelector('#pbg-music'); m.style.cssText = iconStyle(!!st.music); m.textContent = st.music ? '\u{1F3B5}' : '\u{1F515}';
  }

  // Garante que a cena do jogo volte visivel e ativa (a cena SettingsGame e destruida,
  // entao restaurar a visibilidade DELA nao adianta).
  function restoreGame(fw) {
    var gm = g(); if (!gm) return;
    var targets = fw ? [fw] : [];
    ['Level', 'LevelTutorial'].forEach(function (n) { if (targets.indexOf(n) < 0) targets.push(n); });
    targets.forEach(function (n) {
      try {
        var sc = gm.scene.getScene(n);
        if (!sc) return;
        if (sc.sys && sc.sys.setVisible) sc.sys.setVisible(true);
        gm.scene.resume(n);
      } catch (e) {}
    });
  }

  function doContinue() {
    try { var gm = g(), fw = fromWhere(); gm.scene.stop('SettingsGame'); restoreGame(fw); }
    catch (e) { console.warn('[PAUSE-BRIDGE] continuar', e); }
    hide();
  }
  function doRestart() {
    try {
      var gm = g(), fw = fromWhere(); gm.scene.stop('SettingsGame');
      if (fw) { var lvl = gm.scene.getScene(fw); if (lvl && lvl.scene && lvl.scene.restart) { if (lvl.sys && lvl.sys.setVisible) lvl.sys.setVisible(true); lvl.scene.restart(); } }
      else restoreGame(null);
    } catch (e) { console.warn('[PAUSE-BRIDGE] reiniciar', e); }
    hide();
  }
  function doHome() {
    try {
      var gm = g(), fw = fromWhere(); hidePhaser(false);
      gm.scene.stop('SettingsGame'); if (fw) gm.scene.stop(fw);
      var menu = gm.scene.getScene('Menu'); if (menu && menu.scene && menu.scene.restart) menu.scene.restart();
    } catch (e) { console.warn('[PAUSE-BRIDGE] home', e); }
    hide();
  }

  function show() { buildUI(); render(); ui.style.display = 'flex'; shown = true; hidePhaser(true); }
  function hide() { if (ui) ui.style.display = 'none'; shown = false; }

  var hooked = false;
  function tryHook() {
    if (hooked) return;
    try {
      var sc = g().scene.getScene('SettingsGame');
      if (sc && sc.events) {
        var h = function () { try { sc.sys.setVisible(false); } catch (e) {} };
        sc.events.on('start', h);
        sc.events.on('wake', h);
        hooked = true;
      }
    } catch (e) {}
  }


  /* O jogo AUTO-PAUSA quando a pagina vai a background (visibilitychange/blur) e quando o
     rewarded ad abre. Nesses casos a cena SettingsGame sobe sozinha e o overlay de Pause
     "aparecia do nada" ao voltar (relato do testador).
     Deteccao correta: e pause automatico se a pagina NAO estava visivel quando ele ocorreu,
     ou se um ad esta rodando. Um clique do jogador acontece com a pagina visivel.
     (A versao anterior exigia "prova de clique" via hook no botao; quando o hook nao
     encontrava o botao, TODO pause era tratado como automatico -> tela travada.) */
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  });
  function isAutoPause() {
    if (window.__adRunning) return true;                 // ad em andamento
    if (document.visibilityState === 'hidden') return true;
    if (hiddenAt && (Date.now() - hiddenAt) < 1200) return true;  // acabou de voltar
    return false;
  }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false;
    try { active = gm.scene.isActive('SettingsGame'); } catch (e) {}
    if (active && !shown) {
      if (isAutoPause()) {
        // pause automatico (ad / app em background): fecha a cena e retoma, sem overlay
        try { gm.scene.stop('SettingsGame'); } catch (e) {}
        ['Level', 'LevelTutorial'].forEach(function (n) {
          try {
            if (gm.scene.getScene(n)) {
              var s2 = gm.scene.getScene(n);
              if (s2.sys && s2.sys.setVisible) s2.sys.setVisible(true);
              gm.scene.resume(n);
            }
          } catch (e) {}
        });
      } else {
        show();                       // clique do jogador: comportamento normal
      }
    }
    else if (!active && shown) hide();
  }, 30);

  console.log('%c[PAUSE-BRIDGE]', 'color:#5246c4', 'ativo (SettingsGame).');
})();
