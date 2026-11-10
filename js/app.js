import { renderHome } from './pages/inicio.js';

const routes = new Map([['inicio', { label: 'Início', render: renderHome }]]);
const main = document.querySelector('main');
const nav = document.querySelector('#primary-nav');
let current;

function renderRoute() {
  const requested = location.hash.slice(1);
  if (requested === 'conteudo') return;
  const id = routes.has(requested) ? requested : 'inicio';
  const route = routes.get(id);
  nav.innerHTML = [...routes].map(([key, entry]) => `<a href="#${key}" ${id === key ? 'aria-current="page"' : ''}>${entry.label}</a>`).join('');
  document.title = route.label + ' · Montante';
  route.render(main);
  if (current && current !== id) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  current = id;
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
