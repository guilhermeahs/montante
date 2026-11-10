async page => {
  const base = 'http://127.0.0.1:4178/';
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const waitText = (selector, text) => page.waitForFunction(
    ([query, expected]) => document.querySelector(query)?.innerText.includes(expected), [selector, text], { timeout: 7000 }
  );
  const tap = locator => locator.tap();
  const advance = async day => {
    await button('Avançar um dia').click();
    await waitText('#challenge-day', day);
  };

  await page.goto(base + '#painel');
  const marketOrders = await page.evaluate(async () => {
    const { exampleState } = await import('/js/services/demo.js');
    const state = exampleState();
    localStorage.setItem('montante.state', JSON.stringify(state));
    return state.operations;
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await tap(page.getByRole('link', { name: 'Abrir Desafios históricos', exact: true }));
  await page.getByRole('heading', { name: 'Desafios históricos', exact: true }).waitFor();
  await tap(button('Sortear rodada'));
  await waitText('#challenge-day', 'Dia 0');
  verify(await page.locator('#challenge-result').isHidden(), 'Referência histórica apareceu antes da hora');
  verify(await page.getByRole('button', { name: /^Replay:/ }).count() === 0, 'Replay anunciado antes do resultado');
  verify((await page.locator('#challenge-metrics').innerText()).includes('10.000,00'), 'Saldo total inicial');
  await tap(button('Comprar'));
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Quantidade (unidades da cesta)').fill('2');
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click();
  await waitText('#challenge-feedback', 'Compra registrada');
  await button('Reproduzir').click();
  await waitText('#challenge-day', 'Dia 1');
  await button('Vender').click();
  await dialog.getByRole('button', { name: 'Confirmar venda' }).click();
  await waitText('#challenge-feedback', 'Venda registrada');
  await button('Reproduzir').waitFor();
  await page.reload();
  await waitText('#challenge-day', 'Dia 1');
  await button('Reproduzir').waitFor();
  await page.getByText('Operações desta rodada', { exact: true }).click();
  verify(await page.locator('#challenge-orders li').count() === 2, 'Extrato da rodada não persistiu');
  verify(await page.locator('#challenge-chart .chart-scrubber input').getAttribute('max') === '1', 'Gráfico contém dias futuros');
  verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow a 360 px');

  await tap(button('Sortear rodada'));
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await waitText('#challenge-day', 'Dia 1');
  for (let day = 2; day < 20; day++) await advance('Dia ' + day);
  await advance('Rodada concluída');
  await tap(button('Ver resultado'));
  await page.getByRole('heading', { name: 'Como sua carteira reagiu' }).waitFor();
  for (const label of ['Manter a posição inicial', 'Ficar em caixa', 'Maior queda da sua carteira']) {
    await waitText('#challenge-result', label);
  }
  const savedOrders = await page.evaluate(() => JSON.parse(localStorage.getItem('montante.state')).operations);
  verify(JSON.stringify(savedOrders) === JSON.stringify(marketOrders), 'Mercado simulado foi afetado');

  await page.setViewportSize({ width: 390, height: 844 });
  await tap(button('Replay: Dólar em alta · março de 2020'));
  await dialog.getByRole('button', { name: 'Substituir rodada' }).click();
  await waitText('#challenge-day', '28/02/2020');
  await waitText('#challenge-metrics', '4,4987');
  await advance('02/03/2020');
  await waitText('#challenge-metrics', '4,4946');
  verify(await page.locator('#challenge-chart .chart-scrubber input').getAttribute('max') === '1', 'Replay expõe data futura');
  verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow a 390 px');

  await page.goto(base + '#dados');
  const pending = page.waitForEvent('download');
  await button('Exportar backup JSON').click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  verify(JSON.parse(backup.toString()).state.challenge.day === 1, 'Backup não contém a rodada');
  await page.getByLabel('Arquivo de backup JSON').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await button('Validar e importar').click();
  await dialog.getByRole('button', { name: 'Substituir dados' }).click();
  await page.getByText('Backup importado.', { exact: true }).waitFor();
  await page.goto(base + '#desafios-historicos');
  await waitText('#challenge-day', '02/03/2020');
  verify(errors.length === 0, JSON.stringify(errors));
  return 'DESAFIOS OK: rodada surpresa, compra, venda, pausa, recarga, relatório, replay real, backup e toque em 360/390 px.';
}
