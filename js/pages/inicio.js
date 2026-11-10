import { example, project } from '../core/financial-engine.js';
import { compactMoney, money, percent } from '../core/format.js';
import { drawChart, investmentLines } from '../components/chart.js';

export function renderHome(main) {
  const result = project(example);
  main.innerHTML = `
    <section class="hero" aria-labelledby="home-title">
      <div>
        <p class="eyebrow">Educação financeira · Sem transações reais</p>
        <h1 id="home-title">Veja seu dinheiro crescer antes de investir.</h1>
        <p class="lead">Escolha como começar. Faça uma projeção ou pratique com uma carteira virtual.</p>
        <div class="home-journeys">
          <article class="card journey journey-projection">
            <p class="eyebrow">Simular · Projeções</p>
            <h2>Quero simular meu dinheiro</h2>
            <p>Calcule juros compostos e compare alternativas antes de investir.</p>
            <a class="button" href="#simulador">Começar uma simulação</a>
          </article>
          <article class="card journey journey-invest">
            <p class="eyebrow">Investir · Saldo virtual</p>
            <h2>Quero praticar investimentos</h2>
            <p>Use dinheiro fictício para conhecer o mercado, comprar ativos e acompanhar sua carteira.</p>
            <a class="button" href="#mercado">Entrar no mercado simulado</a>
          </article>
        </div>
      </div>
      <section class="card home-chart" aria-label="Exemplo de projeção em cinco anos">
        <p class="eyebrow">Exemplo de simulação</p>
        <h2>Patrimônio em 5 anos</h2>
        <p class="hero-amount">${compactMoney(result.balance)}</p>
        <div data-home-chart></div>
        <p class="muted chart-basis">${money(example.initial)} iniciais · ${money(example.contribution)}/mês · ${percent(example.rate)} a.m.</p>
      </section>
    </section>
    <section class="home-guide section" aria-labelledby="como-funciona">
      <h2 id="como-funciona">Como funciona</h2>
      <ol class="home-steps">
        <li><h3>Projete e compare</h3><p>Experimente valores, taxas e prazos. A projeção fica separada do saldo virtual.</p><a href="#comparador">Comparar modalidades</a></li>
        <li><h3>Pratique com saldo fictício</h3><p>Compre e venda ativos simulados e acompanhe o efeito na carteira.</p><a href="#painel">Ver visão geral de Investir</a></li>
        <li><h3>Aprenda no seu ritmo</h3><p>Consulte conceitos e use o quiz para conferir o que aprendeu.</p><a href="#aprender">Explorar glossário e quiz</a></li>
      </ol>
    </section>`;
  drawChart(main.querySelector('[data-home-chart]'), result.series, investmentLines, { interactive: false, label: 'Patrimônio e total investido, do mês 0 ao mês 60' });
}
