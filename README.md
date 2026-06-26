# Shop Sorting 2 (Goods Sort) — Projeto de Estudo

Estrutura de um jogo HTML5 comercial reconstruída a partir de uma captura **HAR**
(tráfego de rede), reorganizada para estudo de arquitetura de jogos.

- **Engine:** Phaser 3 (`libs/phaser.min.js`)
- **Jogo:** `game/shop-sorting-2.min.js` (minificado e **ofuscado** — lógica não legível)
- **Wrapper de anúncios:** Azerion / GameDistribution (em `vendor/`, substituído por stub local)
- **Gênero:** puzzle de organização (sort/merge) por prateleiras

> ⚠️ Código de terceiros. Use apenas para **estudo da estrutura** (como assets,
> níveis, localização e economia são organizados), não para redistribuição.

---

## Como executar (precisa de servidor HTTP)

O jogo carrega JSON/atlas via `fetch`, então **`file://` não funciona** (erro de CORS).
Rode um servidor local:

```bash
cd goods_sort_study
python3 -m http.server 8000
# abra http://localhost:8000
```

Alternativas: `npx serve` ou a extensão *Live Server* do VS Code.

---

## É executável? Sim — depois das correções abaixo.

A captura HAR vinha **quebrada para rodar local**. Foram corrigidos 4 problemas:

| # | Problema | Correção |
|---|----------|----------|
| 1 | **Caminhos errados.** O `index.html` apontava para o CDN (`assets/style.css`, `libs/phaser.min.js`), mas os arquivos tinham sido jogados em pastas planas (`css/`, `js/`). | Estrutura reorganizada para `assets/atlases`, `assets/sounds`, `assets/jsons`, `assets/images`, `assets/fonts` e `libs/`, batendo com o que o jogo pede. |
| 2 | **Travava na splash.** O jogo faz `await _azerionIntegrationSDK.onAdProviderLoaded()` — o provedor de anúncios só carrega online/em domínio autorizado, então a Promise nunca resolvia e o jogo não iniciava. | `sdk-stub.js` resolve qualquer chamada do SDK na hora. Anúncios viram no-op. |
| 3 | **Som com nome inválido.** O arquivo estava salvo como `last%2030%20sec.mp3` (com `%20` literal). O jogo pede `last 30 sec.mp3`. | Renomeado para `last 30 sec.mp3` (espaços reais). |
| 4 | **Recursos externos quebrados** no `<head>`: SDK msstart, `manifest.json` do CDN (404) e um `<iframe>` de menu do Yahoo. | Removidos do `index.html` (não são usados pela lógica do jogo). |

Validações feitas: `node --check` em todos os `.js` (OK), `JSON.parse` em todos os
configs (OK), e checagem de que **as 21 requisições de asset do jogo resolvem** (0 falhas).

> Verificação final visual (renderização WebGL) precisa de navegador — rode o servidor
> e abra no Chrome/Firefox. A estrutura e os caminhos estão garantidos.

---

## Estrutura de pastas

```
goods_sort_study/
├── index.html              # entrada, corrigida e executável
├── sdk-stub.js             # stub do SDK de anúncios (roda offline)
├── libs/
│   └── phaser.min.js       # engine
├── game/
│   └── shop-sorting-2.min.js  # lógica do jogo (ofuscada)
├── assets/
│   ├── style.css
│   ├── css/aeria_ymenu.css
│   ├── atlases/            # atlas.png+json, tiles.png+json, splash.png+json
│   ├── sounds/             # 24 efeitos + trilha (.mp3)
│   ├── jsons/              # configs do jogo (ver docs/ARQUITETURA.md)
│   ├── images/             # 10 backgrounds + preloader
│   └── fonts/inter.ttf
├── vendor/                 # SDKs originais, preservados SÓ para estudo
│   ├── azerion-libs.js
│   ├── azerion-integration-sdk.js
│   ├── main.min.js         # GameDistribution SDK
│   ├── msstart-...min.js
│   └── socket.io.js
└── docs/
    ├── ARQUITETURA.md      # como os configs e assets se conectam
    └── manifest_har.tsv    # mapa arquivo -> URL original do HAR
```

Veja **`docs/ARQUITETURA.md`** para a parte que interessa no estudo: como níveis,
localização e economia são definidos por dados (data-driven).
