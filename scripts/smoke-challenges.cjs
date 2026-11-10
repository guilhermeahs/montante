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
  const drawReplay = async seed => {
    await page.evaluate(value => {
      const getRandomValues = crypto.getRandomValues;
      crypto.getRandomValues = array => {
        crypto.getRandomValues = getRandomValues;
        array[0] = value;
        return array;
      };
    }, seed);
    await tap(button('Sortear replay do dólar'));
    await page.getByRole('dialog').getByRole('button', { name: 'Substituir rodada' }).click();
    await waitText('#challenge-mode', 'Replay surpresa do dólar');
    await waitText('#challenge-day', 'Rodada em andamento · Dia 0');
  };
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
  await tap(page.getByRole('radio', { name: 'Até 75%', exact: true }).locator('..'));
  await tap(button('Sortear rodada'));
  await waitText('#challenge-day', 'Dia 0');
  verify(await page.locator('#challenge-result').isHidden(), 'Referência histórica apareceu antes da hora');
  verify(await button('Sortear replay do dólar').count() === 0, 'Replay anunciado antes do resultado');
  verify((await page.locator('#challenge-metrics').innerText()).includes('10.000,00'), 'Saldo total inicial');
  verify((await page.locator('#challenge-metrics').innerText()).includes('Saldo desta rodada'), 'Falta distinguir a carteira da rodada');
  await waitText('#challenge-holdings', 'Unidades da cesta');
  verify(await page.locator('#challenge-holdings strong').innerText() === '75', 'Quantidade inicial não aparece no resumo');
  await waitText('#challenge-cash', '2.500,00');
  verify(!(await page.locator('#challenge-cash').innerText()).includes('US$'), 'A cesta usa caixa em reais');
  verify((await page.locator('#challenge-position').innerText()).includes('75%'), 'Exposição selecionada não aplicada');
  await tap(button('Comprar'));
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Quantidade (unidades da cesta)').fill('2');
  await dialog.getByRole('button', { name: 'Confirmar compra' }).click();
  await waitText('#challenge-feedback', 'Compra registrada');
  verify(await page.locator('#challenge-holdings strong').innerText() === '77', 'Compra não atualizou a quantidade do resumo');
  await button('Reproduzir').click();
  await waitText('#challenge-day', 'Dia 1');
  await button('Vender').click();
  await dialog.getByRole('button', { name: 'Confirmar venda' }).click();
  await waitText('#challenge-feedback', 'Venda registrada');
  verify(await page.locator('#challenge-holdings strong').innerText() === '76', 'Venda parcial não atualizou a quantidade do resumo');
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
  const held = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('montante.state'));
    return 75 + state.challenge.orders.reduce((total, order) =>
      total + (order.side === 'buy' ? order.units : -order.units), 0);
  });
  await tap(button('Vender tudo'));
  await dialog.getByText('Quantidade a vender: ' + held + ' (unidades da cesta).', { exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  verify(await button('Vender tudo').isEnabled(), 'Cancelar a venda total alterou a posição');
  await tap(button('Vender tudo'));
  await dialog.getByRole('button', { name: 'Confirmar venda total' }).click();
  await waitText('#challenge-feedback', 'Venda total registrada');
  await waitText('#challenge-position', '0 unidades da cesta');
  verify(await page.locator('#challenge-holdings strong').innerText() === '0', 'Venda total não zerou a quantidade do resumo');
  await waitText('#challenge-trade-help', 'Compre antes de vender');
  verify(await button('Vender').isDisabled() && await button('Vender tudo').isDisabled(), 'Venda disponível sem posição');
  const liquidation = await page.evaluate(() => JSON.parse(localStorage.getItem('montante.state')).challenge.orders.at(-1));
  verify(liquidation.side === 'sell' && liquidation.units === held && liquidation.day === 1, 'Venda total com dia ou quantidade incorreta');
  for (let day = 2; day < 20; day++) await advance('Dia ' + day);
  await advance('Última rodada concluída');
  await page.reload();
  await waitText('#challenge-day', 'Última rodada concluída');
  await waitText('#challenge-trade-help', 'Esta rodada terminou');
  verify(await button('Vender tudo').isDisabled(), 'Rodada concluída abriu venda');
  await tap(button('Nova rodada surpresa'));
  verify(await page.evaluate(() => document.activeElement?.id === 'challenge-setup-title'), 'Atalho da nova rodada não levou à preparação');
  await tap(button('Ver resultado'));
  await page.getByRole('heading', { name: 'Como sua carteira reagiu' }).waitFor();
  for (const label of ['Manter a posição inicial', 'Ficar em caixa', 'Maior queda da sua carteira']) {
    await waitText('#challenge-result', label);
  }
  const savedOrders = await page.evaluate(() => JSON.parse(localStorage.getItem('montante.state')).operations);
  verify(JSON.stringify(savedOrders) === JSON.stringify(marketOrders), 'Mercado simulado foi afetado');

  await page.setViewportSize({ width: 390, height: 844 });
  await drawReplay(0);
  await waitText('#challenge-metrics', '4,4987');
  await waitText('#challenge-holdings', 'US$ 1.600,00');
  await waitText('#challenge-holdings', '16 lotes de US$ 100');
  await waitText('#challenge-cash', 'R$ 2.802,08');
  await waitText('#challenge-cash', 'Equivale a US$ 622,86');
  await advance('Dia 1');
  await waitText('#challenge-metrics', '4,4946');
  await waitText('#challenge-cash', 'Equivale a US$ 623,43');
  await waitText('#challenge-holdings', 'US$ 1.600,00');
  verify(await page.locator('#challenge-chart .chart-scrubber input').getAttribute('max') === '1', 'Replay expõe data futura');
  verify(await page.locator('#challenge-chart [data-chart-period]').innerText() === 'Dia 1', 'Data real aparece antes do resultado');
  verify(!/2020|Dólar em alta|Dólar em queda/.test(await page.locator('#challenge-run').innerText()), 'Replay revela o episódio antes do resultado');
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
  await waitText('#challenge-day', 'Rodada em andamento · Dia 1');
  await waitText('#challenge-holdings', 'US$ 1.600,00');
  await tap(button('Vender tudo'));
  await dialog.getByText(/Quantidade a vender: \d+ \(lotes de US\$ 100\)\./).waitFor();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await tap(button('Vender tudo'));
  await dialog.getByRole('button', { name: 'Confirmar venda total' }).click();
  await waitText('#challenge-holdings', 'US$ 0,00');
  await waitText('#challenge-cash', 'R$ 9.993,44');
  await page.getByText('Operações desta rodada', { exact: true }).click();
  await waitText('#challenge-orders', 'Dia 1');
  verify(!(await page.locator('#challenge-orders').innerText()).includes('02/03/2020'), 'Extrato adiantou a data real');
  for (let day = 2; day < 22; day++) await advance('Dia ' + day);
  await advance('Última rodada concluída');
  await waitText('#challenge-mode', 'Dólar em alta · março de 2020');
  await waitText('#challenge-orders', '02/03/2020');
  await waitText('#challenge-result', '15,56%');
  verify(await page.locator('#challenge-chart [data-chart-period]').innerText() === '31/03/2020', 'Data final do replay não aparece no resultado');

  await drawReplay(1);
  await waitText('#challenge-metrics', '5,7718');
  verify(!/2020|Dólar em queda/.test(await page.locator('#challenge-run').innerText()), 'Replay da queda revelou o episódio');

  const previous = await page.evaluate(() => JSON.parse(localStorage.getItem('montante.state')).challenge.id);
  await tap(button('Nova rodada surpresa'));
  await tap(button('Sortear rodada'));
  await dialog.getByRole('button', { name: 'Substituir rodada' }).click();
  await waitText('#challenge-day', 'Rodada em andamento · Dia 0');
  await page.waitForFunction(() => document.activeElement?.id === 'challenge-mode');
  const next = await page.evaluate(() => JSON.parse(localStorage.getItem('montante.state')).challenge);
  verify(next.id !== previous && next.kind === 'blind' && next.orders.length === 0, 'Nova rodada herdou o replay ou as ordens');
  await tap(button('Vender tudo'));
  await dialog.getByRole('button', { name: 'Confirmar venda total' }).click();
  await waitText('#challenge-feedback', 'Venda total registrada');
  await waitText('#challenge-position', '0 unidades da cesta');
  await waitText('#challenge-metrics', '10.000,00');
  verify(errors.length === 0, JSON.stringify(errors));
  return 'DESAFIOS OK: quantidade, caixa e posição em dólares, replay sorteado sem spoiler, compra, vendas, recarga, backup e toque em 360/390 px.';
}
