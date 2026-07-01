# Feature: Novo Pedido (Gestor)

## Nomenclatura

| Camada | Termo | Exemplo |
|--------|--------|---------|
| UI (modal, steps, labels) | **Pedido** | `NovoPedidoModal`, passo “Informações do pedido” |
| Domain / Application | **VendaGestor** | `CriarVendaGestorUseCase`, `VendaDetalheCarregadaDTO` |
| API BFF (Next) | Rotas atuais `/api/vendas/gestor` | Payload legado mantido |

## Arquitetura

```
presentation/novo-pedido  → hooks orquestram; sem fetch direto (BFF via use cases)
application               → use cases, mappers, DTOs, VendaApiNormalizer
domain                    → tipos (vendaDetalhe), ValidadorPedidoGestor, CalculadoraPagamentoPedido
infrastructure/api        → VendaDetalheReadRepository, NovoPedidoReadRepository
```

### Contexto React

- `NovoPedidoFormContext` — carrinho, cliente, pagamentos, catálogo
- `NovoPedidoUIContext` — modais, navegação, scroll
- `NovoPedidoDetalheContext` — visualização de venda, abas fiscal/entrega, cancelamento

Montagem: `assembleNovoPedidoContextSlices` + providers em `NovoPedidoProvider` (sem context monolítico legado).

## Compatibilidade backend (não remover sem gate)

O backend ainda aceita chaves duplas. Centralizar em `VendaApiNormalizer` / `CriarVendaPayloadMapper`:

- Leitura: `produtosLancados` **ou** `produtos`
- Escrita: enviar **ambos** até confirmação do time backend
- `tipoAtendimento` + `modalidadeEntrega` conforme mappers atuais

**Gate futuro:** feature flag ou versão de API documentada antes de remover dual-key.

## Checklist de regressão manual

- [ ] Criar pedido balcão — status `FINALIZADA` e `PENDENTE_EMISSAO`
- [ ] Criar pedido entrega — status `ABERTA` (cobrar entregador / já pago)
- [ ] Visualizar venda gestor e PDV — abas fiscal, entrega, pagamentos
- [ ] Kanban — quick view e atribuir entregador
- [ ] Submit com troco e pagamento `naoEfetivo` bloqueado em finalização
- [ ] PATCH pagamento entrega em aberto (gestor)
- [ ] Catálogo: grupos vazios ocultos; busca por nome

## Validação unificada

`ValidadorPedidoGestor` em `src/domain/services/pedido/ValidadorPedidoGestor.ts` é a fonte única para `canSubmitNovoPedido` e `validarCriarVendaGestor`.
