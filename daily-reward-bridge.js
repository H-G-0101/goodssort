/*
 * daily-reward-bridge.js  -  modal Daily Reward (cena 'Reward') com o visual enviado (grid 7 dias)
 * Nativo: rewards = [hint,100,mix,100,freeze,300,400]; dia atual = stats.rewardDay (1-7, cicla);
 * claim -> da o premio + lastRewardDate=now + rewardDay+1 (volta a 1 apos 7). Caller = Menu.
 */
(function () {
  // 7 dias (edite a vontade). type: coins|hint|mix|freeze
  var DAYS = [
    { type: 'hint',   amount: 1,   icon: '\uD83D\uDCA1' },  // dia 1
    { type: 'coins',  amount: 100, icon: '\uD83E\uDE99' },  // dia 2
    { type: 'mix',    amount: 1,   icon: '\uD83D\uDD00' },  // dia 3
    { type: 'coins',  amount: 100, icon: '\uD83E\uDE99' },  // dia 4
    { type: 'freeze', amount: 1,   icon: '\u2744\uFE0F' },  // dia 5
    { type: 'coins',  amount: 300, icon: '\uD83E\uDE99' },  // dia 6
    { type: 'coins',  amount: 400, icon: '\uD83E\uDE99' }   // dia 7
  ];

  var ui = null, shown = false, hooked = false;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function save() {
    try { if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; } } catch (e) {}
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }
  function scene() { try { return g().scene.getScene('Reward'); } catch (e) { return null; } }
  function rewardDay() { var st = stats(); var d = st && st.rewardDay; return (typeof d === 'number' && d >= 1 && d <= 7) ? d : 1; }
  function caller() {
    var sc = scene();
    if (sc && sc.fromWhere) { var fw = sc.fromWhere; if (typeof fw === 'string') return fw; if (fw.scene) return (typeof fw.scene === 'string') ? fw.scene : (fw.scene.key || 'Menu'); }
    return 'Menu';
  }
  function hidePhaser(h) { try { var sc = scene(); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!h); } catch (e) {} }

  function cellStyle(state) {
    var base = 'position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;';
    if (state === 'claimed') return base + 'opacity:.55;';
    if (state === 'locked') return base + 'opacity:.9;';
    return base; // current
  }
  function tileStyle(state) {
    var b = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;padding:14px 6px 10px;border-radius:16px;background:rgba(255,255,255,0.5);box-shadow:inset 0 1px 0 rgba(255,255,255,0.8);';
    return b + (state === 'current' ? 'border:2.5px solid #6a5fc8;box-shadow:0 0 0 3px rgba(122,110,224,0.25),inset 0 1px 0 rgba(255,255,255,0.8);' : 'border:1.5px solid rgba(255,255,255,0.7);');
  }
  function pillStyle(state) {
    var grad = (state === 'current') ? 'linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72)' : 'linear-gradient(#7a6ee0,#5246c4 55%,#4438ad)';
    var bd = (state === 'current') ? '#2e8f6b' : '#3a2f8c';
    return 'display:flex;align-items:center;justify-content:center;min-width:62px;height:30px;padding:0 14px;border-radius:15px;border:1.5px solid ' + bd + ';background:' + grad + ';box-shadow:0 3px 7px rgba(40,28,80,0.3);';
  }
  function stateOf(n) { var d = rewardDay(); return n < d ? 'claimed' : (n === d ? 'current' : 'locked'); }

  function checkBadge() {
    return '<span style="position:absolute;top:-8px;right:-8px;z-index:3;width:30px;height:30px;border-radius:50%;border:2.5px solid #fff;background:linear-gradient(#f25fa8,#e0318a);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(180,30,110,0.4);">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 13 10 18 19 6"></polyline></svg></span>';
  }
  function dayCell(n) {
    var d = DAYS[n - 1], st = stateOf(n);
    return '<div style="' + cellStyle(st) + '">' +
      (st === 'claimed' ? checkBadge() : '') +
      '<div style="' + tileStyle(st) + '">' +
        '<span style="display:flex;align-items:center;justify-content:center;height:34px;font-size:28px;">' + d.icon + '</span>' +
        '<span style="font-weight:800;font-size:24px;color:#3a3358;line-height:1;text-shadow:0 1px 0 rgba(255,255,255,0.6);">' + d.amount + '</span>' +
      '</div>' +
      '<div style="' + pillStyle(st) + '"><span style="white-space:nowrap;font-weight:700;font-size:16px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">Day ' + n + '</span></div>' +
    '</div>';
  }
  function day7() {
    var d = DAYS[6], st = stateOf(7);
    var ring = (st === 'current') ? 'border:2.5px solid #6a5fc8;box-shadow:0 0 0 3px rgba(122,110,224,0.25),inset 0 1px 0 rgba(255,255,255,0.8);' : 'border:1.5px solid rgba(255,255,255,0.7);box-shadow:inset 0 1px 0 rgba(255,255,255,0.8);';
    var pgrad = (st === 'current') ? 'linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72)' : 'linear-gradient(#5246c4,#4438ad)';
    var pbd = (st === 'current') ? '#2e8f6b' : '#3a2f8c';
    return '<div style="grid-column:1 / -1;position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 14px 14px;border-radius:18px;background:rgba(255,255,255,0.4);opacity:' + (st === 'claimed' ? '.55' : '1') + ';' + ring + '">' +
      (st === 'claimed' ? checkBadge() : '') +
      '<span style="display:flex;align-items:center;justify-content:center;height:34px;font-size:30px;">' + d.icon + '</span>' +
      '<span style="font-weight:800;font-size:26px;color:#3a3358;line-height:1;text-shadow:0 1px 0 rgba(255,255,255,0.6);">' + d.amount + '</span>' +
      '<div style="display:flex;align-items:center;justify-content:center;min-width:120px;height:40px;padding:0 22px;border-radius:20px;border:1.5px solid ' + pbd + ';background:' + pgrad + ';box-shadow:0 3px 7px rgba(40,28,80,0.3);"><span style="white-space:nowrap;font-weight:700;font-size:18px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.2);">Day 7</span></div>' +
    '</div>';
  }

  function build() {
    if (ui) { ui.querySelector('#dr-grid').innerHTML = gridHTML(); return; }
    var root = document.createElement('div'); root.id = 'dr-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 30%,#4a3f6e 0%,#2c2440 70%,#1d1730 100%);font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:360px;max-width:100%;">' +
        '<div style="position:relative;z-index:2;margin-top:30px;padding:60px 22px 26px;border-radius:28px;background:linear-gradient(#e9e2fb,#ddd2f5);border:2px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.4);">' +
          '<div id="dr-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">' + gridHTML() + '</div>' +
          '<div style="display:flex;justify-content:center;margin-top:22px;">' +
            '<button id="dr-collect" style="display:flex;align-items:center;justify-content:center;width:100%;height:64px;border-radius:22px;cursor:pointer;font-family:inherit;border:2px solid #2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);box-shadow:0 5px 12px rgba(30,140,98,0.4);">' +
              '<span style="font-weight:800;font-size:28px;color:#fff;letter-spacing:0.5px;text-shadow:0 2px 0 rgba(0,0,0,0.2);">Collect</span></button>' +
          '</div>' +
        '</div>' +
        '<div style="position:absolute;z-index:4;top:0;left:-14px;right:-14px;height:64px;border-radius:16px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);border:2px solid #3a2f8c;box-shadow:inset 0 3px 0 rgba(220,214,255,0.5),inset 0 -5px 0 rgba(0,0,0,0.15),0 5px 10px rgba(40,28,80,0.35);display:flex;align-items:center;justify-content:center;">' +
          '<span style="white-space:nowrap;font-weight:800;font-size:32px;color:#fff;-webkit-text-stroke:4px #4438ad;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,0.18);">Daily Reward</span>' +
          '<div style="position:absolute;left:-8px;top:42px;width:0;height:0;border-top:14px solid #3a2f8c;border-left:10px solid transparent;"></div>' +
          '<div style="position:absolute;right:-8px;top:42px;width:0;height:0;border-top:14px solid #3a2f8c;border-right:10px solid transparent;"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root); ui = root;
    root.querySelector('#dr-collect').onclick = onCollect;
  }
  function gridHTML() { return dayCell(1) + dayCell(2) + dayCell(3) + dayCell(4) + dayCell(5) + dayCell(6) + day7(); }

  var collecting = false;
  function onCollect() {
    if (collecting) return;                 // anti double-tap (coleta dupla)
    collecting = true;
    var st = stats(); if (!st) { collecting = false; close(); return; }
    // ELEGIBILIDADE: 1 claim por dia-calendario. Se a cena for reaberta no mesmo dia
    // (qualquer fluxo), fecha sem conceder - nao confia so no gate da cena nativa.
    var last = st.lastRewardDate || 0;
    if (last > 0) {
      var a = new Date(last), b = new Date();
      var sameDay = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      if (sameDay) {
        console.warn('[DAILY-BRIDGE] ja coletado hoje - sem novo premio.');
        close();
        setTimeout(function () { collecting = false; }, 800);
        return;
      }
    }
    var d = DAYS[rewardDay() - 1];
    if (d.type === 'coins') st.coins = (st.coins || 0) + d.amount;
    else if (d.type === 'hint') st.hintCount = (st.hintCount || 0) + d.amount;
    else if (d.type === 'mix') st.mixCount = (st.mixCount || 0) + d.amount;
    else if (d.type === 'freeze') st.freezeCount = (st.freezeCount || 0) + d.amount;
    st.lastRewardDate = Date.now();
    st.rewardDay = (rewardDay() >= 7) ? 1 : rewardDay() + 1;
    save();
    try { if (st.audio && g().sounds && g().sounds.collect) g().sounds.collect.play(); } catch (e) {}
    close();
    setTimeout(function () { collecting = false; }, 800);   // libera so depois de fechado
  }
  function close() {
    try {
      var gm = g(), sc = scene(), ck = caller();
      hidePhaser(false);
      try { if (sc && typeof sc.resumedPreviousScene === 'function') sc.resumedPreviousScene(); } catch (e) {}
      gm.scene.stop('Reward');
      if (ck) { try { gm.scene.resume(ck); } catch (e) {} var cs = gm.scene.getScene(ck); if (cs && typeof cs.updateInfo === 'function') { try { cs.updateInfo(); } catch (e) {} } }
    } catch (e) { console.warn('[DAILY-BRIDGE] close', e); }
    hide();
  }
  function show() { build(); ui.style.display = 'flex'; shown = true; hidePhaser(true); }
  function hide() { if (ui) ui.style.display = 'none'; shown = false; }

  function tryHook() {
    if (hooked) return;
    try { var sc = scene(); if (sc && sc.events) { var h = function () { try { sc.sys.setVisible(false); } catch (e) {} }; sc.events.on('start', h); sc.events.on('wake', h); hooked = true; } } catch (e) {}
  }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false; try { active = gm.scene.isActive('Reward'); } catch (e) {}
    if (active && !shown) show();
    else if (!active && shown) hide();
  }, 30);

  console.log('%c[DAILY-BRIDGE]', 'color:#7b4fe0', 'ativo (Daily Reward 7 dias).');
})();
