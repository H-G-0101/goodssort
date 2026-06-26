/*
 * sdk-stub.js  -  STUB DE ESTUDO (offline)
 * ------------------------------------------------------------------
 * O jogo trava na splash esperando o provedor de anuncios:
 *     await _azerionIntegrationSDK.onAdProviderLoaded()
 * Esse provedor (Azerion/GameDistribution) so carrega online, com dominio
 * autorizado. Local, ele nunca resolve -> jogo nao inicia.
 *
 * Este stub responde a QUALQUER metodo do SDK com uma Promise resolvida,
 * entao o gate de boot passa e os anuncios viram no-op. So pra estudo.
 * Para ver o SDK real, abra /vendor/azerion-integration-sdk.js
 * ------------------------------------------------------------------
 */
(function () {
  const log = (...a) => console.log('%c[SDK-STUB]', 'color:#888', ...a);

  // Funcao que serve pra tudo: loga e resolve.
  const noop = (name) => (...args) => {
    log(name, args);
    // showRewarded/showInterstitial: resolve "true" = anuncio visto (libera recompensa no estudo)
    return Promise.resolve(true);
  };

  // Proxy: qualquer propriedade acessada vira uma funcao segura.
  const handler = {
    get(_t, prop) {
      if (prop === 'then') return undefined; // evita ser tratado como thenable
      return noop(String(prop));
    }
  };

  const stub = new Proxy({}, handler);

  window._azerionIntegrationSDK = stub;
  window.azerionIntegrationSDK = stub;

  // GD/MSStart as vezes sao checados; deixa stubs vazios pra nao dar ReferenceError.
  window.GD_OPTIONS = window.GD_OPTIONS || {};
  window.gdsdk = window.gdsdk || stub;
  window.$msstart = window.$msstart || stub;

  log('carregado - jogo roda offline, anuncios desativados.');
})();
