# Testes

- `npm run lint` verifica a sintaxe dos módulos e scripts JavaScript.
- `npm test` executa os testes do Node para projeção, comparador, persistência, CSV, mercado, carteira e backup.
- `npm start` sobe o servidor estático em `http://127.0.0.1:4178`.
- O smoke test exercita Início, Simulador e Comparador em Edge e verifica o console, as respostas HTTP e as larguras de 360, 390, 768, 1024 e 1440 px.

Com o servidor aberto, rode o smoke test em uma sessão Playwright descartável. Ele limpa o armazenamento da origem no perfil de teste.

```sh
npx --yes --package @playwright/cli playwright-cli -s=montante-teste open http://127.0.0.1:4178 --browser=msedge
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-core.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-lab.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-education.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste close
```

O teste do laboratório percorre Mercado, Carteira, Painel e Dados e demonstração. Verifica filtros e favoritos, preços, validação de compras e vendas, extrato, persistência, relógio, backup e restauração nas mesmas larguras.

O teste de educação percorre Metas e cenários, Aprender, Painel e Dados e demonstração. Verifica edição e exclusão de metas, premissas com prazos diferentes, gráfico, inflação, busca, respostas e reinício do quiz, tema e persistência.
