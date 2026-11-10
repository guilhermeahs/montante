import { annualFromMonthly, example, monthlyFromAnnual, project } from '../core/financial-engine.js';
import { escapeHtml, inputNumber, money, percent } from '../core/format.js';
import { drawChart, investmentLines } from '../components/chart.js';
import { askName, confirmAction } from '../components/dialog.js';
import { baseFields, durationField, field, listenForm, readBase, readNumber } from '../components/forms.js';
import { exportCSV } from '../services/export.js';
import { store, transact } from '../services/storage.js';

let lastParams = { ...example };
let unit = 'monthly';
let comparison;

export function takeComparison() {
  const selected = comparison;
  comparison = undefined;
  return selected;
}

export function resetSimulator() {
  lastParams = { ...example };
  unit = 'monthly';
  comparison = undefined;
}

export function renderSimulator(main) {
  const initialRate = unit === 'annual' ? annualFromMonthly(lastParams.rate) : lastParams.rate;
  main.innerHTML = `
    <div class="sim-layout">
      <form class="card stacked" id="projection" novalidate>
        <h1 class="form-title">Parâmetros</h1>
        ${baseFields(lastParams)}
        ${field('rate', 'Taxa de juros (% ao mês)', initialRate)}
        <div class="field"><label for="rate-unit">Período da taxa</label><select id="rate-unit"><option value="monthly">Mensal</option><option value="annual">Anual efetiva</option></select></div>
        ${durationField(lastParams.months)}
        <button type="submit">Simular</button>
        <p id="projection-error" class="error" role="alert"></p>
      </form>
      <div>
        <section id="projection-metrics" class="metric-grid" aria-label="Resultado da simulação" aria-live="polite"></section>
        <section class="card section">
          <h2>Evolução do patrimônio</h2>
          <div id="projection-chart"></div>
          <div class="chart-options">
            <label><input id="show-interest" type="checkbox"> Mostrar juros acumulados</label>
            <label><input id="show-simple" type="checkbox"> Comparar com juros simples</label>
          </div>
          <p id="projection-context" class="muted"></p>
        </section>
        <details class="card section">
          <summary>Tabela mensal</summary>
          <div class="table-wrap" role="region" aria-label="Tabela da evolução mês a mês" tabindex="0">
            <table><thead><tr><th>Mês</th><th>Saldo inicial</th><th>Aporte</th><th>Rendimento</th><th>Saldo final</th><th>Total investido</th></tr></thead><tbody id="projection-rows"></tbody></table>
          </div>
        </details>
        <div class="actions section">
          <button id="save-simulation" type="button">Salvar simulação</button>
          <button id="export-simulation" class="secondary" type="button">Exportar evolução em CSV</button>
        </div>
      </div>
    </div>
    <section class="section card">
      <h2>Simulações salvas</h2>
      <p id="simulation-status" class="muted" role="status"></p>
      <ul id="simulations" class="record-list"></ul>
    </section>`;

  const form = main.querySelector('#projection');
  const error = main.querySelector('#projection-error');
  const rateUnit = main.querySelector('#rate-unit');
  const rateLabel = form.elements.rate.labels[0];
  const status = main.querySelector('#simulation-status');
  const records = main.querySelector('#simulations');
  const interestToggle = main.querySelector('#show-interest');
  const simpleToggle = main.querySelector('#show-simple');
  let result = project(lastParams);

  function showChart() {
    const lines = [...investmentLines];
    if (interestToggle.checked) lines.push({ key: 'interest', label: 'Juros acumulados', color: 'var(--chart-blue)' });
    if (simpleToggle.checked) lines.push({ key: 'simple', label: 'Juros simples', color: 'var(--chart-purple)' });
    drawChart(main.querySelector('#projection-chart'), result.series, lines);
  }

  function showResult() {
    const metricAmount = value => money(value).replace('\u00a0', ' ');
    main.querySelector('#projection-metrics').innerHTML = `
      <article class="card metric emphasis"><p>Montante final</p><strong>${metricAmount(result.balance)}</strong></article>
      <article class="card metric"><p>Total investido</p><strong>${metricAmount(result.invested)}</strong></article>
      <article class="card metric profit"><p>Juros ganhos</p><strong>${metricAmount(result.interest)}</strong></article>`;
    main.querySelector('#projection-context').textContent =
      `Rentabilidade sobre o total investido: ${result.returnPercent === null ? 'indefinida sem capital investido' : percent(result.returnPercent)}. Aportes no fim do mês, taxa constante de ${percent(lastParams.rate, 6)} a.m. e sem impostos.`;
    main.querySelector('#projection-rows').innerHTML = result.series.map(row =>
      `<tr><th scope="row">${row.month}</th><td>${money(row.opening)}</td><td>${money(row.deposit)}</td><td>${money(row.yield)}</td><td>${money(row.balance)}</td><td>${money(row.invested)}</td></tr>`).join('');
    showChart();
  }

  function renderRecords() {
    try {
      const items = store.read().simulations;
      records.innerHTML = items.map(item => `<li><div><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${money(project(item.params).balance)} · ${item.params.months} meses · ${percent(item.params.rate, 6)} a.m.</span></div>
        <div class="actions">
          <button class="secondary" data-action="open" data-id="${item.id}">Abrir</button>
          <button class="secondary" data-action="compare" data-id="${item.id}">Comparar</button>
          <button class="secondary" data-action="rename" data-id="${item.id}">Renomear</button>
          <button class="secondary" data-action="remove" data-id="${item.id}">Excluir</button>
        </div></li>`).join('') || '<li class="muted">Nenhuma simulação salva neste navegador.</li>';
    } catch {
      records.innerHTML = '<li class="error">Não foi possível ler as simulações salvas neste navegador.</li>';
    }
  }

  function setRateLabel() {
    rateLabel.textContent = unit === 'annual' ? 'Taxa de juros (% ao ano)' : 'Taxa de juros (% ao mês)';
  }

  rateUnit.value = unit;
  setRateLabel();
  rateUnit.addEventListener('change', () => {
    const oldUnit = unit;
    const newUnit = rateUnit.value;
    unit = newUnit;
    setRateLabel();
    try {
      const oldRate = readNumber(form, 'rate', { max: oldUnit === 'annual' ? annualFromMonthly(100) + 1e-6 : 100 });
      form.elements.rate.value = inputNumber(newUnit === 'annual' ? annualFromMonthly(oldRate) : Math.min(100, monthlyFromAnnual(oldRate)));
      error.textContent = '';
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
  listenForm(form, error, () => {
    const base = readBase(form);
    const inputRate = readNumber(form, 'rate', { max: unit === 'annual' ? annualFromMonthly(100) + 1e-6 : 100 });
    const rate = unit === 'annual' ? Math.min(100, monthlyFromAnnual(inputRate)) : inputRate;
    const params = { ...base, rate };
    result = project(params);
    lastParams = params;
    showResult();
  });
  interestToggle.addEventListener('change', showChart);
  simpleToggle.addEventListener('change', showChart);

  main.querySelector('#save-simulation').addEventListener('click', () => {
    askName('Salvar simulação', '', async name => {
      await transact(state => ({ ...state, simulations: [...state.simulations, { id: crypto.randomUUID(), name, params: lastParams }] }));
      renderRecords();
      status.textContent = 'Simulação salva.';
    });
  });
  main.querySelector('#export-simulation').addEventListener('click', () => {
    const headings = ['Mês', 'Saldo inicial (R$)', 'Aporte (R$)', 'Rendimento (R$)', 'Saldo final (R$)', 'Total investido (R$)', 'Juros acumulados (R$)'];
    const rows = result.series.map(row => [row.month, ...[row.opening, row.deposit, row.yield, row.balance, row.invested, row.interest].map(value => Number(value.toFixed(2)))]);
    exportCSV('montante-evolucao.csv', [headings, ...rows]);
  });
  records.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    try {
      const item = store.read().simulations.find(entry => entry.id === button.dataset.id);
      if (!item) throw new Error('Essa simulação já foi removida.');
      switch (button.dataset.action) {
        case 'open':
          lastParams = item.params;
          renderSimulator(main);
          main.scrollIntoView();
          main.focus({ preventScroll: true });
          break;
        case 'compare':
          comparison = item;
          location.hash = 'comparador';
          break;
        case 'rename':
          askName('Renomear simulação', item.name, async name => {
            await transact(state => ({ ...state, simulations: state.simulations.map(entry => entry.id === item.id ? { ...entry, name } : entry) }));
            renderRecords();
            status.textContent = 'Simulação renomeada.';
          });
          break;
        case 'remove':
          confirmAction('Excluir simulação', 'Excluir a simulação “' + item.name + '”?', 'Excluir simulação', async () => {
            await transact(state => ({ ...state, simulations: state.simulations.filter(entry => entry.id !== item.id) }));
            renderRecords();
            status.textContent = 'Simulação excluída.';
          });
          break;
      }
    } catch (failure) {
      status.textContent = failure.message;
    }
  });
  showResult();
  renderRecords();

}
