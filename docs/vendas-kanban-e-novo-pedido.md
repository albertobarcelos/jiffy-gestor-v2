# Quadro de Vendas (Kanban) e fluxo de Novo Pedido

> **Documento vivo** — descreve o comportamento atual do código. Ao alterar `VendasKanban`, `NovoPedidoModal` ou módulos em `./kanban/`, atualize as seções afetadas e a data no rodapé.

**Última revisão:** 2026-06-30 (doc sincronizada com orchestrator + edição de produtos)
**Rota:** `/pedidos-clientes` → `app/(erp)/pedidos-clientes/page.tsx`  
**Componente raiz:** `src/presentation/components/features/kanban/VendasKanban.tsx`

> **Pastas:** código em `features/kanban/`, `pedidos/`, `delivery/`, `fiscal/`. Inventário em [`docs/arquitetura-jiffy/PEDIDOS_FEATURES_REORGANIZACAO.md`](arquitetura-jiffy/PEDIDOS_FEATURES_REORGANIZACAO.md).

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Arquitetura de arquivos](#2-arquitetura-de-arquivos)
3. [Modos do quadro: Balcão vs Delivery](#3-modos-do-quadro-balcão-vs-delivery)
4. [Colunas do Kanban](#4-colunas-do-kanban)
5. [Classificação de vendas nas colunas](#5-classificação-de-vendas-nas-colunas)
6. [Filtros e dados](#6-filtros-e-dados)
7. [Drag and drop e ações no card](#7-drag-and-drop-e-ações-no-card)
8. [Fluxo fiscal (NFe/NFCe)](#8-fluxo-fiscal-nfenfce)
9. [Abrir Novo Pedido (integração Kanban → modal)](#9-abrir-novo-pedido-integração-kanban--modal)
10. [NovoPedidoModal — wizard em 4 passos](#10-novopedidomodal--wizard-em-4-passos)
11. [Balcão vs Entrega no modal](#11-balcão-vs-entrega-no-modal)
12. [Visualização / edição de pedido existente](#12-visualização--edição-de-pedido-existente)
13. [Delivery: transições, impressão e configurações](#13-delivery-transições-impressão-e-configurações)
14. [Modais e componentes auxiliares](#14-modais-e-componentes-auxiliares)
15. [APIs e hooks principais](#15-apis-e-hooks-principais)
16. [Persistência local (localStorage)](#16-persistência-local-localstorage)
17. [Pontos de atenção / débitos conhecidos](#17-pontos-de-atenção--débitos-conhecidos)
18. [Changelog deste documento](#18-changelog-deste-documento)

---

## 1. Visão geral

A tela **Pedidos / Clientes** é um Kanban que unifica vendas do **PDV** e do **Gestor**, com dois modos de visualização:

| Modo (toolbar) | O que mostra | Colunas visíveis |
|----------------|--------------|------------------|
| **Delivery** | Pedidos `venda_gestor` com `tipoVenda` **entrega** ou **retirada** | 4 operacionais + Finalizadas + Com nota (sem Pendente emissão) |
| **Balcão** | Demais vendas (balcão, mesa, gestor não-entrega, PDV, etc.) | Finalizadas + Pendente emissão + Com nota |

Funcionalidades centrais:

- Criar pedido (**Novo Pedido**) — tipo inferido pelo modo do quadro (não abre mais o diálogo de escolha na página).
- Arrastar cards entre colunas (fiscal e/ou logística).
- Emitir / reemitir nota fiscal.
- Ver detalhes do pedido (mesmo `NovoPedidoModal` em modo leitura, passo 4).
- **Editar produtos** de pedido delivery em andamento (lápis ao lado do código `#…` no card → `NovoPedidoModal` com `modoEdicaoProdutos`).
- Configurar impressão delivery (estação, template de cupom, preferências).

---

## 2. Arquitetura de arquivos

### Estrutura atual

```
app/(erp)/pedidos-clientes/page.tsx    # dynamic import → VendasKanban (ssr: false)
src/presentation/components/features/
├── kanban/
│   ├── VendasKanban.tsx               # Composição pura (~20 linhas)
│   ├── KanbanModoVendasToggle.tsx
│   ├── components/
│   │   ├── KanbanToolbar.tsx          # Filtros, busca, toggle Delivery/Balcão
│   │   ├── KanbanBoardRenderer.tsx    # DnD + colunas + cards
│   │   ├── KanbanModaisRenderer.tsx   # Todos os modais do quadro
│   │   ├── KanbanColuna.tsx           # Coluna (UI; tipo KanbanColumn em types.ts)
│   │   ├── KanbanVendaCard.tsx        # Card + painéis delivery
│   │   └── …                          # header, actions, drag preview
│   ├── hooks/
│   │   ├── useKanbanOrchestrator.ts   # Facade: wiring de todos os hooks abaixo
│   │   ├── useKanbanFilters.ts        # Busca, origem, período, tipo entrega
│   │   ├── useKanbanDataQueries.ts    # React Query (vendas unificadas / delivery)
│   │   ├── useKanbanVendasPorColuna.ts
│   │   ├── useKanbanPreTransicao.ts   # Validações antes de mover card
│   │   ├── useKanbanDragDrop.ts
│   │   ├── useKanbanModais.ts         # Estado dos modais (criar / ver / editar produtos)
│   │   ├── useKanbanEntregadorSync.ts
│   │   ├── useKanbanPinning.ts
│   │   ├── useFiscalEmissaoKanban.ts
│   │   └── useFiscalReativacaoRejeitada.ts
│   ├── rules/                         # vendasKanban.rules.ts, vendasKanban.storage.ts
│   └── utils/                         # kanbanColumnsConfig, cache, listagem, card display
├── pedidos/                           # NovoPedidoModal + wizard (+ useEdicaoProdutosDelivery)
├── delivery/                          # config cupom, painéis kanban entrega
└── fiscal/                            # EmitirNfeModal, badge, PDF retry
```

**Composição do `VendasKanban`:** `useKanbanOrchestrator()` retorna `toolbarProps`, `boardProps` e `modaisProps` para três renderers — sem lógica de negócio no componente raiz.

**DTO de venda no Kanban:** `VendaUnificadaDTO` em `kanban/hooks/useVendasUnificadas.ts` (alias `Venda` em `kanban/types.ts`).

---

## 3. Modos do quadro: Balcão vs Delivery

- **Toggle:** `KanbanModoVendasToggle` na toolbar (`modoKanbanVendas`: `'delivery' | 'balcao'`).
- **Persistência:** `localStorage` chave `jiffy-gestor-v2:kanban-modo-vendas` (padrão ao ler: **`delivery`**).
- **Filtro client-side** (`VendasKanban`):
  - `delivery` → `v.isPedidoEntregaGestor()`
  - `balcao` → `!v.isPedidoEntregaGestor()`

`isPedidoEntregaGestor()` = `tabelaOrigem === 'venda_gestor'` + `tipoVenda` ∈ `{ entrega, retirada }` + não cancelada.

**Novo Pedido:** `useKanbanModais.handleAbrirNovoPedido` define contexto e abre modal:

```ts
setNovoPedidoCriarContext({
  instanciaKey: Date.now(),
  tipoInicioPedido: modoKanbanVendas === 'delivery' ? 'entrega' : 'balcao',
})
setNovoPedidoModalOpen(true)
```

> **Nota:** `EscolhaTipoPedidoModal` (dois cards Balcão/Entrega) **não** é montado no Kanban. O tipo segue o modo do quadro.

---

## 4. Colunas do Kanban

Definição em `kanbanColumnsConfig.tsx` (via `useKanbanOrchestrator`):

| ID | Título | Uso principal |
|----|--------|----------------|
| `NOVOS_PEDIDOS` | Novos Pedidos | Triagem delivery (ABERTA, etapa operacional inicial) |
| `EM_PREPARO` | Em Preparo | Cozinha / preparação |
| `PRONTO_ENTREGA` | Pronto para entrega | Aguardando retirada/envio |
| `EM_ROTA` | Em Rota | A caminho |
| `FINALIZADAS` | Finalizadas | Venda finalizada (balcão) ou fim logística (delivery) |
| `PENDENTE_EMISSAO` | Pendente Emissão Fiscal | `solicitarEmissaoFiscal` + regras fiscais |
| `COM_NFE` | Com Nota Solicitada | Emitida / aguardando SEFAZ / em processo de emissão |

**Colunas exibidas por modo:**

- **Delivery:** todas **exceto** `PENDENTE_EMISSAO` (pendência fiscal aparece **dentro** de Finalizadas com estilo fiscal).
- **Balcão:** `FINALIZADAS`, `PENDENTE_EMISSAO`, `COM_NFE` (sem as 4 operacionais).

Constantes em `vendasKanban.rules.ts`:

- `COLUNAS_ENTREGA_OPERACIONAIS` — drag logístico
- `COLUNAS_KANBAN_DESTINO_PIN` — pin no topo após soltar: Finalizadas, Pendente, Com nota

---

## 5. Classificação de vendas nas colunas

Lógica central: `VendaUnificadaDTO.getEtapaKanban()` (`useVendasUnificadas.ts`).

**Ordem de prioridade (resumo):**

1. `temNFeEmitida()` → `COM_NFE`
2. `statusFiscal === 'REJEITADA'` → `PENDENTE_EMISSAO`
3. `PENDENTE` / `PENDENTE_AUTORIZACAO` → `COM_NFE` (aguardando SEFAZ)
4. `isPendenteEmissao()` → `PENDENTE_EMISSAO`
5. Se **pedido entrega gestor:** `statusEtapaOperacional` mapeado → `NOVOS_PEDIDOS` … `EM_ROTA` (ver mapa abaixo)
6. Se `dataFinalizacao` → `FINALIZADAS`
7. Senão → `ABERTA` (não usado como coluna direta no filtro; entrega ABERTA cai em operacional)

**Mapa etapa operacional (API → coluna):**

| API (exemplos) | Coluna |
|----------------|--------|
| `NOVOS_PEDIDOS`, `NOVO`, `RECEBIDO`, `PENDENTE_TRIAGEM`, `PENDENTE` | NOVOS_PEDIDOS |
| `EM_PREPARO`, `PREPARO`, `COZINHA` | EM_PREPARO |
| `PRONTO_ENTREGA`, `PRONTO` | PRONTO_ENTREGA |
| `EM_ROTA`, `ROTA` | EM_ROTA |
| `ENTREGUE`, `CONCLUIDO`, `FINALIZADO`, `FINALIZADA` | null → regras fiscais / Finalizadas |

**Exibição com override:** `useFiscalEmissaoKanban.getEtapaKanbanParaExibicao` — durante emitir/reemitir, card fica visualmente em `COM_NFE`.

**Modo Delivery + coluna Finalizadas:** inclui vendas com etapa `FINALIZADAS` **ou** `PENDENTE_EMISSAO` (fiscal dentro da mesma coluna física).

---

## 6. Filtros e dados

**Hook:** `useKanbanFilters`

| Filtro | Comportamento |
|--------|----------------|
| Busca (`q`) | Debounce 400ms → API (a busca vale para todo o dataset, não só páginas carregadas) |
| Data criação | Inicia com filtro implícito do dia atual, sem exibir período na toolbar; botão **Por datas** abre painel lateral com `FaturamentoRangeCalendar` (mesmo padrão do Dashboard) e passa a exibir o período selecionado |
| Data finalização | Botão **Por datas** abre painel lateral com `FaturamentoRangeCalendar` e envia `dataFinalizacaoInicio/Fim` |
| Origem | `''` \| `PDV` \| `GESTOR` (Delivery/Balcão é controlado pelo toggle do quadro, não pelo select de origem) |
| Fluxo do quadro | O modo Delivery/Balcão filtra no cliente (`filtrarVendasKanbanPorModo`) sobre as páginas já carregadas do React Query |

**Dados:** `useVendasUnificadasInfinite(params, { refetchIntervalMs: 60_000, refetchOnWindowFocus: true })` — primeira página de **50** vendas do dia atual; mais páginas ao rolar coluna (scroll load-more). Busca/filtros (`q`, data de criação, data de finalização e origem) vão na API e aplicam-se a **todo** o dataset. Polling a cada 60s e refetch ao focar a janela mantêm o quadro alinhado entre estações sem pré-carga silenciosa agressiva.

**Efeito colateral:** vendas `REJEITADA` com `solicitarEmissaoFiscal === false` são reativadas automaticamente via hook `useFiscalReativacaoRejeitada` (`useMarcarEmissaoFiscal` + toast informativo).

**Ordenação por coluna:** cada coluna possui select **Ordem** (`Data`, `Nº da venda`, `Cliente`) e botão de direção crescente/decrescente. O estado fica em memória na página e reinicia no reload; o pin do último card movido continua persistido em `localStorage`.

---

## 7. Drag and drop

**Biblioteca:** `@dnd-kit/core` — `PointerSensor` com `distance: 10` (evita conflito com scroll mobile).

### 7.1 Colunas operacionais (só delivery)

- Origem e destino devem ser pedido entrega gestor.
- Não permite voltar etapa arrastando.
- Avanço múltiplo: `acoesTransicaoEntregaAvanco` encadeia `iniciar_preparo` → `marcar_pronto` → `despachar`.
- Hook: `useEntregaTransicoesKanban` → `POST` transição gestor (`useTransicaoVendaGestor`).

### 7.2 Colunas fiscais (principalmente balcão)

| Destino | Ação |
|---------|------|
| `PENDENTE_EMISSAO` | `marcarEmissaoFiscal` se ainda não marcado |
| `FINALIZADAS` | Se entrega em `EM_ROTA` → `finalizar`; senão se tinha flag → `desmarcarEmissaoFiscal`. **REJEITADA** bloqueada com toast |
| `COM_NFE` | Só se card está em Pendente emissão → chama `handleEmitirNfe` |

### 7.3 Pin no topo

Ao soltar em Finalizadas / Pendente / Com nota, `venda.id` vai para `primeiroPorColuna` (localStorage).

---

## 8. Fluxo fiscal (NFe/NFCe)

**Hook:** `useFiscalEmissaoKanban`

- Emite via `useEmitirNfe` (PDV) ou `useEmitirNfeGestor` conforme `tabelaOrigem`.
- Reemite via `useReemitirNfe` / `useReemitirNfeGestor`.
- Abre `EmitirNfeModal` com cliente da venda quando necessário.
- Card: botão Emitir/Reemitir, badge `StatusFiscalBadge`, PDF quando emitida.

**Regras auxiliares:** `deveExibirBotaoEmitirNotaNoKanban`, `vendaBloqueadaParaEmissaoInterativa` em `vendasKanban.rules.ts`.

---

## 9. Abrir Novo Pedido (integração Kanban → modal)

Estado e handlers ficam em `useKanbanModais`; renderização em `KanbanModaisRenderer`.

### 9.1 Criar pedido

| Estado | Função |
|--------|--------|
| `novoPedidoModalOpen` | Controla painel |
| `novoPedidoCriarContext` | `{ instanciaKey, tipoInicioPedido }` — `key` no `NovoPedidoModal` remonta estado limpo |

**Montagem condicional** (só monta quando há contexto):

```tsx
{novoPedidoCriarContext && (
  <NovoPedidoModal
    key={novoPedidoCriarContext.instanciaKey}
    open={novoPedidoModalOpen}
    tipoInicioPedido={novoPedidoCriarContext.tipoInicioPedido}
    onClose={…}
    onSuccess={…}
  />
)}
```

### 9.2 Ver detalhes e editar produtos

O Kanban usa **até três instâncias** de `NovoPedidoModal` (criar / visualização / edição de produtos), cada uma montada só quando o contexto correspondente existe — evita custo de modal fechado no bundle inicial da árvore.

| Contexto | Handler | Props distintivas |
|----------|---------|-------------------|
| Criar | `handleAbrirNovoPedido` | `tipoInicioPedido` conforme modo do quadro |
| Visualizar | `handleViewDetails` / `abrirDetalhesPagamentoPedido` | `modoVisualizacao={true}`, `vendaId`, `abaDetalhesInicial` opcional |
| Editar produtos | `handleEditarProdutos` | `modoEdicaoProdutos={true}`, `tipoInicioPedido="entrega"` |

---

## 10. NovoPedidoModal — wizard em 4 passos

**UI:** painel lateral (`JiffyPainelSlide` / `PainelPedidoBackdrop`), não dialog central.

| Passo | Balcão (`tipoInicioPedido='balcao'`) | Entrega (`tipoInicioPedido='entrega'`) |
|-------|--------------------------------------|----------------------------------------|
| **1** | Informações | **Produtos** |
| **2** | Produtos | **Informações** |
| **3** | Pagamento | Pagamento |
| **4** | Detalhes / confirmação | Detalhes / confirmação |

**Validação resumida:**

- Balcão step 1 → sempre pode avançar (informações).
- Entrega step 1 → precisa ≥ 1 produto.
- Balcão step 2 → precisa ≥ 1 produto.
- Entrega step 2 → cliente + (endereço + entregador se entrega com morada) via `validarInformacoesPedido`.
- Step 3 → regras de pagamento conforme `status` e fluxo entrega (ver seção 11).

**Criação:** `useCreateVendaGestor` → API gestor; após sucesso, balcão pode disparar impressão fiscal conforme status.

**Reset:** `resetForm` no `onExited` do painel (não no meio da animação de fechar).

---

## 11. Balcão vs Entrega no modal

### 11.1 Status inicial da venda

```ts
function statusPadraoNovoPedido(tipoInicio: 'balcao' | 'entrega') {
  return tipoInicio === 'entrega' ? 'ABERTA' : 'FINALIZADA'
}
```

| Tipo | `statusVenda` padrão | Aparece no Kanban (modo delivery) |
|------|----------------------|-----------------------------------|
| Entrega | `ABERTA` | `NOVOS_PEDIDOS` (triagem) |
| Balcão | `FINALIZADA` | Modo balcão → coluna Finalizadas |

Operador pode alterar status no passo Informações (balcão) ou conforme fluxo entrega.

### 11.2 Payload (`tipoVenda` e extras)

- **Balcão:** `tipoVenda: 'balcao'`, cliente via `SeletorClienteModal` (`clienteId`).
- **Entrega:** `tipoVenda: 'entrega'`, `tipoAtendimento` / `modalidadeEntrega` (`entrega` \| `retirada`), `tempoPrevistoMinutos`, taxa/entregador, `enderecoEntrega`, cliente via `EntregaClienteSelector` (`clienteEntregaVinculado`).

`solicitarEmissaoFiscal: true` apenas se `status === 'PENDENTE_EMISSAO'`.

### 11.3 Pagamento no delivery

- `fluxoPagamentoEntrega`: `'cobrar_entregador'` \| `'ja_pago'`.
- Pedido **ABERTA** + cobrar no entregador: pagamentos podem ser `naoEfetivo` / `cobrarNaEntrega`.
- **Retirada:** `tipoAtendimentoDelivery === 'retirada'` → sem endereço/entregador obrigatório (`pedidoComEntrega` false).

### 11.4 Componentes específicos entrega

- `EntregaClienteSelector` — busca por telefone (automática ao completar 11 dígitos ou ao sair do campo), moradas, criar cliente rápido; overlay de carregamento durante a consulta.
- Lista entregadores: `GET /api/usuarios-pdv/entregadores`.
- Taxas tipo `entrega`: `useTaxasInfinite` filtrado.
- Último entregador: `localStorage` `jiffy:delivery:last-entregador-id`.

---

## 12. Visualização / edição de pedido existente

### 12.1 Ver detalhes

**Abertura:** clique no card → `handleViewDetails` → `NovoPedidoModal` de visualização:

| Prop | Valor |
|------|--------|
| `vendaId` | id da venda |
| `tabelaOrigemVenda` | `venda` \| `venda_gestor` |
| `statusFiscalUnificado` | do listagem (PDV pode não repetir no GET detalhe) |
| `modoVisualizacao` | `true` → abre no **passo 4** |
| `abaDetalhesInicial` | opcional (`'pagamentos'` ao confirmar cobrança na coluna Em Rota) |
| `onAfterClose` | limpa `pedidoVisualizacaoContext` após animação |

Passo 4: abas **Informações do pedido** e **Nota fiscal** (se aplicável).

### 12.2 Editar produtos (delivery)

**Abertura:** ícone lápis ao lado do código do pedido (`#IUMBJYFY`) no `KanbanVendaCardHeader` → `handleEditarProdutos`.

| Regra | Detalhe |
|-------|---------|
| Modo | Apenas **Delivery** + pedido entrega gestor |
| Colunas permitidas | `NOVOS_PEDIDOS`, `EM_PREPARO`, `PRONTO_ENTREGA` (`podeEditarProdutosNaKanbanCard` em `vendasKanban.rules.ts`) |
| Modal | `NovoPedidoModal` com `modoEdicaoProdutos={true}` — foco no passo de produtos |
| Persistência | `useEdicaoProdutosDelivery` + `montarDiffProdutosPedidoDelivery` → PATCH add/remove (`AtualizarProdutosPedidoDeliveryUseCase`) |
| Item existente | `ProdutoSelecionado.produtoLancadoId` mapeado em `VendaDetalheProdutosMapper` (necessário para `remove`) |

> **Removido do card:** edição de cliente via `ClientesTabsModal` ao lado do nome. Cliente continua editável dentro do `NovoPedidoModal` (visualização / fluxo de pedido), não por ícone separado no card.

---

## 13. Delivery: transições, impressão e configurações

### 13.1 Transições API (`AcaoTransicaoGestor`)

| Ação | Efeito típico |
|------|----------------|
| `iniciar_preparo` | Novos → Em preparo |
| `marcar_pronto` | Em preparo → Pronto |
| `despachar` | Pronto → Em rota |
| `finalizar` | Em rota → entregue / finalizada |

Botão **Avançar etapa** no card (`KanbanVendaCard`) e drag entre colunas operacionais.

### 13.2 Impressão

**Hook:** `useImpressaoDelivery` — após transição bem-sucedida, `processarAposTransicoes` busca tickets e imprime conforme `parametroEmpresa` (modo impressão delivery).

**Reimpressão:** botão no card (modo delivery) → `reimprimirCupomEntrega`.

### 13.3 Configurações

**Modal:** `DeliveryConfiguracoesModal` (ícone na toolbar, modo delivery).

- Estação de impressão (criar/listar/mapear impressoras lógicas).
- Preferências: `parsePreferenciasImpressaoDelivery` em `GET /api/empresas/me`.
- Template cupom: editor + storage local `deliveryCupomTemplateStorage`.

---

## 14. Modais e componentes auxiliares

Renderizados por `KanbanModaisRenderer` (salvo modais internos ao `NovoPedidoModal`):

| Componente | Quando abre |
|------------|-------------|
| `NovoPedidoModal` (criar) | Botão Novo Pedido na toolbar |
| `NovoPedidoModal` (visualização) | Clique no card / confirmar cobrança |
| `NovoPedidoModal` (edição produtos) | Lápis no código do pedido no card (delivery) |
| `EmitirNfeModal` | Emitir nota a partir do card |
| `DeliveryConfiguracoesModal` | Config delivery na toolbar |
| `JiffySidePanelModal` + `FaturamentoRangeCalendar` | Período personalizado nos filtros |
| `EscolhaTipoPedidoModal` | **Não** acoplado ao Kanban atual |
| `SeletorClienteModal` | Dentro do NovoPedido (balcão) |
| `EntregaClienteSelector` | Dentro do NovoPedido (entrega) |
| `ModalLancamentoProdutoPainel` | Lançar produto com complementos |
| `PainelEdicaoProdutoLinhaPedido` | Editar linha do pedido |
| `ProdutosTabsModal` | Cadastro rápido de produto |

---

## 15. APIs e hooks principais

| Hook / endpoint | Uso |
|-----------------|-----|
| `useKanbanOrchestrator` | Facade do quadro (toolbar + board + modais) |
| `useKanbanModais` | Estado/handlers dos modais do Kanban |
| `useKanbanFilters` | Filtros da toolbar (busca, origem, período, tipo entrega) |
| `useKanbanDataQueries` | Queries React Query + params unificados |
| `useKanbanVendasPorColuna` | Agrupa e ordena vendas por coluna |
| `useKanbanPreTransicao` / `useKanbanDragDrop` | Validação e DnD |
| `useFiscalReativacaoRejeitada` | Reativação automática de notas REJEITADAS |
| `useVendasUnificadasInfinite` | `GET` vendas unificadas (filtros + infinite scroll) |
| `useMarcarEmissaoFiscal` / `useDesmarcarEmissaoFiscal` | Flag solicitar emissão |
| `useEmitirNfe`, `useEmitirNfeGestor` | Emissão |
| `useReemitirNfe`, `useReemitirNfeGestor` | Reemissão |
| `useTransicaoPedidoDelivery` / `useEntregaTransicoesKanban` | Etapas delivery |
| `useEdicaoProdutosDelivery` | Salvar diff de produtos no modal de edição |
| `useCreateVendaGestor` | Criar pedido no modal |
| `useImpressaoDelivery` | Tickets pós-transição |
| `useEmpresaMe` | Nome, prefs impressão, template |
| `useKanbanColumnScrollLoadMore` | Scroll próximo ao fim da coluna → `fetchNextPage()` |

**BFF gestor (exemplos):** rotas em `app/api/vendas/...` — ver hooks em `useVendas.ts`.

---

## 16. Persistência local (localStorage)

| Chave | Conteúdo |
|-------|----------|
| `jiffy-gestor-v2:kanban-modo-vendas` | `delivery` \| `balcao` |
| `jiffy-gestor-v2:kanban-primeiro-por-coluna` | `{ [colunaId]: vendaId }` pin |
| `jiffy:delivery:last-entregador-id` | Último entregador no modal |
| `deliveryCupomTemplateStorage` | Template cupom (infra) |
| `estacaoImpressaoStorage` | ID estação impressão |

---

## 17. Pontos de atenção / débitos conhecidos

- [ ] `EscolhaTipoPedidoModal` existe mas o Kanban **não** pergunta Balcão/Entrega — tipo vem do toggle Delivery/Balcão.
- [x] Refatoração Fase 1+2: `VendasKanban` composição pura + `useKanbanOrchestrator` + `KanbanModaisRenderer` (2026-06).
- [x] Modais `NovoPedidoModal` montados condicionalmente por contexto (criar / ver / editar produtos).
- [x] `novo-pedido/` migrado para `features/pedidos/` (ver `PEDIDOS_FEATURES_REORGANIZACAO.md`).
- [ ] Modo delivery esconde coluna Pendente emissão mas vendas fiscais pendentes aparecem em Finalizadas (estilo amarelo via `getCardBorderEFundoKanban`).
- [x] Removidos na Fase 0: `NFeKanban*.disabled`, `NFeKanbanSimple`, `DroppableColumn` (legado).
- [x] Removido do card: `ClientesTabsModal` para editar cliente ao lado do nome.

---

## 18. Changelog deste documento

| Data | Alteração |
|------|-----------|
| 2026-06-30 | Doc sincronizada: orchestrator, 3× NovoPedidoModal, edição de produtos no card, `useKanbanFilters`, remoção ClientesTabsModal do card |
| 2026-06-30 | Padronização de nomes: `VendasKanban`, `KanbanToolbar`, `KanbanVendaCard`, `KanbanColuna`, `vendasKanban.rules` |
| 2026-06-15 | Fase 0 reorganização: doc `PEDIDOS_FEATURES_REORGANIZACAO.md`, estrutura alvo §2, remoção kanban legado |
| 2026-05-27 | Fase 3 listagem: snapshot visual removido; filtro por modo derivado do React Query; paginação só por scroll; polling 60s + refetch ao focar janela |
| 2026-05-25 | Atualização pós-migração para `app/(erp)`: rota canônica, filtros atuais (Data criação e Data finalização por calendário personalizado, sem Status fiscal), ordenação por coluna, snapshot visual por Delivery/Balcão e carregamento incremental por scroll |
| 2026-05-18 | Documento inicial: mapeamento VendasKanban + NovoPedido (balcão/entrega) + kanban/ + hooks |

---

### Como manter este arquivo

1. Ao mudar colunas, drag ou `getEtapaKanban`, atualize §4–§7 e §5.
2. Ao mudar passos do modal, edição de produtos ou payload de criação, atualize §9–§12.
3. Ao ligar/desligar `EscolhaTipoPedidoModal` no Kanban, atualize §3 e §9.
4. Registre mudanças na tabela §18.
