import { escapeHtml, money, number, percent } from '../core/format.js';
import { marketDate } from '../core/market-engine.js';
import { initialCash, saleAvailabilityDay } from '../core/portfolio-engine.js';

const stamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const fullDay = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

export const moneyCents = cents => money(cents / 100).replace('\u00a0', ' ');
export const dateTime = timestamp => stamp.format(new Date(timestamp)) + ' UTC';
export const shortDate = timestamp => date.format(new Date(timestamp));
export const creditDate = day => fullDay.format(new Date(marketDate(day)));
export const receivableText = day => `O dinheiro das vendas entra no saldo disponível em ${creditDate(day + 1)} (próximo dia simulado).`;
export const quantity = (asset, units) => number(units / asset.scale, 6);
export const sideLabel = side => side === 'buy' ? 'Compra' : 'Venda';
export const profitClass = value => value < 0 ? 'negative' : value > 0 ? 'positive' : '';

export const portfolioHelp = `<details class="card section">
  <summary>O que significam os valores da carteira?</summary>
  <ul>
    <li><strong>Patrimônio:</strong> saldo disponível, vendas a receber e valor dos ativos que você tem.</li>
    <li><strong>Saldo disponível:</strong> o dinheiro virtual que você pode usar para comprar agora.</li>
    <li><strong>A receber:</strong> dinheiro de vendas que entra no saldo no próximo dia simulado.</li>
    <li><strong>Resultado realizado:</strong> ganho ou perda de vendas já feitas, depois dos custos.</li>
    <li><strong>Resultado não realizado:</strong> ganho ou perda que ainda pode mudar enquanto você mantém o ativo.</li>
  </ul>
</details>`;

export function balanceCards(summary) {
  return `<article class="card metric emphasis" data-balance="wealth"><p>Patrimônio</p><strong>${moneyCents(summary.wealth)}</strong></article>
    <article class="card metric" data-balance="cash"><p>Saldo disponível</p><strong>${moneyCents(summary.cash)}</strong></article>
    <article class="card metric" data-balance="pending"><p>A receber</p><strong>${moneyCents(summary.pendingCash)}</strong></article>`;
}

export function portfolioMetrics(summary, { day, overview = false }) {
  const variation = (summary.wealth - initialCash) / initialCash * 100;
  const totalResult = summary.realized + summary.unrealized;
  const metrics = [];
  if (overview) metrics.push(['Resultado da carteira', totalResult, profitClass(totalResult)]);
  else metrics.push(
    ['Custo das posições', summary.invested],
    ['Posições a mercado', summary.marketValue],
    ['Resultado realizado', summary.realized, profitClass(summary.realized)],
    ['Resultado não realizado', summary.unrealized, profitClass(summary.unrealized)]
  );
  return `<div class="metric-grid portfolio-metrics${overview ? ' portfolio-overview' : ''}">${balanceCards(summary)}
    ${metrics.map(([label, value, tone = '']) => `<article class="card metric ${tone}"><p>${label}</p><strong>${moneyCents(value)}</strong></article>`).join('')}
    </div>
    ${summary.pendingCash ? `<p class="muted">${receivableText(day)} <a href="#mercado">Abrir o Mercado</a></p>` : ''}
    <p class="section muted">Variação sobre o saldo fictício inicial de ${moneyCents(initialCash)}: <strong>${percent(variation)}</strong>. Os aportes do simulador ficam nas projeções.</p>`;
}

export function distribution(positions) {
  if (!positions.length) return '<p class="muted">A distribuição aparece após a primeira compra.</p>';
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
  if (!operations.length) return '<p class="muted">Nenhuma operação registrada.</p>';
  return `<p class="table-hint muted">Deslize a tabela para ver o extrato completo.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Extrato das operações simuladas">
    <table><thead><tr><th>Data simulada</th><th>Operação</th><th>Ativo</th><th>Quantidade</th><th>Preço</th><th>Bruto</th><th>Taxas</th><th>Líquido</th><th>Caixa antes</th><th>Caixa depois</th><th>Realizado</th><th>Crédito da venda</th><th>ID</th></tr></thead>
      <tbody>${operations.map(order => `<tr><td>${dateTime(order.timestamp)}</td><td>${sideLabel(order.side)}</td><th scope="row">${order.assetId}</th>
        <td>${quantity(provider.metadata(order.assetId), order.units)}</td><td>${moneyCents(order.cents)}</td><td>${moneyCents(order.gross)}</td>
        <td>${moneyCents(order.fees)}</td><td>${moneyCents(order.net)}</td><td>${moneyCents(order.cashBefore)}</td><td>${moneyCents(order.cashAfter)}</td>
        <td class="${profitClass(order.realized)}">${moneyCents(order.realized)}</td>
        <td>${order.side === 'sell' ? dateTime(marketDate(saleAvailabilityDay(order))) : '—'}</td><td><code>${order.id}</code></td></tr>`).join('')}</tbody></table>
    </div>`;
}
