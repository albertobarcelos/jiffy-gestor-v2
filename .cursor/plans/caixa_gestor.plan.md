---
name: Caixa Gestor
overview: Implementar o caixa da estação do Gestor (delivery + balcão). Estudo autenticado da API primeiro; UI só depois.
todos:
  - id: branch
    content: Criar feat/caixa-gestor a partir de origin/developer (sem WIP atual)
    status: completed
  - id: estudo-api
    content: Estudo autenticado na API de homologação e doc docs/features/caixa-gestor-estudo-api.md
    status: pending
  - id: bff-usecases
    content: BFF + domain + use cases de operacao-caixa-estacao
    status: pending
  - id: telas-caixa
    content: Telas Meu Caixa, movimentações, fechamento, histórico e item no TopNav
    status: pending
  - id: vincular-vendas
    content: Vincular estacaoId nas vendas/pedidos se o estudo confirmar
    status: pending
  - id: testes
    content: Testes unitários das regras e mappers de caixa
    status: pending
isProject: true
---

Plano completo: [docs/features/caixa-gestor-plano.md](../../docs/features/caixa-gestor-plano.md)

Próximo passo: estudo autenticado na API de homologação (`/api/v1/caixa/operacao-caixa-estacao`) e registro em `docs/features/caixa-gestor-estudo-api.md`. Não implementar telas antes disso.
