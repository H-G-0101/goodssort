/*
 * cidi-login-bridge.js  -  CiDi Login SDK (proxy) para o Grocery Store.  [v2 robusto]
 *
 * FIX v2: em alguns WebViews (Pi Browser/Android) o global CidiProxySDK do UMD cross-origin
 * aparece DEPOIS deste bridge rodar (ordem de defer nao confiavel p/ script externo).
 * Agora ESPERAMOS o global aparecer (poll 150ms, ate 20s) antes de criar o client.
 *
 * Fluxo: espera CidiProxySDK -> cria UM client compartilhado (window.__cidiClient) ->
 *        client.auth.login() (tempToken lido da URL automaticamente; token em memoria,
 *        re-login a cada load). O MESMO client e usado por task/tournament/medal.
 *
 * Expõe: window.__cidiClient, window.__cidiLogin (Promise<bool>), window.__cidiLoggedIn,
 *        window.__cidiEnsureLogin() -> Promise<bool> (re-tenta client+login; usado no debug).
 */
(function () {
  // ===== CONFIG =====
  var PROXY_BASE   = 'https://elf-proxy.cidi.games/api/v1';
  var CIDI_API_KEY = 'CIDI_8F247321FC6148B6';
  var WAIT_MS      = 20000;   // quanto tempo esperar o UMD definir o global
  var POLL_MS      = 150;

  window.__cidiClient = window.__cidiClient || null;
  window.__cidiLoggedIn = window.__cidiLoggedIn || false;

  function sdkReady() {
    return (typeof window.CidiProxySDK !== 'undefined') && window.CidiProxySDK &&
           typeof window.CidiProxySDK.createClient === 'function';
  }
  function hasTempToken() {
    try { return new URLSearchParams(window.location.search).has('tempToken'); } catch (e) { return false; }
  }
  function waitForSDK(timeoutMs) {
    return new Promise(function (resolve) {
      if (sdkReady()) return resolve(true);
      var waited = 0;
      var iv = setInterval(function () {
        waited += POLL_MS;
        if (sdkReady()) { clearInterval(iv); resolve(true); }
        else if (waited >= timeoutMs) { clearInterval(iv); resolve(false); }
      }, POLL_MS);
    });
  }
  function ensureClient() {
    if (window.__cidiClient) return window.__cidiClient;
    if (!sdkReady()) return null;
    try {
      window.__cidiClient = window.CidiProxySDK.createClient({ baseURL: PROXY_BASE, apiKey: CIDI_API_KEY });
      console.log('[CiDi-Login] client criado.');
    } catch (e) { console.warn('[CiDi-Login] createClient falhou', e); }
    return window.__cidiClient;
  }
  function doLogin() {
    var c = ensureClient();
    if (!c) { console.warn('[CiDi-Login] sem client (SDK ausente).'); return Promise.resolve(false); }
    if (!hasTempToken()) {
      console.warn('[CiDi-Login] sem tempToken na URL - login so pelo app Pi. Client criado assim mesmo.');
      return Promise.resolve(false);
    }
    console.log('[CiDi-Login] login() chamado...');
    return c.auth.login()
      .then(function () { window.__cidiLoggedIn = true; console.log('[CiDi-Login] login OK.'); return true; })
      .catch(function (err) {
        console.warn('[CiDi-Login] login falhou:', err && err.code, err && err.message);
        return false;
      });
  }

  // re-tentativa manual (botao de debug) - espera o SDK de novo se preciso
  window.__cidiEnsureLogin = function () {
    return waitForSDK(5000).then(function (ok) {
      if (!ok) { console.warn('[CiDi-Login] SDK ainda ausente.'); return false; }
      return doLogin();
    });
  };

  window.__cidiLogin = waitForSDK(WAIT_MS).then(function (ok) {
    if (!ok) { console.warn('[CiDi-Login] CidiProxySDK nao apareceu em ' + WAIT_MS + 'ms (offline/dev?).'); return false; }
    return doLogin();
  });

  console.log('%c[CiDi-Login]', 'color:#5a8df5', 'bridge v2 (espera o SDK do proxy aparecer).');
})();
