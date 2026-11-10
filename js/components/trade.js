import { executeMarketTrade, quantityUnits, replayPortfolio, saleAvailabilityDay } from '../core/portfolio-engine.js';
import { escapeHtml } from '../core/format.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { holdMarketClock } from '../services/market-clock.js';
import { store, transact } from '../services/storage.js';
import { openDialog } from './dialog.js';
import { field } from './forms.js';
import { creditDate, dateTime, moneyCents, quantity, sideLabel } from './portfolio-ui.js';

export async function openTrade(id, side, onSuccess) {
  const main = document.querySelector('main');
  const originalPage = main.firstElementChild;
  const release = await holdMarketClock();
  let opened = false;
  try {
    if (main.firstElementChild !== originalPage) return;
    showTrade(id, side, onSuccess, release);
    opened = true;
  } finally {
    if (!opened) release();
  }
}

function showTrade(id, side, onSuccess, release) {
  const state = store.read();
  const provider = new DemoMarketProvider(state.market);
  const asset = provider.metadata(id);
  const quote = provider.quote(id);
  const orderId = crypto.randomUUID();
  const holdings = replayPortfolio(state.operations).holdings.get(id)?.units ?? 0;

  openDialog(`<form novalidate>
    <h2 id="dialog-title">${sideLabel(side)} · ${asset.id}</h2>
    <p>${escapeHtml(asset.name)} · Cotação congelada de <strong>${moneyCents(quote.cents)}</strong> em ${dateTime(quote.timestamp)}.</p>
    <p class="muted">A operação movimenta apenas saldo virtual. Taxa simulada de 0,10%. O avanço automático aguarda o fechamento da ordem.
      ${side === 'sell' ? 'A venda libera o dinheiro no próximo dia simulado. Posição disponível: ' + quantity(asset, holdings) + '.' : ''}</p>
    ${field('trade-quantity', 'Quantidade', asset.scale === 1 ? '1' : '0,001', { mode: asset.scale === 1 ? 'numeric' : 'decimal', help: asset.scale === 1 ? 'Negociação em unidades inteiras.' : 'Até seis casas decimais.' })}
    <p class="muted" data-preview aria-live="polite"></p>
    <p class="error" role="alert"></p>
    <div class="actions"><button type="submit">Confirmar ${side === 'buy' ? 'compra' : 'venda'}</button><button type="button" class="secondary" data-cancel>Cancelar</button></div>
  </form>`, dialog => {
    dialog.addEventListener('close', release, { once: true });
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
        const record = executeMarketTrade(state.operations, order()).at(-1);
        const totalLabel = side === 'buy' ? 'Total a pagar' : 'Valor a receber';
        const due = side === 'sell' ? ` Crédito em ${creditDate(saleAvailabilityDay(record))} (dia simulado).` : '';
        preview.textContent = `Valor da ordem: ${moneyCents(record.gross)} · Taxa: ${moneyCents(record.fees)} · ${totalLabel}: ${moneyCents(record.net)} · Saldo disponível após a ordem: ${moneyCents(record.cashAfter)}.${due}`;
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
          const updated = executeMarketTrade(current.operations, confirmedOrder);
          const confirmed = updated.at(-1);
          const presented = executeMarketTrade(state.operations, confirmedOrder).at(-1);
          if (confirmed.cashBefore !== presented.cashBefore || confirmed.costSold !== presented.costSold) {
            throw new Error('A carteira mudou em outra aba. Feche e abra a ordem para revisar os valores.');
          }
          return { ...current, operations: updated };
        });
        dialog.close();
        onSuccess(side === 'sell' ? `Venda registrada. Crédito em ${creditDate(quote.day + 1)} (dia simulado).` : 'Compra registrada.');
      } catch (failure) {
        error.textContent = failure.message;
        submit.disabled = false;
      }
    });
    showPreview();
  });
}
