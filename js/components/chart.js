import { escapeHtml, money, number } from '../core/format.js';

export const investmentLines = [
  { key: 'balance', label: 'Patrimônio total', color: 'var(--chart-green)', fill: 'var(--mint)' },
  { key: 'invested', label: 'Total investido', color: 'var(--gold)', dashed: true }
];

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const plotSize = 1000;
let chartSequence = 0;

function chartScale(values, zoom) {
  const lower = zoom ? Math.min(...values) : Math.min(0, ...values);
  const upper = zoom ? Math.max(...values) : Math.max(0, ...values);
  const span = upper - lower || Math.max(.04 * Math.abs(upper), 1);
  const ideal = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(ideal));
  const step = Math.max(.01, magnitude * [1, 2, 2.5, 5, 10].find(factor => factor >= ideal / magnitude));
  const first = Math.floor(lower / step);
  const last = Math.max(first + 1, Math.ceil((upper === lower ? upper + span / 2 : upper) / step));
  const valuesByTick = Array.from({ length: last - first + 1 }, (_, index) => (last - index) * step);
  const shortLabels = valuesByTick.map(value => compact.format(value));
  const labels = new Set(shortLabels).size === valuesByTick.length ? shortLabels : valuesByTick.map(value => number(value, 2));
  const y = value => plotSize * (last * step - value) / ((last - first) * step);
  return { labels, y };
}

export function drawChart(container, data, lines, options = {}) {
  if (data.length < 2) return;
  const { interactive = true, label = 'Evolução dos valores', period = (_, index) => 'Mês ' + index } = options;
  const id = 'chart-' + ++chartSequence;
  const values = data.flatMap(point => lines.map(line => point[line.key])).filter(Number.isFinite);
  if (!values.length) return;

  const previousSlider = container.querySelector('input[type="range"]');
  const selectedPeriod = previousSlider?.value === previousSlider?.max ? undefined : previousSlider?.dataset.period;
  const focusedControl = container.contains(document.activeElement) ? document.activeElement.dataset.chartControl : undefined;
  const { labels: axisLabels, y } = chartScale(values, options.zoom);
  const periods = data.map(period);
  const x = index => index / (data.length - 1) * plotSize;
  const grids = axisLabels.map((_, index) => {
    const row = plotSize * index / (axisLabels.length - 1);
    return `<line class="grid" x1="0" x2="${plotSize}" y1="${row}" y2="${row}" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  const paths = lines.map((line, lineIndex) => {
    const points = data.flatMap((point, index) => Number.isFinite(point[line.key]) ? [[x(index), y(point[line.key])]] : []);
    if (!points.length) return '';
    const coords = points.map(([horizontal, vertical]) => horizontal.toFixed(2) + ',' + vertical.toFixed(2)).join(' ');
    const area = line.fill ? `<polygon points="${points[0][0]},${plotSize} ${coords} ${points.at(-1)[0]},${plotSize}" fill="${line.fill}" opacity=".15"/>` : '';
    const dash = line.dashed || lineIndex === 1 ? '6 4' : lineIndex > 1 ? '2 3' : '';
    return area + `<polyline points="${coords}" fill="none" stroke="${line.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${dash ? 'stroke-dasharray="' + dash + '"' : ''}/>`;
  }).join('');
  const ticks = data.length === 2 ? [0, 1] : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const legend = lines.map((line, index) => `<span><i class="${line.dashed || index > 0 ? 'legend-dash' : ''}" style="--swatch:${line.color}"></i>${escapeHtml(line.label)}</span>`).join('');

  container.innerHTML = `
    <figure class="chart">
      <div class="chart-currency muted" aria-hidden="true">R$</div>
      <div class="chart-frame">
        <div class="chart-axis" aria-hidden="true">${axisLabels.map((tick, index) =>
          `<span style="--tick-position:${index * 100 / (axisLabels.length - 1)}%">${escapeHtml(tick)}</span>`
        ).join('')}</div>
        <div class="chart-plot${interactive ? ' chart-plot-interactive' : ''}">
          <svg viewBox="0 0 ${plotSize} ${plotSize}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(label)}">${grids}${paths}</svg>
          ${interactive ? `<span class="chart-crosshair" aria-hidden="true"></span>${lines.map(line =>
            `<span class="chart-point" style="--series:${line.color}" aria-hidden="true"></span>`
          ).join('')}` : ''}
        </div>
        <div class="chart-periods" aria-hidden="true">${ticks.map(index => `<span>${escapeHtml(periods[index])}</span>`).join('')}</div>
      </div>
      <figcaption class="legend">${legend}</figcaption>
      ${interactive ? `<div class="chart-controls">
        <label for="${id}">Explore o período do gráfico</label>
        <div class="chart-scrubber">
          <button type="button" class="secondary" data-chart-control="previous" aria-label="Período anterior">‹</button>
          <input type="range" id="${id}" data-chart-control="range" min="0" max="${data.length - 1}">
          <button type="button" class="secondary" data-chart-control="next" aria-label="Próximo período">›</button>
        </div>
        <output for="${id}" class="chart-readout" aria-live="off"><strong data-chart-period></strong><span class="chart-values">${lines.map(line =>
          `<span><span class="muted">${escapeHtml(line.label)}</span> <strong data-chart-value></strong></span>`
        ).join('')}</span></output>
      </div>` : ''}
    </figure>`;

  if (!interactive) return;
  const slider = container.querySelector('input');
  const previous = container.querySelector('[data-chart-control="previous"]');
  const next = container.querySelector('[data-chart-control="next"]');
  const activePeriod = container.querySelector('[data-chart-period]');
  const readouts = container.querySelectorAll('[data-chart-value]');
  const crosshair = container.querySelector('.chart-crosshair');
  const points = container.querySelectorAll('.chart-point');
  const plot = container.querySelector('.chart-plot');
  function show(index) {
    const point = data[index];
    const horizontal = x(index) / plotSize * 100 + '%';
    const text = lines.map((line, position) => {
      const value = point[line.key];
      const present = Number.isFinite(value);
      const amount = present ? money(value) : '—';
      readouts[position].textContent = amount;
      points[position].hidden = !present;
      if (present) {
        points[position].style.left = horizontal;
        points[position].style.top = y(value) / plotSize * 100 + '%';
      }
      return line.label + ' ' + amount;
    });
    slider.value = index;
    slider.dataset.period = periods[index];
    slider.setAttribute('aria-valuetext', periods[index] + ' · ' + text.join(' · '));
    activePeriod.textContent = periods[index];
    crosshair.style.left = horizontal;
    previous.disabled = index === 0;
    next.disabled = index === data.length - 1;
  }
  function showPointer(event) {
    const bounds = plot.getBoundingClientRect();
    const position = Math.round((event.clientX - bounds.left) / bounds.width * (data.length - 1));
    show(Math.max(0, Math.min(data.length - 1, position)));
  }

  slider.addEventListener('input', () => show(Number(slider.value)));
  previous.addEventListener('click', () => show(Number(slider.value) - 1));
  next.addEventListener('click', () => show(Number(slider.value) + 1));
  plot.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    if (event.pointerType !== 'mouse') plot.setPointerCapture(event.pointerId);
    showPointer(event);
  });
  plot.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || plot.hasPointerCapture(event.pointerId)) showPointer(event);
  });

  const restored = selectedPeriod ? periods.indexOf(selectedPeriod) : -1;
  show(restored === -1 ? data.length - 1 : restored);
  if (focusedControl) {
    const control = container.querySelector(`[data-chart-control="${focusedControl}"]`);
    (control.disabled ? slider : control).focus({ preventScroll: true });
  }
}
