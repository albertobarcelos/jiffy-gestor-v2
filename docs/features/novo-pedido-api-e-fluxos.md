# Novo Pedido (Gestor) — API, campos e fluxos (balcão e delivery)

> **Documento de referência para migração de API.** Descreve o comportamento **atual do frontend** (`src/presentation/components/features/nfe/novo-pedido` e BFFs relacionados).  
> **Reorganização de pastas:** destino `features/pedidos/` — ver [`PEDIDOS_FEATURES_REORGANIZACAO.md`](../arquitetura-jiffy/PEDIDOS_FEATURES_REORGANIZACAO.md).  
> Complementa [`novo-pedido.md`](./novo-pedido.md) e [`fiscal-flow-kanban-e-novo-pedido.md`](../fiscal-flow-kanban-e-novo-pedido.md).

**Última revisão:** 2026-06-15  
**Componente raiz:** `NovoPedidoModal` → `useNovoPedidoOrchestrator`

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Wizard (passos do modal)](#2-wizard-passos-do-modal)
3. [Balcão vs delivery](#3-balcão-vs-delivery)
4. [Criação do pedido](#4-criação-do-pedido)
5. [Após criar — ações automáticas](#5-após-criar--ações-automáticas)
6. [Leitura de pedido existente](#6-leitura-de-pedido-existente)
7. [Alterações após o pedido criado](#7-alterações-após-o-pedido-criado)
8. [Catálogo e dados auxiliares](#8-catálogo-e-dados-auxiliares)
9. [Moradas por telefone (delivery)](#9-moradas-por-telefone-delivery)
10. [Kanban e transições operacionais](#10-kanban-e-transições-operacionais)
11. [Mapa BFF → backend](#11-mapa-bff--backend)
12. [Campos duplicados e débitos conhecidos](#12-campos-duplicados-e-débitos-conhecidos)
13. [Arquivos-chave no código](#13-arquivos-chave-no-código)

---

## 1. Visão geral

| Camada | Responsabilidade |
|--------|------------------|
| **Presentation** (`novo-pedido/`) | Wizard 4 passos, formulário, detalhes, integração Kanban |
| **Application** | `CriarVendaGestorUseCase`, `CarregarVendaDetalheUseCase`, mappers de payload/DTO |
| **Domain** | `ValidadorPedidoGestor`, `CalculadoraPedido`, tipos `pedido` / `vendaDetalhe` |
| **BFF (Next)** | `app/api/vendas/gestor/*`, `app/api/gestor/morada-telefone/*`, catálogo |
| **Backend** | `POST /api/v1/gestor/vendas`, etc. (via `ApiClient`) |

O modal **não chama o backend diretamente** na criação: usa hooks (`useCreateVendaGestor`) → BFF → `ApiClient` → API v1.

Contextos React (sem context monolítico):

- `NovoPedidoFormContext` — carrinho, cliente, pagamentos
- `NovoPedidoUIContext` — modais, steps, scroll
- `NovoPedidoDetalheContext` — visualização step 4, fiscal, entrega

---

## 2. Wizard (passos do modal)

| Step | UI | Balcão | Delivery |
|------|-----|--------|----------|
| **1** | Produtos (catálogo + carrinho) | Sim | Sim |
| **2** | Informações | **Oculto** (sem passo informações) | Cliente, telefone, morada, retirada/entrega, taxa, tempo previsto |
| **3** | Pagamento | Se status exige pagamento no passo 3 | Sempre (entrega aberta) |
| **4** | Detalhes | Só em **visualização** de venda existente | Idem |

Navegação: `useNovoPedidoNavegacao` + `validarInformacoesPedido` (cliente/endereço no delivery).

---

## 3. Balcão vs delivery

### 3.1 Como o tipo é definido

- Prop `tipoInicioPedido`: `'balcao' | 'entrega'` (vem do Kanban: `EscolhaTipoPedidoModal` / botão Novo Pedido).
- No payload de criação: `tipoVenda` = `'balcao'` ou `'entrega'` (`CriarVendaPayloadMapper`).

### 3.2 Status inicial (`RegrasStatusPedido.statusPadraoNovoPedido`)

| Tipo | `statusVenda` padrão | Kanban após criar |
|------|----------------------|-------------------|
| **Balcão** | `FINALIZADA` | Colunas fiscal (Finalizadas / Pendente emissão / Com NFe) |
| **Delivery** | `ABERTA` | Coluna operacional (Novos pedidos / preparo / rota…) |

O usuário pode alterar status no passo pagamento (balcão): `ABERTA`, `FINALIZADA`, `PENDENTE_EMISSAO`.

### 3.3 Delivery — subtipos

| Campo UI | Valor API | Efeito |
|----------|-----------|--------|
| `tipoAtendimentoDelivery` | `tipoAtendimento` + `modalidadeEntrega` | `'entrega'` ou `'retirada'` |
| `pedidoComEntrega` | — | Entrega com endereço + taxa |
| `pedidoComRetirada` | — | Sem endereço de entrega |
| `fluxoPagamentoEntrega` | `pagamento.cobrarCliente`, `pagamentos[].cobrarNaEntrega` | `cobrar_entregador` vs `ja_pago` |
| `tempoPrevistoMinutos` | `tempoPrevistoMinutos` | Previsão (default UI: 45) |

### 3.4 Catálogo por canal

- Balcão: produtos/grupos com `ativoLocal`.
- Delivery: `ativoDelivery`.
- Implementação: `CanalVendaNovoPedido` em `novoPedidoProdutosApi.ts` + filtros em `useGruposVendaQuery`.

### 3.5 Pagamento no passo 3

| Cenário | Exige pagamentos no submit? |
|---------|----------------------------|
| Balcão `FINALIZADA` / `PENDENTE_EMISSAO` | Sim (total deve cobrir; sem `naoEfetivo`) |
| Delivery `ABERTA` + já pago | Sim (total deve cobrir) |
| Delivery `ABERTA` + cobrar entregador/retirada | Sim (forma de cobrança; valor recebido 0 na API) |

Validação central: `ValidadorPedidoGestor` / `validarCriarVendaGestor`.

---

## 4. Criação do pedido

### 4.1 Fluxo

```
NovoPedidoModal (submit)
  → validarCriarVendaGestor
  → CriarVendaGestorUseCase.buildPayload (CriarVendaPayloadMapper)
  → useCreateVendaGestor.mutateAsync
  → POST /api/vendas/gestor  (BFF)
  → POST /api/v1/gestor/vendas  (backend)
```

### 4.2 Endpoint (frontend)

| Método | BFF | Backend (proxy) |
|--------|-----|-----------------|
| `POST` | `/api/vendas/gestor` | `/api/v1/gestor/vendas` |

Hook: `useCreateVendaGestor` em `useVendas.ts`.  
Use case: `CriarVendaGestorUseCase.ts`.  
Mapper: `CriarVendaPayloadMapper.ts`.  
Contrato tipado: `CriarVendaGestorApiRequest` em `vendaGestorApi.ts`.

### 4.3 Payload de criação — campos raiz

| Campo enviado | Origem UI | Observação |
|---------------|-----------|------------|
| `tipoVenda` | `tipoInicioPedido` | `'balcao'` \| `'entrega'` |
| `origem` | `origem` (default `GESTOR`) | `GESTOR`, `IFOOD`, `RAPPI`, `OUTROS` |
| `statusVenda` | `status` | `ABERTA`, `FINALIZADA`, `PENDENTE_EMISSAO` |
| `valorFinal` | total produtos + taxa entrega | |
| `totalDesconto` | fixo `0` na criação | |
| `totalAcrescimo` | fixo `0` na criação | |
| `produtosLancados` | carrinho | **duplicado** em `produtos` (compat backend) |
| `produtos` | idem | ver débito dual-key |
| `solicitarEmissaoFiscal` | `status === PENDENTE_EMISSAO` | boolean |
| `clienteId` | balcão: `clienteId`; delivery: `clienteEntregaVinculado.id` | |
| `dataFinalizacao` | ISO now | só se `FINALIZADA` ou `PENDENTE_EMISSAO` |

**Somente delivery (`tipoInicioPedido === 'entrega'`):**

| Campo | Condição |
|-------|----------|
| `tipoAtendimento` | `entrega` \| `retirada` |
| `modalidadeEntrega` | igual `tipoAtendimento` (duplicado) |
| `tempoPrevistoMinutos` | número |
| `taxaEntregaId` | se entrega + taxa selecionada |
| `taxaEntregaValor` | valor da taxa |
| `taxasLancadas` | `[{ taxaId, valorCalculado }]` |
| `enderecoEntrega` | morada selecionada (cep, rua, numero, …) |

**Não enviado na criação hoje:** `entregadorId` (vinculado depois via Kanban PATCH).

### 4.4 Item de produto (`produtosLancados[]`)

| Campo | Notas |
|-------|--------|
| `produtoId` | |
| `quantidade` | |
| `valorUnitario` | |
| `valorFinal` | calculado (`CalculadoraPedido`) |
| `tipoDesconto` | `fixo` \| `porcentagem` \| null |
| `valorDesconto` | % convertido a fração se porcentagem |
| `tipoAcrescimo` | idem |
| `valorAcrescimo` | idem |
| `complementos[]` | `complementoId`, `grupoComplementoId`, `valorUnitario`, `quantidade` |

### 4.5 Pagamentos na criação

Array `pagamentos[]` (quando aplicável):

| Campo | Notas |
|-------|--------|
| `meioPagamentoId` | |
| `valor` | |
| `cobrarNaEntrega` | `true` se delivery aberto + cobrar entregador |
| `efetivado` | `false` se UI `naoEfetivo`; else `true` |

Objeto `pagamento` (resumo — varia por cenário):

| Cenário | Campos típicos |
|---------|----------------|
| Balcão finalizado com falta de pagamento | `status: pendente`, `cobrarCliente`, `valorReceber`, `valorRecebido`, `valorFaltante` |
| Delivery aberto + cobrar entregador | `status: pendente`, `meioPagamentoId`, `meioPagamento`, `valorReceber`, `valorRecebido: 0`, `trocoPara`, `meios[]` |
| Delivery aberto + já pago | `status` (pendente/parcial/pago), `valorReceber`, `valorRecebido`, `valorFaltante` |

`meios[]` em cobrança na entrega: `{ meioPagamentoId, nome, valor }`.

### 4.6 Resposta esperada

Parser: `extrairIdVendaCriada` (`VendaApiNormalizer`).  
Aceita `id` ou `vendaId` na raiz ou em `data`.

---

## 5. Após criar — ações automáticas

Ordem em `useNovoPedidoSubmit.handleSubmit`:

1. **POST criar** → obtém `idCriado`.
2. Se `status === FINALIZADA` ou `PENDENTE_EMISSAO`:  
   `POST /api/vendas/gestor/{id}/finalizar` → backend `POST /api/v1/gestor/vendas/{id}/transicoes` com `{ acao: 'finalizar' }`.
3. Se delivery `ABERTA` + preferência empresa `autoIniciarPreparo`:  
   `POST /api/vendas/gestor/{id}/transicoes` com `{ acao: 'iniciar_preparo' }` (+ impressão delivery se configurada).
4. Fecha modal, invalida listas (`vendas`, `vendas-unificadas`).

---

## 6. Leitura de pedido existente

### 6.1 Quando ocorre

- Kanban: abrir card (visualização) com `vendaId` + `tabelaOrigem`.
- PDV: `tabelaOrigemVenda === 'venda'` (GET `/api/vendas/{id}`).
- Gestor: `tabelaOrigemVenda === 'venda_gestor'` (GET `/api/vendas/gestor/{id}`).

### 6.2 Endpoint

| Origem | BFF | Query | Backend |
|--------|-----|-------|---------|
| Gestor | `GET /api/vendas/gestor/{id}` | `incluirFiscal=true\|false` | `GET /api/v1/gestor/vendas/{id}` |
| PDV | `GET /api/vendas/{id}` | `incluirFiscal=true\|false` | (API vendas PDV) |

Use case: `CarregarVendaDetalheUseCase` → `VendaDetalheReadRepository`.

### 6.3 DTO aplicado ao formulário (`VendaDetalheCarregadaDTO`)

Mapeado em `aplicarVendaDetalheCarregada` / `useCarregarVenda`:

- Meta: número, código, tipo venda, datas, terminal, `solicitarEmissaoFiscal`
- Cliente, produtos, pagamentos, fluxo entrega
- `detalhesEntregaPedido`: entregador, endereço, previsão, taxa, troco API
- `resumoFiscal`, `resumoFinanceiroDetalhes`
- Step 4 automático se visualização (`irParaStep4`)

Leitura de produtos: `produtosLancados` **ou** `produtos` (`pickProdutosLancados`).

### 6.4 Enriquecimento após GET

- Cliente entrega: `GET /api/clientes/{id}`
- Entregador: `GET /api/usuarios/{entregadorId}` (usuário PDV)
- Usuários gestor (aberto por, etc.): `GET /api/pessoas/usuarios-gestor/{id}`
- Meio pagamento: `GET /api/meios-pagamentos/{id}` (se não está no cache)

---

## 7. Alterações após o pedido criado

Todas partem do **step 4 (detalhes)** ou do **Kanban**, não reeditam produtos via PUT completo.

### 7.1 Pagamento de entrega em aberto (gestor)

**Quando:** delivery `ABERTA`, sem `dataFinalizacao`, step 4, `podeEditarPagamentoEntregaEmAberto`.

| Método | BFF | Body | Backend |
|--------|-----|------|---------|
| `PATCH` | `/api/vendas/gestor/{id}` | `{ pagamentos: [{ meioPagamentoId, valor }] }` | `PATCH /api/v1/gestor/vendas/{id}` |

Use case: `AtualizarPagamentoEntregaGestorUseCase` → `NovoPedidoReadRepository.atualizarPagamentosVendaGestor`.

### 7.2 Vincular entregador (Kanban / painel)

| Método | BFF | Body |
|--------|-----|------|
| `PATCH` | `/api/vendas/gestor/{id}` | `{ entregadorId }` |

`entregadorKanbanStore.salvarEntregadorVendaGestor`.  
**Não** faz parte do POST de criação.

### 7.3 Marcar / desmarcar emissão fiscal

| Ação | BFF | Body |
|------|-----|------|
| Marcar | `PATCH /api/vendas/gestor/{id}` ou `PATCH /api/vendas/{id}` | `{ solicitarEmissaoFiscal: true }` |
| Desmarcar | idem | `{ solicitarEmissaoFiscal: false }` |

Hooks: `useMarcarEmissaoFiscal`, `useDesmarcarEmissaoFiscal`.

Rotas legadas (ainda existem no BFF):  
`/marcar-emissao-fiscal`, `/desmarcar-emissao-fiscal` — o modal/Kanban usa PATCH genérico.

### 7.4 Finalizar operacionalmente

| Método | BFF | Body backend |
|--------|-----|--------------|
| `POST` | `/api/vendas/gestor/{id}/finalizar` | `{ acao: 'finalizar' }` em transicoes |

Hook: `useFinalzarVendaGestor`.

### 7.5 Transições de etapa (delivery Kanban)

| Método | BFF | Body |
|--------|-----|------|
| `POST` | `/api/vendas/gestor/{id}/transicoes` | `{ acao }` ou `{ acoes: [...] }`, opcional `motivo` |

Ações: `iniciar_preparo`, `marcar_pronto`, `despachar`, `finalizar`, `cancelar`.

Backend: `POST /api/v1/gestor/vendas/{id}/transicoes`.

### 7.6 Emissão / reemissão / cancelamento fiscal

| Ação | BFF gestor | Backend |
|------|------------|---------|
| Emitir NFC-e/NF-e | `POST /api/vendas/gestor/{id}/emitir-nota` | `POST …/emitir-nota` (+ `tipoDocumento`, modelo) |
| Emitir (legado) | `POST …/emitir-nfe` | `…/emitir-nfe` |
| Reemitir | `POST …/reemitir` | `…/reemitir-nota` |
| Cancelar nota | `POST …/cancelar-nota` | `…/cancelar-nota` |
| Status emissão | `GET …/status-emissao` | `…/status-emissao` |

PDV usa rotas espelhadas em `/api/vendas/{id}/…`.

### 7.7 Cancelar venda gestor

| Método | BFF | Body |
|--------|-----|------|
| `POST` | `/api/vendas/gestor/{id}/cancelar` | `{ motivo }` (min. 15 chars) |

Modal detalhes: `useCancelarVendaGestor` ou cancelar nota fiscal (`useCancelarNotaFiscalVendaGestor` / PDV).

### 7.8 Excluir / duplicar

| Ação | BFF gestor |
|------|------------|
| Duplicar | `POST /api/vendas/gestor/{id}/duplicar` |
| Excluir definitivo | `POST /api/vendas/gestor/{id}/excluir` |

### 7.9 Impressão delivery (tickets)

| Método | BFF | Backend |
|--------|-----|---------|
| `GET` | `/api/vendas/gestor/{id}/tickets?estacaoImpressaoId=…` | `GET /api/v1/gestor/vendas/{id}/tickets` |

Contrato esperado: ver `docs/DELIVERY_TICKETS_PAYLOAD.md`.

### 7.7 O que **não** é editado após criar (hoje)

- Lista de produtos / quantidades (sem PUT de venda completa no modal).
- Endereço de entrega após salvar (só na criação ou via backend externo).
- `tipoVenda` / `tipoAtendimento` após criação.

---

## 8. Catálogo e dados auxiliares

Endpoints usados durante o wizard (não são `/vendas/gestor`):

| Uso | BFF | Parâmetros relevantes |
|-----|-----|------------------------|
| Grupos de produtos | `GET /api/grupos-produtos` | `ativo`, `limit`, `offset` |
| IDs de grupos com produtos no canal | `GET /api/produtos` | `ativo`, `ativoLocal` ou `ativoDelivery`, paginação |
| Produtos do grupo | `GET /api/grupos-produtos/{id}/produtos` | `limit`, `offset` |
| Busca produto | `GET /api/produtos` | `name`, `ativo`, `limit` |
| Produto por id | `GET /api/produtos/{id}` | |
| Meios de pagamento | `GET /api/meios-pagamentos` | infinite scroll no hook |
| Taxas de entrega | `GET /api/taxas` | filtro client-side `tipo === entrega` |
| Entregadores | `GET /api/usuarios-pdv/entregadores` | `tipoUsuarioPdv=entregador` (BFF filtra) |
| Cliente | `GET /api/clientes/{id}` | seleção / detalhe |
| Auth / usuário | `GET /api/auth/me` | nome operador |
| Usuário gestor | `GET /api/pessoas/usuarios-gestor/{id}` | labels detalhe |

Repositório: `NovoPedidoReadRepository.ts`.

---

## 9. Moradas por telefone (delivery)

| Operação | BFF | Backend (proxy) |
|----------|-----|-----------------|
| Listar por telefone | `GET /api/gestor/morada-telefone?telefone=` | `GET /api/v1/gestor/morada-telefone` |
| Criar | `POST /api/gestor/morada-telefone` | POST gestor morada |
| Atualizar | `PATCH /api/gestor/morada-telefone/{id}` | PATCH |
| Registrar uso (recentes) | `POST /api/gestor/morada-telefone/{id}/registrar-uso` | POST |

DTO criação/edição (`CriarMoradaTelefoneDTO`): `telefone`, `tipoEtiqueta`, `nomeMorada`, `endereco` (cep, rua, numero, bairro, cidade, estado, complemento, referencia).

Na criação da venda, o endereço vai em `enderecoEntrega` no POST gestor (snapshot), não só referência à morada.

Hook: `useMoradaTelefone.ts`, `useMoradasPorTelefone`, `useCriarMoradaTelefone`, etc.

---

## 10. Kanban e transições operacionais

O `FiscalFlowKanban` reutiliza o mesmo `NovoPedidoModal` para visualização e abre delivery com:

- `tipoInicioPedido` implícito pelo card (`tipoVenda`)
- Transições via `useTransicaoVendaGestor` (mesmos endpoints da seção 7.5)
- Entregador: `AtribuirEntregadorKanbanPainel` → PATCH `entregadorId`
- Impressão: `useImpressaoDelivery` + GET tickets

Lista unificada do Kanban: `GET /api/vendas/unificado` (não é parte do modal, mas alimenta cards).

---

## 11. Mapa BFF → backend (venda gestor)

| BFF | Backend |
|-----|---------|
| `POST /api/vendas/gestor` | `POST /api/v1/gestor/vendas` |
| `GET /api/vendas/gestor/{id}` | `GET /api/v1/gestor/vendas/{id}` |
| `PATCH /api/vendas/gestor/{id}` | `PATCH /api/v1/gestor/vendas/{id}` |
| `POST /api/vendas/gestor/{id}/transicoes` | `POST /api/v1/gestor/vendas/{id}/transicoes` |
| `POST /api/vendas/gestor/{id}/finalizar` | `POST /api/v1/gestor/vendas/{id}/transicoes` (`acao: finalizar`) |
| `GET /api/vendas/gestor/{id}/tickets` | `GET /api/v1/gestor/vendas/{id}/tickets` |
| `POST /api/vendas/gestor/{id}/emitir-nota` | `POST /api/v1/gestor/vendas/{id}/emitir-nota` |
| `POST /api/vendas/gestor/{id}/reemitir` | `POST /api/v1/gestor/vendas/{id}/reemitir-nota` |
| `POST /api/vendas/gestor/{id}/cancelar` | `POST /api/v1/gestor/vendas/{id}/cancelar` |
| `POST /api/vendas/gestor/{id}/cancelar-nota` | `POST /api/v1/gestor/vendas/{id}/cancelar-nota` |
| `POST /api/vendas/gestor/{id}/duplicar` | `POST /api/v1/gestor/vendas/{id}/duplicar` |
| `POST /api/vendas/gestor/{id}/excluir` | `POST /api/v1/gestor/vendas/{id}/excluir` |
| `GET /api/vendas/gestor/{id}/status-emissao` | `GET /api/v1/gestor/vendas/{id}/status-emissao` |

---

## 12. Campos duplicados e débitos conhecidos

### Dual-key (não remover sem alinhar backend)

| Escrita (POST) | Leitura (GET) |
|----------------|---------------|
| `produtosLancados` + `produtos` | `produtosLancados` ou `produtos` |
| `tipoAtendimento` + `modalidadeEntrega` | normalização em mappers de detalhe |

Centralizar mudanças em: `CriarVendaPayloadMapper`, `VendaApiNormalizer`, `VendaDetalheMapper`.

### Outros pontos de atenção para nova API

1. **`entregadorId`** — só PATCH após criar; documentar se passará a ir no POST.
2. **`tipoVenda`** — fonte da verdade UI/Kanban; docs backend mencionam evitar `metodologiaEntrega`.
3. **`tempoPrevistoMinutos` vs `previsaoEntrega`** — UI envia minutos; GET detalhe pode expor `previsaoEntrega` calculada.
4. **Finalizar após criar** — balcão finalizado depende de segundo POST (`finalizar`); se backend unificar, avaliar remover chamada dupla.
5. **Pagamento entrega em aberto** — PATCH só `pagamentos[]`; não atualiza objeto `pagamento` completo.
6. **PDV vs gestor** — mesmo modal; rotas diferentes para GET fiscal/cancelar/duplicar.

---

## 13. Arquivos-chave no código

| Área | Caminho |
|------|---------|
| Orquestrador | `novo-pedido/hooks/useNovoPedidoOrchestrator.ts` |
| Submit | `novo-pedido/hooks/useNovoPedidoSubmit.ts` |
| Payload | `application/mappers/CriarVendaPayloadMapper.ts` |
| Use case criar | `application/use-cases/vendas/CriarVendaGestorUseCase.ts` |
| Contrato API | `application/dto/api/vendaGestorApi.ts` |
| Validação | `domain/services/pedido/ValidadorPedidoGestor.ts` |
| Status padrão | `domain/services/pedido/RegrasStatusPedido.ts` |
| Carregar detalhe | `application/use-cases/vendas/CarregarVendaDetalheUseCase.ts` |
| PATCH pagamento entrega | `application/use-cases/vendas/AtualizarPagamentoEntregaGestorUseCase.ts` |
| Hooks vendas | `presentation/hooks/useVendas.ts` |
| Moradas | `presentation/hooks/useMoradaTelefone.ts` |
| BFF criar | `app/api/vendas/gestor/route.ts` |
| BFF PATCH/GET | `app/api/vendas/gestor/[id]/route.ts` |
| Entregador Kanban | `kanban/entregadorKanbanStore.ts` |
| Doc tickets | `docs/DELIVERY_TICKETS_PAYLOAD.md` |

---

## Changelog

| Data | Nota |
|------|------|
| 2026-06-15 | Documento inicial para migração de API (balcão + delivery, criar e pós-criação). |
