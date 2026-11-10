async page => {
  const origin = 'http://127.0.0.1:4178';
  const errors = [];
  const watch = tab => {
    tab.on('pageerror', error => errors.push(String(error)));
    tab.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    tab.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  };
  watch(page);
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const state = tab => tab.evaluate(() => {
    const { market, operations } = JSON.parse(localStorage.getItem('montante.state'));
    return { day: market.ticks.at(-1).day, paused: market.paused, count: operations.length };
  });
  const action = (tab, name) => tab.getByRole('button', { name, exact: true });
  const dialog = page.getByRole('dialog');
  const confirm = name => action(dialog, name).click();
  const clock = tab => tab.getByText('Relógio da simulação', { exact: true });
  const waitAdvance = previous => page.waitForFunction(day =>
    JSON.parse(localStorage.getItem('montante.state')).market.ticks.at(-1).day > day,
  previous, { polling: 100, timeout: 8000 });
  const buy = async () => {
    await action(page, 'PETR4').click();
    await confirm('Comprar');
    await action(dialog, 'Confirmar compra').waitFor();
    return state(page);
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin + '/#mercado');
  await page.evaluate(() => localStorage.removeItem('montante.state'));
  await page.reload();
  await clock(page).click();
  await page.getByLabel('Velocidade', { exact: true }).selectOption('fast');
  const paused = await buy();
  await confirm('Cancelar');
  verify(paused.paused && (await state(page)).paused, 'Cancelar mudou um mercado já pausado');

  await action(page, 'Retomar simulação').click();
  const held = await buy();
  await page.waitForTimeout(2700);
  verify((await state(page)).day === held.day, 'O dia avançou durante a ordem');
  await confirm('Cancelar');
  await waitAdvance(held.day);
  const buying = await buy();
  await confirm('Confirmar compra');
  await page.getByText('Compra registrada.', { exact: true }).waitFor();
  await waitAdvance(buying.day);
  verify((await state(page)).count === 1, 'Compra duplicada ou ausente');

  await page.getByRole('link', { name: 'Ver minha carteira', exact: true }).click();
  await action(page, 'Vender PETR4').click();
  await action(dialog, 'Confirmar venda').waitFor();
  const selling = await state(page);
  await confirm('Confirmar venda');
  await page.getByText(/Venda registrada\. Crédito em/).waitFor();
  await waitAdvance(selling.day);
  verify((await state(page)).count === 2, 'Venda duplicada ou ausente');

  await page.goto(origin + '/#mercado');
  const reloading = await buy();
  await page.reload();
  await waitAdvance(reloading.day);
  verify((await state(page)).count === 2, 'Recarregar registrou ordem cancelada');

  const other = await page.context().newPage();
  watch(other);
  try {
    await page.bringToFront();
    const shared = await buy();
    await other.goto(origin + '/#mercado');
    await other.bringToFront();
    await other.waitForTimeout(2700);
    verify((await state(other)).day === shared.day, 'Outra aba avançou automaticamente durante a ordem');
    await clock(other).click();
    await action(other, 'Pausar simulação').click();
    await page.bringToFront();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(2700);
    const finished = await state(page);
    verify(finished.paused && finished.day === shared.day, 'Fechar a ordem sobrescreveu a pausa explícita');
  } finally {
    await other.close();
  }

  verify(errors.length === 0, JSON.stringify(errors));
  return 'CLOCK OK: cancelamento, compra, venda, recarga, bloqueio entre abas e pausa explícita.';
}
