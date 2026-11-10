import { drawChart } from '../components/chart.js';
import { distribution, moneyCents, operationTable, portfolioHelp, portfolioMetrics, shortDate } from '../components/portfolio-ui.js';
import { escapeHtml, money, percent } from '../core/format.js';
import { project } from '../core/financial-engine.js';
import { marketDate } from '../core/market-engine.js';
import { marketPortfolio, portfolioHistory, portfolioRisk } from '../core/portfolio-engine.js';
import { projectGoal } from '../core/planning.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { observeState, store } from '../services/storage.js';

export function renderDashboard(main) {
  const state = store.read();
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Investir · Carteira principal</p>
      <h1>Visão geral</h1>
      <p class="lead">Acompanhe sua carteira e pratique com saldo virtual.</p>
      <div class="actions"><a class="button" href="#mercado">Explorar mercado</a><a class="button secondary" href="#carteira">Ver minha carteira</a></div>
    </header>
    <p id="dashboard-profile" class="eyebrow section"></p><div id="dashboard-metrics" class="section"></div>
    <p id="dashboard-error" class="error" role="alert"></p>
    <section id="dashboard-first-trade" class="card empty-state section" hidden>
      <h2>Faça sua primeira compra</h2>
      <p>Escolha um ativo, consulte a cotação simulada e confirme a compra. A posição e o registro aparecerão em Minha carteira.</p>
      <a class="button" href="#mercado">Escolher um ativo</a>
    </section>
    ${portfolioHelp}
    <section class="card section" aria-labelledby="dashboard-risk-title">
      <h2 id="dashboard-risk-title">Risco da carteira</h2>
      <div id="dashboard-risk"></div>
      <details>
        <summary>Como interpretar esses números?</summary>
        <p><strong>Concentração:</strong> quanto da carteira depende de um ativo ou categoria. Se a maior posição perde valor, ela pode puxar o total para baixo.</p>
        <p><strong>Maior queda desde um pico:</strong> quanto o patrimônio chegou a cair em relação a um valor mais alto já alcançado no período do gráfico.</p>
        <p><strong>Taxas pagas:</strong> a soma dos custos simulados das compras e vendas.</p>
        <a href="#aprender">Ver conceitos no glossário</a>
      </details>
    </section>
    <section class="card section"><h2>Onde investi</h2><div id="dashboard-distribution"></div></section>
    <section class="card section">
      <h2>Evolução do patrimônio virtual</h2>
      <p class="muted">Até 90 dias simulados. O patrimônio de cada dia soma o saldo disponível, as vendas a receber e o valor dos ativos.</p>
      <div id="dashboard-chart"></div>
    </section>
    <section class="card section"><h2>Últimas operações</h2><div id="dashboard-operations"></div><a href="#carteira">Ver extrato em Minha carteira</a></section>
    <div class="two-cards section">
      <section class="card"><h2>Projeções salvas</h2><p class="muted">Projeções educacionais ficam separadas do saldo e das posições fictícias.</p><div id="dashboard-simulations"></div><a href="#simulador">Gerenciar simulações</a></section>
      <section class="card"><h2>Metas salvas</h2><div id="dashboard-goals"></div><a href="#metas">Gerenciar metas</a></section>
    </div>
    <div class="actions related-actions section">
      <a href="#comparador">Comparar modalidades</a>
      <a href="#aprender">Aprender sobre os ativos</a>
    </div>`;

  const query = selector => main.querySelector(selector);
  function show(next) {
    const provider = new DemoMarketProvider(next.market);
    const tick = next.market.ticks.at(-1);
    const summary = marketPortfolio(next.operations, tick);
    const history = portfolioHistory(next.operations, next.market.ticks);
    const { largestAsset, largestCategory, drawdown, fees } = portfolioRisk(summary, history, next.operations);
    query('#dashboard-profile').textContent = next.profile === 'example' ? 'Carteira de exemplo acadêmico' : '';
    query('#dashboard-metrics').innerHTML = portfolioMetrics(summary, { overview: true, day: tick.day });
    query('#dashboard-first-trade').hidden = next.operations.length > 0;
    query('#dashboard-risk').innerHTML = `
      ${largestAsset ? `<p><strong>${percent(largestAsset.share * 100)}</strong> do patrimônio está em ${escapeHtml(largestAsset.label)}.
        Se esse ativo cair 10% e o resto ficar igual, o patrimônio cai cerca de <strong>${percent(largestAsset.share * 10)}</strong>.</p>
        <p><strong>${percent(largestCategory.share * 100)}</strong> do patrimônio está em ${escapeHtml(largestCategory.label)}, sua maior categoria.
        Ativos da mesma categoria podem cair juntos.</p>` : '<p>Quando você tiver posições, verá quanto do patrimônio depende do seu maior ativo e da sua maior categoria.</p>'}
      <p>${drawdown === null ? 'Avance um dia para começar a medir a queda desde um pico.' : `Maior queda desde um pico nos dias do gráfico: <strong>${percent(drawdown * 100)}</strong>.`}</p>
      <p>Taxas pagas desde o início desta carteira: <strong>${moneyCents(fees)}</strong>.</p>`;
    query('#dashboard-distribution').innerHTML = distribution(summary.positions);
    query('#dashboard-operations').innerHTML = operationTable(next.operations.slice(-5).reverse(), provider);
    const chart = query('#dashboard-chart');
    if (history.length < 2) chart.innerHTML = '<p class="muted">Avance um dia no mercado para visualizar a evolução.</p>';
    else drawChart(chart, history, [{ key: 'value', label: 'Patrimônio virtual', color: 'var(--chart-green)', fill: 'var(--mint)' }], {
      label: 'Histórico da carteira virtual', zoom: true, period: point => shortDate(marketDate(point.day))
    });
    query('#dashboard-simulations').innerHTML = next.simulations.length ?
      '<ul>' + next.simulations.map(item => `<li><strong>${escapeHtml(item.name)}</strong> · ${moneyCents(project(item.params).balance * 100)} · ${item.params.months} meses</li>`).join('') + '</ul>' :
      '<p class="muted">Nenhuma simulação salva.</p>';
    query('#dashboard-goals').innerHTML = next.goals.length ?
      '<ul>' + next.goals.map(item => {
        const { required } = projectGoal(item.target, item.params);
        return `<li><strong>${escapeHtml(item.name)}</strong> · ${required === null ? 'Aporte fora do limite de projeção' : money(required) + ' por mês'}</li>`;
      }).join('') + '</ul>' :
      '<p class="muted">Nenhuma meta salva.</p>';
  }
  show(state);
  return observeState(show, failure => { query('#dashboard-error').textContent = failure.message; });
}
