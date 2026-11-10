import { example, project } from '../core/financial-engine.js';
import { compactMoney } from '../core/format.js';
import { drawChart, investmentLines } from '../components/chart.js';

export function renderHome(main) {
  const result = project(example);
  main.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Educação financeira · Sem transações reais</p>
        <h1>Veja seu dinheiro crescer antes de investir.</h1>
        <p class="lead">Simule juros compostos, compare modalidades e acompanhe a evolução do seu patrimônio em gráficos simples.</p>
      </div>
      <section class="card" aria-label="Exemplo de projeção em cinco anos">
        <div class="muted">Patrimônio em 5 anos</div>
        <p class="hero-amount">${compactMoney(result.balance)}</p>
        <div data-home-chart></div>
      </section>
    </section>`;
  drawChart(main.querySelector('[data-home-chart]'), result.series, investmentLines, { interactive: false, label: 'Patrimônio e total investido, do mês 0 ao mês 60' });
}
