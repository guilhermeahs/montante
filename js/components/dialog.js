import { escapeHtml } from '../core/format.js';

export function openDialog(content, onOpen) {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = content;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  document.querySelector('main').append(dialog);
  dialog.querySelector('[data-cancel]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  onOpen?.(dialog);
  dialog.showModal();
}

export function confirmAction(title, description, label, onConfirm) {
  openDialog(`<form>
    <h2 id="dialog-title">${escapeHtml(title)}</h2>
    <p>${escapeHtml(description)}</p>
    <p class="error" role="alert"></p>
    <div class="actions"><button class="secondary" type="button" data-cancel autofocus>Cancelar</button><button type="submit">${escapeHtml(label)}</button></div>
  </form>`, dialog => {
    const form = dialog.querySelector('form');
    const submit = form.querySelector('[type="submit"]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        await onConfirm();
        dialog.close();
      } catch (error) {
        dialog.querySelector('.error').textContent = error.message;
        submit.disabled = false;
      }
    });
  });
}

export function askName(title, current, onSave) {
  openDialog(`<form>
    <h2 id="dialog-title">${title}</h2>
    <div class="field"><label for="record-name">Nome</label><input id="record-name" name="recordName" maxlength="80" required autofocus></div>
    <p class="error" role="alert"></p>
    <div class="actions"><button type="submit">Salvar</button><button class="secondary" type="button" data-cancel>Cancelar</button></div>
  </form>`, dialog => {
    const form = dialog.querySelector('form');
    form.elements.recordName.value = current;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = form.elements.recordName.value.trim();
      try {
        if (!name) throw new Error('Digite um nome.');
        onSave(name);
        dialog.close();
      } catch (error) {
        dialog.querySelector('.error').textContent = error.message;
      }
    });
  });
}
