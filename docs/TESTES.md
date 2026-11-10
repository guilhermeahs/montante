# Testes

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
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-trade-clock.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste run-code --filename scripts/smoke-education.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-teste close
```

- **Navegação.** Dez telas em 360, 390, 601, 768, 1024 e 1440 px. Cobre hashes existentes, aliases, estados ativos, foco visível, Voltar/Avançar, contraste dos CTAs, movimento reduzido e leitura de estados com rodada legada e sem regravação.
- **Projeções.** Início, Juros compostos, Comparar modalidades e Metas e cenários. Cobre os valores de referência, rascunho ao voltar de Metas, envio dos valores ao Comparador, validação, simulações salvas e CSV.
- **Investir.** Visão geral, Mercado simulado, Minha carteira e Dados e demonstração. Cobre categorias, filtros, favoritos, detalhe do ativo com a posição atual, fechamento pelo X, Escape ou clique fora, compra, venda parcial, extrato, relógio e backup.
- **Relógio.** Verifica suspensão durante a ordem, retomada após cancelar, comprar ou vender, recarga e pausa explícita feita em outra aba.
- **Educação.** Metas e cenários, Conceitos e glossário, Quiz educativo, Visão geral e Dados e demonstração. Cobre aporte de R$ 8.333,34 para R$ 300 mil em 36 meses, salvamento sem nome, edição de meta antiga, inflação, busca, respostas persistidas e tema.

## Interação no celular

```sh
npx --yes --package @playwright/cli playwright-cli -s=montante-toque open http://127.0.0.1:4178 --browser=msedge --mobile
npx --yes --package @playwright/cli playwright-cli -s=montante-toque run-code --filename scripts/smoke-mobile.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-toque run-code --filename scripts/smoke-market-risk.cjs
npx --yes --package @playwright/cli playwright-cli -s=montante-toque close
```

Os testes emulam toque em 360 e 390 px. O primeiro percorre períodos pelo gráfico, pelos botões e pelo teclado, confere o foco no resultado, toca nas quatro categorias e verifica a tabela ao rolar horizontalmente. O teste de risco cobre taxa, duas vendas no mesmo dia, data do crédito, atalho para o relógio, recarga, sincronização entre abas, bloqueio de compra sem caixa e reinvestimento após avançar.
