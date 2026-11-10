import { drawChart } from './chart.js';
import { openDialog } from './dialog.js';
import { choiceField, choiceValue } from './forms.js';
import { dateTime, moneyCents, profitClass, quantity, shortDate } from './portfolio-ui.js';
import { escapeHtml, percent } from '../core/format.js';

export function openAssetDetails(provider, id, { position, onBuy, restoreFocus }) {
  const asset = provider.metadata(id);
  const quote = provider.quote(id);
  const recent = provider.history(id, 30);
  const largestMove = recent.slice(1).reduce((largest, point, index) =>
    Math.max(largest, Math.abs(point.value / recent[index].value - 1) * 100), 0);
  const units = asset.scale === 1 ? 'Você negocia unidades inteiras.' : 'Você pode negociar frações de até seis casas decimais.';
  openDialog(`<div class="asset-dialog-bar">
    <button type="button" class="secondary asset-dialog-close" data-cancel aria-label="Fechar detalhes do ativo" autofocus>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18"/>
      </svg>
    </button>
  </div>
  <div class="stacked asset-detail">
    <p class="eyebrow">Cotação simulada · ${escapeHtml(asset.category)}</p>
    <h2 id="dialog-title">${asset.id} · ${escapeHtml(asset.name)}</h2>
    ${position ? `<div class="asset-holding">
      <span>Você tem na carteira</span>
      <strong>${quantity(asset, position.units)} ${asset.id}</strong>
    </div>` : ''}
    <p class="asset-quote"><strong>${moneyCents(quote.cents)}</strong> <span class="${profitClass(quote.difference)}">${moneyCents(quote.difference)} (${percent(quote.changePercent)})</span><br>
    <small class="muted">Em ${dateTime(quote.timestamp)} · Variação desde o dia anterior</small></p>
    <section class="card">
      <h3>Entenda este investimento</h3>
      <p>${escapeHtml(asset.description)} ${escapeHtml(asset.risk)}</p>
      <p><strong>Oscilação simulada:</strong> a maior mudança de um dia para o outro foi de ${percent(largestMove)} nos últimos 30 dias disponíveis. Ela descreve os preços fictícios deste exercício.</p>
      <p class="muted">${units} A confirmação mostra a taxa e o saldo virtual da operação.</p>
    </section>
    <div class="actions"><button type="button" data-invest>Comprar</button></div>
    ${choiceField('asset-period', 'Período do histórico', [['1', '1 dia'], ['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['all', 'Todo o histórico']], '30')}
    <div data-asset-chart></div>
  </div>`, dialog => {
    dialog.classList.add('asset-dialog');
    let pressedOutside = false;
    function outside(event) {
      if (event.target !== dialog) return false;
      const { left, right, top, bottom } = dialog.getBoundingClientRect();
      return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
    }
    dialog.addEventListener('pointerdown', event => { pressedOutside = outside(event); });
    dialog.addEventListener('click', event => {
      if (pressedOutside && outside(event)) dialog.close();
      pressedOutside = false;
    });

    const period = dialog.querySelector('#asset-period');
    const chart = dialog.querySelector('[data-asset-chart]');
    function show() {
      const days = choiceValue(period);
      const history = provider.history(id, days === 'all' ? undefined : Number(days));
      drawChart(chart, history, [{ key: 'value', label: 'Cotação simulada', color: 'var(--chart-green)', fill: 'var(--mint)' }], {
        label: 'Histórico de preço simulado de ' + id, zoom: true, period: point => shortDate(point.timestamp)
      });
    }
    period.addEventListener('change', show);
    dialog.querySelector('[data-invest]').addEventListener('click', () => {
      dialog.close();
      onBuy(id);
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) restoreFocus();
    }, { once: true });
    show();
  });
}
