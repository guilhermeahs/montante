import { confirmAction } from '../components/dialog.js';
import { download } from '../services/export.js';
import { emptyState, replaceState, store } from '../services/storage.js';
import { exampleState, maximumBackupSize, parseBackup, serializeBackup } from '../services/demo.js';
import { resetComparator } from './comparador.js';
import { resetSimulator } from './simulador.js';

export function renderData(main) {
  main.innerHTML = `
    <p class="eyebrow">Projeto acadêmico A3</p>
    <h1>Dados e demonstração</h1>
    <p class="lead">Use dados reproduzíveis na apresentação ou transfira seu progresso com um backup local. Todas as cotações, ordens e projeções são educativas.</p>
    <section class="card stacked">
      <h2>Roteiro da demonstração</h2>
      <ol><li>Abra o simulador com os valores do protótipo e explore a tabela mês a mês.</li>
      <li>Compare três modalidades com as mesmas premissas e altere as taxas hipotéticas.</li>
      <li>Avance um dia no mercado, simule uma operação e abra o extrato da carteira.</li></ol>
      <div class="actions"><a class="button" href="#inicio">Início</a><a class="button secondary" href="#simulador">Simulador</a><a class="button secondary" href="#comparador">Comparador</a><a class="button secondary" href="#mercado">Mercado e relógio</a></div>
      <div class="actions"><button type="button" class="secondary" id="load-demo">Carregar carteira de exemplo</button><button type="button" class="secondary" id="reset-demo">Restaurar estado inicial</button></div>
    </section>
    <section class="card section stacked">
      <h2>Backup local</h2>
      <p>Os dados pertencem a este navegador e endereço. Para mudar de navegador ou computador, exporte um backup JSON e importe no outro. A importação validada substitui o estado atual.</p>
      <div class="actions"><button type="button" id="export-backup">Exportar backup JSON</button></div>
      <form id="import-backup" class="stacked">
        <div class="field"><label for="backup-file">Arquivo de backup JSON</label><input id="backup-file" type="file" accept=".json,application/json" required></div>
        <div><button type="submit" class="secondary">Validar e importar</button></div>
      </form>
      <p role="status" id="data-status"></p><p class="error" role="alert" id="data-error"></p>
    </section>`;
  const query = selector => main.querySelector(selector);
  const error = query('#data-error');
  const status = query('#data-status');
  async function apply(state, message) {
    await replaceState(state);
    resetSimulator();
    resetComparator();
    error.textContent = '';
    status.textContent = message;
  }
  query('#load-demo').addEventListener('click', () => {
    confirmAction('Carregar carteira de exemplo', 'Simulações, favoritos, mercado, metas e carteira atuais serão substituídos pelos dados de exemplo. Exporte um backup se quiser guardá-los.', 'Carregar exemplo',
      () => apply(exampleState(), 'Carteira de exemplo carregada. Abra o Painel ou a Carteira.'));
  });
  query('#reset-demo').addEventListener('click', () => {
    confirmAction('Restaurar estado inicial', 'Todos os dados locais do Montante serão substituídos pelo estado inicial. A carteira voltará a R$ 50.000,00 fictícios.', 'Restaurar estado inicial',
      () => apply(emptyState(), 'Estado inicial restaurado.'));
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
        () => apply(backup, 'Backup importado.'));
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
}
