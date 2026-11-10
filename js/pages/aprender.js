import { confirmAction } from '../components/dialog.js';
import { normalizeSearch } from '../core/format.js';
import { glossary, quiz } from '../data/educacao.js';
import { observeState, store, transact } from '../services/storage.js';

const beginnerTerms = new Set(['Juros simples', 'Juros compostos', 'Aporte', 'Inflação']);
let glossaryQuery = '';

function conceptCards(entries) {
  return `<div class="cards">${entries.map(([title, description]) =>
    `<article class="card modality glossary-term"><h4>${title}</h4><p>${description}</p></article>`
  ).join('')}</div>`;
}

export function renderEducation(main) {
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Aprender · Primeiros passos</p>
      <h1>Conceitos e glossário</h1>
      <p class="lead">Comece pelos juros e aportes. Use a busca quando encontrar um termo novo no Simulador ou no Mercado.</p>
      <div class="actions"><a class="button" href="#quiz">Testar no quiz</a><a class="button secondary" href="#simulador">Simular juros compostos</a></div>
    </header>
    <section class="card stacked" aria-labelledby="glossary-title">
      <h2 id="glossary-title">Glossário</h2>
      <div class="field"><label for="glossary-search">Buscar no glossário</label><input type="search" id="glossary-search" placeholder="Ex.: inflação ou liquidez"></div>
      <p class="muted" id="glossary-count" role="status"></p>
      <div class="stacked" id="glossary"></div>
    </section>`;

  const search = main.querySelector('#glossary-search');
  search.value = glossaryQuery;
  const count = main.querySelector('#glossary-count');
  const list = main.querySelector('#glossary');
  function group(title, entries) {
    return `<section class="glossary-group"><h3>${title}</h3>${conceptCards(entries)}</section>`;
  }
  function showGlossary() {
    const term = normalizeSearch(search.value.trim());
    if (!term) {
      count.textContent = '';
      list.innerHTML = group('Comece por aqui', glossary.filter(([title]) => beginnerTerms.has(title))) +
        group('Outros conceitos', glossary.filter(([title]) => !beginnerTerms.has(title)));
      return;
    }
    const results = glossary.filter(entry => normalizeSearch(entry.join(' ')).includes(term));
    count.textContent = results.length === 0 ? 'Nenhum termo encontrado.' :
      results.length + (results.length === 1 ? ' termo encontrado.' : ' termos encontrados.');
    list.innerHTML = results.length ? group('Resultados da busca', results) : '';
  }
  search.addEventListener('input', () => {
    glossaryQuery = search.value;
    showGlossary();
  });
  showGlossary();
}

export function renderQuiz(main) {
  const state = store.read();
  let signature;
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Aprender · Atividades</p>
      <h1>Quiz educativo</h1>
      <p class="lead">Escolha uma resposta por pergunta e confira a explicação. Seu progresso é salvo neste navegador.</p>
      <div class="actions related-actions"><a href="#aprender">Voltar ao glossário</a><a href="#simulador">Praticar no simulador</a><a href="#mercado">Explorar mercado simulado</a></div>
    </header>
    <section class="card stacked" aria-label="Perguntas do quiz">
      <div class="quiz-toolbar"><p id="quiz-score" role="status"></p><button class="secondary" id="reset-quiz">Refazer quiz</button></div>
      <p id="quiz-error" class="error" role="alert"></p>
      <div class="stacked" id="quiz"></div>
    </section>`;
  const query = selector => main.querySelector(selector);
  const questions = query('#quiz');
  const error = query('#quiz-error');

  function showQuiz(next) {
    const answers = next.answers;
    const updated = JSON.stringify(answers);
    if (signature === updated) return;
    signature = updated;
    const answered = Object.keys(answers).length;
    const correct = quiz.filter(question => answers[question.id] === question.answer).length;
    query('#quiz-score').textContent = `${answered} de ${quiz.length} respondidas · ${correct} ${correct === 1 ? 'acerto' : 'acertos'}${answered === quiz.length ? ' · Quiz concluído' : ''}`;
    query('#reset-quiz').disabled = !answered;
    questions.innerHTML = quiz.map((question, index) => {
      const selected = answers[question.id];
      const done = selected !== undefined;
      const right = done && selected === question.answer;
      return `<fieldset class="stacked quiz-question">
        <legend>${index + 1}. ${question.prompt}</legend>
        ${question.options.map((option, choice) => `<button type="button" class="secondary quiz-choice" data-question="${question.id}" data-choice="${choice}" aria-pressed="${selected === choice}" ${done ? 'disabled' : ''}>${option}</button>`).join('')}
        ${done ? `<p tabindex="-1" data-feedback="${question.id}" class="${right ? 'positive' : 'muted'}"><strong>${right ? 'Correto.' : 'Resposta certa: ' + question.options[question.answer] + '.'}</strong> ${question.explanation}</p>` : ''}
      </fieldset>`;
    }).join('');
  }

  questions.addEventListener('click', async event => {
    const button = event.target.closest('[data-question]');
    if (!button || button.disabled) return;
    const { question, choice } = button.dataset;
    error.textContent = '';
    button.disabled = true;
    try {
      await transact(current => Object.hasOwn(current.answers, question) ? current : {
        ...current, answers: { ...current.answers, [question]: Number(choice) }
      });
      questions.querySelector(`[data-feedback="${question}"]`)?.focus({ preventScroll: true });
    } catch (failure) {
      error.textContent = failure.message;
      button.disabled = false;
    }
  });
  query('#reset-quiz').addEventListener('click', () => {
    confirmAction('Refazer quiz', 'As respostas atuais serão removidas para você tentar de novo.', 'Limpar respostas',
      () => transact(current => ({ ...current, answers: {} })));
  });
  showQuiz(state);
  return observeState(showQuiz, failure => { error.textContent = failure.message; });
}
