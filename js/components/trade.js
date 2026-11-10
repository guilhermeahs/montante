import { executeTrade, quantityUnits, replayPortfolio } from '../core/portfolio-engine.js';
import { escapeHtml } from '../core/format.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { store, transact } from '../services/storage.js';
import { openDialog } from './dialog.js';
import { field } from './forms.js';
import { dateTime, moneyCents, quantity, sideLabel } from './portfolio-ui.js';

export async function openTrade(id, side, onSuccess) {
  const main = document.querySelector('main');
  const originalPage = main.firstElementChild;
  const initial = store.read();
  const state = initial.market.paused ? initial : await transact(current => ({
    ...current, market: { ...current.market, paused: true }
  }));
  if (main.firstElementChild !== originalPage) return;
  const provider = new DemoMarketProvider(state.market);
  const asset = provider.metadata(id);
  const quote = provider.quote(id);
  const orderId = crypto.randomUUID();
  const holdings = replayPortfolio(state.operations).holdings.get(id)?.units ?? 0;

  openDialog(`<form novalidate>
    <h2 id="dialog-title">${sideLabel(side)} simulada · ${asset.id}</h2>
    <p>${escapeHtml(asset.name)} · Cotação congelada de <strong>${moneyCents(quote.cents)}</strong> em ${dateTime(quote.timestamp)}.</p>
    <p class="muted">Relógio pausado durante a negociação. Taxas e impostos zerados na demonstração.${side === 'sell' ? ' Posição disponível: ' + quantity(asset, holdings) + '.' : ''}</p>
    ${field('trade-quantity', 'Quantidade', asset.scale === 1 ? '1' : '0,001', { mode: asset.scale === 1 ? 'numeric' : 'decimal', help: asset.scale === 1 ? 'Negociação em unidades inteiras.' : 'Até seis casas decimais.' })}
    <p class="muted" data-preview aria-live="polite"></p>
    <p class="error" role="alert"></p>
    <div class="actions"><button type="submit">Confirmar ${side === 'buy' ? 'compra' : 'venda'}</button><button type="button" class="secondary" data-cancel>Cancelar</button></div>
  </form>`, dialog => {
    const form = dialog.querySelector('form');
    const submit = form.querySelector('[type="submit"]');
    const input = form.elements['trade-quantity'];
    const preview = dialog.querySelector('[data-preview]');
    const error = dialog.querySelector('.error');
    const order = () => ({
      id: orderId, side, assetId: id, units: quantityUnits(input.value, asset),
      cents: quote.cents, day: quote.day, timestamp: quote.timestamp
    });
    function showPreview() {
      try {
        const record = executeTrade(state.operations, order()).at(-1);
        preview.textContent = `Bruto: ${moneyCents(record.gross)} · Taxas: ${moneyCents(record.fees)} · Líquido: ${moneyCents(record.net)} · Caixa antes: ${moneyCents(record.cashBefore)} · Depois: ${moneyCents(record.cashAfter)}.`;
        error.textContent = '';
      } catch (failure) {
        preview.textContent = '';
        error.textContent = failure.message;
      }
    }
    input.addEventListener('input', showPreview);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        const confirmedOrder = order();
        await transact(current => {
          const live = new DemoMarketProvider(current.market).quote(id);
          if (live.day !== quote.day || live.cents !== quote.cents) throw new Error('A cotação mudou em outra aba. Feche e abra a ordem para confirmar a nova cotação.');
          const updated = executeTrade(current.operations, confirmedOrder);
          const confirmed = updated.at(-1);
          const presented = executeTrade(state.operations, confirmedOrder).at(-1);
          if (confirmed.cashBefore !== presented.cashBefore || confirmed.costSold !== presented.costSold) {
            throw new Error('A carteira mudou em outra aba. Feche e abra a ordem para revisar os valores.');
          }
          return { ...current, operations: updated };
        });
        dialog.close();
        onSuccess(sideLabel(side) + ' simulada registrada.');
      } catch (failure) {
        error.textContent = failure.message;
        submit.disabled = false;
      }
    });
    showPreview();
  });
}
