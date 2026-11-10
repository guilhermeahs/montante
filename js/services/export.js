export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    if (typeof value === 'number') return String(value).replace('.', ',');
    const text = /^[\s\u0000]*[=+@-]|^[\t\r\n]/.test(String(value)) ? "'" + value : String(value);
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(';')).join('\r\n');
}

export function exportCSV(filename, rows) {
  download(filename, toCSV(rows), 'text/csv;charset=utf-8');
}
