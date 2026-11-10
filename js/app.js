import { renderHome } from './pages/inicio.js';
import { renderSimulator } from './pages/simulador.js';
import { renderComparator } from './pages/comparador.js';
import { renderDashboard } from './pages/painel.js';
import { renderMarket } from './pages/mercado.js';
import { renderPortfolio } from './pages/carteira.js';
import { renderData } from './pages/dados.js';
import { renderGoals } from './pages/metas.js';
import { renderEducation } from './pages/aprender.js';
import { startClock } from './services/market-clock.js';
import { observeState, store } from './services/storage.js';

const routes = new Map([
  ['inicio', { label: 'Início', render: renderHome }],
  ['simulador', { label: 'Juros compostos', render: renderSimulator }],
  ['comparador', { label: 'Comparar modalidades', render: renderComparator }],
  ['metas', { label: 'Metas e cenários', render: renderGoals }],
  ['painel', { label: 'Visão geral', render: renderDashboard }],
  ['mercado', { label: 'Mercado simulado', render: renderMarket }],
  ['carteira', { label: 'Minha carteira', render: renderPortfolio }],
  ['aprender', { label: 'Aprender', render: renderEducation }],
  ['dados', { label: 'Dados e demonstração', render: renderData }]
]);
const sections = [
  { label: 'Início', entry: 'inicio' },
  { label: 'Simular', entry: 'simulador', tabs: ['simulador', 'comparador', 'metas'] },
  { label: 'Investir', entry: 'painel', tabs: ['painel', 'mercado', 'carteira'] },
  { label: 'Aprender', entry: 'aprender' }
];
const aliases = new Map([['simular', 'simulador'], ['investir', 'painel']]);
const main = document.querySelector('main');
const nav = document.querySelector('#primary-nav');
const sectionNav = document.querySelector('#section-nav');
const settings = document.querySelector('#settings-link');
let current;
let cleanup;

function renderNavigation(id) {
  const active = sections.find(section => section.entry === id || section.tabs?.includes(id));
  nav.innerHTML = sections.map(section => {
    const marker = section === active ? ` aria-current="${section.entry === id ? 'page' : 'location'}"` : '';
    return `<a href="#${section.entry}"${marker}>${section.label}</a>`;
  }).join('');
  const tabs = active?.tabs ?? [];
  sectionNav.parentElement.hidden = !tabs.length;
  if (tabs.length) sectionNav.setAttribute('aria-label', 'Navegação de ' + active.label);
  sectionNav.innerHTML = tabs.map(tab =>
    `<a href="#${tab}"${tab === id ? ' aria-current="page"' : ''}>${routes.get(tab).label}</a>`
  ).join('');
  if (id === 'dados') settings.setAttribute('aria-current', 'page');
  else settings.removeAttribute('aria-current');
}

function renderRoute() {
  const hash = location.hash.slice(1);
  if (hash === 'conteudo' && current) return;
  const requested = aliases.get(hash) ?? hash;
  const id = routes.has(requested) ? requested : 'inicio';
  if (current === id) return;
  const route = routes.get(id);
  renderNavigation(id);
  document.title = route.label + ' · Montante';
  cleanup?.();
  cleanup = undefined;
  try {
    cleanup = route.render(main);
  } catch (error) {
    main.innerHTML = '<h1></h1><p class="error" role="alert"></p><a href="#dados">Abrir Dados e demonstração</a>';
    main.querySelector('h1').textContent = route.label;
    main.querySelector('.error').textContent = error.message;
  }
  if (current) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  current = id;
}

document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});
window.addEventListener('hashchange', renderRoute);
function applyTheme(state) { document.documentElement.dataset.theme = state.theme; }
try { applyTheme(store.read()); } catch { /* O tema claro fica disponível em caso de armazenamento inválido. */ }
observeState(applyTheme);
renderRoute();
startClock();
