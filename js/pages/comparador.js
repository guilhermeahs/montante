import { example, project } from '../core/financial-engine.js';
import { escapeHtml, money, percent } from '../core/format.js';
import { baseFields, durationField, field, listenForm, readBase, readNumber } from '../components/forms.js';
import { drawChart } from '../components/chart.js';
import { compareModes, defaultRates, modes } from '../data/modalidades.js';
import { takeComparison } from './simulador.js';

let base = { ...example };
let rates = { ...defaultRates };

export function resetComparator() {
  base = { ...example };
  rates = { ...defaultRates };
}

export function renderComparator(main) {
  const selected = takeComparison();
  if (selected) {
    base = { ...selected.params };
    rates = { ...defaultRates };
  }
  main.innerHTML = `
    <h1>Comparador de modalidades</h1>
    <p class="lead" id="comparison-base"></p>
    <section class="card" aria-label="Montantes por modalidade"><div id="comparison-bars" class="comparison-bars" aria-live="polite"></div></section>
    <section id="comparison-cards" class="cards section" aria-label="Sobre cada modalidade"></section>
    <p class="muted section">Taxas ilustrativas. Resultados simulados, sem IR, IOF, taxas operacionais ou garantia de rentabilidade futura.</p>
    <details class="card section">
      <summary>Editar valores, prazo e taxas</summary>
      <form id="comparison-form" class="stacked section" novalidate>
        <div class="cards">${baseFields(base)}${durationField(base.months)}</div>
        <div class="cards">${modes.map(mode => field(mode.id, mode.label + ' (% ao mês)', rates[mode.id])).join('')}</div>
        <div class="actions"><button type="submit">Atualizar comparação</button><button id="restore-rates" class="secondary" type="button">Restaurar taxas padrão</button></div>
        <p class="error" role="alert"></p>
      </form>
    </details>
    <section class="card section">
      <h2>Evolução das modalidades</h2>
      <p id="comparison-difference" class="muted"></p>
      <div id="comparison-chart"></div>
    </section>`;
  const form = main.querySelector('#comparison-form');
  const error = form.querySelector('.error');

  function renderResults(params, rateValues) {
    const results = compareModes(params, rateValues);
    if (selected) results.push({
      id: 'salva', label: selected.name, rate: selected.params.rate, color: 'var(--chart-purple)', line: 'var(--chart-purple)',
      description: 'Taxa da simulação salva aplicada à mesma base de cálculo.',
      result: project({ ...params, rate: selected.params.rate })
    });
    const byBalance = [...results].sort((first, second) => first.result.balance - second.result.balance);
    const lowest = byBalance[0].result.balance;
    const highest = byBalance.at(-1).result.balance;
    main.querySelector('#comparison-base').textContent =
      `${money(params.initial)} iniciais + ${money(params.contribution)} por mês durante ${params.months} meses.`;
    main.querySelector('#comparison-bars').innerHTML = results.map(entry => `
      <div class="bar-row"><strong>${escapeHtml(entry.label)}</strong><div class="bar-track" aria-hidden="true"><div style="width:${highest ? entry.result.balance / highest * 100 : 0}%;background:${entry.color}"></div></div><strong>${money(entry.result.balance)}</strong></div>`).join('');
    main.querySelector('#comparison-cards').innerHTML = results.map(entry => `
      <article class="card modality"><h2>${escapeHtml(entry.label)}</h2><p class="muted">${percent(entry.rate, 6)} a.m. · Taxa hipotética</p>
      <p>${entry.description}</p><p>Juros: <strong>${money(entry.result.interest)}</strong><br>Rentabilidade sobre o investido: <strong>${entry.result.returnPercent === null ? '—' : percent(entry.result.returnPercent)}</strong></p></article>`).join('');
    main.querySelector('#comparison-difference').textContent =
      `Diferença entre o maior e o menor montante bruto: ${money(highest - lowest)}${lowest ? ' (' + percent((highest - lowest) / lowest * 100) + ' sobre o menor)' : ''}. Aportes no fim de cada mês.`;
    const history = results[0].result.series.map((_, month) =>
      Object.fromEntries(results.map(entry => [entry.id, entry.result.series[month].balance])));
    drawChart(main.querySelector('#comparison-chart'), history, results.map(entry => ({ key: entry.id, label: entry.label, color: entry.line })));
  }

  function update() {
    const newBase = readBase(form);
    const newRates = Object.fromEntries(modes.map(mode => [mode.id, readNumber(form, mode.id, { max: 100 })]));
    renderResults(newBase, newRates);
    base = newBase;
    rates = newRates;
  }

  listenForm(form, error, update);
  main.querySelector('#restore-rates').addEventListener('click', () => {
    for (const mode of modes) form.elements[mode.id].value = String(mode.rate).replace('.', ',');
    form.requestSubmit();
  });
  renderResults(base, rates);
}
