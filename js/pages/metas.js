import { drawChart } from '../components/chart.js';
import { confirmAction } from '../components/dialog.js';
import { baseFields, durationField, field, listenForm, readBase, readNumber } from '../components/forms.js';
import { example } from '../core/financial-engine.js';
import { escapeHtml, inputNumber, money, percent } from '../core/format.js';
import { projectGoal, projectScenario, scenarios } from '../core/planning.js';
import { observeState, store, transact } from '../services/storage.js';

function goalCards(goals) {
  return goals.length ? goals.map(item => {
    const result = projectGoal(item.target, item.params);
    return `<li><div><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${money(result.balance)} de ${money(item.target)} · ${percent(result.reach)} · ${item.params.months} meses</span></div>
      <div class="actions"><button class="secondary" data-edit-goal="${item.id}">Editar</button><button class="secondary" data-delete-goal="${item.id}">Excluir</button></div></li>`;
  }).join('') : '<li class="muted">Nenhuma meta salva neste navegador.</li>';
}

export function renderGoals(main) {
  let state = store.read();
  let editingId;
  let shownGoals;
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Simular · Projeções</p>
      <h1>Metas e cenários</h1>
      <p class="lead">Estime quanto guardar por mês e veja como as premissas mudam sua projeção.</p>
    </header>
    <div class="two-cards">
      <form id="goal-form" class="card stacked" novalidate>
        <h2>Calcule uma meta</h2>
        <div class="field"><label for="goal-name">Nome da meta</label><input id="goal-name" maxlength="80" value="Minha meta" required></div>
        ${field('goal-target', 'Valor-alvo (R$)', 40000, { format: 'money' })}
        ${baseFields(example, 'goal-')}
        ${field('goal-rate', 'Taxa hipotética (% ao mês)', example.rate)}
        ${durationField(example.months, 'goal-')}
        <div class="actions"><button type="submit">Projetar meta</button><button type="submit" class="secondary" value="save" id="save-goal">Salvar meta</button><button type="button" class="secondary" id="clear-goal" hidden>Nova meta</button></div>
        <p class="error" role="alert" id="goal-error"></p>
      </form>
      <section class="card stacked"><h2>Projeção da meta</h2><div id="goal-result" aria-live="polite"></div><p class="muted">Estimativa com taxa constante, aporte no fim do mês e sem impostos. O aporte necessário indica o total a depositar por mês.</p></section>
    </div>
    <section class="card section"><h2>Metas salvas</h2><p id="goal-status" role="status"></p><ul class="record-list" id="goals"></ul></section>
    <section class="card section stacked">
      <h2>Compare hipóteses</h2>
      <p class="muted">Conservador, moderado e otimista são rótulos de premissas. As taxas são ilustrativas. Cada cenário pode usar capital, aporte, taxa e prazo próprios.</p>
      <details>
        <summary>Editar premissas dos cenários</summary>
        <form class="stacked section" id="scenario-form" novalidate>
          <div class="cards">${scenarios.map(({ id, label, params }) => `<fieldset class="stacked"><legend>${label}</legend>
            ${baseFields(params, id + '-')}${field(id + '-rate', 'Taxa (% ao mês)', params.rate)}${durationField(params.months, id + '-')}</fieldset>`).join('')}</div>
          ${field('scenario-inflation', 'Inflação ilustrativa (% ao ano)', 4, { help: 'Descontada do valor nominal. Use zero para comparar sem inflação.' })}
          <div><button type="submit">Atualizar cenários</button></div>
          <p class="error" role="alert" id="scenario-error"></p>
        </form>
      </details>
      <div id="scenario-results" class="cards" aria-live="polite"></div>
      <div id="scenario-chart"></div>
    </section>`;
  const query = selector => main.querySelector(selector);
  const form = query('#goal-form');
  const status = query('#goal-status');
  const list = query('#goals');
  function show(result) {
    const gap = Number(result.gap.toFixed(2));
    const difference = gap === 0 ? 'Alvo atingido na projeção.' : (gap < 0 ? 'Faltam ' : 'Acima do alvo: ') + money(Math.abs(gap)) + '.';
    query('#goal-result').innerHTML = `<p class="hero-amount">${money(result.balance)}</p>
      <label for="goal-progress">Projeção de alcance: <strong>${percent(result.reach)}</strong></label>
      <progress id="goal-progress" max="100" value="${Math.min(100, result.reach)}"></progress>
      <p>${difference}</p>
      <p>Aporte mensal necessário: <strong>${result.required === null ? 'fora do limite de projeção' : money(result.required)}</strong>.</p>`;
  }
  function load(item) {
    editingId = item?.id;
    const { initial, contribution, rate, months } = item?.params ?? example;
    form.elements['goal-name'].value = item?.name ?? 'Minha meta';
    form.elements['goal-target'].value = inputNumber(item?.target ?? 40000);
    form.elements['goal-initial'].value = inputNumber(initial);
    form.elements['goal-contribution'].value = inputNumber(contribution);
    form.elements['goal-rate'].value = inputNumber(rate);
    form.elements['goal-months'].value = months;
    query('#clear-goal').hidden = !item;
    query('#save-goal').textContent = item ? 'Salvar alterações' : 'Salvar meta';
    query('#goal-error').textContent = '';
    for (const input of form.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
    show(projectGoal(item?.target ?? 40000, { initial, contribution, rate, months }));
    if (item) form.elements['goal-name'].focus();
  }
  function showState(next) {
    state = next;
    const signature = JSON.stringify(next.goals);
    if (signature === shownGoals) return;
    shownGoals = signature;
    list.innerHTML = goalCards(next.goals);
  }
  listenForm(form, query('#goal-error'), async event => {
    const name = form.elements['goal-name'].value.trim();
    const target = readNumber(form, 'goal-target', { min: .01, max: 1e8, grouped: true, cents: true });
    const params = { ...readBase(form, 'goal-'), rate: readNumber(form, 'goal-rate', { max: 100 }) };
    const result = projectGoal(target, params);
    show(result);
    if (event.submitter?.value !== 'save') return;
    if (!name || name.length > 80) {
      form.elements['goal-name'].focus();
      throw new Error('Digite um nome com até 80 caracteres.');
    }
    const save = query('#save-goal');
    if (save.disabled) return;
    save.disabled = true;
    const existingId = editingId;
    try {
      const id = existingId ?? crypto.randomUUID();
      const item = { id, name, target, params };
      await transact(current => {
        if (existingId && !current.goals.some(entry => entry.id === id)) throw new Error('A meta foi removida. Use Nova meta para criar outra.');
        return { ...current, goals: existingId ? current.goals.map(entry => entry.id === id ? item : entry) : [...current.goals, item] };
      });
      status.textContent = existingId ? 'Meta atualizada.' : 'Meta salva.';
      if (editingId === existingId) load(item);
    } finally {
      save.disabled = false;
    }
  });
  query('#clear-goal').addEventListener('click', () => load());
  list.addEventListener('click', event => {
    const { editGoal, deleteGoal } = event.target.closest('button')?.dataset ?? {};
    const item = state.goals.find(entry => entry.id === (editGoal ?? deleteGoal));
    if (!item) return;
    if (editGoal) load(item);
    if (deleteGoal) confirmAction('Excluir meta', 'Excluir a meta “' + item.name + '”?', 'Excluir meta', async () => {
      await transact(current => ({ ...current, goals: current.goals.filter(entry => entry.id !== deleteGoal) }));
      if (editingId === deleteGoal) load();
      status.textContent = 'Meta excluída.';
    });
  });

  function compare(entries, inflation) {
    const results = entries.map(entry => ({ ...entry, ...projectScenario(entry.params, inflation) }));
    query('#scenario-results').innerHTML = results.map(({ label, params, result, extra, real }) => `<article class="card modality">
      <h3>${label}</h3><p class="muted">${money(params.initial)} iniciais · ${money(params.contribution)}/mês · ${percent(params.rate, 6)} a.m. · ${params.months} meses</p>
      <p>Montante nominal: <strong>${money(result.balance)}</strong><br>Poder de compra projetado: <strong>${money(real)}</strong> (${percent(inflation)} a.a.)</p>
      <p>Com R$ 100 a mais por mês: ${extra === null ? 'fora do limite de projeção.' : `<strong>+${money(extra)}</strong> no montante.`}</p>
    </article>`).join('');
    const months = Math.max(...results.map(entry => entry.params.months));
    const data = Array.from({ length: months + 1 }, (_, month) => Object.fromEntries(results.map(entry => [entry.id, entry.result.series[month]?.balance ?? null])));
    drawChart(query('#scenario-chart'), data, results.map(entry => ({ key: entry.id, label: entry.label, color: entry.color })), { label: 'Montantes nominais das três hipóteses' });
  }
  const scenarioForm = query('#scenario-form');
  listenForm(scenarioForm, query('#scenario-error'), () => {
    const inflation = readNumber(scenarioForm, 'scenario-inflation', { max: 100 });
    const entries = scenarios.map(entry => ({ ...entry, params: {
      ...readBase(scenarioForm, entry.id + '-'), rate: readNumber(scenarioForm, entry.id + '-rate', { max: 100 })
    } }));
    compare(entries, inflation);
  });

  load();
  compare(scenarios, 4);
  showState(state);
  return observeState(showState, failure => { query('#goal-error').textContent = failure.message; });
}
