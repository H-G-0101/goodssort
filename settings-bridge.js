/*
 * settings-bridge.js  -  PONTE EXPERIMENTAL DO SETTINGS (com bandeiras)
 * Carrega DEPOIS do shop-bridge.js (reusa window.__game).
 * Detecta cenas "Settings"/"SettingsGame" e mostra a overlay HTML
 * ligada a stats.audio / stats.music / stats.language + saveUserData().
 */
(function () {
  var SCENES = ['Settings'];
  var LANGS = [
    { name: 'English',     flag: '\u{1F1EC}\u{1F1E7}', code: 'en' },
    { name: 'Italiano',    flag: '\u{1F1EE}\u{1F1F9}', code: 'it' },
    { name: 'Espanol',     flag: '\u{1F1EA}\u{1F1F8}', code: 'es' },
    { name: 'Francais',    flag: '\u{1F1EB}\u{1F1F7}', code: 'fr' },
    { name: 'Deutsch',     flag: '\u{1F1E9}\u{1F1EA}', code: 'de' },
    { name: 'Tieng Viet',  flag: '\u{1F1FB}\u{1F1F3}', code: 'vi' },
    { name: 'Korean',      flag: '\u{1F1F0}\u{1F1F7}', code: 'ko' },
    { name: 'Chinese',     flag: '\u{1F1E8}\u{1F1F3}', code: 'zh' }
  ];

  var ui = null, shown = false, pausedKeys = [], activeScene = null, firstRun = false;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function isFirstRun() { try { return g().data.stats.firstLoad === true; } catch (e) { return false; } }
  function save() {
    try { if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; } } catch (e) {}
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }
  function applyMusic(on) {
    try {
      var sm = g().sound;
      if (sm && sm.sounds) sm.sounds.forEach(function (s) { if (s && s.loop && s.setMute) s.setMute(!on); });
    } catch (e) {}
  }

  function buildUI() {
    if (ui) return;
    var root = document.createElement('div');
    root.id = 'sbg-overlay';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(20,15,40,0.55);font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:360px;max-width:100%;">' +
        '<div style="position:relative;z-index:3;margin:0 6px -26px;height:78px;border-radius:22px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(220,214,255,0.4),0 4px 12px rgba(40,28,80,0.25);border:1.5px solid #3a2f8c;display:flex;align-items:center;justify-content:center;">' +
          '<span style="font-weight:800;font-size:38px;color:#fff;-webkit-text-stroke:3px #4438ad;paint-order:stroke fill;">Settings</span>' +
        '</div>' +
        '<button id="sbg-close" style="position:absolute;z-index:6;top:-14px;right:-14px;width:44px;height:44px;border:2px solid #fff;border-radius:50%;cursor:pointer;background:linear-gradient(#ff6f5e,#e8463a 60%,#d23528);color:#fff;font-size:22px;font-weight:800;">\u00D7</button>' +
        '<div style="position:relative;z-index:2;padding:46px 26px 32px;border-radius:26px;background:linear-gradient(#efebff,#e4def8);border:1.5px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.35);">' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;">' +
            '<button id="sbg-sound" style="height:70px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:30px;"></button>' +
            '<button id="sbg-music" style="height:70px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:30px;"></button>' +
            '<button id="sbg-del" style="height:70px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:28px;border:2px solid #b23a2e;background:linear-gradient(#ff8068,#e8463a 58%,#cf3327);box-shadow:inset 0 2px 0 rgba(255,255,255,0.5),0 4px 0 #a32c22;">\u{1F5D1}\uFE0F</button>' +
          '</div>' +
          '<div id="sbg-langs" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    ui = root;
    root.querySelector('#sbg-close').onclick = closeSettings;
    root.querySelector('#sbg-sound').onclick = function () { var st = stats(); if (!st) return; st.audio = !st.audio; save(); render(); };
    root.querySelector('#sbg-music').onclick = function () { var st = stats(); if (!st) return; st.music = !st.music; applyMusic(st.music); save(); render(); };
    root.querySelector('#sbg-del').onclick = function () {
      if (!window.confirm('Apagar todo o progresso? Isso nao pode ser desfeito.')) return;
      try { localStorage.removeItem('grocery-store_sgk'); } catch (e) {}
      location.reload();
    };
  }

  function toggleStyle(on) {
    var b = 'height:70px;border-radius:18px;cursor:pointer;font-family:inherit;font-size:30px;border:2px solid ';
    return on
      ? b + '#4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(255,255,255,0.35),0 4px 0 #34298a;'
      : b + '#9aa1c0;background:linear-gradient(#dcd9ea,#bcb6d6);box-shadow:inset 0 2px 0 rgba(255,255,255,0.5),0 4px 0 #8b86a8;';
  }
  function flagStyle(sel) {
    var b = 'position:relative;display:flex;align-items:center;justify-content:center;height:56px;border-radius:14px;cursor:pointer;font-family:inherit;font-size:34px;background:linear-gradient(#f6f3ff,#e9e3f8);border:';
    return sel ? b + '2px solid #b23ccf;box-shadow:0 3px 9px rgba(120,30,150,0.25);' : b + '1.5px solid #cabfee;';
  }

  function render() {
    var st = stats(); if (!st) return;
    var sBtn = ui.querySelector('#sbg-sound'); sBtn.style.cssText = toggleStyle(!!st.audio); sBtn.textContent = st.audio ? '\u{1F50A}' : '\u{1F507}';
    var mBtn = ui.querySelector('#sbg-music'); mBtn.style.cssText = toggleStyle(!!st.music); mBtn.textContent = st.music ? '\u{1F3B5}' : '\u{1F515}';
    var box = ui.querySelector('#sbg-langs'); box.innerHTML = '';
    LANGS.forEach(function (l) {
      var sel = String(st.language) === l.code;
      var b = document.createElement('button');
      b.style.cssText = flagStyle(sel);
      b.title = l.name;
      b.innerHTML = l.flag + (sel ? '<span style="position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:linear-gradient(#d678e8,#b23ccf);color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;">\u2713</span>' : '');
      b.onclick = function () { st.language = l.code; save(); render(); };
      box.appendChild(b);
    });
  }

  function hidePhaser(hideIt) {
    try { var sc = g().scene.getScene(activeScene); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!hideIt); } catch (e) {}
  }
  function capturePaused() {
    pausedKeys = [];
    try {
      g().scene.scenes.forEach(function (sc) {
        var key = sc && sc.sys && sc.sys.settings && sc.sys.settings.key;
        if (key && SCENES.indexOf(key) === -1 && g().scene.isPaused(key)) pausedKeys.push(key);
      });
    } catch (e) {}
  }
  function closeSettings() {
    try {
      var gm = g();
      hidePhaser(false);
      if (firstRun) {
        // primeiro acesso: marca firstLoad=false e vai pro tutorial (igual ao nativo)
        try { gm.scene.stop('Settings'); } catch (e) {}
        try {
          var lt = gm.scene.getScene('LevelTutorial');
          if (lt && lt.scene) { try { gm.scene.resume('LevelTutorial'); } catch (e) {} lt.scene.restart(); }
          else { gm.scene.start('LevelTutorial'); }
        } catch (e) {}
        var st = stats(); if (st) { st.firstLoad = false; save(); }
      } else {
        try { gm.scene.stop(activeScene); } catch (e) {}
        pausedKeys.forEach(function (k) { try { gm.scene.resume(k); } catch (e) {} });
      }
    } catch (e) { console.warn('[SETTINGS-BRIDGE] close', e); }
    hide();
  }

  function show(key) {
    activeScene = key; buildUI(); firstRun = isFirstRun(); capturePaused(); render();
    try { ui.querySelector('#sbg-del').style.display = firstRun ? 'none' : ''; } catch (e) {}
    ui.style.display = 'flex'; shown = true; hidePhaser(true);
  }
  function hide() { if (ui) ui.style.display = 'none'; shown = false; }

  var hooked = false;
  function tryHook() {
    if (hooked) return;
    try {
      var sc = g().scene.getScene('Settings');
      if (sc && sc.events) {
        var h = function () { try { if (g().scene.isPaused('Menu') || isFirstRun()) sc.sys.setVisible(false); } catch (e) {} };
        sc.events.on('start', h);
        sc.events.on('wake', h);
        hooked = true;
      }
    } catch (e) {}
  }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    // mostra quando aberto pelo botao (Menu pausado) OU no primeiro acesso (firstLoad)
    var ok = false;
    try { ok = gm.scene.isActive('Settings') && (gm.scene.isPaused('Menu') || isFirstRun()); } catch (e) {}
    if (ok && !shown) show('Settings');
    else if (!ok && shown) hide();
  }, 30);

  console.log('%c[SETTINGS-BRIDGE]', 'color:#8a5a2c', 'ativo (bandeiras).');
})();
