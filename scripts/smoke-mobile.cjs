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
  await detail.getByLabel('Período do histórico').selectOption('1');
  await detail.getByLabel('Explore o período do gráfico').press('Home');
  const oldPeriod = await detail.locator('[data-chart-period]').innerText();
  await detail.getByLabel('Período do histórico').selectOption('7');
  verify(await detail.locator('[data-chart-period]').innerText() === oldPeriod, 'Mudança de intervalo perdeu o dia selecionado');
  await detail.getByRole('button', { name: 'Voltar aos ativos' }).click();
  verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow no Mercado');

  verify(errors.length === 0, JSON.stringify(errors));
  return 'MOBILE OK: categorias, toque, arraste, botões, teclado, foco no resultado e rolagem da tabela em 360 e 390 px.';
}
