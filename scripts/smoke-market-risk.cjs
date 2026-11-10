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
  const money = cents => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const button = name => page.getByRole('button', { name, exact: true });
  const dialog = page.getByRole('dialog');
  const amount = () => dialog.getByLabel('Quantidade', { exact: true });
  const tap = locator => locator.tap();
  const expectText = (tab, selector, text) => tab.waitForFunction(
    ([query, expected]) => document.querySelector(query)?.innerText.includes(expected), [selector, text], { timeout: 8000 });
  const checkBalances = (tab, cash, pending, wealth) => tab.waitForFunction(
    values => Object.entries(values).every(([key, value]) =>
      document.querySelector(`[data-balance="${key}"] strong`)?.innerText === 'R$ ' + value),
    { cash: money(cash), pending: money(pending), wealth: money(wealth) }, { timeout: 8000 });
  const checkLayout = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth &&
    getComputedStyle(document.querySelector('.metric-grid')).display === 'grid');
  const openBuy = async () => {
    await tap(button('PETR4'));
    await tap(dialog.getByRole('button', { name: 'Comprar', exact: true }));
  };
  const submit = label => tap(dialog.getByRole('button', { name: label, exact: true }));

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(origin + '/#mercado');
  const { price, startingCash } = await page.evaluate(async () => {
    const { emptyState } = await import('/js/services/storage.js');
    const { initialCash } = await import('/js/core/portfolio-engine.js');
    const { DemoMarketProvider } = await import('/js/services/market-provider.js');
    const state = emptyState();
    localStorage.setItem('montante.state', JSON.stringify(state));
    return { price: new DemoMarketProvider(state.market).quote('PETR4').cents, startingCash: initialCash };
  });
  await page.reload();
  await page.getByRole('heading', { name: 'Mercado simulado', exact: true }).waitFor();
  verify(await checkLayout(), 'CSS ou layout do Mercado em 360 px');
  verify(await page.locator('#market-scenario input:checked').inputValue() === 'random', 'Modo padrão');
  const buyTotal = units => units * price + Math.round(units * price / 1000);
  const sellTotal = units => units * price - Math.round(units * price / 1000);
  const units = Math.floor(startingCash / (price * 1.001));
  const cash = startingCash - buyTotal(units);
  await openBuy();
  await amount().fill(String(units));
  await expectText(page, '[data-preview]', 'Total a pagar: R$ ' + money(buyTotal(units)));
  await submit('Confirmar compra');
  await expectText(page, '#market-status', 'Compra registrada.');
  await checkBalances(page, cash, 0, cash + units * price);

  await page.goto(origin + '/#carteira');
  await page.getByRole('heading', { name: 'Minha carteira', exact: true }).waitFor();
  verify(await checkLayout(), 'Layout da Carteira em 360 px');
  const otherTab = await page.context().newPage();
  watch(otherTab);
  try {
    await otherTab.goto(origin + '/#painel');
    await expectText(otherTab, '#dashboard-risk', 'patrimônio está em PETR4');
    const first = Math.floor(units / 2);
    for (const size of [first, units - first]) {
      await tap(button('Vender PETR4'));
      await amount().fill(String(size));
      await expectText(page, '[data-preview]', 'Valor a receber: R$ ' + money(sellTotal(size)));
      await submit('Confirmar venda');
      await expectText(page, '#portfolio-status', 'Venda registrada. Crédito em 02/01/2026');
    }
    const pending = sellTotal(first) + sellTotal(units - first);
    await checkBalances(page, cash, pending, cash + pending);
    await checkBalances(otherTab, cash, pending, cash + pending);
    await page.reload();
    await checkBalances(page, cash, pending, cash + pending);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/#mercado');
    await openBuy();
    await amount().fill('1');
    await expectText(page, 'dialog .error', 'O valor a receber entra no saldo no próximo dia simulado.');
    await submit('Confirmar compra');
    await expectText(page, 'dialog .error', 'Saldo fictício insuficiente.');
    await submit('Cancelar');
    await expectText(page, '#market-credit-date', '02/01/2026');
    await tap(button('Abrir relógio da simulação'));
    verify(await page.evaluate(() => document.activeElement?.id === 'market-step'), 'Atalho do relógio não levou ao avanço');
    await tap(button('Avançar um dia'));
    await checkBalances(page, cash + pending, 0, cash + pending);
    await button('Abrir relógio da simulação').waitFor({ state: 'hidden' });
    await checkBalances(otherTab, cash + pending, 0, cash + pending);
    verify(await checkLayout(), 'Layout do Mercado em 390 px');
    await openBuy();
    await amount().fill('1');
    await submit('Confirmar compra');
    await expectText(page, '#market-status', 'Compra registrada.');

    await page.goto(origin + '/#painel');
    await expectText(page, '#dashboard-risk', 'patrimônio está em PETR4');
    await expectText(page, '#dashboard-risk', 'Maior queda desde um pico');
    await expectText(page, '#dashboard-risk', 'Taxas pagas');
    verify(await checkLayout(), 'Layout da Visão geral em 390 px');
    await page.getByRole('img', { name: 'Histórico da carteira virtual' }).waitFor();
    verify(await page.locator('#dashboard-chart .chart-scrubber input').getAttribute('max') === '1', 'Histórico mostra dias futuros');
  } finally {
    await otherTab.close();
  }
  verify(errors.length === 0, JSON.stringify(errors));
  return 'RISCO OK: taxas, dois créditos no próximo dia, bloqueio até liberar, recarga, outra aba e toque em 360/390 px.';
}
