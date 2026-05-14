# Levantamento — Dashboard V2 (`dashboardV2.tsx`)

Documento de referência para as próximas fases: **o que migrar para o backend** e **refatoração por responsabilidades** (arquivo principal hoje ~2400 linhas).

**Arquivo principal:** `src/presentation/components/features/dashboard/dashboardV2.tsx`  
**Comparativo de séries:** `src/presentation/components/features/dashboard/dashboardV2ComparacaoChart.ts`

---

## 1. Visão geral

- **Tipo:** Client Component (`'use client'`).
- **Conteúdo:** filtros (empresa, período, intervalo personalizado com modal), faixa de faturamento, 4 cards de métricas, gráfico comparativo (Recharts), formas de pagamento (mini-donuts), Top produtos, Top garçons.
- **Estado global de dados:** React Query (`useQueryClient`, invalidações parciais no refresh).
- **Fuso horário:** `timezoneAgregacao` vindo de `useEmpresaMe` — impacta todos os intervalos enviados às APIs e o calendário.

---

## 2. Endpoints e integrações

### 2.1 Next.js API (BFF) — `fetch` + Bearer

| Uso na tela | Método / rota | Parâmetros relevantes |
|-------------|---------------|------------------------|
| Empresa + timezone | `GET /api/empresas/me` | `Authorization: Bearer` |
| Resumo (atual + anterior) | `GET /api/dashboard/resumo` | `dataFinalizacaoInicial`, `dataFinalizacaoFinal` (ISO) |
| Evolução / comparativo | `GET /api/dashboard/evolucao` | datas ISO, `status` (ex.: FINALIZADA/CANCELADA), `intervaloHora` opcional (15/30/60) |
| Top produtos | `GET /api/dashboard/top-produtos` | `periodo`, `limit`, datas opcionais |
| Top garçons | `GET /api/dashboard/top-garcons` | `periodo`, `limit`, datas opcionais; resposta inclui `totalUsuariosComVendas` |
| Faturamento por dia (calendário do modal) | `GET /api/dashboard/evolucao` | `status=FINALIZADA`; depois agregação **no cliente** por dia |

**Hooks correspondentes (pasta `src/presentation/hooks/`):**

- `useEmpresaMe.ts` → `/api/empresas/me`
- `useDashboardResumoQuery.ts` → `/api/dashboard/resumo`
- `useDashboardEvolucaoQuery.ts` → `/api/dashboard/evolucao`
- `useDashboardTopProdutosQuery.ts` → `/api/dashboard/top-produtos`
- `useDashboardTopGarconsQuery.ts` → `/api/dashboard/top-garcons`
- `useDashboardFaturamentoPorDiaQuery.ts` → `/api/dashboard/evolucao` + transformação em mapa dia → valor

### 2.2 API externa (browser) — `BuscarMetodosPagamentoDetalhadoUseCase`

Acionado por `useDashboardMetodosPagamentoDetalhadoQuery` (sem `fetch` direto no hook: instancia o use case).

- **Base:** `process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL`
- **Rotas típicas:**
  - `GET {base}/api/v1/operacao-pdv/vendas` (paginado, status FINALIZADA)
  - `GET {base}/api/v1/operacao-pdv/vendas/{id}` (muitas chamadas em paralelo, concorrência limitada)
  - `GET {base}/api/v1/pagamento/meios-pagamento` (listagem paginada)
  - `GET {base}/api/v1/pagamento/meios-pagamento/{id}` (meios faltantes no cache)

**Impacto:** alto volume de requisições e processamento no cliente; candidato forte a **consolidar no backend** (ex.: um único endpoint de dashboard para “métodos de pagamento agregados” no período).

### 2.3 Navegação (não é API de dashboard)

- `router.push('/relatorios-vendas')` com query `periodo` quando mapeável (`periodoV2ParaQueryRelatorios`).

---

## 3. Gráficos (Recharts)

| Bloco | Componentes | Fonte de dados |
|-------|-------------|----------------|
| Comparativo de vendas | `LineChart`, `Line`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip` | Duas queries `useDashboardEvolucaoQuery` (atual + anterior), mesma métrica (`FINALIZADA` ou `CANCELADA`) |
| Formas de pagamento | `PieChart` / `Pie` / `Cell` / `ResponsiveContainer` (componente `DonutFormaPagamento`) | `useDashboardMetodosPagamentoDetalhadoQuery` → entidades com `getPercentual`, `getValor`, etc. |

**Pós-processamento no front para o LineChart:** função `mergePontosEvolucaoComparacao` (`dashboardV2ComparacaoChart.ts`):

- Modo **dia:** alinha dias entre períodos; caso de **um único dia** soma todos os buckets da API.
- Modo **hora:** alinha por slot `HH:mm` entre as duas séries.
- Eixo Y: `calcularTicksEDominioYComparativo` no `dashboardV2.tsx` (domínio, ticks, limite de marcas).

---

## 4. Cálculos e regras no frontend (resumo)

| Área | O que o front faz hoje |
|------|-------------------------|
| Períodos | Converte calendário + fuso da empresa para UTC; período anterior; personalizado deslocado **30 dias**; `permiteOpcoesIntervaloPorHoraNoFuso` para habilitar buckets por hora |
| Banner faturamento | Comparação % entre totais do resumo atual vs anterior; estados sem base / erro / carregando |
| Cards | Ticket médio = `totalFaturado / countVendasEfetivadas`; itens/pedido = `countProdutosVendidos / countVendasEfetivadas`; badges de variação % (`badgeVariacaoPercentual`, `badgeTextoCancelamentos`) |
| Top produtos | Até 11 itens na API para detectar “há mais”; percentuais da **barra** relativos à **soma dos valores exibidos**; placeholders até 10 linhas; `maxValorProduto` para modo “vs. maior” |
| Top garçons | 10 linhas com placeholders; “Ver todos” se `totalUsuariosComVendas > 10`; **totais do rodapé** somam **toda** a lista retornada pela API — possível desalinhamento visual se a API devolve >10 itens mas só 10 linhas são mostradas |
| Donuts | Fatia principal = %; resto = `100 - pct`; cores por `formaPagamentoFiscal` normalizado + aliases |
| Calendário modal | `pontosEvolucaoParaMapaFaturamentoPorDia` — soma buckets por `yyyy-MM-dd` |
| Atualização | `textoUltimaAtualizacao` a partir de timestamp; intervalo 30s + `visibilitychange` para re-render |

**Constantes de negócio/UX no arquivo:** `LIMITE_TOP_PRODUTOS_V2_*`, `LIMITE_TOP_GARCONS_V2_*`, `DIAS_COMPARACAO_PERIODO_PERSONALIZADO = 30`, granularidade 15/30/60 min.

---

## 5. Estado, efeitos e refresh

- **Estados locais:** período global, granularidade, métrica do gráfico, filtros dos cards de ranking, modal de intervalo, rascunho de range/horas, mês do calendário, flags “lista completa” de produtos/garçons, `lojaId`, `dadosAtualizadosEm`, `tickRelogio`.
- **Efeitos:** espelhar período global nos selects de ranking; resetar listas completas ao mudar filtro; forçar `granularidade` = `dia` ou restaurar `intervalo_30` ao mudar elegibilidade de gráfico por hora; intervalo de 30s.
- **`handleAtualizarDashboard`:** invalida queries `evolucao`, `metodos-pagamento-detalhado`, `top-produtos`, `top-garcons`; `refetch` explícito de empresa + dois resumos; atualiza `dadosAtualizadosEm`.  
  **Nota:** invalidação não lista explicitamente a query key de **resumo**; refresh do resumo depende dos `refetch` manuais.

---

## 6. Funções utilitárias no `dashboardV2.tsx` (agrupamento)

- **Moeda / número:** `formatarMoeda`, `formatarContagemPedidos`, `formatarItensPorPedido`, `formatarPercentualMiniDonut`, `formatarTickEixoYReais`, `formatarHoraParaInputCalendar`
- **Gráfico Y:** `calcularTicksEDominioYComparativo`
- **Badges / métricas derivadas:** `badgeVariacaoPercentual`, `badgeTextoCancelamentos`, `ticketMedioResumo`, `itensPorPedidoResumo`
- **Mapeamento período ↔ API / relatórios:** `periodoSelectV2ParaOpcaoCalculatePeriodo`, `periodoTopoV2ParaFiltroTabelas`, `filtroTopProdutoV2ParaOpcaoCalculatePeriodo`, `filtroTopProdutoV2ParaApiPeriodo`, `periodoV2ParaQueryRelatorios`
- **Cópia / rótulos:** `tituloGraficoComparativoV2`, `rotuloLinhaGraficoPeriodoAtual/Anterior`, `tituloFaturamentoBanner`, `rotuloRodapeComparacaoCards`, `rotuloPeriodoTituloCard`, `textosComparacaoPeriodoAnterior`, `prefixoSemFaturamentoNaBase`, `textoUltimaAtualizacao`, `labelDataHoje`
- **Forma fiscal / cores:** `normalizarChaveFormaPagamentoFiscal`, `corPrincipalDonutPorFormaFiscal`, `intervaloMinutosAgregacaoGraficoV2`
- **UI:** `DonutFormaPagamento`, `IconeColocacaoTopGarcom`, `MetricCard`

---

## 7. Riscos e observações de arquitetura

1. **Arquivo muito grande** — mistura regras de período, derivação de dados, layout e gráficos; dificulta testes e revisão.
2. **Duas origens de dados** — BFF `/api/dashboard/*` vs agregação pesada na API externa no use case de métodos de pagamento (latência, erros e segurança heterogêneos).
3. **Top garçons — totais vs lista visível** — risco de inconsistência percebida pelo usuário (ver seção 4).
4. **Calendário** — segunda leitura de `evolucao` só para pintar dias; candidato a endpoint dedicado “faturamento por dia” no período do calendário.

---

## 8. Próximas fases (planejamento sugerido)

Este documento **fixa o estado atual**. Nas fases seguintes, por parte da tela:

1. **Levantar** o que pode/deve ir para o backend (agregações, comparações, séries já alinhadas, limites de ranking, métodos de pagamento).
2. **Refatorar** o front: extrair hooks por bloco, componentes de seção, utilitários compartilhados e tipos; reduzir `dashboardV2.tsx` a composição.

_Sessão de análise que originou este arquivo: levantamento estático do código e dos hooks em `src/presentation/hooks` e do use case `BuscarMetodosPagamentoDetalhadoUseCase`._
