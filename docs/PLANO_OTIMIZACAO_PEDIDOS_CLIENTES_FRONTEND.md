# Plano de Otimizacao - Pagina Pedidos de Clientes (Frontend)

## Objetivo

Entender as requisicoes disparadas ao abrir `pedidos-clientes` e estruturar um plano de refinamento para reduzir chamadas e tempo de carga usando apenas frontend/BFF (`app/api`), sem alterar backend externo.

## Contexto observado no log

Trecho analisado:

- `GET /pedidos-clientes`
- `GET /api/vendas/unificado?offset=0&limit=100`
- `GET /api/meios-pagamentos?ativo=true&limit=100&offset=0`
- `GET /api/clientes?ativo=true&limit=100&offset=0`
- `GET /api/grupos-produtos?ativo=true&limit=100&offset=0`

---

## O que cada requisicao faz (mapeamento para codigo)

### 1) `GET /pedidos-clientes` (aparece mais de uma vez)

- Origem: rota `app/pedidos-clientes/page.tsx`.
- A pagina carrega dinamicamente `FiscalFlowKanban`.
- Em dev, repeticao pode ocorrer por comportamento de compilacao/StrictMode e navegacao interna.

### 2) `GET /api/vendas/unificado?offset=0&limit=100`

- Origem: hook `useVendasUnificadas` usado em `FiscalFlowKanban`.
- Funcao: carregar o dataset principal do kanban (vendas unificadas) com filtros atuais.
- Essa chamada e esperada no carregamento da tela.

### 3) `GET /api/grupos-produtos?ativo=true&limit=100&offset=0`

- Origem: `NovoPedidoModal` (hook `useGruposProdutos`).
- Problema atual: `NovoPedidoModal` fica montado no `FiscalFlowKanban` mesmo com `open=false`.
- Efeito: a query roda ao entrar na pagina, antes do usuario abrir o modal.

### 4) `GET /api/meios-pagamentos?ativo=true&limit=100&offset=0`

- Origem: `NovoPedidoModal` (hook `useMeiosPagamentoInfinite`).
- Mesmo padrao: query dispara com modal fechado, por montagem antecipada do componente.

### 5) `GET /api/clientes?ativo=true&limit=100&offset=0`

- Origem: `SeletorClienteModal` (hook `useClientesInfinite`).
- Problema atual: `SeletorClienteModal` tambem fica montado no kanban com `open=false`.
- Resultado: clientes sao buscados sem o usuario pedir.

---

## Diagnostico principal

O excesso de requisicoes na abertura de `pedidos-clientes` nao vem so da tela principal, mas de **modais fechados montados antecipadamente** que disparam queries na inicializacao.

Em termos praticos:

- essencial na entrada: `vendas/unificado`;
- antecipavel (deveria ser lazy): `clientes`, `meios-pagamentos`, `grupos-produtos`.

---

## Plano de melhoria (somente frontend)

## Fase 1 - Reducao imediata de chamadas desnecessarias

### 1.1 Montagem condicional de modais pesados

No `FiscalFlowKanban`, renderizar modal apenas quando necessario:

- `NovoPedidoModal` somente quando `novoPedidoModalOpen === true` (ou modo visualizacao aberto).
- `SeletorClienteModal` somente quando `seletorClienteVendaOpen === true`.

**Impacto esperado:** elimina as chamadas de clientes/meios/grupos ao apenas abrir a pagina.

### 1.2 Gating das queries por estado `open`

Mesmo com montagem condicional, reforcar no hook/componente:

- usar `enabled: open && ...` nas queries de dados de modal.

**Impacto esperado:** evita chamadas acidentais por remount ou reuso de componente.

---

## Fase 2 - Reaproveitamento de dados no frontend

### 2.1 Query keys consistentes para cache compartilhado

Padronizar e documentar chaves para:

- `grupos-produtos`;
- `meios-pagamentos`;
- `clientes`.

Assim, ao reabrir modal, os dados podem vir do cache (sem nova chamada imediata), respeitando `staleTime`.

### 2.2 Prefetch intencional (opcional)

Se quiser UX mais rapida ao abrir modal:

- fazer prefetch no clique de "Novo Pedido" (ou hover), em vez de no carregamento da pagina.

**Trade-off:** preserva performance inicial e ainda acelera abertura do modal.

---

## Fase 3 - Ajuste fino de politica de refetch

### 3.1 Revisar configuracoes agressivas em listas de modal

Exemplo observado: `useGruposProdutos` com `refetchOnMount: true` e `refetchOnWindowFocus: true`.

Para fluxo de modal:

- considerar `refetchOnWindowFocus: false`;
- manter invalidez manual quando houver alteracao real (ex.: cadastro/edicao).

### 3.2 Evitar `cache: 'no-store'` onde nao e necessario

Aplicar somente quando dado precisa ser sempre realtime.
Para catálogos (clientes, grupos, meios), cache curto costuma ser suficiente.

---

## Priorizacao sugerida

1. Montagem condicional dos modais no kanban.
2. `enabled` dependente de `open` nas queries dos modais.
3. Revisao de `refetchOnWindowFocus/refetchOnMount` nas listas auxiliares.
4. Prefetch orientado por interacao do usuario (opcional).

---

## Metricas para validar ganho

Comparar antes/depois ao abrir `pedidos-clientes`:

- total de requests disparadas nos primeiros 5 segundos;
- requests para `clientes`, `meios-pagamentos`, `grupos-produtos` sem abrir modal;
- tempo ate renderizacao interativa do kanban.

### Criterio de sucesso

- manter apenas a chamada essencial (`vendas/unificado`) no carregamento inicial da pagina;
- reduzir em >= 3 requests no primeiro carregamento de `pedidos-clientes`;
- sem regressao funcional ao abrir os modais.

---

## Riscos e mitigacao

- **Risco:** primeira abertura de modal ficar um pouco mais lenta.  
  **Mitigacao:** prefetch no clique/hover e skeleton no modal.

- **Risco:** dados de listas auxiliares ficarem defasados.  
  **Mitigacao:** invalidacao pontual apos create/update, sem refetch global agressivo.

---

## Observacao sobre ambiente de desenvolvimento

Duplicidades de `GET /pedidos-clientes` podem ocorrer em dev por comportamento de compilacao/StrictMode.
O foco deste plano e eliminar chamadas realmente desnecessarias da regra de negocio (modais fechados carregando dados).

