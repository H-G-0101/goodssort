# Arquitetura — Goods Sort (para estudo)

O valor deste projeto pra faculdade não está no código (ofuscado), e sim em **como
um jogo casual comercial separa lógica de dados**. Quase tudo é *data-driven*: dá pra
mudar níveis, textos e economia sem tocar no JavaScript.

## 1. Pipeline de carregamento (Phaser)

```
index.html
  └─ libs/phaser.min.js        (engine)
  └─ sdk-stub.js               (resolve o "gate" de anúncios)
  └─ game/grocery-store.min.js
         │  no boot, o Phaser Loader busca, em paralelo:
         ├─ assets/atlases/*    (sprites empacotados: atlas + tiles + splash)
         ├─ assets/jsons/*      (configuração do jogo)
         ├─ assets/sounds/*     (Web Audio)
         ├─ assets/images/*     (fundos)
         └─ assets/fonts/inter.ttf
```

**Atlas (texture atlas):** `atlas.png` + `atlas.json` é uma técnica clássica de
performance — várias imagens num único PNG, e o JSON guarda as coordenadas (frames)
de cada sprite. Reduz draw calls e requisições. `tiles.*` faz o mesmo para as peças.

## 2. Os 4 arquivos de configuração (`assets/jsons/`)

### `LevelConfigs.json` — 120 níveis
Cada nível é um objeto com:

| campo | significado |
|-------|-------------|
| `levelNumber` | índice do nível |
| `gridX` | largura da grade |
| `shelfArray` | layout das prateleiras |
| `chainsArray` | sequências/cadeias de peças a resolver |
| `tileMax` | tipos de peça no nível (dificuldade) |
| `tileCount` | quantidade total de peças |
| `scale` | escala visual |

> **Estudo de dificuldade:** dá pra ver a curva comparando `tileMax`/`tileCount`
> entre o nível 1 e o 120. É o mesmo princípio que você usa para escalonar dificuldade.

### `Localization.json` — i18n
Estrutura `chave -> { idioma: texto }`. 73 chaves de UI em **6 idiomas**
(`en, de, es, fr, it, pl`). Exemplo conceitual:
```json
{ "play": { "en": "Play", "es": "Jugar", "fr": "Jouer", ... } }
```
Inclui textos de tutorial, recompensas e botões. Padrão limpo de separar texto do código.

### `ShopConfig.json` — loja
Três categorias: `backgrounds`, `products`, `shelfs`. Define o que o jogador
compra com moedas (cosméticos + funcionais).

### `GlobalVariables.json` — economia e tuning
Números soltos que controlam o balanceamento — fáceis de ajustar:

| variável | valor | papel |
|----------|-------|-------|
| `plusCoinsTab` | 100 | moedas por ação/aba |
| `plusTime` | 30 | segundos extras (booster) |
| `freezeTimer` | 15 | duração do congelar tempo |
| `plusWinReward` | 100 | recompensa por vitória |
| `rewardHoursLoad` | 24 | ciclo da recompensa diária (h) |

> **Conexão com monetização:** boosters (`plusTime`, `freezeTimer`) e recompensa
> diária (`rewardHoursLoad=24`) são os ganchos de retenção + anúncio recompensado.

## 3. Camada de anúncios (`vendor/`)

O jogo NÃO fala direto com a rede de anúncios; ele chama uma fachada
`_azerionIntegrationSDK` com métodos como `showInterstitial`, `showRewarded`,
`preloadAd` e o gate de boot `onAdProviderLoaded`. Os SDKs reais
(`azerion-*.js`, `main.min.js` da GameDistribution) ficam por fora.

**Padrão importante:** o jogo depende de uma *interface* de anúncios, não da
implementação. Por isso o `sdk-stub.js` consegue substituir tudo com um Proxy que
resolve qualquer chamada. É exatamente o desacoplamento que permite trocar de SDK
(ex.: trocar Azerion por outro provedor) sem reescrever o jogo — o mesmo motivo de
você marcar seus `showRewardedAd()` como stubs trocáveis.

## 4. Por que travava local (o gate de anúncios)

Trecho do boot (desofuscado conceitualmente):
```js
await checagem() || await _azerionIntegrationSDK.onAdProviderLoaded();
iniciaJogo();
```
Se o provedor de anúncios não carrega (offline / domínio não autorizado),
`onAdProviderLoaded()` nunca resolve e `iniciaJogo()` nunca roda → splash eterna.
O stub resolve na hora e o boot prossegue.

## 5. Ideias de análise para o trabalho

- Plotar a curva de dificuldade a partir de `LevelConfigs.json` (tileMax vs nível).
- Mapear o loop de economia: vitória → moedas (`plusWinReward`) → loja (`ShopConfig`) → boosters.
- Discutir atlas/spritesheet como otimização de performance/rede.
- Discutir o padrão de fachada/adapter na camada de anúncios (desacoplamento).
- Comparar i18n por JSON vs strings hardcoded.
