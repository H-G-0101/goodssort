/*
 * shop-bridge.js  -  PONTE EXPERIMENTAL DA LOJA
 * ---------------------------------------------------------------
 * Carrega DEPOIS do phaser.min.js e ANTES do jogo.
 * 1) Expoe window.__game embrulhando Phaser.Game (sem patchar o jogo).
 * 2) Quando a cena "Shop" abre, mostra uma overlay HTML por cima.
 * 3) Le itens/precos/comprados/moedas reais de __game e
 *    compra/equipa mutando __game.data.stats + saveUserData().
 *
 * EXPERIMENTAL: leitura e segura; compra/equipar mexem no save (JSON puro).
 * O "equipar" pode so aparecer ao reabrir a tela (o visual Phaser nao
 * atualiza ao vivo). Fechar a overlay revela a loja original por baixo.
 * ---------------------------------------------------------------
 */
(function () {
  // ---------- 1) expor o jogo ----------
  function wrapGame() {
    if (!window.Phaser || !Phaser.Game || Phaser.Game.__wrapped) return;
    var _G = Phaser.Game;
    function Wrapped() {
      var g = Reflect.construct(_G, arguments, (this && this.constructor) || Wrapped);
      window.__game = g;
      return g;
    }
    Wrapped.prototype = _G.prototype;
    Object.setPrototypeOf(Wrapped, _G);
    Wrapped.__wrapped = true;
    Phaser.Game = Wrapped;
    console.log('%c[SHOP-BRIDGE]', 'color:#7a6ee0', 'Phaser.Game embrulhado.');
  }
  wrapGame();
  if (!window.Phaser) {
    var t = setInterval(function () { if (window.Phaser) { wrapGame(); clearInterval(t); } }, 20);
  }

  // ---------- categorias reais ----------
  var CATS = [
    { cfg: 'products',    owned: 'productsOpened',    eq: 'product',    label: 'Produtos',    icon: '🛒' },
    { cfg: 'shelfs',      owned: 'shelfsOpened',      eq: 'shelf',      label: 'Prateleiras', icon: '🗄️' },
    { cfg: 'backgrounds', owned: 'backgroundsOpened', eq: 'background', label: 'Fundos',      icon: '🖼️' }
  ];
  var EMOJI = { products: '🛒', shelfs: '🗄️', backgrounds: '🖼️' };

  var ui = null, shown = false, curTab = 0, pausedKeys = [];

  // ---------- 2) overlay ----------
  function buildUI() {
    if (ui) return;
    var root = document.createElement('div');
    root.id = 'sb-overlay';
    root.style.cssText = 'position:fixed;inset:0;z-index:50000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(20,15,40,0.55);font-family:"Baloo 2",system-ui,sans-serif;';
    root.innerHTML =
      '<div style="position:relative;width:380px;max-width:100%;">' +
        '<div style="position:relative;z-index:3;margin:0 6px -26px;height:78px;border-radius:22px;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);box-shadow:inset 0 2px 0 rgba(220,214,255,0.4),0 4px 12px rgba(40,28,80,0.25);border:1.5px solid #3a2f8c;display:flex;align-items:center;justify-content:center;">' +
          '<span style="font-weight:800;font-size:42px;color:#fff;-webkit-text-stroke:3px #4438ad;paint-order:stroke fill;">Shop</span>' +
        '</div>' +
        '<button id="sb-close" style="position:absolute;z-index:6;top:-14px;right:-14px;width:44px;height:44px;border:2px solid #fff;border-radius:50%;cursor:pointer;background:linear-gradient(#ff6f5e,#e8463a 60%,#d23528);color:#fff;font-size:22px;font-weight:800;">×</button>' +
        '<div style="position:relative;z-index:2;padding:42px 18px 22px;border-radius:26px;background:linear-gradient(#efebff,#e4def8);border:1.5px solid #6a5fc8;box-shadow:0 10px 30px rgba(30,20,60,0.35);">' +
          '<div style="text-align:center;margin:-8px 0 12px;font-weight:800;color:#5246c4;">Moedas: <span id="sb-coins">0</span></div>' +
          '<div id="sb-tabs" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;"></div>' +
          '<div id="sb-items" class="gs-scroll" style="height:340px;overflow-y:auto;padding:4px;display:grid;grid-template-columns:1fr 1fr;gap:14px;"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    ui = root;
    root.querySelector('#sb-close').onclick = function () { closeShop(); };
  }

  function tabStyle(active) {
    var b = 'display:flex;flex-direction:column;align-items:center;gap:3px;height:62px;border-radius:16px;cursor:pointer;font-family:inherit;border:1.5px solid ';
    return active
      ? b + '#4438ad;background:linear-gradient(#7a6ee0,#5246c4 55%,#4438ad);color:#fff;'
      : b + '#cabfee;background:linear-gradient(#f7f5ff,#eae8f9);color:#6a5fb0;';
  }
  function buyStyle(kind) {
    var base = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:40px;border-radius:20px;cursor:pointer;font-family:inherit;font-weight:800;color:#fff;border:1.5px solid ';
    if (kind === 'eq')  return base + '#9a37b8;background:linear-gradient(#d678e8,#b23ccf);';        // equipado
    if (kind === 'sel') return base + '#2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);'; // possui -> selecionar
    return base + '#2e8f6b;background:linear-gradient(#5fd6a6,#2bb583 55%,#1f9f72);';                 // comprar
  }

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function cfg() { try { return g().ShopConfig; } catch (e) { return null; } }

  function render() {
    var st = stats(), sc = cfg();
    if (!st || !sc) return;
    ui.querySelector('#sb-coins').textContent = st.coins;
    // tabs
    var tabsEl = ui.querySelector('#sb-tabs'); tabsEl.innerHTML = '';
    CATS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.style.cssText = tabStyle(i === curTab);
      b.innerHTML = '<span style="font-size:24px;">' + c.icon + '</span><span style="font-weight:700;font-size:12px;">' + c.label + '</span>';
      b.onclick = function () { curTab = i; render(); };
      tabsEl.appendChild(b);
    });
    // items
    var cat = CATS[curTab];
    var data = sc[cat.cfg] || {};
    var owned = st[cat.owned] || [];
    var equipped = st[cat.eq];
    var itemsEl = ui.querySelector('#sb-items'); itemsEl.innerHTML = '';
    Object.keys(data).forEach(function (id) {
      var price = data[id] && typeof data[id].price !== 'undefined' ? data[id].price : 0;
      var has = owned.indexOf(id) !== -1 || owned.indexOf(isNaN(+id) ? id : +id) !== -1;
      var isEq = String(equipped) === String(id);
      var tile = document.createElement('div');
      tile.style.cssText = 'position:relative;border-radius:18px;background:linear-gradient(#e6e0fa,#dad2f3);border:1px solid #cabfee;padding:12px;display:flex;flex-direction:column;align-items:center;gap:10px;';
      var label, kind;
      if (isEq) { label = 'Equipado'; kind = 'eq'; }
      else if (has) { label = 'Selecionar'; kind = 'sel'; }
      else if (price > 0) { label = '🪙 ' + price; kind = 'buy'; }
      else { label = 'Assistir AD'; kind = 'buy'; }
      var prevSrc = 'assets/shop-previews/' + (cat.cfg === 'products' ? 'products/_default' : cat.cfg + '/' + id) + '.png';
      tile.innerHTML =
        (isEq ? '<span style="position:absolute;top:-9px;right:-9px;width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:linear-gradient(#d678e8,#b23ccf);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;z-index:2;">✓</span>' : '') +
        '<div style="width:100%;aspect-ratio:1.15;border-radius:14px;border:1px solid #c2b8ec;background:linear-gradient(#f0ecff,#e3dcf6);display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
          '<img src="' + prevSrc + '" alt="' + id + '" style="max-width:88%;max-height:88%;object-fit:contain;" ' +
            'onerror="this.outerHTML=\'<span style=&quot;font-size:40px&quot;>' + EMOJI[cat.cfg] + '</span>\'">' +
        '</div>';
      var btn = document.createElement('button');
      btn.style.cssText = buyStyle(kind);
      btn.textContent = label;
      btn.onclick = function () { action(cat, id, price, has, isEq); };
      tile.appendChild(btn);
      itemsEl.appendChild(tile);
    });
  }

  // ---------- 3) comprar / equipar ----------
  var adBusy = false;
  function action(cat, id, price, has, isEq) {
    var st = stats(); if (!st) return;
    if (isEq) return; // ja equipado
    function grantAndEquip(paid) {
      try {
        if (!has) {
          if (paid) st.coins -= price;
          var idv = isNaN(+id) ? id : +id;
          st[cat.owned].push(idv);
        }
        st[cat.eq] = isNaN(+id) ? id : +id;
        save();
        render();
      } catch (e) { console.warn('[SHOP-BRIDGE] acao falhou', e); }
    }
    if (!has && !(price > 0)) {
      // item de AD: so desbloqueia com rewarded REAL (CiDi); overlay traduzido no funil
      if (adBusy) return;
      adBusy = true;
      var fn = window.__cidiAdShow || function () { return Promise.resolve(true); };
      fn().then(function (ok) {
        adBusy = false;
        if (!ok) { flash('Ad n\u00e3o conclu\u00eddo'); return; }
        grantAndEquip(false);
      });
      return;
    }
    if (!has && price > 0 && st.coins < price) { flash('Moedas insuficientes'); return; }
    grantAndEquip(!has && price > 0);
  }

  function save() {
    try {
      if (g() && typeof g().saveUserData === 'function') { g().saveUserData(); return; }
    } catch (e) {}
    // fallback: grava direto no localStorage (chave conhecida)
    try { localStorage.setItem('grocery-store_sgk', JSON.stringify(g().data)); } catch (e) {}
  }

  function flash(msg) {
    var f = document.createElement('div');
    f.textContent = msg;
    f.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:60000;background:#e8463a;color:#fff;padding:8px 16px;border-radius:10px;font-family:sans-serif;font-weight:700;';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 1500);
  }

  function hidePhaserShop(hideIt) {
    try {
      var sc = g().scene.getScene('Shop');
      if (sc && sc.sys && sc.sys.setVisible) sc.sys.setVisible(!hideIt);
    } catch (e) {}
  }

  function capturePaused() {
    pausedKeys = [];
    try {
      g().scene.scenes.forEach(function (sc) {
        var key = sc && sc.sys && sc.sys.settings && sc.sys.settings.key;
        if (key && key !== 'Shop' && g().scene.isPaused(key)) pausedKeys.push(key);
      });
    } catch (e) {}
    console.log('[SHOP-BRIDGE] cenas pausadas ao abrir:', pausedKeys);
  }

  function closeShop() {
    try {
      var gm = g();
      hidePhaserShop(false);            // restaura visibilidade da loja Phaser
      try { gm.scene.stop('Shop'); } catch (e) {}
      // resume as cenas que estavam pausadas quando a loja abriu (a de origem)
      pausedKeys.forEach(function (k) { try { gm.scene.resume(k); } catch (e) {} });
      // fallback: fromWhere da propria cena, se nada foi resumido
      if (!pausedKeys.length) {
        try {
          var sc = gm.scene.getScene('Shop');
          var fw = sc && sc.whatToBuy && sc.whatToBuy.fromWhere;
          if (fw) gm.scene.resume(fw);
        } catch (e) {}
      }
    } catch (e) { console.warn('[SHOP-BRIDGE] close falhou', e); }
    hide();
  }

  function show() { buildUI(); curTab = 0; capturePaused(); render(); ui.style.display = 'flex'; shown = true; hidePhaserShop(true); }
  function hide() { if (ui) ui.style.display = 'none'; shown = false; }

  // ---------- detectar a cena Shop ----------
  var hooked = false;
  function tryHook() {
    if (hooked) return;
    try {
      var sc = g().scene.getScene('Shop');
      if (sc && sc.events) {
        var h = function () { try { sc.sys.setVisible(false); } catch (e) {} };
        sc.events.on('start', h);
        sc.events.on('wake', h);
        hooked = true;
      }
    } catch (e) {}
  }
  setInterval(function () {
    var gm = g(); if (!gm || !gm.scene) return;
    tryHook();
    var active = false;
    try { active = gm.scene.isActive('Shop'); } catch (e) {}
    if (active && !shown) show();
    else if (!active && shown) hide();
  }, 30);
})();
