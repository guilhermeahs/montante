async (page) => {
  const url = 'http://127.0.0.1:4178/';
  const primary = page.getByRole('navigation', { name: 'Navegação principal' });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const nav = section => page.getByRole('navigation', { name: 'Navegação de ' + section, exact: true });
  const heading = name => page.getByRole('heading', { name, level: 1, exact: true });
  const screens = [
    ['inicio', 'Veja seu dinheiro crescer antes de investir.', 'Início'],
    ['simulador', 'Simulador de juros compostos', 'Simular', 'Juros compostos'],
    ['comparador', 'Comparador de modalidades', 'Simular', 'Comparar modalidades'],
    ['metas', 'Metas e cenários', 'Simular', 'Metas e cenários'],
    ['painel', 'Visão geral', 'Investir', 'Visão geral'],
    ['mercado', 'Mercado simulado', 'Investir', 'Mercado simulado'],
    ['carteira', 'Minha carteira', 'Investir', 'Minha carteira'],
    ['aprender', 'Conceitos e glossário', 'Aprender', 'Conceitos e glossário'],
    ['quiz', 'Quiz educativo', 'Aprender', 'Quiz e atividades'],
    ['dados', 'Dados e demonstração']
  ];

  await page.goto(url);
  await heading(screens[0][1]).waitFor();
  verify(JSON.stringify(await primary.getByRole('link').allTextContents()) === JSON.stringify(['Início', 'Simular', 'Investir', 'Aprender']), 'Destinos principais');
  const start = page.getByRole('link', { name: 'Começar uma simulação', exact: true });
  const practice = page.getByRole('link', { name: 'Entrar no mercado simulado', exact: true });
  verify(await start.getAttribute('href') === '#simulador' && await practice.getAttribute('href') === '#mercado', 'Jornadas do Início');
  verify((await page.locator('.home-chart .hero-amount').innerText()).includes('39.925'), 'Projeção ilustrativa do Início');
  await page.setViewportSize({ width: 360, height: 800 });
  verify(await practice.evaluate(link => link.getBoundingClientRect().bottom <= innerHeight), 'Segunda jornada fora da primeira área visível');
  await page.keyboard.press('Tab');
  verify(await page.getByRole('link', { name: 'Pular para o conteúdo' }).evaluate(link => link === document.activeElement), 'Primeiro foco deve ser o atalho');
  const simulate = primary.getByRole('link', { name: 'Simular', exact: true });
  await simulate.focus();
  verify(await simulate.evaluate(link => link.matches(':focus-visible') && getComputedStyle(link).outlineStyle === 'solid'), 'Foco de teclado visível');
  await page.keyboard.press('Enter');
  await heading(screens[1][1]).waitFor();
  await nav('Simular').getByRole('link', { name: 'Comparar modalidades' }).click();
  await heading(screens[2][1]).waitFor();
  await page.goBack();
  await heading(screens[1][1]).waitFor();
  await page.goForward();
  await heading(screens[2][1]).waitFor();
  verify(await simulate.getAttribute('aria-current') === 'location', 'Grupo Simular ativo no comparador');

  for (const [route, name, section, tab] of screens) {
    await page.goto(url + '#' + route);
    await heading(name).waitFor();
    if (section) verify(await primary.getByRole('link', { name: section, exact: true }).getAttribute('aria-current'), 'Grupo ativo em #' + route);
    if (tab) verify(await nav(section).getByRole('link', { name: tab, exact: true }).getAttribute('aria-current') === 'page', 'Página ativa em #' + route);
  }
  verify(await page.getByRole('link', { name: 'Configurações' }).getAttribute('aria-current') === 'page', 'Configurações ativa');
  await page.goto(url + '#simular');
  await heading(screens[1][1]).waitFor();
  await page.goto(url + '#investir');
  await heading(screens[4][1]).waitFor();

  for (const width of [360, 390, 601, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 860 });
    for (const [route, title] of screens) {
      await page.goto(url + '#' + route);
      await heading(title).waitFor();
      verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '#' + route + ' excede ' + width + ' px');
      const linkHeights = await primary.getByRole('link').evaluateAll(links => links.map(link => link.getBoundingClientRect().height));
      verify(linkHeights.every(height => height >= 44), 'Área clicável da navegação a ' + width + ' px');
    }
  }
  verify(errors.length === 0, JSON.stringify(errors));
  return 'NAV OK: destinos principais, abas ativas, Configurações, hashes anteriores e aliases, teclado, Voltar/Avançar e 6 larguras.';
}
