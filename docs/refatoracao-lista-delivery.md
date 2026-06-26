# Refatoração — listagem delivery (Kanban)

> **Documento de planejamento (backend)** — filtros de data, índices, payload enxuto para cards e modal de observação.  
> **Última revisão:** 2026-06-15  
> **Relacionado:** [`docs/features/kanban-listagem-vendas-unificadas-refatoracao.md`](./features/kanban-listagem-vendas-unificadas-refatoracao.md), [`docs/fiscal-flow-kanban-e-novo-pedido.md`](./fiscal-flow-kanban-e-novo-pedido.md)

---

## Índice

1. [Contexto](#1-contexto)
2. [Estado atual (resumo técnico)](#2-estado-atual-resumo-técnico)
3. [Problemas identificados](#3-problemas-identificados)
4. [Objetivos da refatoração](#4-objetivos-da-refatoração)
5. [Filtros de data](#5-filtros-de-data)
6. [Listagem enxuta para cards (`VendaDeliverySummaryDTO`)](#6-listagem-enxuta-para-cards-vendadeliverysummarydto)
7. [Modal de observação rápida](#7-modal-de-observação-rápida)
8. [Índices e performance no banco](#8-índices-e-performance-no-banco)
9. [Plano de implementação por fases](#9-plano-de-implementação-por-fases)
10. [Contratos de API (resumo)](#10-contratos-de-api-resumo)
11. [Critérios de aceite](#11-critérios-de-aceite)
12. [Impacto no frontend (gestor)](#12-impacto-no-frontend-gestor)
13. [Checklist para o time de backend](#13-checklist-para-o-time-de-backend)

---

## 1. Contexto

O Kanban **Pedidos de Clientes** no modo **Delivery** lista pedidos via:

```
GET /api/v1/delivery/pedidos  (paginado, filtros)
```

O gestor (BFF) faz proxy em `GET /api/delivery/pedidos`. O frontend mapeia cada item como `VendaDeliverySummaryDTO` → `VendaUnificadaDTO` e monta os cards sem buscar produtos na listagem.

**Comparado ao fluxo antigo** (listar + GET detalhe ao montar card para popular cache), hoje:

- A **resposta HTTP** da listagem já é um **summary** (sem `produtosLancados`).
- Os **cards não disparam GET ao montar**, exceto hidratação de entregador quando o summary não traz `entregador`.
- O **modal de observação** abre com **GET do pedido expandido** (`/api/delivery/pedidos/{id}`), mesmo quando a observação já veio na listagem.

A refatoração proposta concentra ganhos no **backend**: consultas mais baratas, filtros de data corretos e payloads alinhados ao que a UI realmente usa.

---

## 2. Estado atual (resumo técnico)

### 2.1 Endpoint e filtros aceitos hoje

**Controller:** `PedidoDeliveryController.findMany`  
**Validator:** `vendaDeliveryFilterOptionsValidator` (`modules/shared/common/validators/`)

| Parâmetro | Suportado no backend | Usado pelo Kanban delivery hoje |
|-----------|----------------------|----------------------------------|
| `offset`, `limit`, `q` | Sim | Sim |
| `statusDelivery` | Sim | Sim (carga inicial, colunas, re-poll) |
| `tipoEntrega`, `origem` | Sim | Parcial (`origem` via toolbar) |
| `cancelado` | Sim | Sim (`false` por padrão) |
| `solicitarEmissaoFiscal` | Sim | Não (colunas fiscais) |
| `dataCriacaoInicial` / `dataCriacaoFinal` | Sim | **Filtrado no cliente** (`kanbanVendasListagem.ts`) |
| `dataFinalizacaoInicial` / `dataFinalizacaoFinal` | Sim | Parcial (finalizados + toolbar; ativos ignoram no sync) |
| `dataUltimaModificacaoInicial` | **Não** | Front envia no re-poll; **API ignora** |

### 2.2 Repositório e serialização

- **Query:** `VendaExternaPrismaRepository.findManyPedidosDelivery` usa `include: includeVendaExternaNested` — grafo **completo** (produtos, complementos, impressoras, pagamentos, taxas, cobranças aninhadas, sequências de transição, etc.).
- **Resposta:** `VendaDeliveryMapper.toSummaryDTO()` serializa só campos do summary — **o JSON é menor que a leitura no DB**.

### 2.3 Summary vs. o que o card precisa

O summary **inclui** (entre outros): identificação, cliente, status, valores, datas, `cobrancas` (DTO completo), `observacoes`, `resumoFiscal` (objeto fiscal completo).

O summary **não inclui** (mas o front espera / usa):

| Campo | Uso no card / Kanban | Consequência hoje |
|-------|----------------------|-------------------|
| `entregador` | Ícone “vincular entregador” | `hidratarEntregadoresKanbanDesdeApi` → GET `/pedidos/{id}` por card sem entregador no summary |
| `contextoEntrega` | Alterar endereço, quick view | Não vem na listagem; depende de GET expandido sob demanda |

### 2.4 Modal de observação (`ObservacaoPedidoKanbanPainel`)

Ao abrir o modal:

1. `GET /api/delivery/pedidos/{id}` (pedido **expandido**).
2. Extrai `observacoes` da resposta.
3. `PATCH` no mesmo endpoint ao salvar.

A listagem **já pode trazer** `observacoes` no summary (backend `toSummaryDTO` inclui). O card já exibe texto via cache. O modal **não reutiliza** esse dado e refaz GET pesado.

---

## 3. Problemas identificados

| # | Problema | Camada | Impacto |
|---|----------|--------|---------|
| P1 | `findManyPedidosDelivery` lê grafo Prisma completo | DB / repositório | Latência e carga no Postgres mesmo com JSON “summary” |
| P2 | Filtro de **criação** aplicado no **cliente** no modo delivery | Front + API | Lista maior que o necessário; paginação/contagem imprecisa com filtros de toolbar |
| P3 | `dataUltimaModificacaoInicial` não existe na API | API | Re-poll de ativos refaz carga grande e filtra no cliente |
| P4 | Filtros `dataCriacao*` e `dataFinalizacao*` são independentes | API | Não cobre regra de negócio “data efetiva” (finalização OU criação) sem duplicar lógica no front |
| P5 | Summary sem `entregador` / `contextoEntrega` | API | N+1 GETs para hidratar entregador |
| P6 | `cobrancas` e `resumoFiscal` no summary são **pesados** | API | Payload maior que o card precisa |
| P7 | Modal observação usa GET expandido | Front + API | Abertura lenta; pressão no DB igual a detalhe de pedido |
| P8 | Índices não cobrem bem `statusDelivery` + datas do Kanban | DB | Join `venda_gestor` ↔ `venda_delivery` + filtro por status sem índice dedicado |
| P9 | Índice `empresaId, dataFinalizacao` sem `tipoVenda` / `cancelado` | DB | Listagem delivery compete com outras consultas por finalização |

---

## 4. Objetivos da refatoração

1. **Listagem do Kanban** deve carregar no DB apenas o necessário para montar cards (summary real).
2. **Filtros de data** devem ser resolvidos no **backend**, com regras claras por modo operacional vs. histórico.
3. **Re-poll** deve usar delta por `dataUltimaModificacao` (e opcionalmente por status).
4. **Modal de observação** deve poder ler/escrever observação sem GET do pedido completo.
5. **Índices** alinhados aos padrões de query do Kanban delivery.

---

## 5. Filtros de data

### 5.1 Regras de negócio desejadas

#### Modo operacional (colunas ativas: PENDENTE, EM_PREPARO, PRONTO, EM_ROTA)

- **Padrão:** sem filtro de data (pedidos “vivos” na operação).
- **Toolbar “Por data” (futuro unificado):** quando o usuário filtra por período, aplicar regra de **data de referência**:

```
dataReferencia = dataFinalizacao ?? dataCriacao
```

Pedido entra no intervalo se `dataReferencia` está entre `inicial` e `final`.

- **Não** misturar com filtro só de finalização para ativos — evita esconder pedidos abertos criados antes do intervalo.

#### Coluna / carga FINALIZADO

- **Padrão Kanban:** finalizados **de hoje** (`dataFinalizacao >= startOfDay(hoje)`), alinhado ao que o front já faz em `usePedidosDeliveryKanbanSync`.
- **Toolbar:** `dataFinalizacaoInicial` / `dataFinalizacaoFinal` (ou `dataReferencia*` quando unificado).

#### Re-poll (delta)

- Ativos: `dataUltimaModificacaoInicial = lastPollAt` (+ status operacionais).
- Finalizados: `statusDelivery=FINALIZADO` + `dataFinalizacaoInicial = lastPollAt` (ou `dataUltimaModificacaoInicial` se finalização atualiza `dataUltimaModificacao`).

### 5.2 Proposta de parâmetros na API

Manter compatibilidade com parâmetros atuais e adicionar:

| Parâmetro novo | Tipo | Descrição |
|----------------|------|-----------|
| `dataReferenciaInicial` | `datetime` ISO | Início do intervalo na regra `dataFinalizacao ?? dataCriacao` |
| `dataReferenciaFinal` | `datetime` ISO | Fim do intervalo na mesma regra |
| `dataUltimaModificacaoInicial` | `datetime` ISO | Delta para sync / re-poll |

**Implementação Prisma (exemplo):**

```sql
-- dataReferencia no intervalo [inicial, final]
(
  data_finalizacao IS NOT NULL
  AND data_finalizacao >= :inicial AND data_finalizacao <= :final
)
OR
(
  data_finalizacao IS NULL
  AND data_criacao >= :inicial AND data_criacao <= :final
)
```

Equivalente em `Prisma.VendaExternaWhereInput` com `OR` de dois blocos.

### 5.3 Validação (`vendaDeliveryFilterOptionsValidator`)

- Adicionar `dataReferenciaInicial`, `dataReferenciaFinal`, `dataUltimaModificacaoInicial`.
- `superRefine`: ordem inicial ≤ final para cada par.
- Documentar mutualidade:
  - Se `dataReferencia*` presente, **não** exigir `dataCriacao*` / `dataFinalizacao*` (ou definir precedência explícita: `dataReferencia` > pares legados).
- Swagger / OpenAPI em `docs/swagger/schemas/deliverySchemas.ts`.

### 5.4 Onde aplicar no repositório

Arquivo: `VendaExternaPrismaRepository.findManyPedidosDelivery`

- Montar `where` em `VendaExterna` + `vendaDelivery.is` para `statusDelivery` / `tipoEntrega`.
- Aplicar filtros de data em `VendaExterna` (`dataCriacao`, `dataFinalizacao`, `dataUltimaModificacao`).
- Para `dataReferencia*`, usar expressão `OR` descrita acima.
- Garantir que `cancelado=false` continue default quando omitido (como hoje no front).

### 5.5 Decisões de produto (registrar com PO)

| Cenário | Decisão pendente |
|---------|------------------|
| Delivery sem filtro na toolbar | Manter operacional “sem data” vs. balcão “hoje por criação” |
| Filtro unificado “Por Data” | Um botão na toolbar vs. dois (criação / finalização) |
| Finalizados fora do “hoje” | Scroll infinito só com filtro explícito ou sempre últimos N dias |

Recomendação técnica: **operacional sem data** + **finalizados com default hoje no backend** (parâmetro opcional `dataFinalizacaoInicial` default no use case quando `statusDelivery=FINALIZADO` e datas omitidas).

---

## 6. Listagem enxuta para cards (`VendaDeliverySummaryDTO`)

### 6.1 Novo include Prisma para listagem

Criar `includeVendaDeliveryListagem` (ou query raw/view) **sem**:

- `produtosLancados` (+ produto, grupos, impressoras)
- `taxasLancadas`
- `pagamentos` (venda externa)
- `sequenciasTransicoes`
- aninhamento profundo em `pagamentoExterno` das cobranças (se não usado no card)

**Incluir:**

- Campos scalar de `VendaExterna` necessários ao summary
- `cliente` (id, nome)
- `observacoes` (pedido — só nível venda, `produtoLancadoId IS NULL`)
- `resumosFiscais` (ou subselect do resumo “ativo” mais recente)
- `vendaDelivery` + `entregador` (id, nome, telefone)
- `vendaDelivery.cobrancas` com include mínimo: `meioPagamento` (id, nome) **ou** só `meioPagamentoId` se o front resolve nomes via cache local

Snapshot de endereço já está em colunas de `VendaDelivery` (`enderecoRua`, `enderecoCep`, …) — mapear como `contextoEntrega` no summary **sem** join com cliente delivery.

### 6.2 Evolução do DTO summary

Estender `vendaDeliverySummaryDTOValidator` e `toSummaryDTO`:

```typescript
// Campos a ADICIONAR no summary
entregador: { id, nome, telefone } | null
contextoEntrega: { enderecoEntrega snapshot + refs } | null

// Campos a REDUZIR (novos validators)
cobrancas: CobrancaDeliverySummaryDTO[]  // id, valor, meioPagamentoId, momentoCobranca, status, datas
resumoFiscal: ResumoFiscalKanbanDTO      // status, numero, serie, modelo, documentoFiscalId, dataEmissao, retornoSefaz

// Opcional: flag na query
view=kanban  // força shape enxuto; default pode manter compat por fase
```

Alternativa sem `view`: sempre retornar summary enxuto na listagem; detalhe continua em `GET /pedidos/{id}`.

### 6.3 Campos do card (referência para o time)

Mínimo para `FiscalKanbanVendaCard` (delivery):

- Identificação: `id`, `numeroVenda`, `codigoVenda`
- Cliente: `cliente.id`, `cliente.nome`
- Operação: `tipoEntrega`, `statusDelivery`, `dataCriacao`, `dataFinalizacao`, `dataUltimaModificacao`
- Delivery: `previsaoEntregaEm`, `tempoTotalEstimadoSegundos`, `entregador`, `contextoEntrega`
- Financeiro: `valorFinal`, `totalFaltaPagar`, `totalPago`, `cobrancas` (enxutas), derivar `fluxoPagamento`
- Fiscal: subconjunto de `resumoFiscal`
- Texto: `observacoes` (array ou texto agregado)
- Meta: `origem`, `solicitarEmissaoFiscal`, `dataCancelamento`

### 6.4 Use case

`FindManyPedidosDeliveryUseCase`:

- Receber filtros novos.
- Chamar repositório com include leve.
- `VendaDeliveryMapper.toSummaryDTO` (ou `toKanbanCardDTO`) enxuto.

---

## 7. Modal de observação rápida

### 7.1 Problema

`ObservacaoPedidoKanbanPainel` ao abrir:

```
GET /api/v1/delivery/pedidos/{id}  → VendaExpandedDeliveryDTO (produtos, taxas, …)
```

Só precisa de `observacoes` (e `id` para PATCH).

### 7.2 Opções de solução (backend)

#### Opção A — Endpoint dedicado (recomendada)

```
GET  /api/v1/delivery/pedidos/{id}/observacoes
PATCH /api/v1/delivery/pedidos/{id}/observacoes
Body PATCH: { observacoes: string[] }  ou { observacao: string }
Response: { observacoes: ObservacaoLancadaExternaDTO[] }
```

- Use case fino: `GetObservacoesPedidoDelivery`, `PatchObservacoesPedidoDelivery`.
- Repositório: `observacaoLancadaExterna` filtrado por `vendaExternaId` e `produtoLancadoId IS NULL`.
- **Sem** include de produtos.

#### Opção B — Query no GET existente

```
GET /api/v1/delivery/pedidos/{id}?fields=observacoes
```

- Implementar projeção no use case de detalhe.
- PATCH continua no recurso completo (aceitável se body pequeno).

#### Opção C — Listagem já traz observação; modal usa cache

- Sem mudança de API se summary sempre inclui `observacoes` atualizadas.
- PATCH retorna só `{ observacoes }` no body de resposta (não o pedido inteiro).
- Front evita GET ao abrir quando `venda.observacoes` já está no cache Kanban.

**Recomendação:** **A + C** — endpoint leve para refresh explícito + front usa cache na abertura; PATCH com resposta mínima.

### 7.3 PATCH observações hoje

Verificar se `update` em venda externa / delivery já suporta replace de observações sem recarregar entidade completa. Se o PATCH atual retorna `VendaExpandedDeliveryDTO`, alterar para:

```json
{ "observacoes": [...], "dataUltimaModificacao": "..." }
```

ou DTO dedicado.

### 7.4 Critérios de performance do modal

| Métrica | Hoje (estimado) | Objetivo |
|---------|-----------------|----------|
| GET ao abrir | 1 query pesada + JSON grande | 0 GET (cache) ou 1 query só `observacao_lancada_externa` |
| PATCH response | Pedido expandido | Só observações + timestamp |
| P95 abertura modal | — | < 200 ms no backend |

---

## 8. Índices e performance no banco

### 8.1 Padrões de query do Kanban

1. **Ativos:** `empresaId` + `tipoVenda=delivery` + `dataCancelamento IS NULL` + `vendaDelivery.statusDelivery IN (...)` + opcional `dataUltimaModificacao >= ?`
2. **Finalizados:** idem + `statusDelivery=FINALIZADO` + `dataFinalizacao` no intervalo
3. **Busca `q`:** `codigoVenda`, `numeroVenda`, `cliente.nome`, `documentoCpfCnpj`
4. **Contagem por coluna:** mesmos filtros + `COUNT` com `limit=1` no app

### 8.2 Índices propostos

#### `venda_gestor` (`VendaExterna`)

```prisma
@@index([empresaId, tipoVenda, dataCancelamento, dataCriacao])
@@index([empresaId, tipoVenda, dataCancelamento, dataFinalizacao])
@@index([empresaId, tipoVenda, dataUltimaModificacao])
```

- Cobre listagem delivery + delta sync.
- Avaliar **índice parcial** (migration SQL) para `tipo_venda = 'delivery' AND data_cancelamento IS NULL` se a tabela é heterogênea.

#### `venda_delivery`

```prisma
@@index([statusDelivery])
@@index([vendaExternaId, statusDelivery])  // se queries partem de delivery
```

- Hoje **não há** índice em `status_delivery`.
- Filtro atual: `vendaExterna WHERE vendaDelivery.statusDelivery IN (...)` → join + filter.

**Alternativa composta** (via migration):

```sql
CREATE INDEX idx_venda_gestor_delivery_listagem
ON venda_gestor (empresa_id, tipo_venda, data_cancelamento, data_finalizacao DESC, data_criacao DESC)
WHERE tipo_venda = 'delivery';
```

#### `observacao_lancada_externa`

Para modal e summary:

```prisma
@@index([vendaExternaId, produtoLancadoId])
```

- Acelerar `WHERE venda_externa_id = ? AND produto_lancado_id IS NULL`.

#### `cobranca_delivery`

Já existe `@@index([vendaDeliveryId])` — suficiente para listagem enxuta de cobranças por pedido.

#### `resumo_fiscal`

Índices existentes `empresaId, vendaGestorId` — ok para 1 resumo por venda na listagem.

### 8.3 Ordenação

Listagem usa `orderBy: dataCriacao desc, numeroVenda desc`.

Índice com `data_criacao DESC` alinhado evita sort em memória em páginas grandes.

### 8.4 Monitoramento

Após deploy:

- Logar tempo de `findManyPedidosDelivery` (p50/p95).
- `EXPLAIN ANALYZE` nas queries com filtros típicos do Kanban (ativos, finalizados hoje, delta).
- Comparar payload JSON médio antes/depois do summary enxuto.

---

## 9. Plano de implementação por fases

### Fase 1 — Quick wins (baixo risco)

| Item | Entrega |
|------|---------|
| `dataUltimaModificacaoInicial` no validator + repositório | Re-poll eficiente no front |
| Incluir `entregador` + `contextoEntrega` em `toSummaryDTO` | Elimina N+1 GET entregador |
| `include` leve só na `findManyPedidosDelivery` | Reduz carga DB sem mudar contrato JSON |
| Índice `venda_delivery.status_delivery` | Melhora filtro por status |

**Esforço estimado:** 3–5 dias  
**Breaking change:** não (só adiciona campos no summary)

### Fase 2 — Filtros de data

| Item | Entrega |
|------|---------|
| `dataReferenciaInicial` / `dataReferenciaFinal` | Filtro unificado “Por Data” |
| Default finalizados “hoje” no use case quando aplicável | Alinha com Kanban |
| Remover filtro client-side de criação no gestor (após deploy) | Menos dados trafegados |
| Índices compostos em `venda_gestor` | Performance com novos filtros |

**Esforço estimado:** 5–8 dias  
**Dependência:** alinhamento PO sobre default operacional vs. histórico

### Fase 3 — Payload e observação

| Item | Entrega |
|------|---------|
| `CobrancaDeliverySummaryDTO` + `ResumoFiscalKanbanDTO` na listagem | JSON menor |
| `GET/PATCH .../observacoes` ou PATCH response mínima | Modal rápido |
| Swagger atualizado | Integração gestor |

**Esforço estimado:** 5–7 dias

### Fase 4 — Hardening

| Item | Entrega |
|------|---------|
| Testes integração repositório (filtros + includes) | Regressão |
| Benchmark antes/depois | Evidência de ganho |
| Índice parcial `tipo_venda = delivery` (se métricas justificarem) | Escala |

---

## 10. Contratos de API (resumo)

### Listagem (evolução)

```
GET /api/v1/delivery/pedidos
```

**Query (adicionar):**

- `dataReferenciaInicial`, `dataReferenciaFinal`
- `dataUltimaModificacaoInicial`

**Response item (adicionar / ajustar):**

```json
{
  "id": "...",
  "numeroVenda": 42,
  "codigoVenda": "...",
  "tipoEntrega": "entrega",
  "statusDelivery": "EM_PREPARO",
  "valorFinal": 50,
  "totalFaltaPagar": 0,
  "cliente": { "id": "...", "nome": "..." },
  "entregador": { "id": "...", "nome": "...", "telefone": "..." },
  "contextoEntrega": { "enderecoEntrega": { "rua": "...", "cep": "..." } },
  "observacoes": [{ "observacao": "sem cebola", "dataLancamento": "..." }],
  "cobrancas": [{ "id": "...", "valor": 50, "meioPagamentoId": "...", "status": "paga", "momentoCobranca": "ANTECIPADO" }],
  "resumoFiscal": { "status": "EMITIDA", "numero": 123, "serie": "1", "modelo": 65, "documentoFiscalId": "..." }
}
```

### Observação (novo)

```
GET  /api/v1/delivery/pedidos/{id}/observacoes
PATCH /api/v1/delivery/pedidos/{id}/observacoes
```

---

## 11. Critérios de aceite

### Listagem / cards

- [ ] `findManyPedidosDelivery` **não** carrega `produtosLancados` nem `taxasLancadas`.
- [ ] Summary inclui `entregador` e `contextoEntrega` para pedidos de entrega.
- [ ] Com 50 pedidos na lista, **zero** GET `/pedidos/{id}` só para ícone de entregador (validar no gestor).
- [ ] Payload médio da listagem (100 itens) reduz ≥ 40% vs. baseline (medir após Fase 3).

### Filtros de data

- [ ] `dataUltimaModificacaoInicial` retorna apenas pedidos alterados após o timestamp.
- [ ] `dataReferenciaInicial/Final` implementa `dataFinalizacao ?? dataCriacao`.
- [ ] Filtro de criação na toolbar do delivery funciona **via API** (front pode remover filtro client-side).
- [ ] Finalizados default “hoje” quando `statusDelivery=FINALIZADO` e sem datas (se PO aprovar).

### Modal observação

- [ ] Abrir modal **não** dispara query com `produtosLancados`.
- [ ] PATCH observação retorna corpo ≤ 2 KB.
- [ ] Observação salva reflete na listagem no próximo GET/sync (ou via `dataUltimaModificacao` no delta).

### Índices

- [ ] `EXPLAIN` das queries principais usa índice em `status_delivery` ou índice composto proposto.
- [ ] p95 `findManyPedidosDelivery` (100 rows, empresa típica) < 300 ms em staging.

---

## 12. Impacto no frontend (gestor)

Após backend Fase 1–2, o gestor pode:

1. Remover filtro client-side de datas em `kanbanVendasListagem.ts` (delivery).
2. Passar `dataReferencia*` quando toolbar unificada existir.
3. Usar `dataUltimaModificacaoInicial` no re-poll (já preparado em `usePedidosDeliveryKanbanSync`).
4. Remover `hidratarEntregadoresKanbanDesdeApi` em massa quando summary traz entregador.
5. Modal observação: abrir com texto do card; GET leve só se `forcarAtualizacao`.

**Não bloquear** deploy backend — campos novos são aditivos.

---

## 13. Checklist para o time de backend

- [ ] `VendaDeliveryFilterOptions` + validator: novos campos de data
- [ ] `VendaExternaPrismaRepository.findManyPedidosDelivery`: include leve + filtros
- [ ] `VendaDeliveryMapper.toSummaryDTO`: entregador, contextoEntrega, DTOs enxutos
- [ ] Endpoint(s) observação ou PATCH response mínima
- [ ] Migrations: índices `status_delivery`, compostos `venda_gestor`, `observacao_lancada_externa`
- [ ] Swagger `deliverySchemas.ts`
- [ ] Testes: filtros dataReferencia, delta `dataUltimaModificacao`, listagem sem produtos
- [ ] Métricas: tempo de query + tamanho JSON antes/depois

---

## Referências no monorepo

| Área | Caminho |
|------|---------|
| Filtros validator | `jiffy-backend/.../VendaDeliveryFilterOptionsValidator.ts` |
| Repositório listagem | `jiffy-backend/.../VendaExternaPrismaRepository.ts` (`findManyPedidosDelivery`) |
| Summary mapper | `jiffy-backend/.../VendaDeliveryMapper.ts` (`toSummaryDTO`) |
| Schema Prisma | `jiffy-backend/prisma/schema/venda_externa.prisma`, `delivery.prisma` |
| Front listagem | `jiffy-gestor-v2/.../usePedidosDeliveryKanbanSync.ts` |
| Front mapper | `jiffy-gestor-v2/.../PedidoDeliveryListMapper.ts` |
| Modal observação | `jiffy-gestor-v2/.../ObservacaoPedidoKanbanPainel.tsx` |
