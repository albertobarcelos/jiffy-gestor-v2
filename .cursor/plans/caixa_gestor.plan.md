---
name: Caixa Gestor
overview: Caixa da estação do Gestor (delivery + balcão) — painel lateral no Kanban/Fredy, BFF e use cases implementados.
todos:
  - id: branch
    content: Criar feat/caixa-gestor a partir de origin/developer (sem WIP atual)
    status: completed
  - id: estudo-api
    content: Estudo autenticado na API de homologação e doc docs/features/caixa-gestor-estudo-api.md
    status: completed
  - id: bff-usecases
    content: BFF + domain + use cases de operacao-caixa-estacao
    status: completed
  - id: telas-caixa
    content: Painel lateral Meu Caixa no Kanban (sem rota /meu-caixa)
    status: completed
  - id: vincular-vendas
    content: Vincular estacaoId nas vendas balcão
    status: completed
  - id: testes
    content: Testes unitários das regras e mappers de caixa
    status: completed
isProject: true
---

Plano completo: [docs/features/caixa-gestor-plano.md](../../docs/features/caixa-gestor-plano.md)

Meu Caixa = **somente modal lateral** no Kanban/Fredy (`MeuCaixaSidePanel`). Não existe página dedicada nem item no TopNav.
