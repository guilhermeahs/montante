# Testes

Desafios históricos usa o mesmo perfil descartável dos outros testes. Execute `scripts/smoke-challenges.cjs` com Edge aberto via `playwright-cli open http://127.0.0.1:4178 --browser=msedge --mobile`. O teste cobre sorteio, avanço manual e automático, compra, venda, pausa, recarga, ausência de preços futuros, comparativo, replay PTAX e backup, com toque a 360 e 390 px.

- `npm run lint` verifica a sintaxe dos módulos e scripts JavaScript.
- `npm test` executa os testes do Node para projeção, comparador, persistência, CSV, mercado, carteira e backup.
- `npm start` sobe o servidor estático em `http://127.0.0.1:4178`.
- Os smoke tests exercitam o site no Edge e verificam console, respostas HTTP, fluxo e responsividade.

Com o servidor aberto, rode os smoke tests em uma sessão Playwright descartável. Eles substituem ou limpam o armazenamento da origem no perfil de teste.

```sh
npx --yes --package @playwright/cli playwright-cli -s=montante-teste open http://127.0.0.1:4178 --browser=msedge
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-navigation.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-core.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-lab.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-education.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste close
```

- **Navegação.** Onze telas em 360, 390, 601, 768, 1024 e 1440 px. Cobre hashes existentes, aliases, estados ativos, foco visível, Voltar/Avançar, áreas de toque, contraste dos CTAs nos dois temas, movimento reduzido e leitura de estado v3 sem regravação.
- **Projeções.** Início, Juros compostos, Comparar modalidades e Metas e cenários. Cobre os valores de referência, rascunho ao voltar de Metas, envio dos valores ao Comparador, validação, simulações salvas e CSV.
- **Investir.** Visão geral, Mercado simulado, Minha carteira e Dados e demonstração. Cobre carteira vazia, filtros e favoritos, retorno dos detalhes, compra, venda parcial, recarga, extrato, relógio, backup e restauração.
- **Educação.** Metas e cenários, Conceitos e glossário, Quiz educativo, Visão geral e Dados e demonstração. Cobre metas, inflação, busca, retorno ao glossário, respostas persistidas, reinício do quiz e tema.

## Interação no celular

```sh
npx --yes --package @playwright/cli playwright-cli -s=montante-toque open http://127.0.0.1:4178 --browser=msedge --mobile
npx --yes --package @playwright/cli playwright-cli -s=montante-toque run-code --filename scripts/smoke-mobile.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-toque run-code --filename scripts/smoke-market-risk.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-toque close
```

Os testes emulam toque em 360 e 390 px. O primeiro percorre períodos pelo gráfico, pelos botões e pelo teclado, confere o foco no resultado e verifica a tabela ao rolar horizontalmente. O teste de risco cobre taxa, duas vendas no mesmo dia, saldo a receber, recarga, sincronização entre abas, bloqueio de compra sem caixa e reinvestimento após avançar.
