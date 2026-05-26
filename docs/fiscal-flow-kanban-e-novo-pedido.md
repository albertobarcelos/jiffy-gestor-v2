# Quadro fiscal (Kanban) e fluxo de Novo Pedido

> **Documento vivo** — descreve o comportamento atual do código. Ao alterar `FiscalFlowKanban`, `NovoPedidoModal` ou módulos em `./kanban/`, atualize as seções afetadas e a data no rodapé.

**Última revisão:** 2026-05-25  
**Rota:** `/pedidos-clientes` → `app/(erp)/pedidos-clientes/page.tsx`  
**Componente raiz:** `src/presentation/components/features/nfe/FiscalFlowKanban.tsx`

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
- Configurar impressão delivery (estação, template de cupom, preferências).

---

## 2. Arquitetura de arquivos

```
app/(erp)/pedidos-clientes/page.tsx    # dynamic import do Kanban (ssr: false)
src/presentation/components/features/nfe/
├── FiscalFlowKanban.tsx               # Orquestrador principal
├── NovoPedidoModal.tsx                # Wizard criar/editar/visualizar pedido (~5.8k linhas)
├── EmitirNfeModal.tsx                 # Emissão com dados do cliente
├── EscolhaTipoPedidoModal.tsx         # UI Balcão/Entrega (existe; não usado pelo Kanban hoje)
├── DeliveryConfiguracoesModal.tsx     # Estação + template cupom + prefs impressão
├── EntregaClienteSelector.tsx         # Telefone → cliente/morada (fluxo entrega)
├── KanbanModoVendasToggle.tsx         # Segmento Delivery | Balcão
└── kanban/
    ├── types.ts                       # Venda, ColunaKanbanId, filtros
    ├── fiscalFlowKanban.rules.ts      # Regras colunas, drag, estilos card, ordenação
    ├── fiscalFlowKanban.storage.ts    # localStorage modo + pin por coluna
    ├── useFiscalKanbanFilters.ts      # Busca, data de criação personalizada, data de finalização e origem
    ├── useKanbanPinning.ts            # Card fixado no topo após drag
    ├── useKanbanColumnScrollLoadMore.ts # Scroll por coluna dispara carregamento incremental
    ├── useEntregaTransicoesKanban.ts  # Avançar etapa / drag entrega
    ├── useFiscalEmissaoKanban.ts      # Emitir/reemitir + etapa “fantasma” COM_NFE
    ├── FiscalKanbanToolbar.tsx
    ├── FiscalKanbanColumn.tsx
    ├── FiscalKanbanVendaCard.tsx
    ├── DraggableVendaCard.tsx
    └── VendaCardDragPreview.tsx
```

**DTO de venda no Kanban:** `VendaUnificadaDTO` em `useVendasUnificadas.ts` (alias `Venda` em `kanban/types.ts`).

---

## 3. Modos do quadro: Balcão vs Delivery

- **Toggle:** `KanbanModoVendasToggle` na toolbar (`modoKanbanVendas`: `'delivery' | 'balcao'`).
- **Persistência:** `localStorage` chave `jiffy-gestor-v2:kanban-modo-vendas` (padrão ao ler: **`delivery`**).
- **Filtro client-side** (`FiscalFlowKanban`):
  - `delivery` → `v.isPedidoEntregaGestor()`
  - `balcao` → `!v.isPedidoEntregaGestor()`

`isPedidoEntregaGestor()` = `tabelaOrigem === 'venda_gestor'` + `tipoVenda` ∈ `{ entrega, retirada }` + não cancelada.

**Novo Pedido:** `handleAbrirNovoPedido` define:

```ts
setTipoPedidoEscolhido(modoKanbanVendas === 'delivery' ? 'entrega' : 'balcao')
setNovoPedidoInstanciaKey(k => k + 1)  // remonta modal = estado limpo
setNovoPedidoModalOpen(true)
```

> **Nota:** `EscolhaTipoPedidoModal` (dois cards Balcão/Entrega) **não** é montado em `FiscalFlowKanban`. O tipo segue o modo do quadro. O modal de escolha pode ser reutilizado em outro lugar ou ficou legado.

---

## 4. Colunas do Kanban

Definição em `getColumns()` dentro de `FiscalFlowKanban.tsx`:

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

Constantes em `fiscalFlowKanban.rules.ts`:

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

**Hook:** `useFiscalKanbanFilters`

| Filtro | Comportamento |
|--------|----------------|
| Busca (`q`) | Debounce 400ms → API (a busca vale para todo o dataset, não só páginas carregadas) |
| Data criação | Inicia com filtro implícito do dia atual, sem exibir período na toolbar; botão **Por datas** abre painel lateral com `FaturamentoRangeCalendar` (mesmo padrão do Dashboard) e passa a exibir o período selecionado |
| Data finalização | Botão **Por datas** abre painel lateral com `FaturamentoRangeCalendar` e envia `dataFinalizacaoInicio/Fim` |
| Origem | `''` \| `PDV` \| `GESTOR` (Delivery/Balcão é controlado pelo toggle do quadro, não pelo select de origem) |
| Fluxo do quadro | O modo Delivery/Balcão é separado no cliente e mantém um snapshot visual por modo para evitar flicker durante paginação automática |

**Dados:** `useVendasUnificadasInfinite(params)` — primeira página de **50** vendas do dia atual; mais páginas ao rolar coluna ou pré-carga silenciosa em segundo plano. Busca/filtros (`q`, data de criação, data de finalização e origem) vão na API e aplicam-se a **todo** o dataset. O modo ativo renderiza um snapshot próprio; páginas carregadas automaticamente em segundo plano não alteram as colunas visíveis até troca de modo/filtro ou carregamento manual por scroll.

**Efeito colateral:** vendas `REJEITADA` com `solicitarEmissaoFiscal === false` são reativadas automaticamente via `useMarcarEmissaoFiscal` (toast informativo).

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

**Regras auxiliares:** `deveExibirBotaoEmitirNotaNoKanban`, `vendaBloqueadaParaEmissaoInterativa` em `fiscalFlowKanban.rules.ts`.

---

## 9. Abrir Novo Pedido (integração Kanban → modal)

| Estado | Função |
|--------|--------|
| `novoPedidoModalOpen` | Controla painel |
| `novoPedidoInstanciaKey` | `key` no `NovoPedidoModal` — nova instância a cada clique em Novo Pedido |
| `tipoPedidoEscolhido` | `'balcao' \| 'entrega'` → prop `tipoInicioPedido` |

**Props passadas:**

```tsx
<NovoPedidoModal
  key={novoPedidoInstanciaKey}
  open={novoPedidoModalOpen}
  tipoInicioPedido={tipoPedidoEscolhido}
  onClose={() => setNovoPedidoModalOpen(false)}
  onSuccess={() => { setNovoPedidoModalOpen(false); refetch() }}
/>
```

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

- `EntregaClienteSelector` — busca por telefone, moradas, criar cliente rápido.
- Lista entregadores: `GET /api/usuarios-pdv/entregadores`.
- Taxas tipo `entrega`: `useTaxasInfinite` filtrado.
- Último entregador: `localStorage` `jiffy:delivery:last-entregador-id`.

---

## 12. Visualização / edição de pedido existente

**Abertura:** clique no card → `handleViewDetails` → segundo `NovoPedidoModal`:

| Prop | Valor |
|------|--------|
| `vendaId` | id da venda |
| `tabelaOrigemVenda` | `venda` \| `venda_gestor` |
| `statusFiscalUnificado` | do listagem (PDV pode não repetir no GET detalhe) |
| `modoVisualizacao` | `true` → abre no **passo 4** |
| `onAfterClose` | limpa `pedidoVisualizacaoContext` após animação |

Passo 4: abas **Informações do pedido** e **Nota fiscal** (se aplicável).

**Edição cliente no card:** ícone lápis → `ClientesTabsModal` (mesmo de Cadastros).

---

## 13. Delivery: transições, impressão e configurações

### 13.1 Transições API (`AcaoTransicaoGestor`)

| Ação | Efeito típico |
|------|----------------|
| `iniciar_preparo` | Novos → Em preparo |
| `marcar_pronto` | Em preparo → Pronto |
| `despachar` | Pronto → Em rota |
| `finalizar` | Em rota → entregue / finalizada |

Botão **Avançar etapa** no card (`FiscalKanbanVendaCard`) e drag entre colunas operacionais.

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

| Componente | Quando abre |
|------------|-------------|
| `NovoPedidoModal` | Novo pedido / ver detalhes |
| `EmitirNfeModal` | Emitir nota a partir do card |
| `DeliveryConfiguracoesModal` | Config delivery na toolbar |
| `EscolheDatasModal` | Período personalizado nos filtros |
| `ClientesTabsModal` | Editar cliente pelo card |
| `EscolhaTipoPedidoModal` | **Não** acoplado ao Kanban atual |
| `SeletorClienteModal` | Dentro do NovoPedido (balcão) |
| `ModalLancamentoProdutoPainel` | Lançar produto com complementos |
| `PainelEdicaoProdutoLinhaPedido` | Editar linha do pedido |
| `ProdutosTabsModal` | Cadastro rápido de produto |

---

## 15. APIs e hooks principais

| Hook / endpoint | Uso |
|-----------------|-----|
| `useVendasUnificadas` | `GET` vendas unificadas (filtros) |
| `useMarcarEmissaoFiscal` / `useDesmarcarEmissaoFiscal` | Flag solicitar emissão |
| `useEmitirNfe`, `useEmitirNfeGestor` | Emissão |
| `useReemitirNfe`, `useReemitirNfeGestor` | Reemissão |
| `useTransicaoVendaGestor` | Etapas delivery |
| `useCreateVendaGestor` | Criar pedido no modal |
| `useFinalzarVendaGestor` | Finalizar gestor |
| `useImpressaoDelivery` | Tickets pós-transição |
| `useEmpresaMe` | Nome, prefs impressão, template |
| `useKanbanColumnScrollLoadMore` | Detecta scroll próximo ao fim da coluna e chama `fetchNextPage()` |

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
- [ ] `getVendasDeliveryPorStatus` em `FiscalFlowKanban` está **comentado/vazio** (legado iFood?).
- [ ] `NovoPedidoModal` é muito grande (~5.9k linhas) — candidato a refatoração por passos/hooks.
- [ ] Modo delivery esconde coluna Pendente emissão mas vendas fiscais pendentes aparecem em Finalizadas (estilo amarelo via `getCardBorderEFundoKanban`).
- [ ] Documentação de otimização anterior: `docs/PLANO_OTIMIZACAO_PEDIDOS_CLIENTES_FRONTEND.md` (lazy mount do modal).

---

## 18. Changelog deste documento

| Data | Alteração |
|------|-----------|
| 2026-05-25 | Atualização pós-migração para `app/(erp)`: rota canônica, filtros atuais (Data criação e Data finalização por calendário personalizado, sem Status fiscal), ordenação por coluna, snapshot visual por Delivery/Balcão e carregamento incremental por scroll |
| 2026-05-18 | Documento inicial: mapeamento FiscalFlowKanban + NovoPedido (balcão/entrega) + kanban/ + hooks |

---

### Como manter este arquivo

1. Ao mudar colunas, drag ou `getEtapaKanban`, atualize §4–§7 e §5.
2. Ao mudar passos do modal ou payload de criação, atualize §10–§11.
3. Ao ligar/desligar `EscolhaTipoPedidoModal` no Kanban, atualize §3 e §9.
4. Registre mudanças na tabela §18.
