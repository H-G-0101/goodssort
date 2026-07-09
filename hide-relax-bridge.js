/*
 * hide-relax-bridge.js  -  remove o modo RELAX ("No Timer") da home.
 * A classe de botao guarda o visual em this.container (NAO e Phaser GameObject),
 * entao escondemos o container + o icone zzz. Reforca a cada 60ms. Sem tocar no bundle.
 */
(function () {
  function g() { return window.__game; }
  // a cena do tutorial (MenuTutorial) recria os botoes -> tratar as DUAS cenas
  var SCENES = ['Menu', 'MenuTutorial'];
  function menus() {
    var out = [];
    try { SCENES.forEach(function (n) { if (g().scene.isActive(n)) out.push(g().scene.getScene(n)); }); } catch (e) {}
    return out;
  }

  /* O tutorial da HOME (seta/mao + quadrado de luz + tela escura apontando p/ o shop) e
     redundante: o jogador acha o carrinho sozinho. Escondemos todo o overlay.
     Varremos as props da cena por nome (hand/hint/rect/light/mask/spot/tutor) para nao
     depender de um nome exato do bundle ofuscado. */
  var TUT_RE = /^(hand|handTween|hintRectangle|hintArray|lightScreen|screenMask|spotlight|tutorialRect|maskRect)$/i;
  function killObj(o) {
    if (!o) return;
    try {
      if (typeof o.stop === 'function') o.stop();                 // tweens
      if (typeof o.setVisible === 'function') o.setVisible(false);
      else if ('visible' in o) o.visible = false;
      if (typeof o.setActive === 'function') o.setActive(false);
      if (o.container && 'visible' in o.container) o.container.visible = false;
    } catch (e) {}
  }
  function hideHomeTutorial(m) {
    try {
      Object.keys(m).forEach(function (k) {
        if (!TUT_RE.test(k)) return;
        var o = m[k];
        if (Array.isArray(o)) o.forEach(killObj); else killObj(o);
      });
      // remove mascaras aplicadas na camera (o escurecimento vem daqui)
      try { if (m.cameras && m.cameras.main && m.cameras.main.mask) m.cameras.main.clearMask(true); } catch (e) {}
      // varre a display list por retangulos/imagens de overlay que sobrarem
      try {
        (m.children && m.children.list ? m.children.list : []).forEach(function (o) {
          if (!o) return;
          var t = o.type || '';
          var big = (o.width && o.width > 600) || (o.displayWidth && o.displayWidth > 600);
          if ((t === 'Rectangle' || t === 'Graphics') && big) { o.visible = false; }
          if (o.mask) { try { o.clearMask(true); } catch (e) {} }
        });
      } catch (e) {}
    } catch (e) {}
  }

  /* O bundle inicia a cena MenuTutorial sozinho (tutorial da home: tela escura + quadrado de
     luz + mao apontando o shop). E redundante e desalinha com nosso layout. Interceptamos o
     ScenePlugin.start: qualquer pedido de 'MenuTutorial' vira 'Menu'. Se ela ja estiver
     ativa (corrida no boot), paramos a cena e iniciamos a Menu. */
  (function killMenuTutorial() {
    var iv = setInterval(function () {
      var gm = window.__game;
      if (!gm || !gm.scene || !gm.scene.scenes || !gm.scene.scenes.length) return;
      clearInterval(iv);

      // 1) patch do ScenePlugin.start em todas as cenas (o plugin e compartilhado por prototipo)
      try {
        var anySc = gm.scene.scenes[0];
        var proto = anySc && anySc.scene && Object.getPrototypeOf(anySc.scene);
        if (proto && typeof proto.start === 'function' && !proto.__mtPatched) {
          proto.__mtPatched = 1;
          var origStart = proto.start;
          proto.start = function (key, data) {
            if (key === 'MenuTutorial') { key = 'Menu'; }
            return origStart.call(this, key, data);
          };
          console.log('[HIDE-RELAX] MenuTutorial redirecionado p/ Menu');
        }
      } catch (e) {}

      // 2) se ja estiver rodando, derruba e abre a home
      try {
        if (gm.scene.isActive('MenuTutorial')) {
          gm.scene.stop('MenuTutorial');
          if (!gm.scene.isActive('Menu')) gm.scene.start('Menu');
          console.log('[HIDE-RELAX] MenuTutorial ativo -> trocado por Menu');
        }
      } catch (e) {}
    }, 20);
    setTimeout(function () { clearInterval(iv); }, 20000);
  })();

  function killBtn(b) {
    if (!b) return;
    if (b.container) { b.container.visible = false; if (b.container.setActive) b.container.setActive(false); }
    b.canBePressed = false;
    if (b.textObject && b.textObject.setVisible) b.textObject.setVisible(false);
  }
  setInterval(function () {
    menus().forEach(function (m) {
      try {
        killBtn(m.relaxButton);
        if (m.iconzzz && m.iconzzz.setVisible) m.iconzzz.setVisible(false);
        killBtn(m.leaderboardButton);                 // ranking (medalha) tambem no tutorial
        if (m.iconLeaderboard && m.iconLeaderboard.setVisible) m.iconLeaderboard.setVisible(false);
        hideHomeTutorial(m);                          // overlay do tutorial da home (redundante)

      } catch (e) {}
    });
  }, 60);
  console.log('%c[HIDE-RELAX]', 'color:#888', 'modo relax (No Timer) oculto na home.');
})();
