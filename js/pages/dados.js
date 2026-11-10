import { confirmAction } from '../components/dialog.js';
import { choiceField, choiceValue, setChoice } from '../components/forms.js';
import { download } from '../services/export.js';
import { emptyState, replaceState, store, transact } from '../services/storage.js';
import { exampleState, maximumBackupSize, parseBackup, serializeBackup } from '../services/demo.js';
import { resetComparator } from './comparador.js';
import { resetSimulator } from './simulador.js';

export function renderData(main) {
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Configurações</p>
      <h1>Dados e demonstração</h1>
      <p class="lead">Gerencie o tema, guarde seu progresso e prepare a demonstração acadêmica.</p>
    </header>
    <div class="two-cards settings-grid">
      <section class="card stacked">
        <h2>Roteiro da demonstração</h2>
        <ol><li>Abra Juros compostos e explore a projeção mês a mês.</li>
        <li>Compare três modalidades com as mesmas premissas.</li>
        <li>Avance um dia no relógio do Mercado, faça uma compra fictícia e abra o extrato em Minha carteira.</li></ol>
        <div class="actions related-actions"><a href="#inicio">Início</a><a href="#simulador">Juros compostos</a><a href="#comparador">Comparar modalidades</a><a href="#mercado">Mercado simulado</a></div>
        <div><button type="button" class="secondary" id="load-demo">Carregar carteira de exemplo</button></div>
        <div class="settings-reset">
          <h3>Limpar dados locais</h3>
          <p class="muted">Restaura o saldo fictício inicial e apaga os dados deste navegador. Exporte um backup para guardar seu progresso.</p>
          <button type="button" class="secondary" id="reset-demo">Restaurar estado inicial</button>
        </div>
        <p role="status" id="demo-status"></p>
      </section>
      <section class="card stacked">
        <h2>Backup local</h2>
        <p>Os dados pertencem a este navegador e endereço. Use um arquivo JSON para transferir seu progresso. A importação substitui os dados atuais após a confirmação.</p>
        <div><button type="button" id="export-backup">Exportar backup JSON</button></div>
        <form id="import-backup" class="stacked">
          <div class="field"><label for="backup-file">Arquivo de backup JSON</label><input id="backup-file" type="file" accept=".json,application/json" required></div>
          <div><button type="submit" class="secondary">Validar e importar</button></div>
        </form>
        <p role="status" id="data-status"></p><p class="error" role="alert" id="data-error"></p>
      </section>
    </div>
    <section class="card section stacked">
      <h2>Preferências</h2>
      ${choiceField('site-theme', 'Tema do Montante', [['light', 'Claro (original)'], ['dark', 'Escuro']])}
      <p role="status" id="theme-status"></p><p class="error" role="alert" id="theme-error"></p>
    </section>`;
  const query = selector => main.querySelector(selector);
  const error = query('#data-error');
  const status = query('#data-status');
  const demoStatus = query('#demo-status');
  const theme = query('#site-theme');
  try { setChoice(theme, store.read().theme); } catch { /* A restauração fica disponível mesmo com armazenamento inválido. */ }
  async function apply(state, feedback, message) {
    await replaceState(state);
    resetSimulator();
    resetComparator();
    setChoice(theme, state.theme);
    error.textContent = '';
    status.textContent = '';
    demoStatus.textContent = '';
    feedback.textContent = message;
  }
  query('#load-demo').addEventListener('click', () => {
    confirmAction('Carregar carteira de exemplo', 'Os dados locais, incluindo a rodada dos Desafios históricos, serão substituídos pelos dados de exemplo. Exporte um backup para guardar seu progresso.', 'Carregar exemplo',
      () => apply(exampleState(), demoStatus, 'Carteira de exemplo carregada. Abra a Visão geral de Investir ou Minha carteira.'));
  });
  query('#reset-demo').addEventListener('click', () => {
    confirmAction('Restaurar estado inicial', 'Todos os dados locais do Montante serão substituídos pelo estado inicial. A carteira voltará a R$ 50.000,00 fictícios.', 'Restaurar estado inicial',
      () => apply(emptyState(), demoStatus, 'Estado inicial restaurado.'));
  });
  query('#export-backup').addEventListener('click', () => {
    error.textContent = '';
    try { download('montante-backup.json', serializeBackup(store.read()), 'application/json'); }
    catch (failure) { error.textContent = failure.message; }
  });
  query('#import-backup').addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    status.textContent = '';
    try {
      const file = query('#backup-file').files[0];
      if (!file || file.size > maximumBackupSize) throw new Error('Selecione um arquivo JSON de até 1 MiB.');
      const backup = parseBackup(await file.text());
      if (!main.contains(event.target)) return;
      confirmAction('Importar backup', 'O arquivo foi validado. A importação substitui todos os dados locais do Montante.', 'Substituir dados',
        () => apply(backup, status, 'Backup importado.'));
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
  theme.addEventListener('change', async () => {
    const themeError = query('#theme-error');
    themeError.textContent = '';
    try {
      await transact(current => ({ ...current, theme: choiceValue(theme) }));
      query('#theme-status').textContent = 'Tema salvo.';
    } catch (failure) {
      themeError.textContent = failure.message;
      setChoice(theme, document.documentElement.dataset.theme ?? 'light');
    }
  });
}
