# Reorganização: features `nfe` → kanban, pedidos, delivery, fiscal

> **Documento de migração** — plano e inventário para sair de `features/nfe/` (nome legado) em features por domínio.  
> **Status:** Migração concluída (Fase 7) — código em `kanban/`, `pedidos/`, `delivery/`, `fiscal/`  
> **Última revisão:** 2026-06-15

---

## Objetivo

Separar ~111 arquivos hoje em `src/presentation/components/features/nfe/` em:

| Feature alvo | Responsabilidade |
|--------------|------------------|
| `kanban/` | Quadro operacional (Balcão + Delivery), colunas, drag, filtros, cards |
| `pedidos/` | Wizard `NovoPedidoModal` (criar / editar / visualizar) |
| `delivery/` | UI delivery: config impressão/cupom, painéis do kanban, entrega |
| `fiscal/` | Emissão NF-e/NFC-e, badge, PDF retry |

**Não** criar pasta `gestor/` ou `balcão/` — balcão é **modo** do kanban + flags no wizard (`venda_gestor`, `tipoInicioPedido: 'balcao'`).

---

## Inventário de imports externos (fora de `features/nfe/`)

Estes arquivos importam de `features/nfe` hoje e precisam ser atualizados nas fases correspondentes:

| Arquivo | Import atual | Feature alvo (fase) |
|---------|--------------|---------------------|
| `app/(erp)/pedidos-clientes/page.tsx` | `VendasKanban` | `kanban` (Fase 4) |
| `app/layout.tsx` | `DocumentoFiscalPdfRetryModal` | `fiscal` (Fase 2) |
| `src/presentation/components/features/vendas/DetalhesVendas.tsx` | `StatusFiscalBadge` | `fiscal` (Fase 2) |
| `src/presentation/hooks/usePedidosDeliveryInfinite.ts` | `kanban/kanbanVendaCacheUpdate` | `kanban` (Fase 4) |
| `src/presentation/hooks/useImpressaoDelivery.ts` | `kanban/types`, `vendasKanban.rules` | `kanban` + `delivery` (Fases 3–4) |
| `src/shared/utils/deliveryImpressoraExpedicao.ts` | `kanban/types` | `kanban` (Fase 4) |
| `src/application/delivery/montarMensagemWhatsapp*.ts` (3 arquivos) | `kanban/carregarPedidoKanbanQuickView`, `types` | `delivery/kanban-panels` (Fase 3) |
| `tests/unit/presentation/kanban/*.test.ts` (2 arquivos) | `kanban/*` | `kanban` ou `delivery` (Fases 3–4) |

**Total:** 12 pontos de importação externa (excluindo docs e o pacote `nfe` interno).

O restante do acoplamento é **interno** ao diretório `nfe/` (~100+ imports relativos entre `kanban/`, `novo-pedido/` e raiz).

---

## Árvore alvo (presentation)

```
src/presentation/components/features/

kanban/
  VendasKanban.tsx
  KanbanModoVendasToggle.tsx
  components/          # toolbar, column, card, drag
  hooks/               # filters, pinning, scroll load more
  rules/               # vendasKanban.rules, storage
  utils/               # cache update, listagem, card display
  types.ts
  index.ts

delivery/
  configuracoes/       # DeliveryConfiguracoesModal, cupom template
  kanban-panels/       # entregador, endereço, observação, quick view
  components/          # EntregaClienteSelector
  hooks/               # useImpressaoDelivery (futuro)
  index.ts

fiscal/
  EmitirNfeModal.tsx
  DocumentoFiscalPdfRetryModal.tsx
  StatusFiscalBadge.tsx
  hooks/               # useFiscalEmissaoKanban (opcional)
  index.ts

pedidos/               # hoje: nfe/novo-pedido/
  NovoPedidoModal.tsx
  EscolhaTipoPedidoModal.tsx
  components/
  context/
  hooks/
  types.ts
  index.ts
```

---

## Fases de execução

| Fase | Conteúdo | PR |
|------|----------|-----|
| **0** | Inventário, limpeza legado, documentação | ✅ esta fase |
| **1** | Criar pastas + `index.ts` re-exportando de `nfe/`; migrar imports externos | ✅ |
| **2** | Mover `fiscal/` + atualizar dependentes | ✅ |
| **3** | Mover `delivery/` (config + painéis kanban) | ✅ |
| **4** | Mover `kanban/` + `VendasKanban` | ✅ |
| **5** | Mover `pedidos/` (`novo-pedido/` completo) | ✅ |
| **6** | Hooks globais → features; split `useVendas` se necessário | ✅ (parcial: hooks listagem/impressão; `useVendas` mantido em `presentation/hooks`) |
| **7** | Remover `features/nfe/`; aliases TS; rename doc | ✅ |

**Ordem de movimentação real:** fiscal → delivery → kanban → pedidos (pedidos é o mais referenciado).

---

## Compatibilidade durante a migração

1. ~~Manter `features/nfe/` re-exportando tudo até a Fase 7.~~ **Concluído** — pasta removida.
2. Novos imports devem usar o path da feature (`@/features/kanban/...` ou `@/src/presentation/components/features/kanban/...`).
3. Barrels públicos: `kanban/index.ts`, `pedidos/index.ts`, `delivery/index.ts`, `fiscal/index.ts`.
4. **Aliases TypeScript** em `tsconfig.json`:

```json
"@/features/kanban/*": ["./src/presentation/components/features/kanban/*"],
"@/features/pedidos/*": ["./src/presentation/components/features/pedidos/*"],
"@/features/delivery/*": ["./src/presentation/components/features/delivery/*"],
"@/features/fiscal/*": ["./src/presentation/components/features/fiscal/*"]
```

Hooks de listagem/impressão: importar de `@/features/kanban/hooks/*` e `@/features/delivery/hooks/*` (stubs em `presentation/hooks/` removidos).

---

## Arquivos removidos na Fase 0 (legado)

| Arquivo | Motivo |
|---------|--------|
| `NFeKanban.tsx.disabled` | Kanban antigo; referencia `NFeKanbanDnd` inexistente |
| `NFeKanbanCard.tsx.disabled` | Card do kanban legado |
| `NFeKanbanSimple.tsx` | Sem imports no projeto |
| `DroppableColumn.tsx` | Usado apenas pelo `NFeKanban.tsx.disabled` |

Substituto atual: `VendasKanban` + `kanban/DroppableColumnContent.tsx`.

---

## Mapa rápido: arquivo atual → pasta alvo

### Raiz `nfe/` → destino

| Arquivo atual | Destino |
|---------------|---------|
| `VendasKanban.tsx` | `kanban/` |
| `KanbanModoVendasToggle.tsx` | `kanban/` |
| `EmitirNfeModal.tsx` | `fiscal/` |
| `DocumentoFiscalPdfRetryModal.tsx` | `fiscal/` |
| `StatusFiscalBadge.tsx` | `fiscal/` |
| `DeliveryConfig*.tsx`, `DeliveryCupom*`, `DeliveryModoCupom*` | `delivery/configuracoes/` |
| `DeliveryConfiguracoesModal.tsx` | `delivery/configuracoes/` |
| `EntregaClienteSelector.tsx` | `delivery/components/` |
| `EscolhaTipoPedidoModal.tsx` | `pedidos/` |
| `ModalLancamentoProdutoPainel.tsx` | `pedidos/components/` |
| `PainelEdicaoProdutoLinhaPedido.tsx` | `pedidos/components/` |
| `SeletorClienteModal.tsx` | `pedidos/components/` |
| `novo-pedido/**` | `pedidos/**` |
| `kanban/**` (core) | `kanban/**` |
| `kanban/*Entrega*`, `*Entregador*`, `*QuickView*`, whatsapp | `delivery/kanban-panels/` |

### Hooks globais (Fase 6)

| Hook | Destino sugerido |
|------|------------------|
| `useVendasUnificadas`, `usePedidosDeliveryInfinite` | `kanban/hooks/` |
| `useImpressaoDelivery` | `delivery/hooks/` |
| `useVendas` (emissão/transição) | split `fiscal` + `kanban` |

---

## Documentação relacionada

- Comportamento do quadro e modal: [`docs/vendas-kanban-e-novo-pedido.md`](../../vendas-kanban-e-novo-pedido.md)
- APIs do novo pedido: [`docs/features/novo-pedido-api-e-fluxos.md`](../../features/novo-pedido-api-e-fluxos.md)
- Application layer já organizada: `src/application/delivery/`, `use-cases/vendas/`

---

## Changelog

| Data | Alteração |
|------|-----------|
| 2026-06-30 | Padronização de nomes: `VendasKanban`, `KanbanToolbar`, `KanbanVendaCard`, `KanbanColuna`, `vendasKanban.rules`; doc renomeado para `vendas-kanban-e-novo-pedido.md` |
| 2026-06-15 | Limpeza: removidos stubs `presentation/hooks/` (listagem/impressão); imports → `@/features/*` |
| 2026-06-15 | Fase 7: removido `features/nfe/`; aliases `@/features/*` em `tsconfig.json` |
| 2026-06-15 | Fase 6: `useVendasUnificadas`, `usePedidosDeliveryInfinite`, `kanbanListagemQueryCache` → `kanban/hooks/`; `useImpressaoDelivery` → `delivery/hooks/` |
| 2026-06-15 | Fase 5: `novo-pedido/` → `features/pedidos/` (wizard, modais, hooks, context) |
| 2026-06-15 | Fase 4: `VendasKanban`, `KanbanModoVendasToggle`, core `kanban/` em `features/kanban/` |
| 2026-06-15 | Fase 2: `EmitirNfeModal`, `StatusFiscalBadge`, `DocumentoFiscalPdfRetryModal` em `features/fiscal/` |
| 2026-06-15 | Fase 1: barrels `kanban`, `pedidos`, `delivery`, `fiscal`; imports externos migrados |
