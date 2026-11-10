async (page) => {
  const origin = 'http://127.0.0.1:4178';
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  const verify = (condition, message) => { if (!condition) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const find = text => page.getByText(text, { exact: true });
  const includes = (selector, expected) => page.waitForFunction(
    ([target, value]) => document.querySelector(target)?.innerText.replace(/\s+/g, ' ').includes(value), [selector, expected], { timeout: 5000 }
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin);
  await page.evaluate(() => localStorage.removeItem('montante.state'));
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Simular', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navegação de Simular' }).getByRole('link', { name: 'Metas e cenários', exact: true }).click();
  await includes('#goal-result', '39.924,92');
  verify(await page.locator('#clear-goal').isHidden(), 'Nova meta aparece sem uma meta em edição');
  const target = page.getByLabel('Valor-alvo (R$)', { exact: true });
  await target.fill('0');
  await button('Projetar meta').click();
  await includes('#goal-error', 'entre');
  await target.fill('20.000,00');
  await page.getByLabel('Nome da meta').fill('Viagem de estudo');
  await button('Salvar meta').click();
  await find('Meta salva.').waitFor();
  await page.reload();
  await find('Viagem de estudo').waitFor();
  await button('Editar').click();
  await page.getByLabel('Nome da meta').fill('Reserva do semestre');
  await button('Salvar alterações').click();
  await find('Meta atualizada.').waitFor();
  await find('Reserva do semestre').waitFor();

  await find('Editar premissas dos cenários').click();
  await page.locator('#conservador-months').fill('12');
  await page.getByLabel('Inflação ilustrativa (% ao ano)').fill('0');
  await button('Atualizar cenários').click();
  await includes('#scenario-results', '12 meses');
  await includes('#scenario-results', '0% a.a.');
  await includes('#scenario-chart output', 'Conservador —');
  await page.getByLabel('Explore o período do gráfico').press('Home');
  await includes('#scenario-chart output', 'Mês 0');

  await page.goto(origin + '/#painel');
  await includes('#dashboard-goals', 'Reserva do semestre');
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Aprender', exact: true }).click();
  await page.getByLabel('Buscar no glossário').fill('inflacao');
  await page.getByRole('heading', { name: 'Inflação', exact: true }).waitFor();
  await page.getByLabel('Buscar no glossário').fill('xyzabc');
  await find('Nenhum termo encontrado.').waitFor();
  await page.getByLabel('Buscar no glossário').fill('inflacao');
  await page.getByRole('link', { name: 'Testar no quiz', exact: true }).click();
  await page.getByRole('heading', { name: 'Quiz educativo', level: 1, exact: true }).waitFor();
  await button('Entram no saldo e também rendem').click();
  await includes('#quiz-score', '1 acerto');
  await page.goBack();
  verify(await page.getByLabel('Buscar no glossário').inputValue() === 'inflacao', 'Busca perdida ao voltar ao glossário');
  await page.getByRole('navigation', { name: 'Navegação de Aprender' }).getByRole('link', { name: 'Quiz e atividades' }).click();
  await button('No mesmo mês em que é depositado').click();
  await includes('#quiz-score', '2 de 5 respondidas');
  await page.reload();
  await includes('#quiz-score', '2 de 5 respondidas');
  await page.getByRole('link', { name: 'Voltar ao glossário', exact: true }).click();
  await page.getByRole('heading', { name: 'Conceitos e glossário', level: 1, exact: true }).waitFor();
  await page.getByRole('navigation', { name: 'Navegação de Aprender' }).getByRole('link', { name: 'Quiz e atividades' }).click();
  await includes('#quiz-score', '2 de 5 respondidas');
  await button('Refazer quiz').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Limpar respostas' }).click();
  await includes('#quiz-score', '0 de 5 respondidas');

  await page.getByRole('link', { name: 'Configurações', exact: true }).click();
  await page.getByLabel('Tema do Montante').selectOption('dark');
  await find('Tema salvo.').waitFor();
  await page.reload();
  verify(await page.evaluate(() => document.documentElement.dataset.theme === 'dark'), 'Tema escuro não persistiu');
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, title] of [['metas', 'Metas e cenários'], ['aprender', 'Conceitos e glossário'], ['quiz', 'Quiz educativo']]) {
      await page.goto(origin + '/#' + route);
      await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
      verify(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' excede ' + width + ' px');
    }
  }
  await page.goto(origin + '/#dados');
  await page.getByLabel('Tema do Montante').selectOption('light');
  await find('Tema salvo.').waitFor();
  await page.goto(origin + '/#metas');
  await button('Excluir').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir meta' }).click();
  await find('Meta excluída.').waitFor();
  await find('Nenhuma meta salva neste navegador.').waitFor();
  verify(errors.length === 0, JSON.stringify(errors));
  return 'EDU OK: metas, cenários, inflação, glossário, quiz, tema e 3 telas × 5 larguras.';
}
