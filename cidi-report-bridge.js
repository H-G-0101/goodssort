/*
 * cidi-report-bridge.js  -  Task + Tournament(Event) + Medal do CiDi (Grocery Store).
 *
 * Reusa o client compartilhado do login (window.__cidiClient / __cidiLogin).
 * APIs (doc):  client.report.gameTask({completeTime,metadata})        -> true
 *              client.report.gameTaskResult({bizDate})                -> {completed,...}
 *              client.report.tournamentScore({score:String,reportedAt}) -> true
 *              client.report.medal() -> true   /  medalOwnership() -> {owned}
 *
 * GATILHO (sem tocar no bundle): polling de game.data.stats -
 *   vitoria de nivel = currentCommonLevel/currentRelaxLevel avancou (score tambem acumula).
 *   - TASK: 1x por dia (bizDate) na 1a vitoria do dia.
 *   - TOURNAMENT: reporta stats.score (acumulado, monotonico) a cada vitoria.
 *   - MEDAL: quando niveis completados >= MEDAL_LEVEL (== condicao configurada no painel CiDi).
 *
 * ROBUSTEZ (licoes Gemnova/2248/Bus Jam):
 *   - PENDING gravado ANTES de tentar; limpo SO com sucesso confirmado (nunca trava retry).
 *   - Flags persistidas em localStorage proprio (grocery-store_cidi) - escrito pos-login,
 *     ou seja, depois do CiDiSDK.init() (storage do Pi ja pronto).
 *   - reconcileMedal() no boot pos-login: medalOwnership() eh a fonte da verdade
 *     (se elegivel e nao possui -> re-claim; se possui -> marca local).
 *   - Tournament pending guarda o MELHOR score do dia nao-reportado (vitoria seguinte carrega).
 *   - Task: retry no boot se pendente do MESMO bizDate.
 */
(function () {
  // ===== CONFIG =====
  var MEDAL_LEVEL = 100;                   // niveis completados p/ medalha (== painel CiDi)
  var FLAGS_KEY   = 'grocery-store_cidi';  // persistencia das flags de reporte

  var F = { taskDate: null, taskPending: null,      // bizDate reportado / pendente
            tournPending: 0,                        // melhor score ainda nao confirmado
            medalClaimed: false };
  var lastLv = null, lastScore = null, busyTask = false, busyTourn = false, busyMedal = false;

  function g() { return window.__game; }
  function stats() { try { return g().data.stats; } catch (e) { return null; } }
  function levelsDone(s) { // niveis COMPLETADOS (current = proximo a jogar)
    return Math.max(0, (s.currentCommonLevel || 1) - 1) + Math.max(0, (s.currentRelaxLevel || 1) - 1);
  }
  function todayBiz() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }
  function loadF() { try { var r = localStorage.getItem(FLAGS_KEY); if (r) F = Object.assign(F, JSON.parse(r)); } catch (e) {} }
  function saveF() { try { localStorage.setItem(FLAGS_KEY, JSON.stringify(F)); } catch (e) {} }
  function client() { return window.__cidiClient || null; }
  function log(tag, ok, extra) { console.log('[CiDi-Report] ' + tag + ' -> ' + (ok ? 'OK' : 'X') + (extra ? ' ' + extra : '')); }

  // ===== TASK (diaria, dedupe por bizDate) =====
  function reportTask(meta) {
    var bd = todayBiz();
    if (F.taskDate === bd || busyTask) return;               // ja reportada hoje
    var c = client(); if (!c) return;
    busyTask = true;
    F.taskPending = bd; saveF();                              // pending ANTES de tentar
    c.report.gameTask({ completeTime: Math.floor(Date.now() / 1000), metadata: JSON.stringify(meta || {}) })
      .then(function (r) {
        if (r === true) { F.taskDate = bd; F.taskPending = null; saveF(); log('gameTask', true, bd); }
        else log('gameTask', false, 'retorno ' + r);
      })
      .catch(function (e) { log('gameTask', false, (e && e.code) + ' ' + (e && e.message)); })
      .finally(function () { busyTask = false; });
  }

  // ===== TOURNAMENT (score acumulado; pending = melhor nao confirmado) =====
  function reportTournament(score) {
    if (!(score > 0)) return;
    if (score > (F.tournPending || 0)) { F.tournPending = score; saveF(); }  // pending ANTES
    if (busyTourn) return;
    var c = client(); if (!c) return;
    var snd = F.tournPending;                                  // sempre manda o melhor pendente
    busyTourn = true;
    c.report.tournamentScore({ score: String(snd), reportedAt: Math.floor(Date.now() / 1000) })
      .then(function (r) {
        if (r === true) {
          if (F.tournPending <= snd) { F.tournPending = 0; saveF(); }        // confirmado
          log('tournamentScore', true, snd);
        } else log('tournamentScore', false, 'retorno ' + r);
      })
      .catch(function (e) { log('tournamentScore', false, (e && e.code) + ' ' + (e && e.message)); })
      .finally(function () { busyTourn = false; });
  }

  // ===== MEDAL (ownership = fonte da verdade) =====
  function reconcileMedal(done) {
    if (F.medalClaimed || busyMedal) return;
    if (!(done >= MEDAL_LEVEL)) return;                        // ainda nao elegivel
    var c = client(); if (!c) return;
    busyMedal = true;
    c.report.medalOwnership()
      .then(function (r) {
        if (r && r.owned) { F.medalClaimed = true; saveF(); log('medal', true, 'ja possui'); return true; }
        return c.report.medal().then(function (ok) {
          if (ok === true) { F.medalClaimed = true; saveF(); log('medal(claim)', true, 'nivel ' + done); }
          else log('medal(claim)', false, 'retorno ' + ok);
        });
      })
      .catch(function (e) { log('medal', false, (e && e.code) + ' ' + (e && e.message)); })
      .finally(function () { busyMedal = false; });
  }

  // ===== gatilho: polling de vitoria =====
  function tick() {
    var s = stats(); if (!s) return;
    var lv = levelsDone(s), sc = s.score || 0;
    if (lastLv === null) { lastLv = lv; lastScore = sc; return; }   // baseline no 1o tick
    if (lv > lastLv) {                                              // >>> VITORIA DE NIVEL <<<
      log('vitoria detectada', true, 'niveis=' + lv + ' score=' + sc);
      reportTask({ level: lv, score: sc });
      reportTournament(sc);
      reconcileMedal(lv);
    } else if (sc > lastScore && (F.tournPending || 0) > 0) {
      reportTournament(sc);                                         // carrega pendente antigo
    }
    lastLv = lv; lastScore = sc;
  }

  // ===== boot: pos-login, flush de pendencias + reconcile =====
  function boot() {
    loadF();
    var lp = window.__cidiLogin || Promise.resolve(false);
    Promise.resolve(lp).then(function (logged) {
      if (!logged) { console.log('[CiDi-Report] sem login (fora do app Pi?) - reporte inativo.'); return; }
      // espera o jogo existir p/ baseline e flush
      var iv = setInterval(function () {
        var s = stats(); if (!s) return;
        clearInterval(iv);
        var lv = levelsDone(s), sc = s.score || 0;
        lastLv = lv; lastScore = sc;
        // flush de pendencias de sessoes anteriores
        if (F.taskPending === todayBiz()) { F.taskDate = null; reportTask({ level: lv, score: sc, retry: true }); }
        if ((F.tournPending || 0) > 0) reportTournament(F.tournPending);
        reconcileMedal(lv);                                         // fonte da verdade no boot
        setInterval(tick, 500);                                     // gatilho de vitoria
        console.log('[CiDi-Report] ativo. niveis=' + lv + ' score=' + sc + ' medalLevel=' + MEDAL_LEVEL);
      }, 100);
      setTimeout(function () { clearInterval(iv); }, 20000);
    });
  }

  boot();
  console.log('%c[CiDi-Report]', 'color:#fa4488', 'bridge task/tournament/medal carregada.');
})();
