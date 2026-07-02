/*
 * sdk-stub.js  -  STUB DE ESTUDO (offline)  v2
 * ------------------------------------------------------------------
 * Substitui o SDK de anuncios (Azerion/GameDistribution) para o jogo
 * rodar offline. O SDK real esta em /vendor para estudo.
 *
 * Por que v2: o jogo usa o SDK de forma ANINHADA e MISTA:
 *   - await _azerionIntegrationSDK[x]()            -> precisa Promise
 *   - _azerionIntegrationSDK[obj].isAdPlaying()    -> metodo SINCRONO
 *                                                     num sub-objeto,
 *                                                     tem que devolver false
 *     (o jogo faz: false === isAdPlaying() && resume();
 *      se isAdPlaying() nao for false, o jogo nunca despausa)
 *
 * Solucao: um Proxy RECURSIVO e CHAMAVEL.
 *   - acessar qualquer .propriedade  -> devolve outro proxy (objeto/func)
 *   - CHAMAR como funcao             -> Promise resolvida (p/ os await)
 *   - metodos de consulta booleana (is/has/can/should) -> false SINCRONO
 * Assim funciona em qualquer profundidade, sem precisar saber os nomes.
 * ------------------------------------------------------------------
 */
(function () {
  console.log('%c[SDK-STUB v3]', 'color:#888', 'ativo - ad roteado p/ CiDi (fallback estudo offline).');

  // ambiente de estudo (localhost/file): sem CiDi, concede pra poder testar
  var IS_DEV = (location.protocol === 'file:') ||
               /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname || '');

  // === Overlay "Carregando ad..." (traduzido nas 9 linguas do jogo) ===
  var ADTXT = { en:'Loading ad...', de:'Werbung wird geladen...', es:'Cargando anuncio...',
                fr:'Chargement de la publicit\u00e9...', it:'Caricamento annuncio...',
                pl:'\u0141adowanie reklamy...', ko:'\uad11\uace0 \ub85c\ub529 \uc911...',
                zh:'\u5e7f\u544a\u52a0\u8f7d\u4e2d...', vi:'\u0110ang t\u1ea3i qu\u1ea3ng c\u00e1o...' };
  function adLang() {
    try { var l = window.__game.data.stats.language; if (l && ADTXT[l]) return l; } catch (e) {}
    try { var n = (navigator.language || 'en').slice(0, 2); if (ADTXT[n]) return n; } catch (e) {}
    return 'en';
  }
  var adOv = null;
  function adOverlay(showIt) {
    try {
      if (showIt) {
        if (!adOv) {
          adOv = document.createElement('div');
          adOv.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;' +
            'align-items:center;justify-content:center;gap:18px;background:rgba(18,14,34,0.88);' +
            'font-family:"Baloo 2",system-ui,sans-serif;';
          adOv.innerHTML =
            '<div style="width:54px;height:54px;border-radius:50%;border:5px solid rgba(255,255,255,0.25);' +
              'border-top-color:#fff;animation:cidiadspin .9s linear infinite;"></div>' +
            '<div id="cidi-ad-txt" style="font-weight:800;font-size:22px;color:#fff;' +
              'text-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>';
          var st = document.createElement('style');
          st.textContent = '@keyframes cidiadspin{to{transform:rotate(360deg)}}';
          adOv.appendChild(st);
          (document.body || document.documentElement).appendChild(adOv);
        }
        adOv.querySelector('#cidi-ad-txt').textContent = ADTXT[adLang()];
        adOv.style.display = 'flex';
      } else if (adOv) adOv.style.display = 'none';
    } catch (e) {}
  }

  // === Ad rewarded via CiDi ===
  // O jogo chama _azerionIntegrationSDK.showRewardedAd() (IS_PRODUCTION=true no bundle),
  // e trata o retorno como boolean (ok ? concede : nada). Roteamos pro CiDi.
  // Doc CiDi: showRewardedAd({timeout}) -> Promise<{success}>; SO success===true concede.
  function cidiRewarded() {
    return new Promise(function (resolve) {
      try {
        if (window.CiDiSDK && typeof CiDiSDK.showRewardedAd === 'function') {
          adOverlay(true);
          CiDiSDK.showRewardedAd({ timeout: 300000 })
            .then(function (r) {
              adOverlay(false);
              var ok = !!(r && r.success === true);
              console.log('[CiDi-Ad] showRewardedAd ->', ok, r);
              resolve(ok);
            })
            .catch(function (err) {
              adOverlay(false);
              console.warn('[CiDi-Ad] showRewardedAd falhou:', err && err.error, err && err.message);
              resolve(false);
            });
          return;
        }
        // sem CiDi: so concede em ambiente de estudo; em producao NAO da reward de graca
        if (IS_DEV) { console.log('[CiDi-Ad] CiDiSDK ausente - fallback estudo (concede).'); resolve(true); }
        else { console.warn('[CiDi-Ad] CiDiSDK ausente em producao - sem reward.'); resolve(false); }
      } catch (e) { adOverlay(false); console.warn('[CiDi-Ad] erro', e); resolve(IS_DEV); }
    });
  }
  window.__cidiAdShow = cidiRewarded;   // helper p/ os bridges HTML usarem o MESMO funil

  function makeProxy() {
    var fn = function () {};
    return new Proxy(fn, {
      get: function (_t, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
        if (typeof prop === 'symbol') return undefined;
        var name = String(prop);
        if (name === 'showRewardedAd') return cidiRewarded;         // <<< ad real via CiDi
        if (/^(is|has|can|should|was|are)/.test(name)) {
          return function () { return false; };
        }
        return makeProxy();
      },
      apply: function () { return Promise.resolve(makeProxy()); }
    });
  }

  var stub = makeProxy();
  window._azerionIntegrationSDK = stub;
  window.azerionIntegrationSDK = stub;

  window.GD_OPTIONS = window.GD_OPTIONS || {};
  window.gdsdk = window.gdsdk || stub;
  window.$msstart = window.$msstart || stub;
})();
