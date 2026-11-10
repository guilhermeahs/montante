import { drawChart } from '../components/chart.js';
import { openDialog } from '../components/dialog.js';
import { dateTime, moneyCents, profitClass, shortDate } from '../components/portfolio-ui.js';
import { openTrade } from '../components/trade.js';
import { escapeHtml, percent } from '../core/format.js';
import { modes } from '../core/market-engine.js';
import { categories } from '../data/ativos.js';
import { configureMarket, stepMarket } from '../services/market-clock.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { observeState, store, transact } from '../services/storage.js';

let requestedAsset;
export function goToAsset(id) {
  requestedAsset = id;
  location.hash = 'mercado';
}

function openAsset(provider, id, onTrade) {
  const asset = provider.metadata(id);
  const quote = provider.quote(id);
  openDialog(`<div class="stacked">
    <p class="eyebrow">Cotação simulada · ${escapeHtml(asset.category)}</p>
    <h2 id="dialog-title">${asset.id} · ${escapeHtml(asset.name)}</h2>
    <p>${escapeHtml(asset.description)} A amplitude fictícia do cenário aleatório desta classe é de até ${percent(asset.volatility * 100)} por dia simulado.</p>
    <p><strong>${moneyCents(quote.cents)}</strong> em ${dateTime(quote.timestamp)} · <span class="${profitClass(quote.difference)}">${moneyCents(quote.difference)} (${percent(quote.changePercent)})</span> desde o dia anterior.</p>
    <div class="field"><label for="asset-period">Período do histórico</label><select id="asset-period">
      <option value="1">1 dia</option><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option><option value="all">Histórico disponível</option>
    </select></div>
    <div data-asset-chart></div>
    <div class="actions"><button type="button" data-invest>Comprar ficticiamente</button><button type="button" class="secondary" data-cancel>Fechar</button></div>
  </div>`, dialog => {
    const select = dialog.querySelector('select');
    const chart = dialog.querySelector('[data-asset-chart]');
    function show() {
      const history = provider.history(id, select.value === 'all' ? undefined : Number(select.value));
      drawChart(chart, history, [{ key: 'value', label: 'Cotação simulada', color: '#08785e', fill: '#1bbd93' }], {
        label: 'Histórico de preço simulado de ' + id, zoom: true, period: point => shortDate(point.timestamp)
      });
    }
    select.addEventListener('change', show);
    dialog.querySelector('[data-invest]').addEventListener('click', () => {
      dialog.close();
      onTrade(id);
    });
    show();
  });
}

export function renderMarket(main) {
  let state = store.read();
  let provider = new DemoMarketProvider(state.market);
  main.innerHTML = `
    <p class="eyebrow">Laboratório · 100% simulado</p>
    <h1>Mercado simulado</h1>
    <p class="lead">Explore cotações fictícias e pratique com saldo virtual. O relógio avança um dia simulado por vez.</p>
    <section class="card stacked">
      <h2>Relógio da simulação</h2>
      <p id="market-time" class="muted"></p>
      <div class="cards">
        <div class="field"><label for="market-scenario">Cenário de preços</label><select id="market-scenario">${Object.entries(modes).map(([id, mode]) => `<option value="${id}">${mode.label}</option>`).join('')}</select></div>
        <div class="field"><label for="market-speed">Velocidade</label><select id="market-speed"><option value="normal">Normal · 8 s por dia</option><option value="fast">Rápida · 2 s por dia</option></select></div>
      </div>
      <div class="actions"><button id="market-toggle" type="button"></button><button class="secondary" id="market-step" type="button">Avançar um dia</button><a href="#carteira">Ver carteira virtual</a></div>
    </section>
    <section class="card section stacked">
      <h2>Ativos</h2>
      <div class="cards">
        <div class="field"><label for="asset-search">Buscar ativo</label><input type="search" id="asset-search" placeholder="Ex.: PETR4 ou Petrobras"></div>
        <div class="field"><label for="asset-category">Categoria</label><select id="asset-category"><option value="">Todas</option>${categories.map(category => `<option>${category}</option>`).join('')}</select></div>
        <div class="field"><label for="asset-sort">Ordenar por</label><select id="asset-sort"><option value="name">Nome</option><option value="price">Preço (maior primeiro)</option><option value="variation">Variação (maior primeiro)</option></select></div>
      </div>
      <label><input type="checkbox" id="only-favorites"> Somente favoritos</label>
      <p id="market-status" class="muted" role="status"></p>
      <p id="market-error" class="error" role="alert"></p>
      <div id="market-assets"></div>
    </section>`;

  const query = selector => main.querySelector(selector);
  const list = query('#market-assets');
  const status = query('#market-status');
  const error = query('#market-error');
  const search = query('#asset-search');
  const category = query('#asset-category');
  const sort = query('#asset-sort');
  const onlyFavorites = query('#only-favorites');
  const toggle = query('#market-toggle');

  function renderAssets() {
    const focused = document.activeElement?.dataset.marketButton;
    const normalized = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const term = normalized(search.value.trim());
    const items = provider.list().filter(asset =>
      (!term || normalized(asset.id + ' ' + asset.name).includes(term)) &&
      (!category.value || category.value === asset.category) &&
      (!onlyFavorites.checked || state.favorites.includes(asset.id))
    ).map(asset => ({ asset, quote: provider.quote(asset.id) }));
    items.sort((a, b) => {
      if (sort.value === 'price') return b.quote.cents - a.quote.cents;
      if (sort.value === 'variation') return b.quote.changePercent - a.quote.changePercent;
      return a.asset.name.localeCompare(b.asset.name, 'pt-BR');
    });
    if (!items.length) {
      list.innerHTML = '<p class="muted">Nenhum ativo corresponde aos filtros.</p>';
      return;
    }
    list.innerHTML = `<div class="table-wrap" tabindex="0" role="region" aria-label="Cotações simuladas">
      <table><thead><tr><th>Ativo</th><th>Categoria</th><th>Preço simulado</th><th>Variação diária</th><th>Favorito</th></tr></thead><tbody>
      ${items.map(({ asset, quote }) => `<tr><th scope="row"><button class="text-button" data-market-button="detail-${asset.id}" data-detail="${asset.id}">${asset.id}</button><br><small class="muted">${escapeHtml(asset.name)}</small></th>
        <td>${asset.category}</td><td>${moneyCents(quote.cents)}</td><td class="${profitClass(quote.difference)}">${percent(quote.changePercent)} · ${moneyCents(quote.difference)}</td>
        <td><button class="secondary small-button" data-market-button="favorite-${asset.id}" data-favorite="${asset.id}" aria-label="Favoritar ${asset.id}" aria-pressed="${state.favorites.includes(asset.id)}">${state.favorites.includes(asset.id) ? '★' : '☆'}</button></td></tr>`).join('')}
      </tbody></table></div>`;
    if (focused) list.querySelector(`[data-market-button="${focused}"]`)?.focus({ preventScroll: true });
  }

  function showState(next) {
    state = next;
    provider = new DemoMarketProvider(state.market);
    query('#market-time').textContent = `${dateTime(provider.timestamp())} · ${state.market.paused ? 'Pausado' : 'Em andamento'} · Cotações simuladas`;
    query('#market-scenario').value = state.market.scenario;
    query('#market-speed').value = state.market.speed;
    toggle.textContent = state.market.paused ? 'Retomar simulação' : 'Pausar simulação';
    renderAssets();
  }

  async function handle(action) {
    error.textContent = '';
    try { await action(); } catch (failure) { error.textContent = failure.message; }
  }

  function trade(id) { return handle(() => openTrade(id, 'buy', message => { status.textContent = message; })); }

  query('#market-scenario').addEventListener('change', event => handle(() => configureMarket({ scenario: event.target.value })));
  query('#market-speed').addEventListener('change', event => handle(() => configureMarket({ speed: event.target.value })));
  toggle.addEventListener('click', () => handle(() => configureMarket({ paused: !state.market.paused })));
  query('#market-step').addEventListener('click', () => handle(stepMarket));
  search.addEventListener('input', renderAssets);
  for (const control of [category, sort, onlyFavorites]) control.addEventListener('change', renderAssets);
  list.addEventListener('click', event => {
    const { detail, favorite } = event.target.closest('button')?.dataset ?? {};
    if (detail) openAsset(provider, detail, trade);
    if (favorite) handle(() => transact(current => {
      const favorites = current.favorites.includes(favorite) ? current.favorites.filter(id => id !== favorite) : [...current.favorites, favorite];
      return { ...current, favorites };
    }));
  });

  function onClockError(event) { error.textContent = event.detail.message; }
  window.addEventListener('montante:clock-error', onClockError);
  const unobserve = observeState(showState, failure => { error.textContent = failure.message; });
  showState(state);
  if (requestedAsset) {
    const id = requestedAsset;
    requestedAsset = undefined;
    openAsset(provider, id, trade);
  }
  return () => {
    unobserve();
    window.removeEventListener('montante:clock-error', onClockError);
  };
}
