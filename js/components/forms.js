import { escapeHtml, inputNumber, number, parseBR } from '../core/format.js';

const brMoneyInput = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function field(id, label, value, { mode = 'decimal', help = '', format = 'number' } = {}) {
  const formatted = typeof value !== 'number' ? value : format === 'money' ? brMoneyInput.format(value) : inputNumber(value);
  return `<div class="field">
    <label for="${id}">${label}</label>
    <input id="${id}" name="${id}" inputmode="${mode}" value="${escapeHtml(formatted)}" ${help ? `aria-describedby="${id}-help"` : ''} required>
    ${help ? `<small id="${id}-help">${help}</small>` : ''}
  </div>`;
}

export function baseFields(values) {
  return field('initial', 'Valor inicial (R$)', values.initial, { format: 'money' }) +
    field('contribution', 'Aporte mensal (R$)', values.contribution, { format: 'money', help: 'Valor depositado no fim de cada mês.' });
}

export function durationField(months) {
  return field('months', 'Prazo (meses)', months, { mode: 'numeric' });
}

export function readNumber(form, key, { min = 0, max = Infinity, integer = false, grouped = false, cents = false } = {}) {
  const input = form.elements[key];
  const text = input.value.trim();
  const value = grouped ? parseBR(text) : /^\d+([,.]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
  const excessiveDecimals = cents && Number(value.toFixed(2)) !== value;
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)) || excessiveDecimals) {
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    const label = input.labels[0].textContent;
    throw new RangeError(`${label}. Informe ${integer ? 'um número inteiro' : 'um número'} ${max === Infinity ? 'maior ou igual a ' + number(min) : 'entre ' + number(min) + ' e ' + number(max)}${cents ? ', com até duas casas decimais' : ''}.`);
  }
  input.removeAttribute('aria-invalid');
  return value;
}

export function readBase(form) {
  return {
    initial: readNumber(form, 'initial', { max: 1e8, grouped: true, cents: true }),
    contribution: readNumber(form, 'contribution', { max: 1e8, grouped: true, cents: true }),
    months: readNumber(form, 'months', { min: 1, max: 600, integer: true })
  };
}

export function listenForm(form, error, handler) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    try {
      await handler(event);
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
}
