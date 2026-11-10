async (page) => {
  const origin = 'http://127.0.0.1:4178';
  const errors = [];
  const failed = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(response.status() + ' ' + response.url()); });
  const verify = (condition, label) => { if (!condition) throw new Error(label); };
  const text = locator => locator.innerText().then(value => value.replace(/\s+/g, ' '));
  const contains = async (locator, value) => verify((await text(locator)).includes(value), 'Esperado: ' + value);
  const save = async () => {
    await page.getByRole('button', { name: 'Salvar simulação' }).click();
    await page.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Teste navegador');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await page.getByText('Simulação salva.', { exact: true }).waitFor();
  };
  await page.goto(origin);
  await page.evaluate(() => localStorage.removeItem('montante.state'));
  await page.getByRole('link', { name: 'Começar uma simulação' }).click();
  await page.getByRole('link', { name: 'Pular para o conteúdo' }).focus();
  await page.keyboard.press('Enter');
  verify(await page.evaluate(() => document.activeElement === document.querySelector('main') && location.hash === '#simulador'), 'Atalho de teclado perdeu o foco ou a rota');
  await contains(page.locator('#projection-metrics'), '39.924,92');
  const initial = page.getByLabel('Valor inicial (R$)', { exact: true });
  await initial.fill('1750');
  await page.getByRole('link', { name: 'Definir uma meta', exact: true }).click();
  await page.getByRole('heading', { name: 'Metas e cenários', level: 1 }).waitFor();
  await page.goBack();
  await page.getByRole('heading', { name: 'Simulador de juros compostos', level: 1 }).waitFor();
  verify(await initial.inputValue() === '1750', 'Rascunho perdido ao voltar de Metas');
  await contains(page.locator('#projection-draft'), 'Parâmetros editados');
  await contains(page.locator('#projection-metrics'), '39.924,92');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await page.getByRole('link', { name: 'Comparar com estes valores', exact: true }).click();
  await contains(page.locator('#comparison-base'), '1.750,00 iniciais');
  verify(await page.locator('.bar-row').count() === 3, 'Comparar projeção atual deve mostrar três modalidades');
  await page.getByRole('navigation', { name: 'Navegação de Simular' }).getByRole('link', { name: 'Juros compostos', exact: true }).click();
  await initial.fill('1000');
  await page.getByLabel('Aporte mensal (R$)', { exact: true }).fill('500');
  await page.getByLabel('Taxa de juros (% ao mês)', { exact: true }).fill('0,8');
  await page.getByLabel('Prazo (meses)', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  for (const expected of ['39.924,92', '31.000,00', '8.924,92']) {
    await contains(page.locator('#projection-metrics'), expected);
  }
  await page.getByRole('checkbox', { name: 'Comparar com juros simples' }).check();
  await contains(page.locator('#projection-chart .legend'), 'Juros simples');
  await page.getByRole('checkbox', { name: 'Mostrar juros acumulados' }).check();
  await page.getByLabel('Explore o período do gráfico').press('Home');
  await contains(page.locator('#projection-chart output'), 'Mês 0');
  await page.getByText('Tabela mensal', { exact: true }).click();
  verify(await page.locator('#projection-rows tr').count() === 61, 'Quantidade de meses');
  const term = page.getByLabel('Prazo (meses)', { exact: true });
  await term.fill('1,5');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await contains(page.locator('#projection-error'), 'número inteiro');
  await term.fill('60');
  await page.getByLabel('Período da taxa').selectOption('annual');
  await page.getByRole('button', { name: 'Simular', exact: true }).click();
  await contains(page.locator('#projection-metrics'), '39.924,92');
  await save();
  await page.reload();
  await page.getByText('Teste navegador', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Renomear', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Reserva navegador');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByText('Reserva navegador', { exact: true }).waitFor();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar evolução em CSV' }).click();
  const csv = await downloaded;
  verify(csv.suggestedFilename() === 'montante-evolucao.csv', 'Nome do CSV');
  const stream = await csv.createReadStream();
  let content = '';
  for await (const chunk of stream) content += chunk;
  verify(content.includes('39924,92') && content.split('\r\n').length === 62, 'Conteúdo CSV');
  await page.getByRole('button', { name: 'Comparar', exact: true }).click();
  await contains(page.locator('#comparison-bars'), 'Reserva navegador');
  await contains(page.locator('#comparison-bars'), '36.233,87');
  await contains(page.locator('#comparison-bars'), '40.585,58');
  await contains(page.locator('#comparison-bars'), '41.260,02');
  await page.getByText('Editar valores, prazo e taxas', { exact: true }).click();
  await page.getByLabel('Poupança (% ao mês)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Atualizar comparação' }).click();
  await contains(page.locator('.bar-row').first(), '31.000,00');
  await page.getByRole('button', { name: 'Restaurar taxas padrão' }).click();
  await contains(page.locator('.bar-row').first(), '36.233,87');
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Simular', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir simulação' }).click();
  await page.getByText('Simulação excluída.', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Nenhuma simulação salva neste navegador.', { exact: true }).waitFor();
  const widths = [360, 390, 768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, title] of [
      ['inicio', 'Veja seu dinheiro crescer antes de investir.'],
      ['simulador', 'Simulador de juros compostos'],
      ['comparador', 'Comparador de modalidades']
    ]) {
      await page.goto(origin + '/#' + route);
      await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
      const layout = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, viewport: innerWidth, display: getComputedStyle(document.querySelector('.header-inner')).display }));
      verify(layout.w <= layout.viewport && layout.display === 'grid', 'Layout/CSS em ' + route + ' a ' + width + ' px: ' + JSON.stringify(layout));
    }
  }
  verify(errors.length === 0 && failed.length === 0, JSON.stringify({ errors, failed }));
  return 'P0 OK: 3 telas × 5 larguras, projeção, validação, taxa anual, tabela, gráfico, CSV, persistência, renomeação, comparação, reset de taxas e exclusão.';
}
