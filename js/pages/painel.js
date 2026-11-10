import { drawChart } from '../components/chart.js';
import { distribution, moneyCents, operationTable, portfolioMetrics, shortDate } from '../components/portfolio-ui.js';
import { escapeHtml, money, percent } from '../core/format.js';
import { project } from '../core/financial-engine.js';
import { marketDate } from '../core/market-engine.js';
import { markPortfolio, portfolioHistory } from '../core/portfolio-engine.js';
import { projectGoal } from '../core/planning.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { observeState, store } from '../services/storage.js';

export function renderDashboard(main) {
  const state = store.read();
  main.innerHTML = `
    <p class="eyebrow">Laboratório · 100% simulado</p>
    <h1>Painel educacional</h1>
    <p class="lead">Acompanhe o resultado da carteira virtual e acesse suas projeções em uma área separada.</p>
    <div class="actions"><a class="button" href="#mercado">Explorar mercado</a><a class="button secondary" href="#carteira">Ver carteira</a><a class="button secondary" href="#simulador">Simular</a><a class="button secondary" href="#comparador">Comparar</a><a class="button secondary" href="#metas">Metas</a><a class="button secondary" href="#aprender">Aprender</a></div>
    <p id="dashboard-profile" class="eyebrow section"></p><div id="dashboard-metrics" class="section"></div>
    <p id="dashboard-error" class="error" role="alert"></p>
    <section class="card section">
      <h2>Evolução do patrimônio virtual</h2>
      <p class="muted">Últimos 90 dias simulados disponíveis desde o início da carteira. Cada ponto usa o caixa, o extrato e as cotações daquele dia.</p>
      <div id="dashboard-chart"></div>
    </section>
    <section class="card section"><h2>Distribuição</h2><div id="dashboard-distribution"></div></section>
    <section class="card section"><h2>Últimas operações</h2><div id="dashboard-operations"></div><a href="#carteira">Abrir extrato completo</a></section>
    <div class="two-cards section">
      <section class="card"><h2>Projeções salvas</h2><p class="muted">Projeções educacionais ficam separadas do saldo e das posições fictícias.</p><div id="dashboard-simulations"></div><a href="#simulador">Gerenciar simulações</a></section>
      <section class="card"><h2>Metas salvas</h2><div id="dashboard-goals"></div><a href="#metas">Gerenciar metas</a></section>
    </div>`;

  const query = selector => main.querySelector(selector);
  function show(next) {
    const provider = new DemoMarketProvider(next.market);
    const summary = markPortfolio(next.operations, asset => provider.quote(asset.id).cents);
    const history = portfolioHistory(next.operations, next.market.ticks);
    query('#dashboard-profile').textContent = next.profile === 'example' ? 'Carteira de exemplo acadêmico' : '';
    query('#dashboard-metrics').innerHTML = portfolioMetrics(summary);
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
      '<ul>' + next.goals.map(item => `<li><strong>${escapeHtml(item.name)}</strong> · ${percent(projectGoal(item.target, item.params).reach)} de ${money(item.target)}</li>`).join('') + '</ul>' :
      '<p class="muted">Nenhuma meta salva.</p>';
  }
  show(state);
  return observeState(show, failure => { query('#dashboard-error').textContent = failure.message; });
}
