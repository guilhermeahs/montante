import { drawChart } from '../components/chart.js';
import { confirmAction, openDialog } from '../components/dialog.js';
import { choiceField, choiceValue } from '../components/forms.js';
import { moneyCents } from '../components/portfolio-ui.js';
import { percent } from '../core/format.js';
import { advanceChallenge, allocations, challengeView, createChallenge, historicalEvents, tradeChallenge } from '../core/challenges.js';
import { observeState, store, transact } from '../services/storage.js';

const rate = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 });
const dollars = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
const moneyDollars = amount => dollars.format(amount).replace('\u00a0', ' ');
const labelForDay = (point, index) => point.date ? point.date.split('-').reverse().join('/') : 'Dia ' + index;

export function renderChallenges(main) {
  let run = store.read().challenge;
  let timer;
  let advancing = false;
  let active = true;
  let lastChart;
  let lastSnapshot;
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Investir · Prática com saldo virtual</p>
      <h1>Desafios históricos</h1>
      <p class="lead">Uma alta, uma queda ou dias tranquilos. As oscilações se inspiram em episódios reais e aparecem sem aviso. Decida com o que você sabe hoje.</p>
      <button class="secondary section" type="button" id="challenge-new" hidden>Nova rodada surpresa</button>
    </header>
    <section id="challenge-run" hidden aria-labelledby="challenge-mode">
      <div class="card stacked challenge-top">
        <div>
          <p class="eyebrow" id="challenge-source"></p>
          <h2 id="challenge-mode" tabindex="-1"></h2>
          <p id="challenge-day" class="muted" role="status"></p>
        </div>
        <div class="actions">
          <button type="button" id="challenge-advance">Avançar um dia</button>
          <button type="button" class="secondary" id="challenge-play">Reproduzir</button>
          <button type="button" id="challenge-see-result" hidden>Ver resultado</button>
        </div>
      </div>
      <div id="challenge-metrics" class="metric-grid challenge-metrics section"></div>
      <div class="two-cards section">
        <section class="card">
          <h2>Preço revelado</h2>
          <p id="challenge-first-point" class="muted"></p>
          <div id="challenge-chart"></div>
        </section>
        <section class="card stacked">
          <h2>Sua posição</h2>
          <p id="challenge-position"></p>
          <div class="actions">
            <button type="button" id="challenge-buy" aria-describedby="challenge-trade-help">Comprar</button>
            <button type="button" class="secondary" id="challenge-sell" aria-describedby="challenge-trade-help">Vender</button>
            <button type="button" class="secondary" id="challenge-sell-all" aria-describedby="challenge-trade-help">Vender tudo</button>
          </div>
          <p class="muted" id="challenge-trade-help"></p>
          <p id="challenge-feedback" role="status" tabindex="-1"></p>
          <details>
            <summary>Operações desta rodada</summary>
            <ul id="challenge-orders" class="record-list"></ul>
          </details>
        </section>
      </div>
      <section id="challenge-result" class="card section" hidden aria-labelledby="challenge-result-title"></section>
    </section>
    <section class="card stacked section challenge-setup" aria-labelledby="challenge-setup-title">
      <h2 id="challenge-setup-title" tabindex="-1">Prepare uma rodada surpresa</h2>
      <p class="muted">Cada rodada começa com R$ 10.000 virtuais, separados da carteira principal. Escolha quanto colocar na cesta de ações antes de conhecer o cenário.</p>
      ${choiceField('challenge-allocation', 'Exposição inicial', allocations.map(value => [value, 'Até ' + value + '%']), run?.allocation ?? 50)}
      <div class="actions"><button type="button" id="challenge-start">Sortear rodada</button><a href="#mercado">Abrir Mercado simulado</a></div>
      <p class="error" id="challenge-error" role="alert"></p>
    </section>`;

  const query = selector => main.querySelector(selector);
  const advance = query('#challenge-advance');
  const play = query('#challenge-play');
  const buy = query('#challenge-buy');
  const sell = query('#challenge-sell');
  const sellAll = query('#challenge-sell-all');
  const newRound = query('#challenge-new');
  const tradeHelp = query('#challenge-trade-help');
  const result = query('#challenge-result');
  const error = query('#challenge-error');
  const feedback = query('#challenge-feedback');

  function stop() {
    clearInterval(timer);
    timer = undefined;
    play.textContent = 'Reproduzir';
  }

  function show(next) {
    const signature = JSON.stringify(next);
    if (lastSnapshot === signature) return;
    lastSnapshot = signature;
    if (run?.id !== next?.id) stop();
    run = next;
    query('#challenge-run').hidden = !run;
    newRound.hidden = !run;
    if (!run) {
      stop();
      return;
    }

    const { revealed, portfolio, finished, result: summary } = challengeView(run);
    const replay = run.kind === 'replay';
    const quote = revealed.at(-1);
    const units = portfolio.positions[0]?.units ?? 0;
    const unit = replay ? 'lotes de US$ 100' : 'unidades da cesta';
    query('#challenge-source').textContent = replay ? 'PTAX histórica · Saldo virtual' : 'Preços simulados · Rodada surpresa';
    query('#challenge-mode').textContent = replay ? historicalEvents.get(run.episode).title : 'Rodada surpresa';
    query('#challenge-day').textContent = finished ? 'Última rodada concluída' : 'Rodada em andamento · ' + labelForDay(quote, run.day);
    advance.disabled = play.disabled = finished;
    advance.hidden = play.hidden = finished;
    query('#challenge-see-result').hidden = !finished;
    buy.disabled = finished || portfolio.cash < quote.cents;
    sell.disabled = sellAll.disabled = finished || units === 0;
    if (finished) tradeHelp.textContent = 'Esta rodada terminou. Comece uma nova rodada para voltar a negociar.';
    else if (!units) tradeHelp.textContent = 'Você está sem posição nesta rodada. Compre antes de vender.';
    else if (buy.disabled) tradeHelp.textContent = 'O saldo não cobre uma nova compra. Você pode vender ou avançar o dia.';
    else tradeHelp.textContent = 'Para manter sua posição, avance o dia sem operar.';
    if (finished) stop();
    const label = replay ? 'Dólar por US$ 1' : 'Preço da cesta';
    query('#challenge-metrics').innerHTML = `
      <article class="card metric emphasis"><p>Patrimônio da rodada</p><strong>${moneyCents(portfolio.wealth)}</strong></article>
      <article class="card metric" id="challenge-cash"><p>Saldo desta rodada · em reais</p><strong>${moneyCents(portfolio.cash)}</strong>
        ${replay ? `<small class="muted">Equivale a ${moneyDollars(portfolio.cash * 100 / quote.cents)} pela PTAX do dia.</small>` : ''}</article>
      <article class="card metric" id="challenge-holdings"><p>${replay ? 'Dólares na posição' : 'Unidades da cesta'}</p>
        <strong>${replay ? moneyDollars(units * 100) : units.toLocaleString('pt-BR')}</strong>
        <small class="muted">${replay ? units + (units === 1 ? ' lote de US$ 100' : ' lotes de US$ 100') : moneyCents(portfolio.marketValue) + ' em ativos'}</small></article>
      <article class="card metric"><p>${label}</p><strong>${replay ? rate.format(quote.cents / 10000) : moneyCents(quote.cents)}</strong></article>`;
    query('#challenge-position').textContent = `${units} ${unit} · ${moneyCents(portfolio.marketValue)} em posição. Exposição inicial de até ${run.allocation}%.`;
    query('#challenge-orders').innerHTML = run.orders.length ? run.orders.map(order => `<li>
      <span>${labelForDay(revealed[order.day], order.day)} · ${order.side === 'buy' ? 'Compra' : 'Venda'} · ${order.units} ${unit}</span>
      <strong>${moneyCents(order.gross)}</strong>
    </li>`).join('') : '<li class="muted">Nenhuma ordem manual nesta rodada.</li>';

    const chart = query('#challenge-chart');
    const chartKey = run.id + ':' + run.day;
    if (lastChart !== chartKey) {
      lastChart = chartKey;
      query('#challenge-first-point').textContent = revealed.length < 2 ? 'Avance um dia para começar a desenhar a série.' : '';
      if (revealed.length < 2) chart.replaceChildren();
      else drawChart(chart, revealed.map(point => ({ ...point, price: point.cents / (replay ? 10000 : 100) })), [
        { key: 'price', label, color: 'var(--chart-green)', fill: 'var(--mint)' }
      ], { label: 'Preços revelados nesta rodada', zoom: true, period: labelForDay,
        ...(replay ? { formatValue: value => rate.format(value) } : {}) });
    }

    result.hidden = !finished;
    if (!summary) {
      result.replaceChildren();
      return;
    }

    const difference = portfolio.wealth - summary.hold;
    result.innerHTML = `
      <p class="eyebrow">Resultado da rodada</p>
      <h2 id="challenge-result-title" tabindex="-1">Como sua carteira reagiu</h2>
      <div class="challenge-comparison">
        <div><span>Suas decisões</span><strong>${moneyCents(portfolio.wealth)}</strong></div>
        <div><span>Manter a posição inicial</span><strong>${moneyCents(summary.hold)}</strong></div>
        <div><span>Ficar em caixa</span><strong>${moneyCents(summary.cash)}</strong></div>
      </div>
      <p>Maior queda da sua carteira em relação a um pico anterior: <strong>${percent(summary.drawdown * 100)}</strong>.
        Diferença para manter a posição inicial: <strong>${moneyCents(difference)}</strong>.</p>
      <h3>${replay ? 'Episódio revisitado' : summary.hasShock ? 'Inspiração histórica revelada' : 'Rodada sem choque forte'}</h3>
      ${!replay && !summary.hasShock ? '<p>Compare esta rodada mais tranquila com um episódio real de oscilação.</p>' : ''}
      <p><strong>${summary.event.title}</strong>. ${summary.event.description}</p>
      <p>${replay ? 'Variação histórica no recorte' : 'Variação na rodada simulada'}: <strong>${percent(summary.marketChange * 100)}</strong>.
        <a href="${summary.event.source}" target="_blank" rel="noopener">${summary.event.sourceLabel}</a></p>
      <div class="actions">
        ${[...historicalEvents].filter(([, event]) => event.rows).map(([episode, event]) =>
          `<button class="secondary" type="button" data-replay="${episode}">Replay: ${event.title}</button>`
        ).join('')}
      </div>
      <p class="muted challenge-license">Os replays usam dados do Banco Central sob <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL 1.0</a>.
        As operações são exercícios com saldo virtual.</p>`;
  }

  async function step() {
    if (advancing || !active || !run) return;
    advancing = true;
    const expected = run;
    try {
      await transact(state => {
        if (!active || state.challenge?.id !== expected.id || state.challenge.day !== expected.day) return state;
        const next = advanceChallenge(state.challenge);
        return next === state.challenge ? state : { ...state, challenge: next };
      });
    } catch (failure) {
      stop();
      feedback.textContent = failure.message;
    } finally {
      advancing = false;
    }
  }

  function start(episode = null) {
    const previous = run?.id;
    const next = createChallenge({ id: crypto.randomUUID(), allocation: Number(choiceValue(query('#challenge-allocation'))),
      seed: crypto.getRandomValues(new Uint32Array(1))[0], episode });
    async function replace() {
      if (!active) return;
      await transact(state => {
        if (state.challenge?.id !== previous) throw new Error('A rodada foi alterada em outra aba.');
        return { ...state, challenge: next };
      });
      if (!active) return;
      error.textContent = '';
      feedback.textContent = '';
      const focusRound = () => { if (active) query('#challenge-mode').focus(); };
      const dialog = main.querySelector('dialog[open]');
      if (dialog) dialog.addEventListener('close', focusRound, { once: true });
      else focusRound();
    }
    stop();
    if (run) {
      confirmAction('Substituir a rodada atual?', 'Os dados desta rodada serão descartados. A carteira do Mercado simulado fica separada.', 'Substituir rodada', replace);
    } else replace().catch(failure => { error.textContent = failure.message; });
  }

  function trade(side, all = false) {
    stop();
    const current = run;
    const { revealed, portfolio, finished } = challengeView(current);
    if (finished) return;
    const price = revealed.at(-1).cents;
    const maximum = side === 'buy' ? Math.floor(portfolio.cash / price) : portfolio.positions[0]?.units ?? 0;
    if (maximum < 1) return;
    const name = all ? 'Vender tudo' : side === 'buy' ? 'Comprar' : 'Vender';
    const unit = current.kind === 'replay' ? 'lotes de US$ 100' : 'unidades da cesta';
    const confirmation = all ? 'venda total' : side === 'buy' ? 'compra' : 'venda';
    const id = crypto.randomUUID();
    openDialog(`<form>
      <h2 id="dialog-title">${name} na rodada</h2>
      <p>Preço confirmado por unidade de negociação: <strong>${moneyCents(price)}</strong>. A operação usa saldo virtual.</p>
      ${all ? `<p>Quantidade a vender: <strong>${maximum}</strong> (${unit}).</p>` : `<div class="field"><label for="challenge-units">Quantidade (${unit})</label>
        <input id="challenge-units" type="number" inputmode="numeric" min="1" max="${maximum}" step="1" value="1" required autofocus>
      </div>`}
      <p data-trade-total class="muted"></p>
      <p class="error" role="alert"></p>
      <div class="actions"><button type="submit">Confirmar ${confirmation}</button>
      <button type="button" class="secondary" data-cancel${all ? ' autofocus' : ''}>Cancelar</button></div>
    </form>`, dialog => {
      const form = dialog.querySelector('form');
      const input = form.querySelector('input');
      const total = form.querySelector('[data-trade-total]');
      const submit = form.querySelector('[type="submit"]');
      const quantity = () => all ? maximum : Number(input.value);
      const updateTotal = () => { total.textContent = all || input.validity.valid ? 'Total: ' + moneyCents(quantity() * price) : ''; };
      input?.addEventListener('input', updateTotal);
      updateTotal();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submit.disabled || !active) return;
        submit.disabled = true;
        try {
          const units = quantity();
          await transact(state => {
            const latest = state.challenge;
            if (!active || latest?.id !== current.id || latest.day !== current.day ||
                latest.orders.length !== current.orders.length || latest.orders.at(-1)?.id !== current.orders.at(-1)?.id) {
              throw new Error('A rodada mudou. Abra a ordem novamente para conferir o valor.');
            }
            return { ...state, challenge: tradeChallenge(latest, { id, side, units }) };
          });
          dialog.close();
          feedback.textContent = all ? 'Venda total registrada. Sua posição ficou zerada.' :
            side === 'buy' ? 'Compra registrada.' : 'Venda registrada.';
          if (all) feedback.focus();
        } catch (failure) {
          form.querySelector('.error').textContent = failure.message;
          submit.disabled = false;
        }
      });
    });
  }

  newRound.addEventListener('click', () => query('#challenge-setup-title').focus());
  query('#challenge-start').addEventListener('click', () => start());
  advance.addEventListener('click', step);
  query('#challenge-see-result').addEventListener('click', () => query('#challenge-result-title').focus());
  play.addEventListener('click', () => {
    if (timer !== undefined) {
      stop();
      return;
    }
    play.textContent = 'Pausar';
    timer = setInterval(() => { if (!document.hidden) step(); }, 2000);
  });
  buy.addEventListener('click', () => trade('buy'));
  sell.addEventListener('click', () => trade('sell'));
  sellAll.addEventListener('click', () => trade('sell', true));
  result.addEventListener('click', event => {
    const episode = event.target.closest('[data-replay]')?.dataset.replay;
    if (episode) start(episode);
  });
  show(run);
  const unobserve = observeState(state => show(state.challenge), failure => { error.textContent = failure.message; });
  return () => {
    active = false;
    stop();
    unobserve();
  };
}
