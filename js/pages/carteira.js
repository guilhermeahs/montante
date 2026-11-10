import { openAssetDetails } from '../components/asset-details.js';
import { confirmAction } from '../components/dialog.js';
import { distribution, moneyCents, operationTable, portfolioMetrics, profitClass, quantity, sideLabel } from '../components/portfolio-ui.js';
import { openTrade } from '../components/trade.js';
import { markPortfolio } from '../core/portfolio-engine.js';
import { exportCSV } from '../services/export.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { observeState, store, transact } from '../services/storage.js';

export function renderPortfolio(main) {
  let state = store.read();
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Investir · Saldo virtual</p>
      <h1>Minha carteira</h1>
      <p class="lead">Acompanhe o saldo fictício, os ativos que você tem e o registro de cada compra e venda.</p>
    </header>
    <p id="portfolio-profile" class="eyebrow"></p>
    <div id="portfolio-metrics"></div>
    <p id="portfolio-status" role="status"></p><p id="portfolio-error" class="error" role="alert"></p>
    <section class="card section">
      <h2>Posições</h2>
      <p class="muted">Compras e vendas têm taxas e impostos zerados. O preço médio considera o custo remanescente.</p>
      <div id="positions"></div>
      <div class="actions section"><a class="button" href="#mercado">Explorar mercado</a><a class="button secondary" href="#painel">Ver visão geral</a></div>
    </section>
    <section class="card section"><h2>Distribuição da carteira</h2><div id="portfolio-distribution"></div></section>
    <section class="card section">
      <h2>Extrato de operações</h2>
      <div class="actions"><button type="button" class="secondary" id="export-operations">Exportar extrato em CSV</button><button type="button" class="secondary" id="reset-wallet">Reiniciar carteira</button></div>
      <div class="section" id="portfolio-history"></div>
    </section>`;

  const query = selector => main.querySelector(selector);
  const status = query('#portfolio-status');
  const error = query('#portfolio-error');
  const positions = query('#positions');
  let provider;

  function show(next) {
    state = next;
    provider = new DemoMarketProvider(state.market);
    const summary = markPortfolio(state.operations, asset => provider.quote(asset.id).cents);
    query('#portfolio-profile').textContent = state.profile === 'example' ? 'Carteira de exemplo acadêmico' : '';
    query('#portfolio-metrics').innerHTML = portfolioMetrics(summary);
    query('#portfolio-distribution').innerHTML = distribution(summary.positions);
    query('#portfolio-history').innerHTML = operationTable(state.operations.slice().reverse(), provider);
    const focused = document.activeElement?.dataset.portfolioButton;
    const horizontal = positions.querySelector('.table-wrap')?.scrollLeft ?? 0;
    positions.innerHTML = summary.positions.length ? `<p class="table-hint muted">Deslize a tabela para ver detalhes e negociar.</p><div class="table-wrap sticky-name" tabindex="0" role="region" aria-label="Posições em ativos">
      <table><thead><tr><th>Ativo</th><th>Quantidade</th><th>Preço médio</th><th>Cotação simulada</th><th>Custo</th><th>Valor a mercado</th><th>Não realizado</th><th>Negociar</th></tr></thead>
      <tbody>${summary.positions.map(position => `<tr>
        <th scope="row"><button class="text-button" data-asset="${position.asset.id}" data-portfolio-button="asset-${position.asset.id}">${position.asset.id}</button></th>
        <td>${quantity(position.asset, position.units)}</td><td>${moneyCents(position.average)}</td><td>${moneyCents(position.cents)}</td><td>${moneyCents(position.cost)}</td>
        <td>${moneyCents(position.marketValue)}</td><td class="${profitClass(position.unrealized)}">${moneyCents(position.unrealized)}</td>
        <td><div class="actions"><button class="secondary small-button" data-side="buy" data-id="${position.asset.id}" data-portfolio-button="buy-${position.asset.id}" aria-label="Comprar ${position.asset.id}">Comprar</button>
        <button class="secondary small-button" data-side="sell" data-id="${position.asset.id}" data-portfolio-button="sell-${position.asset.id}" aria-label="Vender ${position.asset.id}">Vender</button></div></td>
    </tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nenhuma posição aberta. Escolha um ativo no Mercado simulado para começar.</p>';
    const table = positions.querySelector('.table-wrap');
    if (table) table.scrollLeft = horizontal;
    if (focused) positions.querySelector(`[data-portfolio-button="${focused}"]`)?.focus({ preventScroll: true });
  }

  async function trade(id, side) {
    error.textContent = '';
    try {
      await openTrade(id, side, message => { status.textContent = message; });
    } catch (failure) {
      error.textContent = failure.message;
    }
  }

  positions.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const { asset, id, side } = button.dataset;
    if (asset) openAssetDetails(provider, asset, {
      onBuy: id => trade(id, 'buy'),
      backLabel: 'Voltar à carteira',
      restoreFocus: () => positions.querySelector(`[data-asset="${asset}"]`)?.focus({ preventScroll: true })
    });
    if (side) trade(id, side);
  });
  query('#export-operations').addEventListener('click', () => {
    const headings = ['ID', 'Data simulada (UTC)', 'Operação', 'Ativo', 'Quantidade', 'Preço (R$)', 'Bruto (R$)', 'Taxas (R$)', 'Líquido (R$)', 'Caixa antes (R$)', 'Caixa depois (R$)', 'Realizado (R$)'];
    const rows = state.operations.map(order => [order.id, order.timestamp, sideLabel(order.side), order.assetId,
      order.units / provider.metadata(order.assetId).scale,
      ...[order.cents, order.gross, order.fees, order.net, order.cashBefore, order.cashAfter, order.realized].map(value => value / 100)]);
    exportCSV('montante-extrato.csv', [headings, ...rows]);
  });
  query('#reset-wallet').addEventListener('click', () => {
    confirmAction('Reiniciar carteira', 'O extrato e as posições serão apagados e o saldo fictício voltará a R$ 50.000,00. Simulações, metas e mercado são preservados.', 'Reiniciar carteira', async () => {
      await transact(current => ({ ...current, operations: [] }));
      status.textContent = 'Carteira reiniciada.';
    });
  });
  show(state);
  return observeState(show, failure => { error.textContent = failure.message; });
}
