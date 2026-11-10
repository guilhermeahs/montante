const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const whole = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const money = value => brl.format(value);
export const compactMoney = value => whole.format(value);
export const number = (value, digits = 4) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);
export const inputNumber = value => new Intl.NumberFormat('pt-BR', { useGrouping: false, maximumFractionDigits: 12 }).format(value);
export const percent = (value, digits = 2) => number(value, digits) + '%';

export function parseBR(value) {
  const text = String(value).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) return Number(text.replaceAll('.', '').replace(',', '.'));
  if (/^\d+([,.]\d+)?$/.test(text)) return Number(text.replace(',', '.'));
  return NaN;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
