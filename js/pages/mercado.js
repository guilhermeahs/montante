import { openAssetDetails } from '../components/asset-details.js';
import { balanceCards, dateTime, moneyCents, profitClass, receivableText } from '../components/portfolio-ui.js';
import { openTrade } from '../components/trade.js';
import { escapeHtml, normalizeSearch, percent } from '../core/format.js';
import { modes } from '../core/market-engine.js';
import { marketPortfolio } from '../core/portfolio-engine.js';
import { assetClasses, categories } from '../data/ativos.js';
import { configureMarket, stepMarket } from '../services/market-clock.js';
import { DemoMarketProvider } from '../services/market-provider.js';
import { observeState, store, transact } from '../services/storage.js';

export function renderMarket(main) {
  let state = store.read();
  let provider = new DemoMarketProvider(state.market);
  main.innerHTML = `
    <header class="page-intro">
      <p class="eyebrow">Investir · Carteira principal</p>
      <h1>Mercado simulado</h1>
      <p class="lead">Pratique com cotações fictícias. Alguns movimentos afetam vários ativos de uma vez. O gráfico revela apenas os dias que já passaram.</p>
    </header>
    <section class="section" aria-label="Saldo da carteira">
      <div id="market-balances" class="metric-grid"></div>
      <div id="market-receivable" hidden>
        <p id="market-credit-date" class="muted"></p>
        <button type="button" class="secondary" id="market-show-clock" aria-controls="market-clock-controls">Abrir relógio da simulação</button>
      </div>
    </section>
    <section class="card market-clock" aria-label="Controles do mercado simulado">
      <div class="market-clock-status"><p id="market-time" class="muted"></p><a href="#carteira">Ver minha carteira</a></div>
      <details id="market-clock-controls">
        <summary>Relógio da simulação</summary>
        <div class="stacked section">
          <p class="muted">Cada avanço corresponde a um dia no mercado fictício. No modo imprevisível, os períodos de alta, queda e calmaria aparecem sem aviso.</p>
          <div class="two-cards">
            <div class="field"><label for="market-scenario">Cenário de preços</label><select id="market-scenario">${Object.entries(modes).map(([id, mode]) => `<option value="${id}">${mode.label}</option>`).join('')}</select></div>
            <div class="field"><label for="market-speed">Velocidade</label><select id="market-speed"><option value="normal">Normal · 8 s por dia</option><option value="fast">Rápida · 2 s por dia</option></select></div>
          </div>
          <div class="actions"><button id="market-toggle" type="button"></button><button class="secondary" id="market-step" type="button">Avançar um dia</button></div>
        </div>
      </details>
    </section>
    <section class="card section stacked">
      <h2>Escolha uma categoria</h2>
      <fieldset class="market-categories">
        <legend>Categoria de ativos</legend>
        <div class="market-category-options">${categories.map((name, index) => {
          const count = provider.list().filter(asset => asset.category === name).length;
          return `<label title="${assetClasses[name].title}"><input type="radio" name="asset-category" value="${name}"${index === 0 ? ' checked' : ''}> <span>${name} (${count})</span></label>`;
        }).join('')}</div>
      </fieldset>
      <div>
        <h3 id="market-category-title"></h3>
        <p id="market-category-intro" class="muted"></p>
      </div>
      <div class="cards market-filters">
        <div class="field"><label for="asset-search">Buscar ativo</label><input type="search" id="asset-search" aria-describedby="market-search-help">
          <small id="market-search-help">A busca e os filtros continuam ativos ao trocar de categoria.</small></div>
        <div class="field"><label for="asset-sort">Ordenar por</label><select id="asset-sort"><option value="name">Nome</option><option value="price">Preço (maior primeiro)</option><option value="variation">Variação (maior primeiro)</option></select></div>
      </div>
      <label><input type="checkbox" id="only-favorites"> Somente favoritos</label>
      <p id="market-count" class="muted" role="status"></p>
      <p id="market-status" class="muted" role="status"></p>
      <p id="market-error" class="error" role="alert"></p>
      <div id="market-assets"></div>
    </section>`;

  const query = selector => main.querySelector(selector);
  const list = query('#market-assets');
  const status = query('#market-status');
  const error = query('#market-error');
  const search = query('#asset-search');
  const category = query('.market-categories');
  const sort = query('#asset-sort');
  const onlyFavorites = query('#only-favorites');
  const toggle = query('#market-toggle');
  const clock = query('#market-clock-controls');
  const step = query('#market-step');
  const receivable = query('#market-receivable');

  function renderAssets() {
    const active = category.querySelector(':checked').value;
    const { title, description, risk } = assetClasses[active];
    query('#market-category-title').textContent = title;
    query('#market-category-intro').textContent = description + ' ' + risk;
    const focused = document.activeElement?.dataset.marketButton;
    const horizontal = list.querySelector('.table-wrap')?.scrollLeft ?? 0;
    const term = normalizeSearch(search.value.trim());
    const items = provider.list().filter(asset =>
      (!term || normalizeSearch(asset.id + ' ' + asset.name).includes(term)) &&
      active === asset.category &&
      (!onlyFavorites.checked || state.favorites.includes(asset.id))
    ).map(asset => ({ asset, quote: provider.quote(asset.id) }));
    items.sort((a, b) => {
      if (sort.value === 'price') return b.quote.cents - a.quote.cents;
      if (sort.value === 'variation') return b.quote.changePercent - a.quote.changePercent;
      return a.asset.name.localeCompare(b.asset.name, 'pt-BR');
    });
    const count = `${items.length} ${items.length === 1 ? 'ativo em' : 'ativos em'} ${active}`;
    if (query('#market-count').textContent !== count) query('#market-count').textContent = count;
    if (!items.length) {
      list.innerHTML = '<p class="muted">Nenhum ativo corresponde aos filtros.</p><button type="button" class="secondary" data-clear-filters>Limpar filtros</button>';
      return;
    }
    list.innerHTML = `<p class="table-hint muted">Deslize a tabela para ver todas as colunas.</p>
      <div class="table-wrap sticky-name" tabindex="0" role="region" aria-label="Cotações simuladas">
      <table><thead><tr><th>Ativo</th><th>Preço simulado</th><th>Variação diária</th><th>Categoria</th><th>Favorito</th></tr></thead><tbody>
      ${items.map(({ asset, quote }) => `<tr><th scope="row"><button class="text-button" data-market-button="detail-${asset.id}" data-detail="${asset.id}">${asset.id}</button><br><small class="muted">${escapeHtml(asset.name)}</small></th>
        <td>${moneyCents(quote.cents)}</td><td class="${profitClass(quote.difference)}">${percent(quote.changePercent)} · ${moneyCents(quote.difference)}</td><td>${asset.category}</td>
        <td><button class="secondary small-button" data-market-button="favorite-${asset.id}" data-favorite="${asset.id}" aria-label="Favoritar ${asset.id}" aria-pressed="${state.favorites.includes(asset.id)}">${state.favorites.includes(asset.id) ? '★' : '☆'}</button></td></tr>`).join('')}
      </tbody></table></div>`;
    list.querySelector('.table-wrap').scrollLeft = horizontal;
    if (focused) list.querySelector(`[data-market-button="${focused}"]`)?.focus({ preventScroll: true });
  }

  function showState(next) {
    state = next;
    provider = new DemoMarketProvider(state.market);
    const tick = next.market.ticks.at(-1);
    const summary = marketPortfolio(next.operations, tick);
    query('#market-balances').innerHTML = balanceCards(summary);
    if (!summary.pendingCash && receivable.contains(document.activeElement)) clock.querySelector('summary').focus();
    receivable.hidden = !summary.pendingCash;
    query('#market-credit-date').textContent = summary.pendingCash ? receivableText(tick.day) : '';
    query('#market-time').textContent = `${dateTime(provider.timestamp())} · ${state.market.paused ? 'Pausado' : 'Em andamento'}`;
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
  step.addEventListener('click', () => handle(stepMarket));
  query('#market-show-clock').addEventListener('click', () => {
    clock.open = true;
    step.focus();
  });
  search.addEventListener('input', renderAssets);
  for (const control of [category, sort, onlyFavorites]) control.addEventListener('change', renderAssets);
  list.addEventListener('click', event => {
    const { detail, favorite, clearFilters } = event.target.closest('button')?.dataset ?? {};
    if (clearFilters !== undefined) {
      search.value = '';
      sort.value = 'name';
      onlyFavorites.checked = false;
      renderAssets();
      search.focus();
    }
    if (detail) openAssetDetails(provider, detail, {
      onBuy: trade,
      backLabel: 'Voltar aos ativos',
      restoreFocus: () => list.querySelector(`[data-detail="${detail}"]`)?.focus({ preventScroll: true })
    });
    if (favorite) handle(() => transact(current => {
      const favorites = current.favorites.includes(favorite) ? current.favorites.filter(id => id !== favorite) : [...current.favorites, favorite];
      return { ...current, favorites };
    }));
  });

  function onClockError(event) { error.textContent = event.detail.message; }
  window.addEventListener('montante:clock-error', onClockError);
  const unobserve = observeState(showState, failure => { error.textContent = failure.message; });
  showState(state);
  return () => {
    unobserve();
    window.removeEventListener('montante:clock-error', onClockError);
  };
}
