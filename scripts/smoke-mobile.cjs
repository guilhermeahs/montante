async page => {
  const base = 'http://127.0.0.1:4178/';
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const cdp = await page.context().newCDPSession(page);
  const safeTap = async target => {
    await target.scrollIntoViewIfNeeded();
    const { x, y, width, height } = await target.boundingBox();
    await page.touchscreen.tap(x + width / 2, y + height / 2);
  };

  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto(base + '#simulador');
    await page.reload();
    const plot = page.locator('#projection-chart .chart-plot');
    const readout = page.locator('#projection-chart output');
    const slider = page.locator('#projection-chart input[type="range"]');
    await plot.waitFor();
    verify((await readout.innerText()).includes('39.924,92'), 'Valor final no gráfico');
    verify(await page.locator('#projection-chart .chart-axis span').count() >= 3, 'Escala em reais');
    await safeTap(plot);
    verify(Number(await slider.inputValue()) === 30, 'Toque não selecionou o meio do gráfico');
    verify((await readout.innerText()).includes('Mês 30'), 'Leitura do ponto selecionado');
    await page.getByRole('button', { name: 'Período anterior', exact: true }).tap();
    verify(Number(await slider.inputValue()) === 29, 'Botão de período anterior');
    await page.getByRole('button', { name: 'Próximo período', exact: true }).tap();
    verify(Number(await slider.inputValue()) === 30, 'Botão de próximo período');

    await plot.scrollIntoViewIfNeeded();
    const bounds = await plot.boundingBox();
    const center = Math.round(bounds.y + bounds.height / 2);
    const from = Math.round(bounds.x + bounds.width * .52);
    const to = Math.round(bounds.x + bounds.width * .84);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y: center }] });
    for (const part of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + (to - from) * part / 4, y: center }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    verify(Number(await slider.inputValue()) >= 49, 'Arraste horizontal não percorreu a série');
    await page.getByLabel('Explore o período do gráfico').press('End');
    verify((await readout.innerText()).includes('Mês 60'), 'Teclado não foi ao último período');
    verify(await page.getByRole('button', { name: 'Próximo período' }).isDisabled(), 'Controle avançou além da série');
    await page.getByRole('button', { name: 'Simular', exact: true }).click();
    verify(await page.locator('#projection-metrics').evaluate(node => node === document.activeElement && node.getBoundingClientRect().top < innerHeight), 'Resultado não veio para a área visível após simular');
    verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow no Simulador a ' + width + ' px');
  }

  await page.goto(base + '#comparador');
  await page.locator('#comparison-chart .chart-plot').waitFor();
  verify(await page.locator('#comparison-chart .chart-values > span').count() === 3, 'Comparador perdeu séries');

  await page.goto(base + '#mercado');
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const cards = page.locator('.market-category-options label');
    for (const [index, expected] of [7, 4, 4, 3].entries()) {
      const card = cards.nth(index);
      await card.tap();
      verify(await card.getByRole('radio').isChecked(), 'Categoria não selecionou ao tocar');
      verify(await page.locator('#market-assets tbody tr').count() === expected, 'Categoria errada ao tocar');
      verify(await card.evaluate(node => {
        const [name, count] = node.querySelectorAll('span');
        const bounds = node.getBoundingClientRect();
        return bounds.height >= 48 && name.getBoundingClientRect().right <= count.getBoundingClientRect().left &&
          count.getBoundingClientRect().right < bounds.right && document.documentElement.scrollWidth <= innerWidth;
      }), 'Rótulo ou contagem apertada a ' + width + ' px');
    }
    const sort = page.getByRole('radio', { name: 'Maior variação', exact: true });
    await sort.locator('..').tap();
    verify(await sort.isChecked(), 'Ordenação não mudou ao tocar');
    verify(await page.locator('#asset-sort .choice-options').evaluate(group => {
      const positions = [...group.querySelectorAll('label')].map(label => label.getBoundingClientRect().top);
      return positions.every(top => top === positions[0]);
    }), 'Opções de ordenação saíram da mesma linha');
    const favorites = page.getByRole('checkbox', { name: 'Somente favoritos' });
    await favorites.locator('..').tap();
    verify(await favorites.isChecked() && await favorites.evaluate(node => getComputedStyle(node).appearance === 'none'), 'Filtro de favoritos sem estilo ou sem toque');
    await favorites.locator('..').tap();
  }
  await page.getByRole('radio', { name: 'Ações (7)', exact: true }).locator('..').tap();
  const table = page.getByRole('region', { name: 'Cotações simuladas' });
  await table.waitFor();
  await table.evaluate(node => { node.scrollLeft = 120; });
  verify(await table.evaluate(node => {
    const ticker = node.querySelector('tbody th');
    return node.scrollLeft > 0 && Math.abs(ticker.getBoundingClientRect().left - node.getBoundingClientRect().left) <= 2;
  }), 'Ticker não ficou visível ao deslizar a tabela');
  await page.getByRole('button', { name: 'PETR4', exact: true }).click();
  const detail = page.getByRole('dialog');
  await detail.getByRole('radio', { name: '1 dia', exact: true }).locator('..').tap();
  await detail.getByLabel('Explore o período do gráfico').press('Home');
  const oldPeriod = await detail.locator('[data-chart-period]').innerText();
  await detail.getByRole('radio', { name: '7 dias', exact: true }).locator('..').tap();
  verify(await detail.locator('[data-chart-period]').innerText() === oldPeriod, 'Mudança de intervalo perdeu o dia selecionado');
  const close = detail.getByRole('button', { name: 'Fechar detalhes do ativo' });
  await detail.evaluate(node => { node.scrollTop = node.scrollHeight; });
  verify(await close.evaluate(button => {
    const dialog = button.closest('dialog');
    const buttonTop = button.getBoundingClientRect().top;
    return dialog.scrollTop > 0 && buttonTop >= dialog.getBoundingClientRect().top &&
      buttonTop < dialog.getBoundingClientRect().top + 25;
  }), 'O X sumiu ao rolar o detalhe');
  await close.tap();
  await detail.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'PETR4', exact: true }).tap();
  await detail.waitFor();
  await page.touchscreen.tap(4, 4);
  await detail.waitFor({ state: 'hidden' });
  verify(page.url().endsWith('#mercado'), 'Fechar por toque fora mudou a página');
  verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow no Mercado');

  await page.evaluate(async () => {
    const { exampleState } = await import('/js/services/demo.js');
    localStorage.setItem('montante.state', JSON.stringify(exampleState()));
  });
  await page.goto(base + '#carteira');
  const holdings = page.getByRole('region', { name: 'Posições em ativos' });
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await holdings.evaluate(node => { node.scrollLeft = 140; });
    const position = holdings.getByRole('rowheader').filter({ hasText: 'PETR4' }).locator('.position-quantity');
    verify(await position.innerText() === '35 unidades', 'Quantidade incorreta na carteira');
    verify(await position.evaluate(node => {
      const table = node.closest('.table-wrap');
      const left = node.getBoundingClientRect().left;
      return table.scrollLeft > 0 && left >= table.getBoundingClientRect().left && left < innerWidth;
    }), 'Quantidade saiu da área visível ao rolar a carteira');
    await holdings.getByRole('button', { name: 'PETR4', exact: true }).tap();
    await detail.getByText('35 PETR4', { exact: true }).waitFor();
    await page.touchscreen.tap(4, 4);
    await detail.waitFor({ state: 'hidden' });
    verify(page.url().endsWith('#carteira'), 'Toque fora saiu da carteira');
  }

  verify(errors.length === 0, JSON.stringify(errors));
  return 'MOBILE OK: categorias, toque no gráfico, X ao rolar, toque fora e quantidade da carteira em 360 e 390 px.';
}
