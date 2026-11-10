# Montante

Simulador educacional de investimentos do projeto acadêmico A3. As projeções são hipotéticas e o aplicativo funciona localmente, sem transações reais.

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

O Início apresenta uma projeção calculada. O Simulador aceita taxas mensais ou anuais, compara juros simples e compostos, salva cenários no navegador e exporta a evolução em CSV. O Comparador calcula Poupança, CDB e Tesouro Selic sobre a mesma base, com taxas editáveis.

Em **Laboratório**, pratique com 18 ativos fictícios, acompanhe o relógio simulado e use R$ 50.000,00 virtuais para comprar e vender. Painel e carteira mostram posições, distribuição, desempenho e extrato. **Dados e demonstração** inclui roteiro acadêmico, carteira de exemplo reproduzível, backup JSON e restauração.

Simulações, favoritos, mercado e carteira ficam no navegador deste endereço. Outro navegador ou computador tem armazenamento independente. Exporte e importe o backup para transferir o progresso.

Veja [CONTINUIDADE.md](CONTINUIDADE.md), [arquitetura](docs/ARQUITETURA.md), [regras financeiras](docs/REGRAS_FINANCEIRAS.md), [testes](docs/TESTES.md) e [referências](docs/REFERENCIAS.md).

Equipe A3: Bernardo Rocha, Arthur Cantarutti, Guilherme Honorato e Bernardo Benizio.
