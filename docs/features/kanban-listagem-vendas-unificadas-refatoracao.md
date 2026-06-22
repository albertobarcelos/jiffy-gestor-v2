# Refatoração da listagem do Kanban (vendas unificadas)

> **Documento de planejamento** — descreve o problema atual, a solução proposta e o que cada time deve fazer.  
> **Última revisão:** 2026-06-18  
> **Relacionado:** [`docs/fiscal-flow-kanban-e-novo-pedido.md`](../fiscal-flow-kanban-e-novo-pedido.md)

---

## Índice

1. [Contexto](#1-contexto)
2. [Como funciona hoje](#2-como-funciona-hoje)
3. [Por que isso é um problema](#3-por-que-isso-é-um-problema)
4. [Objetivo da refatoração](#4-objetivo-da-refatoração)
5. [O que o backend já oferece hoje](#5-o-que-o-backend-já-oferece-hoje)
6. [O que precisa ser construído (visão técnica)](#6-o-que-precisa-ser-construído-visão-técnica)
7. [Regras de negócio: em qual coluna cada venda cai](#7-regras-de-negócio-em-qual-coluna-cada-venda-cai)
8. [Contrato de API sugerido](#8-contrato-de-api-sugerido)
9. [Plano de implementação em fases](#9-plano-de-implementação-em-fases)
10. [O que o frontend fará depois](#10-o-que-o-frontend-fará-depois)
11. [Critérios de aceite](#11-critérios-de-aceite)
12. [Resumo para repassar ao time de backend](#12-resumo-para-repassar-ao-time-de-backend)

---

## 1. Contexto

A tela **Pedidos de Clientes** (`FiscalFlowKanban`) no modo **Balcão** exibe três colunas fiscais:

| Coluna | ID interno |
|--------|------------|
| Finalizadas | `FINALIZADAS` |
| Pendente Emissão Fiscal | `PENDENTE_EMISSAO` |
| Com Nota Solicitada | `COM_NFE` |

Os dados vêm do endpoint **vendas unificadas** (`GET /api/vendas/unificado` no gestor, proxy do `GET /api/v1/.../vendas/unificado` no backend Jiffy).

Hoje o gestor busca uma **lista única paginada** (50 itens por vez) e o **frontend** decide em qual coluna cada pedido aparece. Isso funcionou em volumes pequenos, mas escala mal e já causou bugs de listagem vazia, contagem errada e lentidão percebida.

---

## 2. Como funciona hoje

### Fluxo resumido

```
[Filtros: período, origem, busca]
        ↓
GET /vendas/unificado?offset=0&limit=50&...
        ↓
Lista mista (todos os status juntos)
        ↓
Frontend: achata páginas, remove pedidos delivery operacional (modo balcão)
        ↓
Frontend: getEtapaKanban() em cada item → filtra por coluna
        ↓
Renderiza cards + contagem = itens já carregados na coluna
        ↓
Scroll no fim da coluna → busca mais 50 na lista global (mesma query)
```

### Detalhes importantes

- **Não carrega o período inteiro de uma vez.** Só o que já foi paginado (50, 100, 150…).
- **A API não sabe de colunas do Kanban.** Não existe parâmetro `coluna=COM_NFE`.
- **A classificação** está duplicada no frontend (`VendaUnificadaDTO.getEtapaKanban()` em `useVendasUnificadas.ts`).
- **Cabeçalho da coluna** mostra quantos itens daquela coluna já foram carregados e classificados — não necessariamente o total real do período.
- **Modo Delivery** do Kanban usa outro endpoint (`/api/v1/delivery/pedidos`) e não é o foco desta refatoração; o problema crítico é o **modo Balcão + vendas unificadas**.

### Incidente recente (jun/2026)

Uma tentativa de paginar “10 em 10 por coluna no scroll” piorou o cenário: página global de 10 itens + limite visual de 10 cards deixou colunas quase vazias. A correção foi voltar para página de 50 e exibir todos os cards já carregados — **paliativo**, não solução estrutural.

---

## 3. Por que isso é um problema

| Problema | Efeito para o usuário |
|----------|------------------------|
| Paginação global em lista heterogênea | Primeiros 50 pedidos podem ser quase todos “Finalizadas”; “Com nota” fica vazia até rolar muitas vezes |
| Regra de coluna no frontend | Mudanças (ex.: rejeição SEFAZ vs pré-SEFAZ) quebram em um lugar e não no outro |
| Contagem ≠ realidade | Cabeçalho mostra números que não batem com o que o usuário espera do período |
| Processamento pesado no browser | Filtrar, classificar e ordenar milhares de itens a cada poll (60s) |
| Múltiplas queries paralelas improvisadas | Tentativa de várias streams por `statusFiscal` no frontend gerou merge/deduplicação frágil |

**Conclusão:** o Kanban precisa de um contrato de API **orientado a colunas** (ou equivalente no servidor), com **regra de negócio centralizada no backend**.

---

## 4. Objetivo da refatoração

1. **Uma única fonte da verdade** para “em qual coluna do Kanban balcão esta venda aparece”.
2. **Listagem e paginação por coluna** (ou por grupo fiscal filtrável), não lista global mista.
3. **Contagem total por coluna** independente da página de cards carregada.
4. **Menos trabalho no frontend:** renderizar, ordenar na UI e ações (emitir, reemitir); não reimplementar regras fiscais.

---

## 5. O que o backend já oferece hoje

Com base no módulo `vendas-unificadas` do jiffy-backend:

| Recurso | Situação |
|---------|----------|
| `GET` paginado (`offset`, `limit`, `count`, `hasNext`) | ✅ Existe |
| Filtros: `origem`, `periodoInicial`, `periodoFinal`, `dataFinalizacaoInicio/Fim`, `q` | ✅ Existe |
| Filtro `statusFiscal` (valor único, ex.: `EMITIDA`, `REJEITADA`) | ✅ Existe |
| Campos `codigoRetorno`, `retornoSefaz` no DTO / view | ✅ Existe (garantir em todos os ambientes) |
| Campo `etapaKanban` ou filtro por coluna do Kanban | ❌ Não existe |
| Contagem agrupada por coluna do Kanban | ❌ Não existe |
| Filtro “somente balcão” (excluir pedidos delivery operacional) | ❌ Não explícito |
| Regra composta “coluna COM_NFE” (vários status fiscais) | ❌ Só com múltiplas chamadas no cliente |

A ordenação atual no repositório é `dataCriacao desc` para todas as consultas.

---

## 6. O que precisa ser construído (visão técnica)

### 6.1. Domínio: resolver coluna do Kanban no servidor

Criar serviço de domínio (ex.: `ResolverColunaKanbanBalcao`) que recebe os campos da venda unificada e retorna o ID da coluna (`FINALIZADAS`, `PENDENTE_EMISSAO`, `COM_NFE`) ou `null` se a venda não pertence ao quadro balcão (ex.: pedido delivery operacional, venda aberta sem finalização).

Esse serviço deve espelhar as regras hoje no frontend (seção 7), com evolução planejada para **rejeição SEFAZ vs pré-SEFAZ**.

### 6.2. Expor `etapaKanbanBalcao` no DTO de listagem

Cada item retornado em `GET /vendas/unificado` (ou no novo endpoint) deve incluir:

- `etapaKanbanBalcao`: `FINALIZADAS` | `PENDENTE_EMISSAO` | `COM_NFE` | `null`

Opcionalmente `modoKanban`: `balcao` | `delivery_operacional` | `excluido` para o frontend não precisar inferir.

### 6.3. Novo filtro de query: `colunaKanban` (ou `etapaKanban`)

Permitir:

```
GET /vendas/unificado?colunaKanban=COM_NFE&periodoInicial=...&limit=50&offset=0
```

O backend traduz `colunaKanban` em condições SQL/view (não obrigar o cliente a montar combinações de `statusFiscal`).

### 6.4. Endpoint de contagens por coluna

Opção A — endpoint dedicado:

```
GET /vendas/unificado/kanban/contagens?periodoInicial=...&...
→ { FINALIZADAS: 538, PENDENTE_EMISSAO: 12, COM_NFE: 546 }
```

Opção B — mesma rota com `limit=0` ou flag `somenteContagem=true` por coluna.

Requisito: **uma round-trip** (ou poucas) para os três números do cabeçalho, usando os **mesmos filtros** da listagem.

### 6.5. Filtro de escopo balcão

Parâmetro sugerido: `escopoKanban=balcao` que exclui vendas classificadas como delivery operacional (entrega/retirada com etapa logística), para não trafegar dados irrelevantes.

### 6.6. Ordenação

Manter padrão `dataCriacao desc` ou permitir `ordenarPor` alinhado ao que o Kanban já oferece (data, valor, etc.) — pode ser fase 2.

### 6.7. Testes

- Testes unitários do resolver de coluna (todos os cenários da seção 7).
- Testes de integração: filtro `colunaKanban` retorna só itens daquela coluna; contagem bate com `count` da listagem filtrada.

---

## 7. Regras de negócio: em qual coluna cada venda cai

Regras atuais no frontend (`getEtapaKanban`) — **o backend deve implementar a mesma lógica** (com ajuste planejado em rejeitadas).

### Modo Balcão — prioridade de avaliação (primeira regra que bater)

| Ordem | Condição | Coluna |
|-------|----------|--------|
| — | Pedido delivery operacional (entrega gestor em fluxo logístico) | *Fora do balcão* |
| 1 | Nota emitida ou cancelada com documento fiscal (`EMITIDA`/`CANCELADA` + documento) | `COM_NFE` |
| 2 | `statusFiscal = REJEITADA` **com** retorno SEFAZ (`codigoRetorno` ou `retornoSefaz`) | `COM_NFE` *(evolução desejada; hoje tudo REJEITADA vai para PENDENTE)* |
| 3 | `statusFiscal = REJEITADA` **sem** retorno SEFAZ | `PENDENTE_EMISSAO` *(evolução desejada)* |
| 3b | `statusFiscal = REJEITADA` *(comportamento atual simplificado)* | `PENDENTE_EMISSAO` |
| 4 | `statusFiscal` = `PENDENTE` ou `PENDENTE_AUTORIZACAO` | `COM_NFE` |
| 5 | Marcada para emissão e ainda não emitida (`solicitarEmissaoFiscal` + não `EMITIDA`) | `PENDENTE_EMISSAO` |
| 6 | `statusFiscal` = `EMITINDO` ou `CONTINGENCIA` | `PENDENTE_EMISSAO` |
| 7 | Possui `dataFinalizacao` | `FINALIZADAS` |
| 8 | Demais casos | `ABERTA` *(não exibida no balcão)* |

### Observações

- Vendas **canceladas** entram nas regras de cancelamento antes de qualquer coluna fiscal.
- **`solicitarEmissaoFiscal`** no DTO do backend corresponde a `solicitarFiscal` na view.
- A coluna `COM_NFE` agrega **vários** `statusFiscal` — por isso filtrar só por `statusFiscal` no cliente é insuficiente.

---

## 8. Contrato de API sugerido

### Listagem por coluna (evolução do endpoint atual)

**Request (exemplo):**

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `colunaKanban` | Sim* | `FINALIZADAS`, `PENDENTE_EMISSAO`, `COM_NFE` |
| `escopoKanban` | Recomendado | `balcao` — exclui delivery operacional |
| `periodoInicial` / `periodoFinal` | Conforme UX | Filtro de criação |
| `dataFinalizacaoInicio` / `Fim` | Opcional | Filtro de finalização |
| `origem` | Opcional | PDV / GESTOR / DELIVERY |
| `q` | Opcional | Busca textual |
| `offset` / `limit` | Sim | Paginação |

\*Para compatibilidade, chamadas **sem** `colunaKanban` podem manter comportamento atual.

**Response (inalterado na estrutura):**

```json
{
  "count": 546,
  "page": 1,
  "limit": 50,
  "hasNext": true,
  "hasPrevious": false,
  "items": [
    {
      "id": "...",
      "statusFiscal": "EMITIDA",
      "etapaKanbanBalcao": "COM_NFE",
      "...": "..."
    }
  ]
}
```

### Contagens

```json
{
  "FINALIZADAS": 538,
  "PENDENTE_EMISSAO": 12,
  "COM_NFE": 546
}
```

Mesmos filtros de período/origem/busca da listagem.

---

## 9. Plano de implementação em fases

### Fase 1 — Backend: regra + campo (sem quebrar cliente atual)

- Implementar `ResolverColunaKanbanBalcao` com testes.
- Incluir `etapaKanbanBalcao` em cada item do `GET /vendas/unificado`.
- Documentar no Swagger.

### Fase 2 — Backend: filtro e contagens

- Query `colunaKanban` + `escopoKanban=balcao`.
- Endpoint (ou variante) de contagens por coluna.

### Fase 3 — Frontend gestor

- Um `useInfiniteQuery` **por coluna** no modo balcão.
- Cabeçalho usa API de contagens.
- Remover `vendasPorColuna` que reclassifica lista global.
- Manter overrides locais só durante emissão (UX otimista).

### Fase 4 — Ajustes finos

- Rejeitada SEFAZ vs pré-SEFAZ (se ainda não na fase 1).
- Ordenação server-side opcional.
- Cache/patch por coluna após emitir/reemitir nota.

---

## 10. O que o frontend fará depois

- Parar de paginar uma lista global para alimentar três colunas.
- Três streams independentes (ou BFF agregador) com scroll por coluna.
- Confiar em `etapaKanbanBalcao` vindo da API; `getEtapaKanban()` vira fallback legado até remoção.
- Polling/refetch por coluna, sem reprocessar milhares de registros no browser.

---

## 11. Critérios de aceite

- [ ] Abrir Kanban balcão com período de alto volume: **cada coluna mostra cards relevantes na primeira página**, sem depender de sorte na ordem global.
- [ ] Número no cabeçalho de cada coluna = total do período na API (não só cards carregados).
- [ ] Scroll em uma coluna carrega **mais itens da mesma coluna**.
- [ ] Pedido rejeitado aparece na coluna correta conforme regra acordada (SEFAZ vs pré-SEFAZ).
- [ ] Pedidos delivery operacional **não aparecem** no balcão quando `escopoKanban=balcao`.
- [ ] Testes automatizados no backend cobrem as regras da seção 7.
- [ ] Swagger atualizado.

---

## 12. Resumo para repassar ao time de backend

*(Texto em linguagem simples — pode copiar e colar como descrição de tarefa.)*

---

### Tarefa: Melhorar a API de vendas unificadas para o Kanban de Pedidos (modo balcão)

**O problema**

Hoje a tela de Pedidos de Clientes (modo balcão) chama a listagem de vendas unificadas e recebe uma lista única, paginada de 50 em 50, com todos os tipos de pedido misturados. O sistema no navegador é quem decide se cada pedido vai para Finalizadas, Pendente emissão ou Com nota solicitada.

Isso está lento, confuso e frágil: as primeiras páginas quase não trazem pedidos de algumas colunas, o número no topo da coluna não reflete o total real do período, e toda mudança de regra fiscal precisa ser feita no front e no back separadamente.

**O que precisamos**

1. **Definir no backend, de forma oficial, em qual coluna do Kanban balcão cada venda deve aparecer** — usando os mesmos critérios que já usamos hoje (nota emitida, pendente na SEFAZ, marcada para emissão, finalizada, rejeitada, etc.). Pedidos de delivery operacional (fluxo de entrega) não devem entrar nesse quadro balcão.

2. **Devolver essa informação em cada item da listagem**, por exemplo um campo que diga a coluna: Finalizadas, Pendente emissão ou Com nota solicitada.

3. **Permitir buscar pedidos já filtrados por coluna** — ou seja, quando a tela pedir “me dê os pedidos da coluna Com nota solicitada deste período”, a API já retorna só esses, paginados, sem o front precisar baixar tudo e filtrar.

4. **Informar o total de pedidos por coluna** para o período e filtros selecionados (números do cabeçalho do Kanban), em uma consulta rápida, separada da listagem de cards se necessário.

5. **Garantir que os campos de rejeição fiscal** (`codigoRetorno`, `retornoSefaz`) continuem disponíveis na view/DTO em todos os ambientes, porque vamos precisar distinguir rejeição já enviada à SEFAZ (fica em Com nota) de rejeição antes da SEFAZ (fica em Pendente emissão).

6. **Cobrir com testes** as regras de classificação, para não voltarmos a ter pedidos “sumindo” de colunas.

**Resultado esperado**

A tela do gestor passa a pedir dados **por coluna**, com totais corretos, e o navegador só exibe e pagina — sem reclassificar milhares de pedidos. O Kanban fica mais rápido, previsível e fácil de manter.

**Prioridade sugerida**

Primeiro: campo de coluna em cada item + testes das regras.  
Depois: filtro por coluna na listagem + endpoint de contagens.

**Não é escopo desta tarefa**

Refatorar o Kanban de delivery (já usa outra API de pedidos delivery). Mudanças visuais no gestor — isso fica para o time de frontend após a API estar pronta.

---

*Documento preparado a partir da análise do fluxo em `FiscalFlowKanban`, `useVendasUnificadas` e módulo `vendas-unificadas` do jiffy-backend.*
