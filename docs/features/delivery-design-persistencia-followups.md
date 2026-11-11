# Follow-ups — persistência do Design Delivery (FE)

Registro para não perder o contexto da revisão arquitetural e da estratégia de PR da branch `feat/persistir-config-app-delivery` → `developer`.

**Escopo da revisão:** frontend apenas (`jiffy-gestor-v2` + consumo no `jiffy-cardapio`).  
**Referência:** `docs/arquitetura-jiffy` + `docs/DESIGN-DELIVERY-RECRIAR-PERSISTENCIA.md`.  
**Data:** 2026-11-10.

---

## Status do PR atual

Abrir **um PR com o que já está commitado**, sem empilhar o refactor Clean completo nesta branch.

| Item | Situação |
|------|----------|
| Persistência draft/publish via API + BFF | Incluído |
| Use cases + port + adapter + composition | Incluído |
| Consumo do **published** no cardápio | Incluído |
| Customizer (desfazer / design padrão / tema checkout) | Incluído |
| Polimento layouts (Vitrine / Grade / Catálogo / cards) | Incluído |
| Limpeza arquitetural completa (ports UI, DTO único, localStorage) | **Fora deste PR** — follow-ups abaixo |

### Commits da branch (vs `developer`, ordem antiga → nova)

| Commit | Escopo |
|--------|--------|
| `b0c5c836` | docs: guia recriar persistência |
| `09811247` | feat: persiste design via API + published no cardápio |
| `31b84651` | refactor: use cases / arquitetura do Design |
| `6d8234be` | feat: Desfazer / Design padrão / tema checkout |
| `74f0e326` | feat: layout Vitrine alinhado ao Básico |
| `6bb574f7` | feat: topnav Básico na Vitrine + capa |
| `a4c0258c` | fix: slots quadrados / imagem sem corte |
| `66a24d20` | feat: Grade topnav, chips, barras |
| `3852d56b` | feat: Catálogo alinhado + add rápido na Grade |

Tamanho aproximado: ~97 arquivos, +4.2k / −1.3k.

### O que não fazer neste PR

- Não misturar refactor Clean completo (presentation → infra, porta localStorage, unificar DTO gestor/cardápio, domain Design).
- Só hotfix mínimo se houver bug real de contrato (ex.: campo tipado que quebra publish).

No corpo do PR, apontar este arquivo como lista de follow-ups conhecidos (não bloqueantes se o BE já valida).

---

## Veredito da revisão (resumo)

O miolo API está alinhado: DTO Zod em application, use cases + port, adapter + composition, BFF fino, cardápio só published.

Principais desvios:

1. Domain Design ausente (defaults/gate/sanitização em application + presentation).
2. Presentation importa infrastructure (composition e APIs de mídia).
3. Orquestração na UI (`useDeliveryDesignDraft`, migração localStorage, merge de mídia).
4. Modelo UI ≠ DTO (`mostrarSugestoesDaCasa` só no Zod; cast no mapper).
5. Duplicação DTO/mapper gestor ↔ cardápio.
6. localStorage legado sem porta.

---

## Follow-ups priorizados

### P0 — Contrato / tipagem

1. Alinhar tipo UI ↔ DTO Zod (`mostrarSugestoesDaCasa` e defaults) e remover cast em `uiDesignConfigToApi`.
2. Unificar DTO Zod gestor ↔ cardápio (package interno ou path único) — evitar drift.
3. Defaults canônicos em um único lugar (hoje: DTO + `defaultDesignConfig` na UI).

### P1 — Camadas / DIP

4. Presentation sem importar `infrastructure/composition` nem clients HTTP de mídia — facade / hooks só via abstração de application.
5. Porta (ou use cases) para upload/clear/hydrate de logo/banner; tirar `deliveryMediaApi` / `empresaDeliveryMidiaApi` direto das tabs/hooks.
6. Extrair orquestração pesada de `useDeliveryDesignDraft` (autosave, publish=save+publish, skip blob) para application service / use case composto.

### P2 — Storage e domain

7. Porta + adapter para localStorage de migração (`designConfigStorage`); migração como application service.
8. Avaliar mínimo de domain Design só se surgirem invariantes reais; até lá policies tipadas em application bastam, desde que únicas.

### P3 — Limpeza

9. Remover / isolar write legado de storage por slug se estiver morto no caminho feliz.
10. Revisar valor do gate FE `validarPublicacaoDesign` vs validação Zod + BE (manter só se UX precisar).

---

## Estratégia de PRs

### Recomendação prática (já commitado)

1. **PR feature** → `developer` com a branch atual (sem refactor Clean extra).
2. **Follow-ups** em PRs pequenos depois do merge (lista P0→P2).
3. Fatiar A/B/C **só** se o time bloquear pelo tamanho do diff.

### Fatiamento opcional (se reorganizar histórico)

| PR | Conteúdo | Commits aprox. |
|----|----------|----------------|
| **A – Core** | docs + persistência + use cases + BFF + published | `b0c5c836`, `09811247`, `31b84651` |
| **B – Customizer UX** | desfazer / design padrão / tema checkout | `6d8234be` |
| **C – Layouts** | Vitrine → Grade → Catálogo / cards | `74f0e326` … `3852d56b` |

Ordem: A → merge → B → C (ou A+B juntos se B for pequeno).

### Depois do merge do core — PRs de arquitetura

1. Sync UI type ↔ Zod + remover cast.
2. Facade/ports para hooks (sem composition na presentation).
3. DTO único gestor ↔ cardápio.
4. Porta / migração localStorage.

---

## Mapa rápido do fluxo (referência)

**Escrita (gestor):** Customizer → `useDeliveryDesignDraft` → mapper UI→API → use cases → port → adapter → BFF → BE.

**Leitura admin:** `useDeliveryDesignMe` → BuscarMe → mapper API→UI → (opcional) hydrate mídia CDN.

**Público (cardápio):** catálogo com `empresa.design` published → Zod + mapper → merge CDN/FK → tema/layouts.

---

## Arquivos-chave

| Camada | Paths |
|--------|--------|
| DTO | `src/application/dto/delivery-publico/DeliveryPublicoDesignDTO.ts` |
| Port | `src/application/ports/IEmpresaDeliveryDesignApi.ts` |
| Mapper | `src/application/mappers/DeliveryDesignConfigMapper.ts` |
| Use cases | `src/application/use-cases/delivery-publico/design/*` |
| Validação | `src/application/services/delivery/validarDraftDesign.ts`, `validarPublicacaoDesign.ts` |
| Adapter / composition | `src/infrastructure/api/EmpresaDeliveryDesignApiAdapter.ts`, `composition/deliveryDesignUseCases.ts` |
| BFF | `app/api/delivery/empresas/me/design/**` |
| Cardápio (cópia DTO) | `apps/jiffy-cardapio/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO.ts` |

---

## Checklist ao retomar

- [ ] PR feature aberto / mergeado em `developer`
- [ ] P0 tipagem UI ↔ DTO
- [ ] P1 desacoplar presentation de infra
- [ ] P0/P1 DTO compartilhado gestor ↔ cardápio
- [ ] P2 porta localStorage / migração
- [ ] Atualizar este doc quando um follow-up for concluído
