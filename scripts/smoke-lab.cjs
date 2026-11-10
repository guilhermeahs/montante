async (page) => {
  const origin = 'http://127.0.0.1:4178';
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const read = selector => page.locator(selector).innerText().then(text => text.replace(/\s+/g, ' '));
  const expect = async (selector, value) => {
    try {
      await page.waitForFunction(
        ([target, expected]) => document.querySelector(target)?.innerText.replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').includes(expected.toLocaleLowerCase('pt-BR')),
        [selector, value], { timeout: 5000 }
      );
    } catch {
      throw new Error('Esperado em ' + selector + ': ' + value + '. Recebido: ' + await read(selector));
    }
  };
  const action = label => page.getByRole('button', { name: label, exact: true });
  const modal = () => page.getByRole('dialog');
  const confirm = label => modal().getByRole('button', { name: label, exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(origin);
  await page.evaluate(() => localStorage.removeItem('montante.state'));
  await page.getByText('Laboratório', { exact: true }).click();
  await page.getByRole('navigation', { name: 'Laboratório educacional' }).getByRole('link', { name: 'Mercado', exact: true }).click();
  await expect('#market-time', 'Pausado');
  verify(await page.locator('#market-assets tbody tr').count() === 18, 'Catálogo incompleto');
  await page.getByLabel('Categoria', { exact: true }).selectOption('Criptomoedas');
  verify(await page.locator('#market-assets tbody tr').count() === 3, 'Filtro por categoria');
  await page.getByLabel('Categoria', { exact: true }).selectOption('');
  await page.getByLabel('Buscar ativo').fill('petrobras');
  await action('Favoritar PETR4').click();
  await page.locator('[data-favorite="PETR4"][aria-pressed="true"]').waitFor();
  await page.getByLabel('Buscar ativo').fill('');
  await page.getByLabel('Somente favoritos').check();
  verify(await page.locator('#market-assets tbody tr').count() === 1, 'Filtro de favoritos');
  await action('PETR4').click();
  await modal().getByLabel('Período do histórico').selectOption('90');
  await modal().getByRole('img', { name: /Histórico de preço simulado/ }).waitFor();
  await confirm('Comprar ficticiamente');
  await modal().getByLabel('Quantidade', { exact: true }).fill('1000000');
  await expect('dialog .error', 'Saldo fictício insuficiente');
  await modal().getByLabel('Quantidade', { exact: true }).fill('10');
  await expect('dialog [data-preview]', 'Líquido:');
  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto(origin + '/#mercado');
    await otherTab.getByRole('button', { name: 'Avançar um dia', exact: true }).click();
    await otherTab.getByText(/02\/01\/2026.*Pausado/).waitFor();
    await confirm('Confirmar compra');
    await expect('dialog .error', 'A cotação mudou em outra aba');
  } finally {
    await otherTab.close();
  }
  await confirm('Cancelar');
  await action('PETR4').click();
  await confirm('Comprar ficticiamente');
  await modal().getByLabel('Quantidade', { exact: true }).fill('10');
  await modal().locator('form').evaluate(form => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await page.getByText('Compra simulada registrada.', { exact: true }).waitFor();

  await page.getByRole('link', { name: 'Ver carteira virtual', exact: true }).click();
  verify(await page.locator('#portfolio-history tbody tr').count() === 1, 'Compra duplicada ou não registrada');
  await expect('#positions', 'PETR4 10');
  await action('Vender PETR4').click();
  await modal().getByLabel('Quantidade', { exact: true }).fill('11');
  await expect('dialog .error', 'Quantidade superior');
  await modal().getByLabel('Quantidade', { exact: true }).fill('4');
  await confirm('Confirmar venda');
  await page.getByText('Venda simulada registrada.', { exact: true }).waitFor();
  await expect('#positions', 'PETR4 6');
  verify(await page.locator('#portfolio-history tbody tr').count() === 2, 'Extrato de compra e venda');

  await page.goto(origin + '/#mercado');
  await page.getByLabel('Cenário de preços').selectOption('up');
  const start = await read('#market-time');
  await action('Avançar um dia').click();
  await page.waitForFunction(previous => !document.querySelector('#market-time').textContent.includes(previous.split(' · ')[0]), start);
  await page.getByLabel('Velocidade', { exact: true }).selectOption('fast');
  const beforeAuto = await read('#market-time');
  await action('Retomar simulação').click();
  await page.waitForFunction(previous => !document.querySelector('#market-time').textContent.includes(previous.split(' · ')[0]), beforeAuto, { timeout: 8000 });
  await action('Pausar simulação').click();
  await expect('#market-time', 'Pausado');
  await page.reload();
  await expect('#market-time', 'Pausado');
  verify(await page.getByLabel('Velocidade', { exact: true }).inputValue() === 'fast', 'Velocidade persistida');
  verify(await action('Favoritar PETR4').getAttribute('aria-pressed') === 'true', 'Favorito não persistiu');
  await page.goto(origin + '/#painel');
  await page.getByRole('img', { name: 'Histórico da carteira virtual' }).waitFor();
  await expect('#dashboard-operations', 'Venda');
  await expect('#dashboard-distribution', 'PETR4');

  await page.goto(origin + '/#carteira');
  const csvPending = page.waitForEvent('download');
  await action('Exportar extrato em CSV').click();
  const csv = await csvPending;
  verify(csv.suggestedFilename() === 'montante-extrato.csv', 'Nome do CSV de operações');

  await page.goto(origin + '/#dados');
  const pending = page.waitForEvent('download');
  await action('Exportar backup JSON').click();
  const downloaded = await pending;
  const stream = await downloaded.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  verify(JSON.parse(backup.toString()).state.operations.length === 2, 'Backup incompleto');
  await action('Restaurar estado inicial').click();
  await confirm('Restaurar estado inicial');
  await page.getByText('Estado inicial restaurado.', { exact: true }).waitFor();
  await page.goto(origin + '/#carteira');
  await expect('#portfolio-metrics', '50.000,00');
  await expect('#positions', 'Nenhuma posição aberta');
  await page.goto(origin + '/#dados');
  await page.getByLabel('Arquivo de backup JSON').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await action('Validar e importar').click();
  await expect('#data-error', 'backup exportado pelo Montante');
  await page.getByLabel('Arquivo de backup JSON').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await action('Validar e importar').click();
  await confirm('Substituir dados');
  await page.getByText('Backup importado.', { exact: true }).waitFor();
  await page.goto(origin + '/#carteira');
  await expect('#positions', 'PETR4 6');
  await action('Reiniciar carteira').click();
  await confirm('Reiniciar carteira');
  await expect('#portfolio-history', 'Nenhuma operação');
  await page.goto(origin + '/#mercado');
  verify(await action('Favoritar PETR4').getAttribute('aria-pressed') === 'true', 'Reiniciar carteira apagou favorito');
  await page.goto(origin + '/#dados');
  await action('Carregar carteira de exemplo').click();
  await confirm('Carregar exemplo');
  await page.getByText(/Carteira de exemplo carregada/).waitFor();
  await page.goto(origin + '/#painel');
  await expect('#dashboard-profile', 'Carteira de exemplo');
  await expect('#dashboard-simulations', 'Projeção em cinco anos');

  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, title] of [
      ['mercado', 'Mercado simulado'], ['carteira', 'Carteira virtual'],
      ['painel', 'Painel educacional'], ['dados', 'Dados e demonstração']
    ]) {
      await page.goto(origin + '/#' + route);
      await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
      verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' excede ' + width + ' px');
    }
  }
  verify(errors.length === 0, JSON.stringify(errors));
  return 'LAB OK: mercado, relógio, carteira, painel, extrato, backup, importação, resets e 4 telas × 5 larguras.';
}
