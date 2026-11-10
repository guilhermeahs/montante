import { escapeHtml, money, number, percent } from '../core/format.js';
import { initialCash } from '../core/portfolio-engine.js';

const stamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

export const moneyCents = cents => money(cents / 100).replace('\u00a0', ' ');
export const dateTime = timestamp => stamp.format(new Date(timestamp)) + ' UTC';
export const shortDate = timestamp => date.format(new Date(timestamp));
export const quantity = (asset, units) => number(units / asset.scale, 6);
export const sideLabel = side => side === 'buy' ? 'Compra' : 'Venda';
export const profitClass = value => value < 0 ? 'negative' : value > 0 ? 'positive' : '';

export function portfolioMetrics(summary, { overview = false } = {}) {
  const variation = (summary.wealth - initialCash) / initialCash * 100;
  const totalResult = summary.realized + summary.unrealized;
  const metrics = [
    ['Patrimônio virtual', summary.wealth, 'emphasis'],
    ['Saldo disponível', summary.cash]
  ];
  if (overview) metrics.push(['Resultado da carteira', totalResult, profitClass(totalResult)]);
  else metrics.push(
    ['Custo das posições', summary.invested],
    ['Posições a mercado', summary.marketValue],
    ['Resultado realizado', summary.realized, profitClass(summary.realized)],
    ['Resultado não realizado', summary.unrealized, profitClass(summary.unrealized)]
  );
  return `<div class="metric-grid portfolio-metrics">
    ${metrics.map(([label, value, tone = '']) => `<article class="card metric ${tone}"><p>${label}</p><strong>${moneyCents(value)}</strong></article>`).join('')}
    </div><p class="section muted">Variação sobre o saldo fictício inicial de ${moneyCents(initialCash)}: <strong>${percent(variation)}</strong>. Os aportes do simulador ficam nas projeções.</p>`;
}

export function distribution(positions) {
  if (!positions.length) return '<p class="muted">A distribuição aparece após a primeira compra fictícia.</p>';
  const total = positions.reduce((sum, position) => sum + position.marketValue, 0);
  if (!total) return '<p class="muted">As posições ainda somam R$ 0,00 pela marcação a centavos.</p>';
  const groups = Map.groupBy(positions, position => position.asset.category);
  function bars(entries) {
    return entries.map(([label, value]) => {
      const share = value / total * 100;
      return `<li><span>${escapeHtml(label)}</span><strong>${percent(share)} · ${moneyCents(value)}</strong><div class="bar-track" aria-hidden="true"><div style="width:${share}%;background:var(--mint)"></div></div></li>`;
    }).join('');
  }
  return `<div class="two-cards">
    <div><h3>Por categoria</h3><ul class="distribution">${bars([...groups].map(([label, items]) => [label, items.reduce((sum, item) => sum + item.marketValue, 0)]))}</ul></div>
    <div><h3>Por ativo</h3><ul class="distribution">${bars(positions.map(position => [position.asset.id, position.marketValue]))}</ul></div>
  </div>`;
}

export function operationTable(operations, provider) {
  if (!operations.length) return '<p class="muted">Nenhuma operação fictícia registrada.</p>';
  return `<p class="table-hint muted">Deslize a tabela para ver o extrato completo.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Extrato das operações simuladas">
    <table><thead><tr><th>Data simulada</th><th>Operação</th><th>Ativo</th><th>Quantidade</th><th>Preço</th><th>Bruto</th><th>Taxas</th><th>Líquido</th><th>Caixa antes</th><th>Caixa depois</th><th>Realizado</th><th>ID</th></tr></thead>
      <tbody>${operations.map(order => `<tr><td>${dateTime(order.timestamp)}</td><td>${sideLabel(order.side)}</td><th scope="row">${order.assetId}</th>
        <td>${quantity(provider.metadata(order.assetId), order.units)}</td><td>${moneyCents(order.cents)}</td><td>${moneyCents(order.gross)}</td>
        <td>${moneyCents(order.fees)}</td><td>${moneyCents(order.net)}</td><td>${moneyCents(order.cashBefore)}</td><td>${moneyCents(order.cashAfter)}</td>
        <td class="${profitClass(order.realized)}">${moneyCents(order.realized)}</td><td><code>${order.id}</code></td></tr>`).join('')}</tbody></table>
    </div>`;
}
