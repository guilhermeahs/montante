import { drawChart, investmentLines } from '../components/chart.js';
import { confirmAction } from '../components/dialog.js';
import { baseFields, durationField, field, listenForm, readBase, readNumber } from '../components/forms.js';
import { project } from '../core/financial-engine.js';
import { escapeHtml, inputNumber, money, percent } from '../core/format.js';
import { projectGoal, projectScenario, scenarios } from '../core/planning.js';
import { observeState, store, transact } from '../services/storage.js';

const defaultGoal = { initial: 0, contribution: 0, rate: 0, months: '' };

function goalCards(goals) {
  return goals.length ? goals.map(item => {
    const result = projectGoal(item.target, item.params);
    return `<li><div><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${result.required === null ? 'Aporte fora do limite de projeção' : money(result.required) + ' por mês'} · ${item.params.months} meses</span></div>
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
        <h2>Quanto preciso guardar?</h2>
        ${field('goal-target', 'Quanto você quer ter? (R$)', '', { format: 'money' })}
        ${field('goal-months', 'Em quanto tempo? (meses)', '', { mode: 'numeric' })}
        <details id="goal-options">
          <summary>Personalizar cálculo</summary>
          <div class="stacked section">
            ${field('goal-initial', 'Quanto já tem investido? (R$)', 0, { format: 'money' })}
            ${field('goal-rate', 'Rentabilidade hipotética (% ao mês)', 0, { help: 'Use 0% para calcular sem rendimentos. Uma taxa positiva serve como exemplo.' })}
            ${field('goal-contribution', 'Aporte mensal atual ou planejado (R$)', '', { format: 'money', required: false, help: 'Opcional. Preencha para comparar com o aporte necessário.' })}
          </div>
        </details>
        <div class="actions"><button type="submit">Calcular meu aporte mensal</button><button type="button" class="secondary" id="clear-goal" hidden>Nova meta</button></div>
        <p class="error" role="alert" id="goal-error"></p>
      </form>
      <section class="card stacked" id="goal-result-panel">
        <h2 id="goal-result-title" tabindex="-1">Aporte mensal necessário</h2><div id="goal-result" aria-live="polite"></div>
        <p class="muted">Projeção com taxa constante e depósitos no fim do mês. A estimativa exclui impostos e inflação.</p>
        <details id="goal-save-options" hidden>
          <summary>Salvar esta meta</summary>
          <div class="stacked section">
            <div class="field"><label for="goal-name">Nome da meta (opcional)</label><input id="goal-name" form="goal-form" maxlength="80" placeholder="Ex.: Comprar um carro"></div>
            <div><button type="submit" form="goal-form" class="secondary" value="save" id="save-goal">Salvar meta</button></div>
          </div>
        </details>
      </section>
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
  const output = query('#goal-result');
  const advanced = query('#goal-options');
  const saveOptions = query('#goal-save-options');
  const emptyResult = 'Informe o valor e o prazo para calcular.';

  function show(target, params, hasContribution) {
    const { required, balance } = projectGoal(target, params);
    const { initial, months, rate, contribution } = params;
    const duration = months + (months === 1 ? ' mês' : ' meses');
    const assumption = rate === 0 ? 'Sem considerar rendimentos.' : `Com rentabilidade hipotética de ${percent(rate, 6)} ao mês.`;
    const noYield = rate === 0 ? null : projectGoal(target, { ...params, rate: 0 }).required;
    const projected = hasContribution || required !== null ? project({ ...params, contribution: hasContribution ? contribution : required }) : null;
    const difference = required === null ? 0 : Number((contribution - required).toFixed(2));
    const gap = Number((target - balance).toFixed(2));
    output.innerHTML = `<p class="hero-amount">${required === null ? 'Fora do limite de projeção' : money(required) + ' por mês'}</p>
      <p>Para chegar a <strong>${money(target)}</strong> em ${duration}, começando com ${money(initial)}. ${assumption}</p>
      ${required === 0 ? '<p>O valor inicial já alcança a meta no prazo considerado. O aporte adicional é zero.</p>' : ''}
      ${noYield === null ? '' : `<p>Sem considerar rendimentos, o aporte seria <strong>${money(noYield)} por mês</strong>.</p>`}
      ${hasContribution && required !== null ? `<p>Seu aporte informado de ${money(contribution)} por mês
        ${difference === 0 ? 'é igual ao necessário.' : `está ${money(Math.abs(difference))} ${difference < 0 ? 'abaixo' : 'acima'} do necessário.`}
        ${gap > 0 ? `Nesse ritmo, faltariam ${money(gap)} no fim do prazo.` : 'A meta é alcançada na projeção.'}</p>` : ''}
      ${projected ? `<details><summary>Ver evolução e valores</summary>
        <p>Com o aporte ${hasContribution ? 'informado' : 'necessário'}, o total projetado é <strong>${money(projected.balance)}</strong>.
          Total investido: ${money(projected.invested)}. Rendimentos estimados: ${money(projected.interest)}.</p>
        <div id="goal-chart"></div></details>` : ''}`;
    if (projected) drawChart(query('#goal-chart'), projected.series, investmentLines, { label: 'Evolução projetada da meta' });
    saveOptions.hidden = false;
  }
  function load(item, hasContribution = item?.params.contribution > 0) {
    editingId = item?.id;
    const { initial, contribution, rate, months } = item?.params ?? defaultGoal;
    form.elements['goal-name'].value = item?.name ?? '';
    form.elements['goal-target'].value = item ? inputNumber(item.target) : '';
    form.elements['goal-initial'].value = inputNumber(initial);
    form.elements['goal-contribution'].value = hasContribution ? inputNumber(contribution) : '';
    form.elements['goal-rate'].value = inputNumber(rate);
    form.elements['goal-months'].value = months;
    advanced.open = initial > 0 || rate > 0 || hasContribution;
    saveOptions.open = Boolean(item);
    saveOptions.hidden = !item;
    query('#clear-goal').hidden = !item;
    query('#save-goal').textContent = item ? 'Salvar alterações' : 'Salvar meta';
    query('#goal-error').textContent = '';
    for (const input of form.querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
    if (item) show(item.target, item.params, hasContribution);
    else output.textContent = emptyResult;
  }
  function showState(next) {
    state = next;
    const signature = JSON.stringify(next.goals);
    if (signature === shownGoals) return;
    shownGoals = signature;
    list.innerHTML = goalCards(next.goals);
  }
  listenForm(form, query('#goal-error'), async event => {
    const target = readNumber(form, 'goal-target', { min: .01, max: 1e8, grouped: true, cents: true });
    const months = readNumber(form, 'goal-months', { min: 1, max: 600, integer: true });
    const hasContribution = Boolean(form.elements['goal-contribution'].value.trim());
    const currency = { max: 1e8, grouped: true, cents: true };
    const params = {
      months, initial: readNumber(form, 'goal-initial', currency),
      rate: readNumber(form, 'goal-rate', { max: 100 }),
      contribution: hasContribution ? readNumber(form, 'goal-contribution', currency) : 0
    };
    show(target, params, hasContribution);
    if (event.submitter?.value !== 'save') {
      query('#goal-result-title').focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 760px)').matches) query('#goal-result-panel').scrollIntoView({ block: 'start' });
      return;
    }
    const name = form.elements['goal-name'].value.trim() || 'Meta de ' + money(target);
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
      if (editingId === existingId) load(item, hasContribution);
    } finally {
      save.disabled = false;
    }
  });
  form.addEventListener('input', () => {
    output.textContent = emptyResult;
    saveOptions.hidden = true;
  });
  query('#clear-goal').addEventListener('click', () => {
    load();
    form.elements['goal-target'].focus();
  });
  list.addEventListener('click', event => {
    const { editGoal, deleteGoal } = event.target.closest('button')?.dataset ?? {};
    const item = state.goals.find(entry => entry.id === (editGoal ?? deleteGoal));
    if (!item) return;
    if (editGoal) {
      load(item);
      form.elements['goal-target'].focus();
    }
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
