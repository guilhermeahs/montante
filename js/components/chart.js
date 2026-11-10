import { escapeHtml, money } from '../core/format.js';

export const investmentLines = [
  { key: 'balance', label: 'Patrimônio total', color: '#08785e', fill: '#1bbd93' },
  { key: 'invested', label: 'Total investido', color: '#9b5900', dashed: true }
];

let chartSequence = 0;

export function drawChart(container, data, lines, options = {}) {
  if (data.length < 2) return;
  const { interactive = true, label = 'Evolução dos valores', period = (_, index) => 'Mês ' + index } = options;
  const id = 'chart-' + ++chartSequence;
  const values = data.flatMap(point => lines.map(line => point[line.key]));
  const min = options.zoom ? Math.min(...values) : Math.min(0, ...values);
  const max = options.zoom ? Math.max(...values) : Math.max(0, ...values);
  const width = 600;
  const left = 14;
  const right = 575;
  const top = 10;
  const bottom = 217;
  const x = index => left + index / (data.length - 1) * (right - left);
  const y = value => bottom - (value - min) / (max - min || 1) * (bottom - top) * .94;
  const grids = [0, 1, 2, 3].map(index => {
    const row = top + (bottom - top) * index / 3;
    return `<line class="grid" x1="${left}" x2="${right}" y1="${row}" y2="${row}"/>`;
  }).join('');
  const paths = lines.map(line => {
    const coords = data.map((point, index) => x(index).toFixed(2) + ',' + y(point[line.key]).toFixed(2)).join(' ');
    const area = line.fill ? `<polygon points="${left},${bottom} ${coords} ${right},${bottom}" fill="${line.fill}" opacity=".18"/>` : '';
    return area + `<polyline points="${coords}" fill="none" stroke="${line.color}" stroke-width="3" stroke-linejoin="round" ${line.dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
  }).join('');
  const ticks = data.length === 2 ? [0, 1] : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const labels = ticks.map((index, position) => {
    const anchor = position === 0 ? 'start' : position === ticks.length - 1 ? 'end' : 'middle';
    return `<text x="${x(index)}" y="238" text-anchor="${anchor}">${escapeHtml(period(data[index], index))}</text>`;
  }).join('');

  container.innerHTML = `<figure class="chart"><svg viewBox="0 0 ${width} 248" role="img" aria-label="${escapeHtml(label)}">
    ${grids}${paths}${interactive ? `<line data-marker stroke="#52615a" y1="${top}" y2="${bottom}"/>` : ''}${labels}</svg>
    <figcaption class="legend">${lines.map(line => `<span><i style="--swatch:${line.color}"></i>${escapeHtml(line.label)}</span>`).join('')}</figcaption>
    ${interactive ? `<div class="chart-controls"><label class="muted" for="${id}">Explore o período do gráfico</label><input type="range" id="${id}" min="0" max="${data.length - 1}" value="${data.length - 1}"><output for="${id}" class="chart-readout"></output></div>` : ''}</figure>`;

  if (!interactive) return;
  const slider = container.querySelector('input');
  const output = container.querySelector('output');
  const marker = container.querySelector('[data-marker]');
  const svg = container.querySelector('svg');
  function show(index, mark) {
    const point = data[index];
    const values = period(point, index) + ' · ' + lines.map(line => line.label + ' ' + money(point[line.key])).join(' · ');
    output.value = values;
    slider.setAttribute('aria-valuetext', values);
    marker.setAttribute('x1', x(index));
    marker.setAttribute('x2', x(index));
    marker.style.display = mark ? '' : 'none';
  }
  slider.addEventListener('input', () => show(Number(slider.value), true));
  svg.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = svg.getBoundingClientRect();
    const coordinate = (event.clientX - bounds.left) * width / bounds.width;
    const index = Math.max(0, Math.min(data.length - 1, Math.round((coordinate - left) / (right - left) * (data.length - 1))));
    slider.value = index;
    show(index, true);
  });
  show(data.length - 1, false);
}
