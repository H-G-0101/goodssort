/*
 * plus-coins-bridge.js  -  modal da pilula de MOEDAS (cena PlusCoins) com 4 opcoes de ad
 * Nativo tinha 1 opcao (ad -> +100 = plusCoinsTab). Aqui: 4 opcoes, cada uma 1 rewarded ad.
 * PlusCoins e lancada como overlay e PAUSA o caller; this.fromWhere.scene.key = caller.
 * O ad e um STUB offline (sucesso imediato) -> trocar por CiDi rewarded em playAd().
 */
(function () {
  // valores das 4 opcoes (edite a vontade). 1a = plusCoinsTab (100) do jogo.
  var OPTIONS = [100, 250, 500, 1000];

  var ui = null, shown = false, hooked = false;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function save() {
    try { if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; } } catch (e) {}
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }
  function scene() { try { return g().scene.getScene('PlusCoins'); } catch (e) { return null; } }
  function caller() {
    var sc = scene(); if (!sc) return null;
    var fw = sc.fromWhere;
    if (typeof fw === 'string') return fw;                      // alguns callers passam a string direto
    if (fw && typeof fw.scene === 'string') return fw.scene;    // Menu passa {scene:"Menu",...}
    if (fw && fw.scene && fw.scene.key) return fw.scene.key;
    return null;
  }
  function coins() { var st = stats(); return st ? (st.coins || 0) : 0; }
  function hidePhaser(hideIt) { try { var sc = scene(); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!hideIt); } catch (e) {} }

  // STUB do rewarded ad (offline = sucesso). Trocar por CiDi:
  //   CiDi.showRewardedAd().then(function(ok){ if(ok) onReward(); });
  function playAd(onReward) { try { onReward(); } catch (e) { console.warn('[PLUSCOINS-BRIDGE] ad', e); } }

  function coinIcon() {
    return '<div style="position:relative;width:40px;height:42px;flex:0 0 auto;">' +
      '<div style="position:absolute;left:0;bottom:0;width:40px;height:14px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#b58bff,#6d3fd6);box-shadow:inset 0 -3px 4px rgba(50,15,110,0.5);"></div>' +
      '<div style="position:absolute;left:0;bottom:8px;width:40px;height:14px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#b58bff,#6d3fd6);box-shadow:inset 0 -3px 4px rgba(50,15,110,0.5);"></div>' +
      '<div style="position:absolute;left:0;bottom:16px;width:40px;height:16px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#c9a6ff,#7b4fe0);box-shadow:inset 0 -3px 4px rgba(50,15,110,0.45),inset 0 2px 3px rgba(255,255,255,0.5);"></div></div>';
  }
  function adBtn(i) {
    return '<button data-i="' + i + '" class="pcb-ad" style="display:flex;align-items:center;justify-content:center;gap:8px;min-width:104px;height:48px;padding:0 18px;border-radius:24px;cursor:pointer;font-family:inherit;border:2px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 4px 10px rgba(30,140,98,0.35);">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;background:#3f6fe0;border:2px solid #fff;border-radius:7px;font-size:12px;font-weight:800;color:#fff;padding:2px 7px;letter-spacing:.5px;">AD</span>' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="14" height="14" rx="3" fill="#fff"></rect><polygon points="7.5 9 7.5 15 12 12" fill="#2bb583"></polygon><path d="M16.5 9.5 21 7v10l-4.5-2.5z" fill="#fff"></path></svg>' +
      '</button>';
  }
  function row(i) {
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,0.55);border:1.5px solid rgba(255,255,255,0.75);box-shadow:inset 0 1px 0 rgba(255,255,255,0.8);">' +
      coinIcon() +
      '<span style="font-weight:800;font-size:30px;color:#4a4060;line-height:1;flex:1;">+' + OPTIONS[i] + '</span>' +
      adBtn(i) + '</div>';
  }

  function build() {
    if (ui) return;
    var root = document.createElement('div'); root.id = 'pcb-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 30%,rgba(74,63,110,0.92),rgba(29,23,48,0.94));font-family:"Baloo 2",system-ui,sans-serif;';
    var rows = ''; for (var i = 0; i < OPTIONS.length; i++) rows += row(i);
    root.innerHTML =
      '<div style="position:relative;width:340px;max-width:100%;">' +
        '<div style="position:relative;z-index:3;margin:0 6px -26px;height:72px;border-radius:20px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(220,214,255,0.4),0 4px 12px rgba(40,28,80,0.25);border:1.5px solid #3a2f8c;display:flex;align-items:center;justify-content:center;">' +
          '<span style="font-weight:800;font-size:30px;color:#fff;-webkit-text-stroke:3px #4438ad;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,0.18);">Get Coins!</span>' +
        '</div>' +
        '<button id="pcb-close" aria-label="Close" style="position:absolute;z-index:5;top:-10px;right:-10px;width:44px;height:44px;border-radius:50%;cursor:pointer;border:2px solid #fff;background:linear-gradient(#ff8a8a,#e9573f);box-shadow:0 3px 8px rgba(150,40,30,0.4);color:#fff;font-weight:800;font-size:22px;line-height:1;">\u00D7</button>' +
        '<div style="position:relative;z-index:2;padding:48px 20px 22px;border-radius:26px;background:linear-gradient(#efebff,#e4def8);border:1.5px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.35);">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;">' + coinIcon() +
            '<span id="pcb-balance" style="font-weight:800;font-size:26px;color:#4a4060;">0</span></div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;">' + rows + '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root); ui = root;
    root.querySelector('#pcb-close').onclick = close;
    var btns = root.querySelectorAll('.pcb-ad');
    btns.forEach(function (b) {
      b.onclick = function () {
        var i = parseInt(b.getAttribute('data-i'), 10);
        b.disabled = true; b.style.filter = 'grayscale(0.4)';
        playAd(function () {
          var st = stats(); if (st) { st.coins = (st.coins || 0) + OPTIONS[i]; save(); }
          try { if (g().data.stats.audio && g().sounds && g().sounds.collect) g().sounds.collect.play(); } catch (e) {}
          renderBalance();
          setTimeout(function () { b.disabled = false; b.style.filter = ''; }, 400);
        });
      };
    });
  }
  function renderBalance() { if (ui) ui.querySelector('#pcb-balance').textContent = coins(); }

  function close() {
    try {
      var gm = g(), sc = scene(), ck = caller();
      hidePhaser(false);
      try { if (sc && typeof sc.resumedPreviousScene === 'function') sc.resumedPreviousScene(); } catch (e) {}
      gm.scene.stop('PlusCoins');
      if (ck) {
        try { gm.scene.resume(ck); } catch (e) {}
        var cs = gm.scene.getScene(ck);
        if (cs && typeof cs.updateInfo === 'function') { try { cs.updateInfo(); } catch (e) {} }
      }
    } catch (e) { console.warn('[PLUSCOINS-BRIDGE] close', e); }
    hide();
  }
  function show() { build(); renderBalance(); ui.style.display = 'flex'; shown = true; hidePhaser(true); }
  function hide() { if (ui) ui.style.display = 'none'; shown = false; }

  function tryHook() {
    if (hooked) return;
    try { var sc = scene(); if (sc && sc.events) { var h = function () { try { sc.sys.setVisible(false); } catch (e) {} }; sc.events.on('start', h); sc.events.on('wake', h); hooked = true; } } catch (e) {}
  }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false; try { active = gm.scene.isActive('PlusCoins'); } catch (e) {}
    if (active && !shown) show();
    else if (!active && shown) hide();
  }, 30);

  console.log('%c[PLUSCOINS-BRIDGE]', 'color:#7b4fe0', 'ativo (4 opcoes de ad).');
})();
