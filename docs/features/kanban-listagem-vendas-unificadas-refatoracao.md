# Refatoração da listagem do Kanban (vendas unificadas)

> **Documento de planejamento** — descreve o problema atual, a solução proposta e o que cada time deve fazer.  
> **Última revisão:** 2026-07-01  
> **Relacionado:** [`docs/vendas-kanban-e-novo-pedido.md`](../vendas-kanban-e-novo-pedido.md)

---

## Índice

1. [Contexto](#1-contexto)
2. [Como funciona hoje (balcão)](#2-como-funciona-hoje-balcão)
3. [Referência: Kanban Delivery (modelo alvo)](#3-referência-kanban-delivery-modelo-alvo)
4. [Por que isso é um problema](#4-por-que-isso-é-um-problema)
5. [Paliativos atuais no frontend (jul/2026)](#5-paliativos-atuais-no-frontend-jul2026)
6. [Objetivo da refatoração](#6-objetivo-da-refatoração)
7. [O que o backend já oferece hoje](#7-o-que-o-backend-já-oferece-hoje)
8. [O que precisa ser construído (visão técnica)](#8-o-que-precisa-ser-construído-visão-técnica)
9. [Regras de negócio: em qual coluna cada venda cai](#9-regras-de-negócio-em-qual-coluna-cada-venda-cai)
10. [Contrato de API sugerido](#10-contrato-de-api-sugerido)
11. [Plano de implementação em fases](#11-plano-de-implementação-em-fases)
12. [O que o frontend fará depois](#12-o-que-o-frontend-fará-depois)
13. [Otimizações frontend enquanto o backend não entrega](#13-otimizações-frontend-enquanto-o-backend-não-entrega)
14. [Critérios de aceite](#14-critérios-de-aceite)
15. [Resumo para repassar ao time de backend](#15-resumo-para-repassar-ao-time-de-backend)

---

## 1. Contexto

A tela **Pedidos de Clientes** (`VendasKanban`) no modo **Balcão** exibe três colunas fiscais:

| Coluna | ID interno |
|--------|------------|
| Finalizadas | `FINALIZADAS` |
| Pendente Emissão Fiscal | `PENDENTE_EMISSAO` |
| Com Nota Solicitada | `COM_NFE` |

Os dados vêm do endpoint **vendas unificadas** (`GET /api/vendas/unificado` no gestor, proxy do `GET /api/v1/.../vendas/unificado` no backend Jiffy).

Hoje o gestor busca uma **lista única paginada** (50 itens por vez) e o **frontend** decide em qual coluna cada pedido aparece. Isso funcionou em volumes pequenos, mas escala mal e já causou bugs de listagem vazia, contagem errada e lentidão percebida.

---

## 2. Como funciona hoje (balcão)

### Fluxo resumido

```
[Filtros: período, origem, busca, terminal]
        ↓
GET /vendas/unificado?offset=0&limit=50&periodoInicial=...&dataFinalizacaoInicio=...&...
        ↓
Lista mista (todos os status juntos)
        ↓
Auto-prefetch em cadeia: até 50 páginas (≈ 2.500 itens) em background
        ↓
Frontend: achata páginas, remove pedidos delivery operacional (filtrarVendasKanbanPorModo)
        ↓
Frontend: getEtapaKanban() em cada item → filtra por coluna (7 passes)
        ↓
Frontend: filtrarVendaDeliveryKanbanColunaPorDatasToolbar (fallback client-side por coluna)
        ↓
Renderiza cards + contagem = itens já carregados e classificados na coluna
        ↓
Scroll no fim de qualquer coluna → busca mais 50 na lista global (mesma query)
        ↓
Polling: refetch total a cada 60s + refetch ao focar aba
        ↓
useFiscalReativacaoRejeitada: PATCH silencioso em série para REJEITADAS sem solicitarEmissaoFiscal
```

### Detalhes importantes

- **Não carrega o período inteiro de uma vez** — exceto pelo auto-prefetch, que tenta buscar até `KANBAN_BALCAO_MAX_PAGINAS_AUTO` (50) páginas sequencialmente.
- **A API não sabe de colunas do Kanban.** Não existe parâmetro `colunaKanban=COM_NFE`.
- **A classificação** está duplicada no frontend (`VendaUnificadaDTO.getEtapaKanban()` em `useVendasUnificadas.ts`).
- **Cabeçalho da coluna** mostra quantos itens daquela coluna já foram carregados e classificados — **não** o total real do período na API.
- **Filtro de período** envia criação **e** finalização com o **mesmo intervalo** (`useKanbanFilters.ts`). Pode reduzir resultados se o backend aplicar AND entre os dois.
- **Filtro de terminal** exige 2ª query (`GET /api/vendas?terminalId=...`) e cruzamento de IDs no browser (`useVendaIdsPdvPorTerminal`).
- **Modo Delivery** usa arquitetura diferente (seção 3) — é o **modelo alvo** para o balcão após a API evoluir.

### Histórico de paliativos (jun/2026)

| Data | Mudança | Motivo |
|------|---------|--------|
| Jun/2026 | Tentativa de paginar 10 em 10 por coluna no scroll | Colunas quase vazias — revertido |
| Jun/2026 | Volta para página de 50 + exibir todos os cards carregados | Paliativo parcial |
| Jun/2026 | Correção de filtros (`keepPreviousData`, datas por coluna no client) | Filtros não aplicavam |
| Jul/2026 | Auto-prefetch até 50 páginas + indicador "X de Y carregadas" | Listagem incompleta (~50 cards) |
| Jul/2026 | Barra de reemissão em lote no rodapé da coluna | UX |

Nenhum desses paliativos resolve a causa raiz: **listagem global sem filtro por coluna**.

---

## 3. Referência: Kanban Delivery (modelo alvo)

O Kanban **Delivery** já funciona bem e deve ser o **padrão arquitetural** para o balcão após a API evoluir.

| Aspecto | Delivery (hoje) | Balcão (hoje) |
|---------|-----------------|---------------|
| API | `GET /api/v1/delivery/pedidos` | `GET /api/v1/vendas/unificado` |
| Queries | **6 streams paralelas** (1 por coluna) | **1 stream global** |
| Filtro server-side | `statusDelivery=PENDENTE`, `EM_PREPARO`, etc. | ❌ Não existe equivalente |
| Page size inicial | 15 itens/coluna | 50 itens (lista mista) |
| Contagem no header | `pages[0].count` da query **da coluna** | Length dos itens já classificados no browser |
| Delta poll | `dataUltimaModificacaoInicial` (~30s) | Refetch total (~60s) |
| Endpoint de contagem dedicado | **Não usa** (documentado no DTO mas não ligado) | N/A |

### Como o Delivery obtém contagens (sem endpoint separado)

Cada coluna faz sua query paginada. A primeira página já traz `count` (total daquele filtro):

```typescript
// usePedidosDeliveryKanbanColumns.ts
const apiCount = query.data?.pages?.[0]?.count ?? totalCount
```

**Conclusão:** o balcão **não precisa** de endpoint de contagem dedicado se `GET /vendas/unificado?colunaKanban=...` retornar `count`/`hasNext` corretos por coluna — igual ao delivery.

---

## 4. Por que isso é um problema

| Problema | Efeito para o usuário |
|----------|------------------------|
| Paginação global em lista heterogênea | Primeiros 50 pedidos podem ser quase todos "Finalizadas"; "Com nota" fica vazia até carregar muitas páginas |
| Auto-prefetch em cadeia (até 50 páginas) | Dezenas de requests sequenciais; tela lenta na abertura |
| Regra de coluna no frontend | Mudanças fiscais precisam ser feitas em front e back separadamente |
| Contagem ≠ realidade | Cabeçalho mostra números que não batem com o total do período |
| Processamento pesado no browser | Classificar milhares de itens a cada página/poll |
| PATCH em massa (reativação REJEITADA) | Centenas de requests extras após carregar lista |
| Filtro terminal com 2 APIs | Lentidão e complexidade desnecessária |
| Polling destrutivo | Refetch total a cada 60s com centenas de itens já paginados |

**Conclusão:** o Kanban balcão precisa de contrato de API **orientado a colunas**, com **regra de negócio centralizada no backend** — espelhando o que o delivery já faz com `statusDelivery`.

---

## 5. Paliativos atuais no frontend (jul/2026)

Arquivos principais:

| Paliativo | Arquivo | Observação |
|-----------|---------|------------|
| Auto-prefetch até 50 páginas | `useKanbanDataQueries.ts`, `kanbanVendasListagem.ts` | Remove quando houver query por coluna |
| Ignorar `keepPreviousData` ao filtrar | `useKanbanDataQueries.ts` | Corrige UX de filtros |
| Filtro de data client-side por coluna | `useKanbanVendasPorColuna.ts`, `kanbanVendasListagem.ts` | Fallback; API deveria filtrar |
| Reativação automática REJEITADA | `useFiscalReativacaoRejeitada.ts` | PATCH em série no load |
| Cruzamento terminal + unificado | `useVendaIdsPdvPorTerminal.ts` | Aguarda `terminalId` no unificado |
| Indicador "X de Y carregadas" | `KanbanBoardRenderer.tsx` | UX enquanto prefetch roda |

Estes paliativos devem ser **removidos** após Fase 3 (frontend consumindo API por coluna).

---

## 6. Objetivo da refatoração

1. **Uma única fonte da verdade** para "em qual coluna do Kanban balcão esta venda aparece".
2. **Listagem e paginação por coluna** — não lista global mista.
3. **Contagem total por coluna** via `count` da paginação filtrada (como delivery).
4. **Menos trabalho no frontend:** renderizar, ordenar na UI e ações (emitir, reemitir); não reimplementar regras fiscais.
5. **Delta poll** por `dataUltimaModificacaoInicial` — substituir refetch total.

---

## 7. O que o backend já oferece hoje

Com base no módulo `vendas-unificadas` do jiffy-backend:

| Recurso | Situação |
|---------|----------|
| `GET` paginado (`offset`, `limit`, `count`, `hasNext`) | ✅ Existe |
| Filtros: `origem`, `periodoInicial`, `periodoFinal`, `dataFinalizacaoInicio/Fim`, `q` | ✅ Existe |
| Filtro `statusFiscal` (valor único, ex.: `EMITIDA`, `REJEITADA`) | ✅ Existe |
| Campos `codigoRetorno`, `retornoSefaz` no DTO / view | ✅ Existe (garantir em todos os ambientes) |
| Campo `etapaKanbanBalcao` ou filtro `colunaKanban` | ❌ Não existe |
| Filtro `escopoKanban=balcao` (excluir delivery operacional) | ❌ Não explícito |
| Filtro `terminalId` no unificado | ❌ Não existe (front cruza com `/api/vendas`) |
| Delta poll `dataUltimaModificacaoInicial` | ❌ Não existe no unificado |
| Regra composta "coluna COM_NFE" (vários status fiscais) | ❌ Só com múltiplas chamadas no cliente |

A ordenação atual no repositório é `dataCriacao desc` para todas as consultas.

---

## 8. O que precisa ser construído (visão técnica)

### 8.1. Domínio: resolver coluna do Kanban no servidor

Criar serviço de domínio (ex.: `ResolverColunaKanbanBalcao`) que recebe os campos da venda unificada e retorna o ID da coluna (`FINALIZADAS`, `PENDENTE_EMISSAO`, `COM_NFE`) ou `null` se a venda não pertence ao quadro balcão.

Esse serviço deve espelhar as regras hoje no frontend (seção 9).

### 8.2. Expor `etapaKanbanBalcao` no DTO de listagem

Cada item retornado em `GET /vendas/unificado` deve incluir:

- `etapaKanbanBalcao`: `FINALIZADAS` | `PENDENTE_EMISSAO` | `COM_NFE` | `null`

Opcionalmente `modoKanban`: `balcao` | `delivery_operacional` | `excluido`.

### 8.3. Novo filtro de query: `colunaKanban`

```
GET /vendas/unificado?colunaKanban=COM_NFE&escopoKanban=balcao&dataFinalizacaoInicio=...&limit=50&offset=0
```

O backend traduz `colunaKanban` em condições SQL/view (não obrigar o cliente a montar combinações de `statusFiscal`).

Chamadas **sem** `colunaKanban` mantêm comportamento atual (retrocompatível).

### 8.4. Contagem por coluna — via paginação (obrigatório)

Quando `colunaKanban` estiver presente, o campo **`count` da resposta paginada** deve refletir o total **daquela coluna** no período/filtros — não o total global.

O frontend usará `pages[0].count` no header, **igual ao delivery**.

### 8.5. Endpoint de contagens dedicado (opcional)

Endpoint separado **não é obrigatório** (delivery não usa). Opcional para reduzir round-trips:

```
GET /vendas/unificado/kanban/contagens?...
→ { FINALIZADAS: 538, PENDENTE_EMISSAO: 12, COM_NFE: 546 }
```

### 8.6. Filtro de escopo balcão

`escopoKanban=balcao` exclui vendas classificadas como delivery operacional (entrega/retirada com etapa logística).

### 8.7. Delta poll

```
GET /vendas/unificado?escopoKanban=balcao&colunaKanban=COM_NFE&dataUltimaModificacaoInicial=2026-06-30T10:00:00Z
```

Retorna apenas vendas modificadas desde o timestamp. Substitui refetch total a cada 60s.

### 8.8. Filtro `terminalId`

Implementar no unificado para eliminar cruzamento com `GET /api/vendas?terminalId=...` no front.

### 8.9. Filtro de datas — semântica para colunas fiscais

No balcão (3 colunas fiscais), o período da toolbar deve filtrar por **`dataFinalizacao`**, não por criação.

Documentar se múltiplos filtros de data usam **AND** ou **OR**. Hoje o front envia ambos com o mesmo intervalo.

### 8.10. Ordenação

Manter padrão `dataCriacao desc` ou permitir `ordenarPor` alinhado ao Kanban — fase 2.

### 8.11. Testes

- Testes unitários do resolver de coluna (todos os cenários da seção 9).
- Testes de integração: filtro `colunaKanban` retorna só itens daquela coluna; `count` bate com total real.

---

## 9. Regras de negócio: em qual coluna cada venda cai

Regras atuais no frontend (`VendaUnificadaDTO.getEtapaKanban()`) — **o backend deve implementar a mesma lógica**.

### Modo Balcão — prioridade de avaliação (primeira regra que bater)

| Ordem | Condição | Coluna |
|-------|----------|--------|
| — | Pedido delivery operacional (`isPedidoEntregaGestor()`) | *Fora do balcão* (`null`) |
| 1 | Nota emitida ou cancelada com documento fiscal (`EMITIDA`/`CANCELADA` + `documentoFiscalId`) | `COM_NFE` |
| 2 | `statusFiscal = INUTILIZADA` | `COM_NFE` |
| 3 | `statusFiscal = REJEITADA` *(comportamento atual)* | `PENDENTE_EMISSAO` |
| 3a | `REJEITADA` **com** retorno SEFAZ (`codigoRetorno` ou `retornoSefaz`) | `COM_NFE` *(evolução desejada)* |
| 3b | `REJEITADA` **sem** retorno SEFAZ | `PENDENTE_EMISSAO` *(evolução desejada)* |
| 4 | `PENDENTE` ou `PENDENTE_AUTORIZACAO` **após cooldown de reemissão** | `PENDENTE_EMISSAO` |
| 5 | `PENDENTE` ou `PENDENTE_AUTORIZACAO` aguardando SEFAZ | `COM_NFE` |
| 6 | Marcada para emissão e ainda não emitida (`solicitarEmissaoFiscal` + não `EMITIDA`) | `PENDENTE_EMISSAO` |
| 7 | Possui `dataFinalizacao` | `FINALIZADAS` |
| 8 | Demais casos | `ABERTA` *(não exibida no balcão)* |

### Observações

- Vendas **canceladas** (`dataCancelamento` ou `statusFiscal = CANCELADA`) entram nas regras de cancelamento antes de qualquer coluna fiscal.
- **`solicitarEmissaoFiscal`** no DTO do backend corresponde a `solicitarFiscal` na view.
- A coluna `COM_NFE` agrega **vários** `statusFiscal` — filtrar só por `statusFiscal` no cliente é insuficiente.
- Cooldown de reemissão (`fiscalPendentePodeReemitirAposCooldown`) é lógica de UX no front; o backend pode simplificar na v1.

---

## 10. Contrato de API sugerido

### Listagem por coluna (evolução do endpoint atual)

**Request (exemplo):**

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `colunaKanban` | Sim* | `FINALIZADAS`, `PENDENTE_EMISSAO`, `COM_NFE` |
| `escopoKanban` | Recomendado | `balcao` — exclui delivery operacional |
| `dataFinalizacaoInicio` / `Fim` | Recomendado (balcão) | Filtro principal para colunas fiscais |
| `periodoInicial` / `periodoFinal` | Opcional | Filtro de criação |
| `origem` | Opcional | PDV / GESTOR / DELIVERY |
| `q` | Opcional | Busca textual |
| `terminalId` | Opcional | Filtro por terminal PDV |
| `dataUltimaModificacaoInicial` | Opcional | Delta poll |
| `offset` / `limit` | Sim | Paginação |

\*Sem `colunaKanban` → comportamento atual (retrocompatível).

**Response (inalterado na estrutura):**

```json
{
  "count": 773,
  "page": 1,
  "limit": 50,
  "hasNext": true,
  "hasPrevious": false,
  "items": [
    {
      "id": "...",
      "statusFiscal": "EMITIDA",
      "etapaKanbanBalcao": "COM_NFE"
    }
  ]
}
```

`count` = total **da coluna filtrada**, usado no header do Kanban.

### Contagens (opcional)

Endpoint dedicado só se quiser evitar 3 queries iniciais só para os números do topo:

```json
{
  "FINALIZADAS": 2,
  "PENDENTE_EMISSAO": 0,
  "COM_NFE": 773
}
```

---

## 11. Plano de implementação em fases

### Fase 1 — Backend: regra + campo (sem quebrar cliente atual)

- Implementar `ResolverColunaKanbanBalcao` com testes.
- Incluir `etapaKanbanBalcao` em cada item do `GET /vendas/unificado`.
- Documentar no Swagger.

### Fase 2 — Backend: filtro por coluna + escopo

- Query `colunaKanban` + `escopoKanban=balcao`.
- Garantir `count`/`hasNext` corretos **por coluna**.
- Filtro de finalização isolado para colunas fiscais.
- (Opcional) endpoint de contagens agregadas.

### Fase 3 — Backend: delta poll + terminal

- `dataUltimaModificacaoInicial` no unificado.
- `terminalId` no unificado.

### Fase 4 — Frontend gestor

- Três `useInfiniteQuery` paralelas (1 por coluna fiscal), espelhando `usePedidosDeliveryKanbanColumns`.
- Header = `pages[0].count` de cada coluna.
- Remover auto-prefetch, classificação global, cruzamento de terminal.
- Delta poll por coluna (como delivery).
- Remover paliativos da seção 5.

### Fase 5 — Ajustes finos

- Rejeitada SEFAZ vs pré-SEFAZ (se ainda não na fase 1).
- Ordenação server-side opcional.
- Cache/patch por coluna após emitir/reemitir nota.

---

## 12. O que o frontend fará depois

```
colunaKanban=FINALIZADAS&escopoKanban=balcao&limit=50&offset=0
colunaKanban=PENDENTE_EMISSAO&escopoKanban=balcao&limit=50&offset=0
colunaKanban=COM_NFE&escopoKanban=balcao&limit=50&offset=0
```

- Parar de paginar uma lista global para alimentar três colunas.
- Três streams independentes com scroll por coluna (como delivery).
- Confiar em `etapaKanbanBalcao`; `getEtapaKanban()` vira fallback legado até remoção.
- Delta poll por coluna, sem reprocessar milhares de registros no browser.

---

## 13. Otimizações frontend enquanto o backend não entrega

Mitigações de curto prazo (não substituem a API por coluna):

| Prioridade | Ação | Impacto |
|------------|------|---------|
| Alta | Remover ou limitar auto-prefetch (cap 2–3 páginas) | Menos requests na abertura |
| Alta | Reativação REJEITADA só após carga estável + limite de PATCH | Menos tempestade de requests |
| Alta | Polling 120s + desligar refetch no focus (balcão) | Menos refetch destrutivo |
| Média | Balcão: enviar só `dataFinalizacao*` na API | Menos dados irrelevantes |
| Média | Classificação single-pass (1 loop vs 7 filters) | Menos CPU |
| Média | Terminais: lazy load ao abrir select | Menos requests no mount |
| Baixa | Indicador claro "X de Y — role para ver mais" | UX honesta |

---

## 14. Critérios de aceite

- [ ] `GET /vendas/unificado?colunaKanban=COM_NFE&escopoKanban=balcao` retorna **somente** vendas da coluna COM_NFE.
- [ ] `count` da resposta = total real da coluna no período (ex.: 773), independente dos items na página.
- [ ] `escopoKanban=balcao` exclui pedidos delivery operacional.
- [ ] Cada item traz `etapaKanbanBalcao` consistente com o filtro.
- [ ] Abrir Kanban balcão: **cada coluna mostra cards relevantes na primeira página**.
- [ ] Scroll em uma coluna carrega **mais itens da mesma coluna**.
- [ ] Chamadas **sem** `colunaKanban` mantêm comportamento atual.
- [ ] Testes automatizados no backend cobrem as regras da seção 9.
- [ ] Swagger atualizado.

---

## 15. Resumo para repassar ao time de backend

### Tarefa: Melhorar a API de vendas unificadas para o Kanban de Pedidos (modo balcão)

**O problema**

A tela de Pedidos de Clientes (modo balcão) chama a listagem de vendas unificadas e recebe uma lista única, paginada de 50 em 50, com todos os tipos de pedido misturados. O navegador decide se cada pedido vai para Finalizadas, Pendente emissão ou Com nota solicitada.

Isso está lento e frágil. O Kanban **Delivery** já resolve isso com listagem **por coluna** (`statusDelivery`) e `count` na paginação — o balcão precisa do equivalente.

**O que precisamos (essencial)**

1. **Regra oficial no backend** de em qual coluna cada venda aparece (`ResolverColunaKanbanBalcao`).
2. **Campo `etapaKanbanBalcao`** em cada item da listagem.
3. **Filtro `colunaKanban`** + **`escopoKanban=balcao`** na listagem existente.
4. **`count` correto por coluna** na resposta paginada (como delivery — **sem** endpoint de contagem separado obrigatório).

**Desejável (fase 2)**

5. **Delta poll** via `dataUltimaModificacaoInicial`.
6. **`terminalId`** no unificado.
7. Filtro de **finalização** isolado para colunas fiscais.

**Não é escopo**

Refatorar Kanban Delivery (`/delivery/pedidos` — já funciona). Mudanças visuais no gestor — frontend após API pronta.

**Prioridade**

1. `etapaKanbanBalcao` + testes das regras  
2. `colunaKanban` + `escopoKanban` + `count` por coluna  
3. Delta poll + `terminalId`

---

*Documento preparado a partir de `VendasKanban`, `useKanbanDataQueries`, `useVendasUnificadas`, `usePedidosDeliveryKanbanColumns` e módulo `vendas-unificadas` do jiffy-backend.*
