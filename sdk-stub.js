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
  console.log('%c[SDK-STUB v2]', 'color:#888', 'ativo - jogo offline, anuncios desativados.');

  function makeProxy() {
    var fn = function () {};
    return new Proxy(fn, {
      get: function (_t, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
        if (typeof prop === 'symbol') return undefined;
        var name = String(prop);
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
