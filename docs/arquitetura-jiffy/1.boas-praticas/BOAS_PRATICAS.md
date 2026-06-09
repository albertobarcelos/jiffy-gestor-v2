# Boas Práticas e Princípios de Arquitetura

Este documento define as orientações gerais da arquitetura do **Jiffy Sistemas**.  
O objetivo é manter o código previsível, legível, testável e alinhado entre todos os módulos.

## 1. Referências arquiteturais

As decisões técnicas deste projeto seguem principalmente:

- **Clean Architecture**
- **Domain-Driven Design (DDD)**
- **SOLID**

## 2. Direção das dependências

Regra principal: **as dependências devem apontar para dentro**.

- `domain` não depende de nenhuma outra camada.
- `application` pode depender de `domain`.
- `infrastructure` implementa contratos e depende de camadas internas quando necessário.
- detalhes técnicos (framework, banco, mensageria, APIs externas) não devem contaminar regras de negócio.

## 3. Princípios obrigatórios no código

- aplicar **Inversão de Dependência** para reduzir acoplamento.
- usar **Injeção de Dependência** para facilitar substituição de implementações e testes.
- escrever código com foco em **testabilidade**.
- manter classes e métodos com **responsabilidade única**.
- evitar duplicação: antes de criar algo novo, verificar se já existe solução reutilizável no projeto.

## 4. Organização de casos de uso e serviços

- se um caso de uso crescer demais, quebrar em serviços auxiliares ou métodos privados.
- preferir orquestrações simples, com fluxo claro de início, meio e fim.
- evitar métodos longos; dividir em partes menores com nomes que expressem intenção.

## 5. Diretrizes de modelagem

- preferir **composição** em vez de herança.
- usar padrões de projeto quando o problema justificar.
- quando uma entidade puder ser criada de formas diferentes, expor fábricas (`factory methods`) na própria classe.
- quando um campo tiver conjunto fechado de valores (ex.: `status`), usar tipagem forte com `enum` ou `value object`.

## 6. Legibilidade e manutenção

- priorizar nomes explícitos para classes, métodos e variáveis.
- evitar soluções excessivamente complexas sem necessidade.
- escrever código que possa ser entendido e mantido por qualquer pessoa do time.

## 7. O que se espera de cada desenvolvedor

- respeitar as regras de dependência entre camadas.
- manter regras de negócio no domínio, não em detalhes de infraestrutura.
- evoluir o código com consistência arquitetural, não apenas com foco em “funcionar”.
- deixar o trecho alterado melhor do que estava (clareza, coesão e cobertura de testes quando aplicável).

## 8. Checklist rápido antes de abrir PR

- a regra de negócio está na camada correta?
- existe acoplamento indevido com framework, banco ou API externa?
- os nomes comunicam a intenção com clareza?
- há duplicação que poderia ser extraída?
- os tipos estão fortes o suficiente (`enum`, `value object`, contratos)?
- o código novo está simples de testar?
