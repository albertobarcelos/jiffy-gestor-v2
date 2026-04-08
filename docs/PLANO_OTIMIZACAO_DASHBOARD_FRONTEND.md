# Plano de Refinamento de Performance do Dashboard (Frontend)

## Objetivo

Reduzir a quantidade de requisições disparadas ao abrir o `dashboard`, melhorando tempo de carregamento percebido e diminuindo carga no servidor, **sem alterar o backend externo** (API principal).

## Escopo

- Inclui:
  - Camada frontend (`app/dashboard` e componentes da feature dashboard).
  - Camada BFF já existente no projeto (`app/api/*` do Next.js), quando necessário para agregação.
  - Estratégia de cache e compartilhamento de dados entre componentes.
- Não inclui:
  - Alterações em banco de dados.
  - Mudanças em contratos da API externa.
  - Refatoração visual/UX fora do necessário para carregamento.

---

## Diagnóstico do cenário atual (resumo)

Hoje o dashboard possui múltiplos componentes com `useEffect` independentes, cada um com seu próprio `fetch`, resultando em:

1. Requisições repetidas para `/api/vendas` com filtros semelhantes.
2. Cálculos derivados (ex.: total cancelado, mesas abertas) gerando novas chamadas em vez de reaproveitamento.
3. Possível duplicidade de execução em ambiente de desenvolvimento por `reactStrictMode`.
4. Falta de uma “fonte única” para dados de dashboard.

---

## Estratégia recomendada (somente frontend)

## Fase 1 - Quick wins (baixo risco, alto impacto)

### 1.1 Padronizar consumo com React Query

- Migrar cargas principais do dashboard para `useQuery` (onde ainda houver `useEffect + useState` para fetch).
- Garantir `queryKey` estável e sem variações desnecessárias.
- Usar `staleTime` coerente (já existe no provider, mas padronizar por query quando fizer sentido).

**Resultado esperado:** menor duplicidade por remount/re-render e melhor reaproveitamento automático de cache.

### 1.2 Evitar refetch redundante por componente

- Unificar parâmetros de período/status em um objeto serializável e reutilizável.
- Evitar que múltiplos componentes façam consultas equivalentes com pequenas diferenças de montagem.

**Resultado esperado:** menos chamadas duplicadas quando o dashboard monta.

### 1.3 Higienizar gatilhos de atualização

- Revisar onde existe `window.location.reload()` em erro para trocar por `queryClient.invalidateQueries`/`refetch` pontual.
- Manter invalidação granular por chave.

**Resultado esperado:** menor custo de recarga total da tela.

---

## Fase 2 - Consolidação de dados (frontend + BFF Next)

### 2.1 Criar “query base” de dashboard

Definir uma query principal com chave única, por exemplo:

- `['dashboard', 'resumo', filtros]`

Essa query deve concentrar dados necessários para:

- cards de métricas;
- total cancelado;
- mesas abertas;
- totais por status.

> Observação: como não haverá mudança no backend externo, a agregação pode acontecer na camada BFF (`app/api`) ou no próprio frontend (funções de transformação), priorizando BFF quando reduzir round-trips.

### 2.2 Derivar múltiplos blocos a partir da mesma query

Usar `select` (React Query) ou funções puras para extrair:

- payload para cards;
- payload para indicadores auxiliares;
- subset para widgets simples.

**Regra:** evitar novo `fetch` quando o dado já existe na query base.

### 2.3 Reaproveitar dados de “Top Produtos”

- Manter modelo atual de 1 carga alimentando tabela + gráficos, mas migrar para query compartilhada.
- Evitar acoplamento por `onDataLoad` quando possível; preferir leitura do mesmo cache via `queryKey`.

**Resultado esperado:** simplifica fluxo e reduz risco de inconsistência entre componentes.

---

## Fase 3 - Organização de arquitetura frontend

### 3.1 Criar camada de hooks da feature dashboard

Organizar em algo como:

- `useDashboardResumoQuery`
- `useDashboardTopProdutosQuery`
- `useDashboardEvolucaoQuery`
- `useDashboardUltimasVendasQuery` (se continuar isolada)

Cada hook:

- recebe filtros padronizados;
- retorna dados já transformados para uso direto na UI;
- centraliza tratamento de erro/loading.

### 3.2 Tipagem forte de contratos

- Criar/ajustar tipos DTO em `src/application/dto` ou `src/shared/types`.
- Garantir que transformação para entidades (`DashboardVendas`, etc.) seja previsível e sem `any`.

### 3.3 Separar “buscar” de “calcular”

- `fetch`: somente obtenção de dados.
- `mapper/calculadora`: derivação de métricas.

**Resultado esperado:** manutenção mais simples e menor chance de múltiplas chamadas por cálculo.

---

## Fase 4 - Instrumentação e validação de ganho

### 4.1 Métricas de comparação (antes vs depois)

Medir no fluxo `login -> dashboard`:

- número total de requests;
- número de requests para `/api/vendas`;
- tempo até cards renderizarem;
- tempo até dashboard “estável”.

### 4.2 Critérios de sucesso sugeridos

- Redução de 30% a 60% no total de requests do dashboard.
- Eliminar chamadas redundantes idênticas no mesmo ciclo de montagem.
- Nenhuma regressão funcional em filtros de período/status.

### 4.3 Cenários de teste mínimo

- Período padrão (`Últimos 7 Dias`).
- Troca de período para `Hoje`.
- Datas personalizadas.
- Alteração de status no gráfico de evolução.
- Navegação de ida/volta entre dashboard e outra página (verificar cache).

---

## Fase 5 - Rollout seguro

### 5.1 Implementação incremental

1. Migrar primeiro `MetricCards` para query compartilhada.
2. Consolidar `TopProdutos`.
3. Consolidar evolução/últimas vendas.
4. Remover chamadas antigas e código morto.

### 5.2 Feature flag opcional

Se quiser reduzir risco:

- Manter estratégia antiga e nova por flag de ambiente.
- Liberar gradualmente para validação interna.

### 5.3 Plano de rollback

- Manter commits por etapa e reversíveis.
- Em caso de regressão, voltar somente o bloco impactado.

---

## Riscos e mitigação

- **Risco:** cache servir dado “defasado”.  
  **Mitigação:** ajustar `staleTime` por bloco e invalidar após ações críticas.

- **Risco:** agregação frontend aumentar complexidade.  
  **Mitigação:** criar hooks pequenos e testes unitários dos mappers.

- **Risco:** diferenças de resultado entre blocos após consolidação.  
  **Mitigação:** snapshot de respostas e testes de consistência entre métricas.

---

## Backlog técnico sugerido (ordem de execução)

1. Mapear todas as chamadas atuais do dashboard por componente.
2. Definir contrato do “resumo dashboard” no frontend/BFF.
3. Implementar `useDashboardResumoQuery`.
4. Migrar `MetricCards` para o novo hook.
5. Migrar `TopProdutos` para query compartilhada.
6. Revisar `UltimasVendas` para uso de cache (ou manter isolada com política otimizada).
7. Validar métricas antes/depois.
8. Limpar código legado.

---

## Resultado esperado final

Ao concluir esse refinamento:

- dashboard com menos requisições concorrentes;
- melhor tempo de render inicial;
- menor ruído de rede em ambiente de desenvolvimento;
- base preparada para futuras otimizações sem depender de backend externo.

