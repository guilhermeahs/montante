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
  ['simulador', { label: 'Simulador', render: renderSimulator }],
  ['comparador', { label: 'Comparador', render: renderComparator }],
  ['painel', { label: 'Painel', render: renderDashboard, lab: true }],
  ['mercado', { label: 'Mercado', render: renderMarket, lab: true }],
  ['carteira', { label: 'Carteira', render: renderPortfolio, lab: true }],
  ['metas', { label: 'Metas e cenários', render: renderGoals, lab: true }],
  ['aprender', { label: 'Aprender', render: renderEducation, lab: true }],
  ['dados', { label: 'Dados e demonstração', render: renderData, lab: true }]
]);
const main = document.querySelector('main');
const nav = document.querySelector('#primary-nav');
const labNav = document.querySelector('#lab-nav');
const menu = document.querySelector('#lab-menu');
let current;
let cleanup;

function renderRoute() {
  const requested = location.hash.slice(1);
  if (requested === 'conteudo' && current) return;
  const id = routes.has(requested) ? requested : 'inicio';
  const route = routes.get(id);
  const links = lab => [...routes].filter(([, entry]) => Boolean(entry.lab) === lab).map(([key, entry]) =>
    `<a href="#${key}" ${id === key ? 'aria-current="page"' : ''}>${entry.label}</a>`).join('');
  nav.innerHTML = links(false);
  labNav.innerHTML = links(true);
  menu.open = false;
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
  if (current && current !== id) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  current = id;
}

labNav.addEventListener('click', () => { menu.open = false; });
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
window.addEventListener('hashchange', renderRoute);
function applyTheme(state) { document.documentElement.dataset.theme = state.theme; }
try { applyTheme(store.read()); } catch { /* O tema claro fica disponível em caso de armazenamento inválido. */ }
observeState(applyTheme);
renderRoute();
startClock();
