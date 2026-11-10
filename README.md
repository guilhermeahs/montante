# Montante

Simulador educacional de investimentos do projeto acadêmico A3. As projeções são hipotéticas e o aplicativo funciona localmente, sem transações reais.

[Abrir o Montante no Cloudflare Pages](https://montante-educacao.pages.dev/).

## Executar

Na raiz, com Node.js 22+ instalado:

```sh
npm start
```

Abra [http://127.0.0.1:4178](http://127.0.0.1:4178). O Node.js serve os arquivos por HTTP durante o desenvolvimento e executa as verificações. A aplicação usa HTML5, CSS3 e JavaScript no navegador. O projeto dispensa instalação de dependências e etapa de build.

```sh
npm run lint
npm test
```

## Navegação

| Jornada | Telas e endereços |
| --- | --- |
| Início | Duas formas de começar e gráfico calculado (`#inicio`) |
| Simular | Juros compostos (`#simulador`), Comparar modalidades (`#comparador`), Metas e cenários (`#metas`) |
| Investir | Visão geral (`#painel`), Desafios históricos (`#desafios-historicos`), Mercado simulado (`#mercado`), Minha carteira (`#carteira`) |
| Aprender | Conceitos e glossário (`#aprender`), Quiz e atividades (`#quiz`) |

**Simular** usa valores hipotéticos. Permite salvar projeções, exportar CSV, comparar Poupança, CDB e Tesouro Selic e estimar aportes e poder de compra. O rascunho do Simulador acompanha a navegação da aba.

**Investir** permite comprar e vender 18 ativos com cotações fictícias e saldo inicial virtual de R$ 50.000,00. O cenário padrão combina movimentos do mercado, da categoria e de cada ativo. Novas operações cobram 0,10% de taxa simulada. O dinheiro de uma venda entra no saldo disponível no próximo dia simulado. Na Visão geral, acompanhe concentração, maior queda recente e taxas pagas.

**Desafios históricos** é uma prática separada com R$ 10.000 virtuais. A rodada pode ter alta, queda ou passar sem choque forte. O gráfico revela um dia por vez. No fim, compare suas decisões com manter a posição ou ficar em caixa e acesse os replays reais do dólar de março e novembro de 2020.

**Configurações** abre **Dados e demonstração** (`#dados`), com roteiro acadêmico, carteira de exemplo, backup JSON, restauração e tema. Os endereços antigos continuam válidos. `#simular` e `#investir` também abrem as entradas de cada jornada.

Simulações, metas, respostas, tema, favoritos, mercado, carteira e a rodada dos Desafios históricos ficam no navegador deste endereço. Outro navegador ou computador tem armazenamento independente. Exporte e importe o backup para transferir o progresso.

Veja [CONTINUIDADE.md](CONTINUIDADE.md), [arquitetura](docs/ARQUITETURA.md), [regras financeiras](docs/REGRAS_FINANCEIRAS.md), [testes](docs/TESTES.md) e [referências](docs/REFERENCIAS.md).

Equipe A3: Bernardo Rocha, Arthur Cantarutti, Guilherme Honorato e Bernardo Benizio.
