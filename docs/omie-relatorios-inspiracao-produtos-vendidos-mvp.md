# Inspiração Omie — personalização de relatórios → Produtos Vendidos MVP

> Análise do artigo [Personalizando seus Relatórios | Ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/1413026-personalizando-seus-relatorios) e tradução para o que o **Jiffy Gestor** já tem no BFF/UI, com propostas para evoluir `RelatoriosProdutosVendidosMvpPage.tsx`.  
> **Documento vivo** — complementa [`relatorio-produtos-vendidos-mvp.md`](./relatorio-produtos-vendidos-mvp.md).

**Última revisão:** 2026-05-18  
**Contexto Omie:** relatórios de **vendas/financeiro** (modelo tipo cubo: filtros, linhas, colunas, valores).  
**Contexto Jiffy:** relatório de **produtos vendidos** (tabela + agregados), fonte PDV finalizada via BFF.

---

## Índice

1. [O que o Omie propõe (resumo do artigo)](#1-o-que-o-omie-propõe-resumo-do-artigo)
2. [Tradução do modelo Omie para o nosso relatório](#2-tradução-do-modelo-omie-para-o-nosso-relatório)
3. [Inventário de campos já disponíveis no projeto](#3-inventário-de-campos-já-disponíveis-no-projeto)
4. [Gap: Omie vs tela atual do Jiffy](#4-gap-omie-vs-tela-atual-do-jiffy)
5. [Propostas de UX (alinhadas ao pedido)](#5-propostas-de-ux-alinhadas-ao-pedido)
6. [Catálogo sugerido — seletor de colunas](#6-catálogo-sugerido--seletor-de-colunas)
7. [Somatórias e totais personalizados](#7-somatórias-e-totais-personalizados)
8. [Gráficos sob demanda (não na carga inicial)](#8-gráficos-sob-demanda-não-na-carga-inicial)
9. [Salvar layout / relatório personalizado (futuro)](#9-salvar-layout--relatório-personalizado-futuro)
10. [Ordenação multi-coluna](#10-ordenação-multi-coluna)
11. [Roadmap sugerido (fases)](#11-roadmap-sugerido-fases)
12. [Changelog](#12-changelog)

---

## 1. O que o Omie propõe (resumo do artigo)

Fonte: [Personalizando seus Relatórios — Ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/1413026-personalizando-seus-relatorios#h_4c2f598541) (atualizado em nov/2025 no site).

### 1.1 Ideia central

- Gerar um relatório padrão do módulo.
- Abrir o painel **“Campos”** para montar a visão: o que entra como **filtro**, **linha**, **coluna** e **valor** (modelo analítico / cubo).
- **Aplicar** → a tela atualiza sem sair do relatório.
- Opcional: **Salvar** layout (nome, fixar no menu, compartilhar com usuários).
- **Atualizar** em tempo real (refresh sem fechar).
- **Ordenar** por uma ou mais colunas (Ctrl + cliques nas setas de ordenação).
- Filtros granulares por campo (ícone de engrenagem em algumas dimensões, ex.: datas de previsão).

### 1.2 Estrutura “Campos” no Omie

| Bloco Omie | Função típica |
|------------|----------------|
| **(1) Campos / dimensões principais** | O que identifica cada registro (ex.: cliente, produto, data) |
| **(2) Filtros** | Restringe o conjunto antes de agregar |
| **(3) Linhas** | Agrupamento vertical (hierarquia) |
| **(4) Colunas** | Agrupamento horizontal (pivot) |
| **(5) Valores** | Métricas somadas/contadas (receita, quantidade, etc.) |
| **(6) Campos calculados** | Fórmulas sobre outros campos |

No nosso MVP **não há pivot** hoje: a analogia mais próxima é **filtros** + **colunas da tabela** + **somatórias no rodapé/cards**.

### 1.3 Outros recursos citados no artigo

| Recurso Omie | Descrição |
|--------------|-----------|
| Salvar relatório personalizado | Biblioteca “Meus Relatórios”, até 10 fixados no menu |
| Compartilhar | Visualização por outros; edição gera **cópia** do personalizado |
| Atualizar | Botão refresh mantendo layout |
| Excluir personalizado | Gestão da biblioteca |
| Ordenação múltipla | Várias colunas com Ctrl |

---

## 2. Tradução do modelo Omie para o nosso relatório

| Conceito Omie | Equivalente no Jiffy (hoje ou proposto) |
|---------------|----------------------------------------|
| Filtros | `MvpFiltersBar` → query BFF (`periodo`, `grupoIds`, `q`, faixas valor/qtd, `sort`) |
| Campos exibidos (colunas) | Colunas fixas em `MvpProdutosTable` — **proposta:** painel “Colunas” |
| Valores / somatórias | `totaisPeriodo`, KPIs, rodapé “Exibindo N de totalFiltrado” — **proposta:** linha de totais configurável |
| Linhas × Colunas (pivot) | **Fora de escopo MVP**; possível fase 3 (ex.: grupo × dia) |
| Campos calculados | Parcial: `deltaPrecoVsCardapioPercentual`, `precoMedioVenda`; margem mock |
| Gráficos sempre visíveis | Omie mistura tabela + visualização; **pedido Jiffy:** gráficos **opcionais** por botão |
| Salvar layout | Não existe — `localStorage` ou API futura |
| Atualizar | Implícito ao mudar filtros; **proposta:** botão “Atualizar” explícito (`refetch`) |
| Ordenação | Um `sort` global na API — **proposta:** ordenar também por coluna visível (client) ou manter sort API |

---

## 3. Inventário de campos já disponíveis no projeto

Dados que **já chegam** do `GET /api/relatorios/produtos-vendidos/mvp` (ver tipos em `src/shared/types/`).

### 3.1 Por linha de produto — `RelatorioProdutoVendidoLinhaDTO`

| Campo API | Tipo | Exibido hoje? | Grupo sugerido no seletor |
|-----------|------|---------------|---------------------------|
| `produtoId` | string | Não (só key) | Identificação |
| `nome` | string | Sim | Identificação |
| `grupoId` | string \| null | Não | Identificação |
| `grupoNome` | string \| null | Sim (lg+) | Identificação |
| `quantidade` | number | Sim | Vendas |
| `valorTotal` | number | Sim | Vendas |
| `precoMedioVenda` | number | Sim | Vendas |
| `percentualFaturamento` | number | **Não** | Participação no filtro |
| `percentualUnidades` | number | **Não** | Participação no filtro |
| `classeAbc` | A \| B \| C | Sim | Curva ABC |
| `valorCardapio` | number \| null | **Não** | Preço / cardápio |
| `deltaPrecoVsCardapioPercentual` | number \| null | **Não** | Preço / cardápio |
| `margemBrutaPercentual` | number \| null | **Não** | Margem (mock se `mock=1`) |

### 3.2 Por linha — comparativo — `ProdutoRankingAnteriorDTO` (merge na tabela)

| Campo API | Exibido hoje? | Grupo sugerido |
|-----------|---------------|----------------|
| `variacaoQtdPct` | Sim (% Qtd) | vs período anterior |
| `variacaoValorPct` | Sim (% Fat.) | vs período anterior |
| `liderValorNoPeriodo` | Não | vs período anterior |
| `maiorCrescimentoQtdPct` | Não | vs período anterior |
| `nome`, `liderNomeNoPeriodo` | Não | Metadados |

### 3.3 Totais do relatório — `totaisPeriodo` + paginação

| Campo API | Significado | Exibido hoje? |
|-----------|-------------|---------------|
| `totaisPeriodo.quantidadeTotal` | Unidades no período PDV (base agregação) | **Não** |
| `totaisPeriodo.valorTotal` | Faturamento no período PDV | **Não** (KPI usa agregado filtrado) |
| `totaisPeriodo.skusDistintos` | SKUs distintos no período | **Não** |
| `totalFiltrado` | Linhas após filtros (produtos distintos) | Rodapé parcial |
| `limit`, `offset` | Paginação | Interno |

### 3.4 KPIs — `RelatorioProdutosVendidosMvpKpisDTO`

| Campo | Card atual |
|-------|------------|
| `faturamentoAtual` / `variacaoPercentualFat` | Faturamento período |
| `quantidadeVendidaAtual` / `variacaoPercentualQuantidade` | Unidades vendidas |
| `ticketMedioPorItemNoPeriodo` / `variacaoPercentualTicketMedio` | Ticket médio / unidade |
| `produtoLiderNomeQuantidade` + unidades | Líder em quantidade |
| `produtoComMaiorCrescimentoNome` + `Pct` | Maior crescimento (condicional) |

**Nota:** KPIs são agregados do **conjunto filtrado** (não só da página visível). Omie-style “somatórias” no rodapé podem mostrar **página atual** vs **total filtrado** vs **período PDV inteiro** (`totaisPeriodo`).

### 3.5 Gráficos (payload já pronto)

| Bloco | Campos | Exibido hoje |
|-------|--------|--------------|
| `participacaoGrupos[]` | `nomeGrupo`, `valorTotal`, `pct` | Donut sempre |
| `serieTemporal[]` | `dia`, `valores[{produtoId, valor, nome}]`, `totalDia` | Linhas sempre |
| `mockFlags` | `serieSimplificada`, `comparativoPeriodoAnteriorOmitido` | Parcial (texto aviso) |

### 3.6 Filtros já suportados pela API (não são “colunas”)

| Filtro UI | Query BFF |
|-----------|-----------|
| Período / datas | `periodo`, `dataFinalizacaoInicial/Final`, `timezone` |
| Ordenação | `sort` (4 opções) |
| Grupo | `grupoIds` |
| Nome | `q` |
| Valor min/max | `valorMin`, `valorMax` |
| Qtd min/max | `qtdMin`, `qtdMax` |

---

## 4. Gap: Omie vs tela atual do Jiffy

| Recurso inspirado Omie | Situação no Jiffy MVP |
|------------------------|------------------------|
| Escolher colunas da lista | Colunas **fixas** (9 visíveis) |
| Somatórias personalizadas | Só rodapé de contagem; `totaisPeriodo` ignorado |
| Gráficos sob demanda | KPIs + 2 gráficos **sempre** após load |
| Painel “Campos” unificado | Filtros espalhados na barra |
| Salvar layout | Não |
| Atualizar explícito | Só refetch ao filtrar |
| Ordenação multi-coluna | Um `sort` global |
| Campos calculados | Só os que o BFF já calcula |
| Filtro por engrenagem em dimensão | Filtros globais (equivalente funcional) |

---

## 5. Propostas de UX (alinhadas ao pedido)

### 5.1 Layout alvo (wireframe textual)

```
┌──────────────────────────────────────────────────────────────┐
│ Produtos vendidos                    [Atualizar] [Campos ▼]   │
├──────────────────────────────────────────────────────────────┤
│ Filtros (período, grupo, busca, …)              [Aplicar]     │
├──────────────────────────────────────────────────────────────┤
│ [Opcional] Faixa resumo: totais escolhidos (somatórias)       │
├──────────────────────────────────────────────────────────────┤
│ TABELA (foco principal — colunas configuráveis)               │
├──────────────────────────────────────────────────────────────┤
│ [Participação por grupo] [Evolução diária] [KPIs expandidos]  │  ← botões toggle
│   (painéis colapsados por padrão; abrem sob demanda)           │
└──────────────────────────────────────────────────────────────┘
```

**Princípio:** primeira pintura = **filtros + tabela + somatórias**; gráficos/KPIs densos só quando o usuário pedir (menos ruído, carga mais rápida percebida — alinhado ao pedido de não ter gráficos inicialmente).

### 5.2 Botão / drawer “Campos” (inspirado Omie)

Painel lateral ou modal com abas:

| Aba | Conteúdo |
|-----|----------|
| **Colunas** | Checkboxes dos campos §6 (ordem drag opcional) |
| **Somatórias** | Checkboxes: quais totais no rodapé / faixa acima da tabela §7 |
| **Gráficos** | Quais visualizações habilitar ao expandir §8 |

Botão **Aplicar** (como Omie) → persiste em `localStorage` por usuário/empresa até existir “Salvar relatório” no servidor.

### 5.3 KPIs

- **Padrão fechado:** 0 cards na carga inicial **ou** faixa compacta (1 linha) com 3 números principais.
- **Expandido:** grid atual `MvpKpiGrid` (5 cards) via toggle “Exibir resumo do período”.

Dados já existem; só mudança de layout/visibilidade.

---

## 6. Catálogo sugerido — seletor de colunas

Colunas **default** (comportamento atual):

- `#`, ABC, Produto, Grupo, Qtd, % Qtd, % Fat., Faturamento, Preço médio

Colunas **opcionais** (dados já na API):

| id coluna | Label UI | Fonte |
|-----------|----------|--------|
| `percentualUnidades` | % un. no filtro | `percentualUnidades` |
| `percentualFaturamento` | % fat. no filtro | `percentualFaturamento` |
| `valorCardapio` | Preço cardápio | `valorCardapio` |
| `deltaPrecoVsCardapio` | Δ% vs cardápio | `deltaPrecoVsCardapioPercentual` |
| `margemBruta` | Margem bruta % | `margemBrutaPercentual` |
| `liderValor` | Líder fat. período | `ranking.liderValorNoPeriodo` (ícone/badge) |
| `maiorCrescimento` | Maior cresc. qtd | `ranking.maiorCrescimentoQtdPct` |

**Implementação:** array `colunasVisiveis: ColunaId[]` em estado ou `localStorage`; `MvpProdutosTable` renderiza dinamicamente (padrão flex já existe).

**Persistência mínima (fase 1):**

```ts
localStorage['jiffy:relatorio-produtos-vendidos:colunas-v1']
```

---

## 7. Somatórias e totais personalizados

Inspirado em **“Valores”** do Omie: escolher quais agregados aparecem.

### 7.1 Fontes de verdade já no payload

| Métrica | Origem | Escopo |
|---------|--------|--------|
| Soma qtd / fat. **página visível** | `sum(items na página)` | Só linhas carregadas no scroll |
| Soma qtd / fat. **total filtrado** | Recalcular no BFF ou somar todas as páginas (custoso) | Ideal: BFF expor `totaisFiltrados: { qtd, valor }` |
| Período PDV inteiro | `totaisPeriodo` | Já na 1ª página |
| SKUs distintos filtrados | `totalFiltrado` | Já no rodapé |
| SKUs período | `totaisPeriodo.skusDistintos` | Não exibido |

### 7.2 UI proposta

Faixa **acima** ou **abaixo** da tabela (checkboxes em “Campos → Somatórias”):

| ID somatória | Label exemplo | Dados |
|--------------|---------------|--------|
| `totais_filtrado_qtd` | Total unidades (filtro) | Requer campo BFF ou fetch all pages |
| `totais_filtrado_valor` | Total faturamento (filtro) | idem |
| `totais_periodo_qtd` | Unidades no período (PDV) | `totaisPeriodo.quantidadeTotal` |
| `totais_periodo_valor` | Faturamento no período (PDV) | `totaisPeriodo.valorTotal` |
| `totais_periodo_skus` | SKUs no período | `totaisPeriodo.skusDistintos` |
| `media_preco_filtrado` | Preço médio ponderado | `valorTotal/qtd` agregado |

**Default sugerido:** `totais_periodo_valor`, `totais_periodo_qtd`, `totalFiltrado` (SKUs).

### 7.3 Gap técnico

- `totaisPeriodo` reflete o **período PDV**, não necessariamente o mesmo recorte que `totalFiltrado` (com `q`, faixas, grupo). Documentar na UI: *“Período PDV”* vs *“Com filtros aplicados”*.
- Para somatória **filtrada** fiel sem baixar todas as páginas: adicionar no BFF `totaisFiltrados: { quantidade, valor }` (já existe internamente como `sumValorFiltrado` / soma qtd no pipeline).

---

## 8. Gráficos sob demanda (não na carga inicial)

### 8.1 Comportamento desejado

| Painel | Default | Toggle | Dados quando aberto |
|--------|---------|--------|---------------------|
| KPIs resumo | **Oculto** ou minimizado | “Exibir KPIs” | `kpis` (+ comparativo 2ª fase) |
| Participação grupos | **Oculto** | “Gráfico: grupos” | `participacaoGrupos` (já na 1ª página) |
| Evolução diária | **Oculto** | “Gráfico: evolução” | `serieTemporal` (já na 1ª página) |

**Importante:** hoje a 1ª request **já calcula** série e participação no BFF. Esconder na UI **não reduz** custo de servidor na fase 1; reduz **complexidade visual** e tempo de render no cliente.

### 8.2 Otimização futura (fase 2)

Query params BFF:

- `incluirParticipacao=0`
- `incluirSerie=0` (já existe `serie=0`)

Só buscar blocos pesados quando o usuário abrir o toggle (nova request ou lazy no mesmo endpoint).

### 8.3 Seleção de “informações” no gráfico (inspirado Omie)

Quando abrir um gráfico, permitir:

| Gráfico | Seleção |
|---------|---------|
| Participação | Top N grupos (5 / 10 / todos) — hoje fixo 10 |
| Evolução | Multi-select produtos (default top 5 por valor); dados em `serieTemporal[].valores` |
| KPIs | Quais cards mostrar (subset dos 5) |

Produtos disponíveis para evolução: união de `items[].produtoId` + nomes em `serieTemporal`.

---

## 9. Salvar layout / relatório personalizado (futuro)

Espelho do Omie (nome, fixar, compartilhar):

| Fase | Escopo |
|------|--------|
| **1** | `localStorage`: colunas, somatórias, toggles gráficos, ordem |
| **2** | API `POST /api/relatorios/layouts` por empresa + usuário |
| **3** | Compartilhar read-only; edição gera cópia (regra Omie) |

Payload sugerido:

```json
{
  "nome": "Produtos — margem e ABC",
  "colunas": ["nome", "grupoNome", "quantidade", "margemBruta", "classeAbc"],
  "somatórias": ["totais_periodo_valor", "totais_filtrado_qtd"],
  "graficos": { "kpis": false, "participacao": true, "evolucao": false },
  "filtros": { "filtroPeriodo": "30dias", "sort": "valor_desc" }
}
```

---

## 10. Ordenação multi-coluna

Omie: Ctrl + várias colunas.

No Jiffy:

- **Hoje:** `sort` único na API (`quantidade_desc`, etc.) — eficiente para lista paginada.
- **Proposta leve:** manter sort na API; colunas só reordenam **página atual** (limitado).
- **Proposta forte:** API aceitar `sort` composto ou sort por coluna clicável com refetch.

Prioridade **baixa** se o sort global no filtro já cobre 80% dos casos.

---

## 11. Roadmap sugerido (fases)

### Fase 1 — UI only (sem mudar BFF) ✅ (2026-05-18)

- [x] Gráficos + KPIs **colapsados por padrão**; toggles na toolbar.
- [x] Drawer **“Personalizar”** com abas Colunas + Somatórias.
- [x] Colunas opcionais §6 em `MvpProdutosTable`.
- [x] Faixa de somatórias usando `totaisPeriodo` + `totalFiltrado` + soma da **página atual** (com rótulo claro).
- [x] Botão **Atualizar** (`refetch` queries).
- [x] Persistência `localStorage` (`mvpPersonalizacao.ts` + `useMvpPersonalizacao`).

### Fase 2 — BFF + carregamento SPA ✅ (2026-05-18)

- [x] `totaisFiltrados: { quantidade, valor }` na resposta base.
- [x] Carga base sem gráficos (`participacao`/`serie` opt-in; default leve).
- [x] Blocos lazy: `somenteParticipacao=1`, `somenteSerie=1` + React Query sob demanda.
- [x] Comparativo (`somenteComparativo=1`) só quando painel KPIs ou colunas % vs período ant.
- [x] Somatórias “com filtros” no seletor (`totais_filtrado_*`).

### Fase 3 — Produto completo estilo Omie

- [ ] Salvar/compartilhar layouts.
- [ ] Campos calculados configuráveis (se negócio definir fórmulas).
- [ ] Pivot grupo × período (se fizer sentido).

---

## 12. Changelog

| Data | Alteração |
|------|-----------|
| 2026-05-18 | Documento inicial: análise Omie + mapeamento campos Jiffy + propostas UX |

---

## Referências

- [Personalizando seus Relatórios — Ajuda Omie](https://ajuda.omie.com.br/pt-BR/articles/1413026-personalizando-seus-relatorios)
- [Relatório Produtos Vendidos MVP (estado atual Jiffy)](./relatorio-produtos-vendidos-mvp.md)
