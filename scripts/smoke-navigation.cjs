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
  const checkContrast = () => page.locator('.home-journeys').evaluate(container => {
    function lightness(color) {
      const values = color.match(/\d+/g).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    }
    function check(foreground, background) {
      const values = [lightness(foreground), lightness(background)].sort((a, b) => b - a);
      return (values[0] + .05) / (values[1] + .05) >= 4.5;
    }
    return [...container.querySelectorAll('.journey')].every(card => {
      const background = getComputedStyle(card).backgroundColor;
      const readable = [...card.querySelectorAll('h2, p')].every(element => check(getComputedStyle(element).color, background));
      const action = getComputedStyle(card.querySelector('a'));
      return readable && check(action.color, action.backgroundColor);
    });
  });
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
  verify(await checkContrast(), 'Contraste das duas jornadas');
  await page.setViewportSize({ width: 360, height: 800 });
  verify(await practice.evaluate(link => link.getBoundingClientRect().bottom <= innerHeight), 'Segunda jornada fora da primeira área visível');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  verify(await start.evaluate(link => getComputedStyle(link).transitionDuration === '0s'), 'Preferência de movimento reduzido');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
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

  const saved = await page.evaluate(async () => {
    const { exampleState } = await import('/js/services/demo.js');
    const sample = { ...exampleState(), theme: 'dark', answers: { juros: 1 } };
    const json = JSON.stringify(sample);
    localStorage.setItem('montante.state', json);
    return json;
  });
  await page.reload();
  verify(await page.evaluate(() => document.documentElement.dataset.theme === 'dark'), 'Tema existente não foi aplicado');
  await page.goto(url + '#inicio');
  await heading(screens[0][1]).waitFor();
  verify(await checkContrast(), 'Contraste das duas jornadas no tema escuro');
  await page.goto(url + '#simulador');
  await page.getByText('Projeção em cinco anos', { exact: true }).waitFor();
  await page.goto(url + '#metas');
  await page.getByText('Reserva financeira', { exact: true }).waitFor();
  await page.goto(url + '#mercado');
  verify(await page.getByRole('button', { name: 'Favoritar PETR4', exact: true }).getAttribute('aria-pressed') === 'true', 'Favorito existente não foi restaurado');
  await page.goto(url + '#carteira');
  await page.locator('#positions').getByRole('button', { name: 'PETR4', exact: true }).waitFor();
  verify(await page.locator('#portfolio-history tbody tr').count() === 2, 'Extrato existente não foi restaurado');
  await page.goto(url + '#quiz');
  await page.getByText('1 de 5 respondidas · 1 acerto', { exact: true }).waitFor();

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
  verify(await page.evaluate(() => localStorage.getItem('montante.state')) === saved, 'A navegação alterou o estado existente');
  verify(errors.length === 0, JSON.stringify(errors));
  return 'NAV OK: 10 telas, 6 larguras, dados v3 preservados, contraste nos dois temas, movimento reduzido, teclado, hashes e histórico.';
}
