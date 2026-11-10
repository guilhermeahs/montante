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
| Investir | Visão geral (`#painel`), Mercado simulado (`#mercado`), Minha carteira (`#carteira`) |
| Aprender | Conceitos e glossário (`#aprender`), Quiz e atividades (`#quiz`) |

**Simular** usa valores hipotéticos. Em Metas e cenários, informe valor e prazo para estimar o aporte mensal. A taxa padrão é zero, e o nome só é pedido como opção ao salvar. Também é possível exportar projeções em CSV, comparar Poupança, CDB e Tesouro Selic e estimar poder de compra. O rascunho do Simulador acompanha a navegação da aba.

**Investir** separa Ações, FIIs, ETFs e Criptomoedas no catálogo de 18 ativos fictícios. A Carteira principal começa com R$ 50.000 virtuais. A confirmação de uma ordem segura o relógio automático e conserva a preferência de pausa. Novas operações cobram 0,10% de taxa simulada. O dinheiro da venda tem data de crédito visível e fica disponível no próximo dia simulado. Na Visão geral, acompanhe concentração, maior queda recente e taxas pagas.

**Minha carteira** mostra a quantidade junto ao código de cada ativo. Ao abrir um ativo, o detalhe destaca a posição e pode ser fechado pelo X, por Escape ou com um clique fora. O antigo endereço dos Desafios históricos abre o Mercado simulado.

**Configurações** abre **Dados e demonstração** (`#dados`), com roteiro acadêmico, carteira de exemplo, backup JSON, restauração e tema. Os endereços antigos continuam válidos. `#simular` e `#investir` também abrem as entradas de cada jornada.

Simulações, metas, respostas, tema, favoritos, mercado e carteira ficam no navegador deste endereço. Outro navegador ou computador tem armazenamento independente. Exporte e importe o backup para transferir o progresso. Backups com rodadas históricas continuam compatíveis.

Veja [CONTINUIDADE.md](CONTINUIDADE.md), [arquitetura](docs/ARQUITETURA.md), [regras financeiras](docs/REGRAS_FINANCEIRAS.md), [testes](docs/TESTES.md) e [referências](docs/REFERENCIAS.md).

Equipe A3: Bernardo Rocha, Arthur Cantarutti, Guilherme Honorato e Bernardo Benizio.
