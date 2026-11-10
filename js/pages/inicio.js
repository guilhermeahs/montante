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
        <div class="actions"><a class="button" href="#simulador">Começar a simular</a><a class="button secondary" href="#comparador">Comparar modalidades</a></div>
      </div>
      <section class="card" aria-label="Exemplo de projeção em cinco anos">
        <div class="muted">Patrimônio em 5 anos</div>
        <p class="hero-amount">${compactMoney(result.balance)}</p>
        <div data-home-chart></div>
      </section>
    </section>
    <section class="section" aria-labelledby="como-funciona">
      <h2 id="como-funciona">Como funciona</h2>
      <div class="cards">
        <article class="card"><h3>Simular</h3><p>Informe capital inicial, aportes, taxa e prazo para visualizar a projeção mês a mês.</p><a href="#simulador">Abrir simulador</a></article>
        <article class="card"><h3>Comparar</h3><p>Veja Poupança, CDB e Tesouro Selic lado a lado com a mesma base de cálculo.</p><a href="#comparador">Abrir comparador</a></article>
        <article class="card"><h3>Aprender</h3><p>Separe o total depositado dos rendimentos e veja o efeito de juros sobre juros.</p></article>
      </div>
    </section>`;
  drawChart(main.querySelector('[data-home-chart]'), result.series, investmentLines, { interactive: false, label: 'Patrimônio e total investido, do mês 0 ao mês 60' });
}
