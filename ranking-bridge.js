/*
 * ranking-bridge.js  -  modal Ranking (cena 'Leaderboard') com o visual enviado.
 * Le game.rankingList (bots) + insere o jogador {name:'You', score:stats.score}, ordena desc,
 * top 3 com medalha. Caller = Menu.
 */
(function () {
  var PLAYER_NAME = 'You';   // nome do jogador na lista (editavel)
  var MEDALS = [
    { bg: '#f4b400', rA: '#5246c4', rB: '#7a6ee0' },  // 1o ouro
    { bg: '#aab4bf', rA: '#5246c4', rB: '#7a6ee0' },  // 2o prata
    { bg: '#cd7f32', rA: '#5246c4', rB: '#7a6ee0' }   // 3o bronze
  ];

  // ===== BOTS (nomes + pontuacao) - edite a vontade =====
  var BOTS = [
    { name: 'Maya',  score: 48500 },
    { name: 'Leo',   score: 44200 },
    { name: 'Nova',  score: 41800 },
    { name: 'Kai',   score: 39500 },
    { name: 'Ruby',  score: 37100 },
    { name: 'Zane',  score: 35400 },
    { name: 'Mochi', score: 33800 },
    { name: 'Pixel', score: 31600 },
    { name: 'Luna',  score: 29900 },
    { name: 'Ace',   score: 28200 },
    { name: 'Coco',  score: 26500 },
    { name: 'Bolt',  score: 24800 },
    { name: 'Mia',   score: 23100 },
    { name: 'Finn',  score: 21400 },
    { name: 'Sky',   score: 19700 },
    { name: 'Duke',  score: 18000 },
    { name: 'Ivy',   score: 16300 },
    { name: 'Tiger', score: 14600 },
    { name: 'Kiki',  score: 12900 },
    { name: 'Max',   score: 11200 },
    { name: 'Bee',   score: 9500 },
    { name: 'Jax',   score: 7800 },
    { name: 'Pepe',  score: 6100 },
    { name: 'Tofu',  score: 4400 },
    { name: 'Remy',  score: 2700 }
  ];

  var ui = null, shown = false, hooked = false;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function scene() { try { return g().scene.getScene('Leaderboard'); } catch (e) { return null; } }
  function hidePhaser(h) { try { var sc = scene(); if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!h); } catch (e) {} }
  function fmt(n) { try { return Number(n).toLocaleString('pt-BR'); } catch (e) { return '' + n; } }

  function buildList() {
    var rows = BOTS.map(function (x) { return { name: x.name, score: x.score, me: false }; });
    var st = stats();
    rows.push({ name: PLAYER_NAME, score: (st && st.score) || 0, me: true });
    rows.sort(function (a, b) { return b.score - a.score; });
    for (var i = 0; i < rows.length; i++) rows[i].rank = i + 1;
    return rows;
  }

  function rowHTML(r) {
    var medal = (r.rank <= 3);
    var badge;
    if (medal) {
      var m = MEDALS[r.rank - 1];
      badge =
        '<span style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;">' +
          '<span style="position:absolute;bottom:-6px;left:7px;width:8px;height:16px;background:' + m.rA + ';transform:rotate(16deg);border-radius:2px;"></span>' +
          '<span style="position:absolute;bottom:-6px;right:7px;width:8px;height:16px;background:' + m.rB + ';transform:rotate(-16deg);border-radius:2px;"></span>' +
          '<span style="position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:' + m.bg + ';border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.25);font-weight:800;font-size:15px;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,0.3);">' + r.rank + '</span>' +
        '</span>';
    } else {
      badge = '<span style="font-weight:800;font-size:21px;color:#5a4a3a;">' + r.rank + '</span>';
    }
    var rowBg = r.me ? 'linear-gradient(#bfe9cf,#a9e0c0)' : 'linear-gradient(#d7cbf3,#c9bced)';
    var rowBd = r.me ? '2px solid #3fae74' : '1.5px solid rgba(255,255,255,0.55)';
    var nm = r.me ? (PLAYER_NAME) : r.name;
    return '<div data-me="' + (r.me ? 1 : 0) + '" style="display:flex;align-items:center;gap:14px;height:64px;padding:0 22px 0 16px;border-radius:20px;background:' + rowBg + ';border:' + rowBd + ';box-shadow:inset 0 1px 0 rgba(255,255,255,0.6);flex-shrink:0;">' +
      '<div style="width:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + badge + '</div>' +
      '<span style="flex:1;font-weight:800;font-size:23px;color:#5a4a3a;letter-spacing:0.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + nm + '</span>' +
      '<span style="font-weight:800;font-size:21px;color:#5a4a3a;">' + fmt(r.score) + '</span>' +
    '</div>';
  }

  function build() {
    var root = document.createElement('div'); root.id = 'rk-root';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 30%,#4a3f6e 0%,#2c2440 70%,#1d1730 100%);font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:340px;max-width:100%;">' +
        '<div style="position:relative;z-index:2;margin-top:32px;padding:58px 18px 26px;border-radius:28px;background:linear-gradient(#e7e0fa,#dbd0f4);border:3px solid #3f3ad0;box-shadow:0 10px 30px rgba(30,20,60,0.4);">' +
          '<div id="rk-rows" style="display:flex;flex-direction:column;gap:14px;max-height:60vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-right:2px;"></div>' +
        '</div>' +
        '<div style="position:absolute;z-index:4;top:0;left:-8px;right:-8px;height:66px;border-radius:18px;background:linear-gradient(#6a5bb8,#4f3f96 55%,#3f3185);border:3px solid #2f2570;box-shadow:inset 0 3px 0 rgba(210,200,255,0.45),inset 0 -5px 0 rgba(0,0,0,0.18),0 5px 10px rgba(40,28,80,0.35);display:flex;align-items:center;justify-content:center;">' +
          '<span style="white-space:nowrap;font-weight:800;font-size:38px;color:#fff;-webkit-text-stroke:5px #3f3185;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,0.2);">Ranking</span>' +
        '</div>' +
        '<button id="rk-close" aria-label="Close" style="position:absolute;z-index:6;top:-14px;right:-14px;width:44px;height:44px;border:2px solid #fff;border-radius:50%;cursor:pointer;background:linear-gradient(#ff6f5e,#e8463a 60%,#d23528);color:#fff;font-family:inherit;display:flex;align-items:center;justify-content:center;">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>' +
        '</button>' +
      '</div>';
    document.body.appendChild(root); ui = root;
    root.querySelector('#rk-close').onclick = close;
  }

  function render() {
    if (!ui) build();
    var rows = buildList();
    var box = ui.querySelector('#rk-rows');
    box.innerHTML = rows.map(rowHTML).join('');
    // rola ate o jogador
    setTimeout(function () {
      try { var me = box.querySelector('[data-me="1"]'); if (me) box.scrollTop = Math.max(0, me.offsetTop - box.clientHeight / 2 + me.clientHeight / 2); } catch (e) {}
    }, 30);
  }

  function close() {
    try {
      var gm = g(), sc = scene();
      hidePhaser(false);
      try { if (sc && typeof sc.resumedPreviousScene === 'function') sc.resumedPreviousScene(); } catch (e) {}
      gm.scene.stop('Leaderboard');
      try { gm.scene.resume('Menu'); } catch (e) {}
      var ms = gm.scene.getScene('Menu'); if (ms && typeof ms.updateInfo === 'function') { try { ms.updateInfo(); } catch (e) {} }
    } catch (e) { console.warn('[RANK-BRIDGE] close', e); }
    hide();
  }
  function show() { render(); ui.style.display = 'flex'; shown = true; hidePhaser(true); }
  function hide() { if (ui) ui.style.display = 'none'; shown = false; }

  function tryHook() {
    if (hooked) return;
    try { var sc = scene(); if (sc && sc.events) { var h = function () { try { sc.sys.setVisible(false); } catch (e) {} }; sc.events.on('start', h); sc.events.on('wake', h); hooked = true; } } catch (e) {}
  }

  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false; try { active = gm.scene.isActive('Leaderboard'); } catch (e) {}
    if (active && !shown) show();
    else if (!active && shown) hide();
  }, 30);

  console.log('%c[RANK-BRIDGE]', 'color:#3f3ad0', 'ativo (Ranking).');
})();
