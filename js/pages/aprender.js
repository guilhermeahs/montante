import { confirmAction } from '../components/dialog.js';
import { normalizeSearch } from '../core/format.js';
import { glossary, quiz } from '../data/educacao.js';
import { observeState, store, transact } from '../services/storage.js';

export function renderEducation(main) {
  const state = store.read();
  let signature;
  main.innerHTML = `
    <p class="eyebrow">Educação financeira</p><h1>Aprender</h1>
    <p class="lead">Entenda os termos do simulador e teste o que aprendeu com exemplos.</p>
    <section class="card stacked">
      <h2>Glossário</h2>
      <div class="field"><label for="glossary-search">Buscar no glossário</label><input type="search" id="glossary-search" placeholder="Ex.: inflação ou liquidez"></div>
      <div class="cards" id="glossary"></div>
      <p class="muted" id="glossary-count" role="status"></p>
    </section>
    <section class="card section stacked">
      <h2>Quiz educativo</h2>
      <p class="muted">Escolha uma resposta por pergunta e veja a explicação. Seu progresso é salvo neste navegador.</p>
      <div class="actions"><button class="secondary" id="reset-quiz">Refazer quiz</button><a href="#simulador">Praticar no simulador</a></div>
      <p id="quiz-score" role="status"></p><p id="quiz-error" class="error" role="alert"></p>
      <div class="stacked" id="quiz"></div>
    </section>`;
  const query = selector => main.querySelector(selector);
  const search = query('#glossary-search');
  const questions = query('#quiz');
  const error = query('#quiz-error');

  function showGlossary() {
    const term = normalizeSearch(search.value.trim());
    const results = glossary.filter(entry => normalizeSearch(entry.join(' ')).includes(term));
    query('#glossary').innerHTML = results.map(([title, description]) => `<article class="card modality"><h3>${title}</h3><p>${description}</p></article>`).join('');
    query('#glossary-count').textContent = results.length ? results.length + ' termos encontrados.' : 'Nenhum termo encontrado.';
  }

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

  search.addEventListener('input', showGlossary);
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
  showGlossary();
  showQuiz(state);
  return observeState(showQuiz, failure => { error.textContent = failure.message; });
}
