import { drawChart } from './chart.js';
import { openDialog } from './dialog.js';
import { dateTime, moneyCents, profitClass, shortDate } from './portfolio-ui.js';
import { escapeHtml, percent } from '../core/format.js';

export function openAssetDetails(provider, id, { onBuy, backLabel, restoreFocus }) {
  const asset = provider.metadata(id);
  const quote = provider.quote(id);
  const recent = provider.history(id, 30);
  const largestMove = recent.slice(1).reduce((largest, point, index) =>
    Math.max(largest, Math.abs(point.value / recent[index].value - 1) * 100), 0);
  const units = asset.scale === 1 ? 'Você negocia unidades inteiras.' : 'Você pode negociar frações de até seis casas decimais.';
  openDialog(`<div class="stacked asset-detail">
    <p class="eyebrow">Cotação simulada · ${escapeHtml(asset.category)}</p>
    <h2 id="dialog-title">${asset.id} · ${escapeHtml(asset.name)}</h2>
    <p class="asset-quote"><strong>${moneyCents(quote.cents)}</strong> <span class="${profitClass(quote.difference)}">${moneyCents(quote.difference)} (${percent(quote.changePercent)})</span><br>
    <small class="muted">Em ${dateTime(quote.timestamp)} · Variação desde o dia anterior</small></p>
    <section class="card">
      <h3>Entenda este investimento</h3>
      <p>${escapeHtml(asset.description)} ${escapeHtml(asset.risk)}</p>
      <p><strong>Oscilação simulada:</strong> a maior mudança de um dia para o outro foi de ${percent(largestMove)} nos últimos 30 dias disponíveis. Ela descreve os preços fictícios deste exercício.</p>
      <p class="muted">${units} A confirmação mostra a taxa e o saldo virtual da operação.</p>
    </section>
    <div class="actions"><button type="button" data-invest>Comprar</button><button type="button" class="secondary" data-cancel autofocus>${backLabel}</button></div>
    <div class="field"><label for="asset-period">Período do histórico</label><select id="asset-period">
      <option value="1">1 dia</option><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option><option value="all">Histórico disponível</option>
    </select></div>
    <div data-asset-chart></div>
  </div>`, dialog => {
    const select = dialog.querySelector('select');
    const chart = dialog.querySelector('[data-asset-chart]');
    function show() {
      const history = provider.history(id, select.value === 'all' ? undefined : Number(select.value));
      drawChart(chart, history, [{ key: 'value', label: 'Cotação simulada', color: 'var(--chart-green)', fill: 'var(--mint)' }], {
        label: 'Histórico de preço simulado de ' + id, zoom: true, period: point => shortDate(point.timestamp)
      });
    }
    select.addEventListener('change', show);
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
