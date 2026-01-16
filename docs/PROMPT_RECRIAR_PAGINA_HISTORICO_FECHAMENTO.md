# Prompt Detalhado: Recriar Página de Histórico de Fechamento de Caixa em Next.js

## 📋 Visão Geral

Esta página exibe um histórico de todas as operações de fechamento de caixa realizadas no sistema, permitindo filtrar por período, status, terminal e realizar buscas. A página implementa paginação infinita (scroll infinito) e exibe os dados em formato de tabela com possibilidade de visualizar detalhes de cada operação.

**Rota:** `/historico-fechamento`  
**Título:** "Histórico de Fechamento de Caixa"

---

## 🎨 Estrutura de Layout

### Layout Principal

A página utiliza um layout de duas colunas:
- **Coluna Esquerda (Desktop/Tablet):** Sidebar de navegação (JiffySidebar)
- **Coluna Direita:** Conteúdo principal da página

### Estrutura do Conteúdo Principal

```
┌─────────────────────────────────────────────────────────┐
│ Título: "Histórico de Fechamento de Caixa"             │
├─────────────────────────────────────────────────────────┤
│ Barra de Filtros Superiores:                            │
│  [Campo de Busca] [Período Dropdown] [Botão Por Datas]  │
├─────────────────────────────────────────────────────────┤
│ Área de Filtros Avançados:                               │
│  [Status] [Terminal] [Data Abertura] [Limpar Filtros]   │
├─────────────────────────────────────────────────────────┤
│ Cabeçalho da Tabela:                                     │
│  Cód. Terminal | Terminal | Fechado por | Data Abertura │
│  Data Fechamento | Período Aberto | Status              │
├─────────────────────────────────────────────────────────┤
│ Lista de Operações (Scroll Infinito):                   │
│  [Item 1]                                                │
│  [Item 2]                                                │
│  [Loading Indicator quando carregando mais]              │
└─────────────────────────────────────────────────────────┘
```

### Dimensões e Espaçamentos

- **Padding do Container Principal:** 18px (topo), 18px (laterais), 8px (inferior)
- **Altura dos Campos de Filtro:** 36px
- **Altura dos Itens da Lista:** 54px
- **Padding dos Itens:** 10px (laterais), 8px (topo), 4px (inferior)
- **Border Radius:** 10px-12px (campos e containers)
- **Espaçamento entre Filtros:** 12px horizontal, 16px vertical

### Cores e Estilos

- **Cor Primária:** Usada para botões, dropdowns e elementos de destaque
- **Cor de Fundo (Info):** Usada para campos de input e itens da lista
- **Cor de Hover:** Background alternado quando o mouse passa sobre um item
- **Sombra no Hover:** `box-shadow: 0 3px 5px rgba(0,0,0,0.2)`
- **Fonte:** Google Fonts (Nunito para textos, Exo para títulos)

---

## 🔌 APIs e Endpoints

### 1. Listar Operações de Caixa

**Endpoint:** `GET /caixa/operacao-caixa-terminal`

**Headers:**
```
Content-Type: application/json
accept: application/json
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (number, opcional): Número de itens por página (padrão: 10)
- `offset` (number, opcional): Offset para paginação (padrão: 0)
- `q` (string, opcional): Termo de busca (busca por código do terminal)
- `dataAberturaInicio` (string ISO8601, opcional): Data inicial do período
- `dataAberturaFim` (string ISO8601, opcional): Data final do período
- `terminalId` (string, opcional): ID do terminal para filtrar
- `status` (string, opcional): Status da operação ('aberto' ou 'fechado')

**Exemplo de Requisição:**
```javascript
GET /caixa/operacao-caixa-terminal?limit=10&offset=0&status=fechado&dataAberturaInicio=2024-01-01T00:00:00.000Z&dataAberturaFim=2024-01-31T23:59:59.999Z
```

**Resposta:**
```json
{
  "items": [
    {
      "id": "string",
      "status": "aberto" | "fechado",
      "empresaId": "string",
      "abertoPorId": "string",
      "terminalId": "string",
      "codigoTerminal": "string",
      "nomeTerminal": "string",
      "dataAbertura": "2024-01-15T10:30:00.000Z",
      "fechadoPorId": "string",
      "nomeResponsavelFechamento": "string",
      "dataFechamento": "2024-01-15T18:45:00.000Z"
    }
  ],
  "count": 100,
  "page": 0,
  "limit": 10,
  "totalPages": 10,
  "hasNext": true,
  "hasPrevious": false
}
```

### 2. Listar Terminais

**Endpoint:** `GET /preferencias/terminais`

**Headers:**
```
Content-Type: application/json
accept: application/json
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (number, opcional): Número de itens por página (padrão: 50)
- `offset` (number, opcional): Offset para paginação
- `q` (string, opcional): Termo de busca

**Resposta:**
```json
{
  "items": [
    {
      "id": "string",
      "codigoInterno": "string",
      "nome": "string"
    }
  ],
  "count": 50,
  "hasNext": false
}
```

**Nota:** Esta API deve ser chamada uma vez no carregamento inicial da página para popular o dropdown de terminais. A busca deve carregar todas as páginas disponíveis (loop até `hasNext` ser `false`).

### 3. Buscar Detalhes de Operação de Caixa

**Endpoint:** `GET /caixa/operacao-caixa-terminal/{id}`

**Headers:**
```
Content-Type: application/json
accept: application/json
Authorization: Bearer {token}
```

**Query Parameters:**
- `tipoRetorno` (string, opcional): Tipo de retorno (padrão: 'detalhado')

**Resposta:** Objeto completo com detalhes da operação de caixa

---

## 🧠 Lógicas de Negócio

### 1. Paginação Infinita (Scroll Infinito)

- **Tamanho da Página:** 10 itens por página
- **Trigger:** Quando o usuário rola até o final da lista
- **Indicador de Loading:** Exibir `CircularProgressIndicator` no final da lista quando `isLoadingMore === true`
- **Controle:** Usar `canLoadMore` para evitar chamadas desnecessárias

**Implementação:**
```javascript
// Detectar scroll até o final
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100 &&
      canLoadMore &&
      !isLoadingMore
    ) {
      fetchOperacoesCaixa();
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [canLoadMore, isLoadingMore]);
```

### 2. Filtros e Busca

#### 2.1. Campo de Busca (q)
- **Debounce:** 1000ms (1 segundo)
- **Funcionalidade:** Busca por código do terminal
- **Comportamento:** Ao digitar, aguarda 1 segundo antes de fazer a requisição

#### 2.2. Filtro de Período Pré-definido

Opções disponíveis:
- `'Hoje'`: Data atual (00:00:00 até 23:59:59)
- `'Ontem'`: Dia anterior
- `'Últimos 7 Dias'`: Últimos 7 dias (incluindo hoje)
- `'Mês Atual'`: Primeiro dia do mês até hoje
- `'Mês Passado'`: Mês anterior completo
- `'Últimos 30 Dias'`: Últimos 30 dias
- `'Últimos 60 Dias'`: Últimos 60 dias
- `'Últimos 90 Dias'`: Últimos 90 dias
- `'Todos'`: Sem filtro de data

**Lógica de Cálculo:**
```javascript
const calcularPeriodo = (opcao) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch(opcao) {
    case 'Hoje':
      return {
        inicio: new Date(today),
        fim: new Date(today.getTime() + 24*60*60*1000 - 1)
      };
    case 'Ontem':
      const ontem = new Date(today.getTime() - 24*60*60*1000);
      return {
        inicio: ontem,
        fim: new Date(today.getTime() - 1)
      };
    case 'Últimos 7 Dias':
      return {
        inicio: new Date(today.getTime() - 6*24*60*60*1000),
        fim: new Date(today.getTime() + 24*60*60*1000 - 1)
      };
    // ... outros casos
  }
};
```

#### 2.3. Filtro de Data Manual

- **Componente:** Modal/Dialog com seletor de data inicial e final
- **Comportamento:** Ao selecionar datas, limpa os filtros pré-definidos
- **Formato de Envio:** ISO8601
  - Data Inicial: `YYYY-MM-DDTHH:mm:ss.SSSZ` (00:00:00.000)
  - Data Final: `YYYY-MM-DDTHH:mm:ss.SSSZ` (23:59:59.999)

#### 2.4. Filtro de Status

- **Opções:** `'aberto'`, `'fechado'`
- **Valor Padrão:** `null` (sem filtro)
- **Envio para API:** String em minúsculas ou string vazia se for 'Todos' ou `null`

#### 2.5. Filtro de Terminal

- **Fonte de Dados:** API de terminais (carregada uma vez no início)
- **Exibição:** Mostra `codigoInterno` do terminal
- **Valor Enviado:** `id` do terminal
- **Valor Padrão:** `null` (sem filtro)

#### 2.6. Filtro de Data de Abertura (Individual)

- **Componente:** DatePicker simples
- **Comportamento:** Permite selecionar apenas data inicial (sem data final)
- **Limpeza:** Botão "X" aparece quando há data selecionada

### 3. Prioridade de Filtros de Data

A lógica deve priorizar filtros manuais sobre pré-definidos:

```javascript
let dataInicio, dataFim;

if (periodoInicialFilter || periodoFinalFilter) {
  // Prioriza filtro manual
  dataInicio = periodoInicialFilter;
  dataFim = periodoFinalFilter || periodoInicialFilter; // Se só inicial, usa mesma data até 23:59:59
} else if (periodoPredefinidoInicialFilter || periodoPredefinidoFinalFilter) {
  // Usa filtro pré-definido
  dataInicio = periodoPredefinidoInicialFilter;
  dataFim = periodoPredefinidoFinalFilter;
}
```

### 4. Formatação de Datas

**Exibição na Tabela:**
- **Data Abertura:** `"dd, MMM HH:mm"` (ex: "15, Jan 10:30")
- **Data Fechamento:** `"dd, MMM HH:mm"` (ex: "15, Jan 18:45")
- **Período Aberto:** Calculado como diferença entre data de fechamento e abertura (ou agora se ainda estiver aberto)
  - Formato: `"Xh Ym"` (ex: "8h 15m")

**Cálculo de Período Aberto:**
```javascript
const calcularPeriodoAberto = (dataAbertura, dataFechamento) => {
  if (!dataAbertura) return 'N/A';
  
  const fim = dataFechamento || new Date();
  const diff = fim - new Date(dataAbertura);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};
```

### 5. Estados de Carregamento

- **Loading Inicial:** Exibir skeleton ou spinner durante primeira carga
- **Loading Mais Itens:** Exibir `CircularProgressIndicator` no final da lista
- **Loading Terminais:** Desabilitar dropdown de terminais durante carregamento
- **Estado Vazio:** Exibir componente de lista vazia quando não houver resultados

### 6. Tratamento de Erros

- **Erro na API:** Exibir mensagem de erro no lugar da lista
- **Item Especial:** Usar IDs especiais para estados:
  - `'no_results'`: Nenhum resultado encontrado
  - `'error_loading'`: Erro ao carregar

### 7. Reset de Filtros

A função `limparTodosFiltros()` deve:
1. Resetar todos os filtros para valores padrão
2. Limpar campo de busca
3. Resetar paginação (voltar para página 0)
4. Limpar lista de operações
5. Recarregar dados

---

## 📊 Estrutura de Dados

### Interface OperacaoCaixa

```typescript
interface OperacaoCaixa {
  id: string;
  status: 'aberto' | 'fechado';
  empresaId?: string;
  abertoPorId?: string;
  terminalId?: string;
  codigoTerminal?: string;
  nomeTerminal?: string;
  dataAbertura: string; // ISO8601
  fechadoPorId?: string;
  nomeResponsavelFechamento?: string;
  dataFechamento?: string; // ISO8601
  fieldValues?: Record<string, any>; // Dados adicionais da API
}
```

### Interface Terminal

```typescript
interface Terminal {
  id: string;
  codigoInterno: string;
  nome?: string;
}
```

### Estado da Página

```typescript
interface HistoricoFechamentoState {
  // Filtros
  searchQuery: string;
  periodoDropdown: string; // 'Hoje', 'Ontem', etc.
  periodoInicialFilter: Date | null;
  periodoFinalFilter: Date | null;
  periodoPredefinidoInicialFilter: Date | null;
  periodoPredefinidoFinalFilter: Date | null;
  statusFilter: 'aberto' | 'fechado' | null;
  terminalFilter: string | null;
  dataAberturaFilter: Date | null;
  
  // Dados
  operacoesCaixa: OperacaoCaixa[];
  terminais: Terminal[];
  
  // Paginação
  currentPage: number;
  pageSize: number;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  
  // Estados de carregamento
  isLoadingTerminais: boolean;
  isResettingFilters: boolean;
  
  // UI
  hoveredIndex: number | null;
}
```

---

## 🎯 Componentes Necessários

### 1. Componentes Principais

#### `HistoricoFechamentoPage`
- Componente principal da página
- Gerencia estado e lógica de negócio
- Layout responsivo (sidebar + conteúdo)

#### `FiltrosSuperiores`
- Campo de busca
- Dropdown de período
- Botão "Por datas"

#### `FiltrosAvancados`
- Filtro de status
- Filtro de terminal
- Filtro de data de abertura
- Botão "Limpar Filtros"

#### `TabelaOperacoes`
- Cabeçalho da tabela
- Lista de itens com scroll infinito
- Indicador de loading

#### `ItemOperacaoCaixa`
- Item individual da lista
- Efeito hover
- Click para abrir modal de detalhes

### 2. Componentes Auxiliares

#### `ModalDetalhesFechamento`
- Modal/Dialog para exibir detalhes completos
- Recebe `idOperacaoCaixa` como prop
- Busca detalhes via API

#### `SeletorDatas`
- Componente para seleção de data inicial e final
- Callback `onDatesSelected(startDate, endDate)`

#### `ListaVazia`
- Componente para exibir quando não há resultados
- Mensagem: "Nenhuma operação de caixa encontrada."

#### `LoadingIndicator`
- Spinner para estados de carregamento

### 3. Hooks Customizados

#### `useDebounce`
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

#### `useInfiniteScroll`
```typescript
function useInfiniteScroll(
  callback: () => void,
  canLoadMore: boolean,
  isLoading: boolean
) {
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= 
        document.documentElement.scrollHeight - 100 &&
        canLoadMore &&
        !isLoading
      ) {
        callback();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, canLoadMore, isLoading]);
}
```

---

## 🔧 Implementação Detalhada

### 1. Função de Busca de Operações

```typescript
const fetchOperacoesCaixa = async (resetPage: boolean = false) => {
  if (resetPage) {
    setCurrentPage(0);
    setOperacoesCaixa([]);
    setCanLoadMore(true);
  }
  
  if (!canLoadMore || isLoadingMore || isResettingFilters) {
    return;
  }
  
  setIsLoadingMore(true);
  
  try {
    // Calcular datas
    let dataInicio: string | null = null;
    let dataFim: string | null = null;
    
    if (periodoInicialFilter || periodoFinalFilter) {
      dataInicio = periodoInicialFilter 
        ? new Date(periodoInicialFilter.setHours(0,0,0,0)).toISOString()
        : null;
      dataFim = periodoFinalFilter
        ? new Date(periodoFinalFilter.setHours(23,59,59,999)).toISOString()
        : periodoInicialFilter
          ? new Date(periodoInicialFilter.setHours(23,59,59,999)).toISOString()
          : null;
    } else if (periodoPredefinidoInicialFilter || periodoPredefinidoFinalFilter) {
      dataInicio = periodoPredefinidoInicialFilter?.toISOString() || null;
      dataFim = periodoPredefinidoFinalFilter?.toISOString() || null;
    }
    
    // Preparar parâmetros
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: (currentPage * pageSize).toString(),
    });
    
    if (searchQuery.trim()) {
      params.append('q', searchQuery.trim());
    }
    if (dataInicio) {
      params.append('dataAberturaInicio', dataInicio);
    }
    if (dataFim) {
      params.append('dataAberturaFim', dataFim);
    }
    if (terminalFilter && terminalFilter !== 'Todos') {
      params.append('terminalId', terminalFilter);
    }
    if (statusFilter && statusFilter !== 'Todos') {
      params.append('status', statusFilter.toLowerCase());
    }
    
    // Fazer requisição
    const response = await fetch(
      `/api/caixa/operacao-caixa-terminal?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.items) {
      const newItems = data.items;
      
      if (newItems.length === 0 && currentPage === 0) {
        // Nenhum resultado
        setOperacoesCaixa([{
          id: 'no_results',
          status: 'fechado',
          terminalId: 'Nenhuma operação de caixa encontrada.',
        }]);
        setCanLoadMore(false);
      } else if (newItems.length > 0) {
        setOperacoesCaixa(prev => [...prev, ...newItems]);
        setCurrentPage(prev => prev + 1);
        setCanLoadMore(newItems.length === pageSize);
      } else {
        setCanLoadMore(false);
      }
    } else {
      // Erro
      setOperacoesCaixa([{
        id: 'error_loading',
        status: 'fechado',
        terminalId: 'Erro ao carregar operações de caixa. Tente novamente.',
      }]);
      setCanLoadMore(false);
    }
  } catch (error) {
    console.error('Erro ao carregar operações:', error);
    setOperacoesCaixa([{
      id: 'error_loading',
      status: 'fechado',
      terminalId: `Exceção ao carregar operações: ${error}`,
    }]);
    setCanLoadMore(false);
  } finally {
    setIsLoadingMore(false);
  }
};
```

### 2. Função de Busca de Terminais

```typescript
const fetchTerminais = async (resetPagination: boolean = false, searchQuery?: string) => {
  if (resetPagination) {
    setTerminais([]);
    setHasMoreTerminais(true);
  }
  
  if (isLoadingTerminais || !hasMoreTerminais) return;
  
  setIsLoadingTerminais(true);
  
  try {
    const allTerminals: Terminal[] = [];
    let hasMore = true;
    let currentOffset = 0;
    const limit = 50;
    
    while (hasMore) {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });
      
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      
      const response = await fetch(
        `/api/preferencias/terminais?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (response.ok && data.items) {
        allTerminals.push(...data.items);
        hasMore = data.hasNext || false;
        currentOffset += limit;
      } else {
        hasMore = false;
      }
    }
    
    setTerminais(allTerminals);
    setHasMoreTerminais(false);
  } catch (error) {
    console.error('Erro ao carregar terminais:', error);
  } finally {
    setIsLoadingTerminais(false);
  }
};
```

### 3. Função de Limpar Filtros

```typescript
const limparTodosFiltros = () => {
  setIsResettingFilters(true);
  
  setPeriodoDropdown('Todos');
  setStatusFilter(null);
  setTerminalFilter(null);
  setSearchQuery('');
  setPeriodoInicialFilter(null);
  setPeriodoFinalFilter(null);
  setPeriodoPredefinidoInicialFilter(null);
  setPeriodoPredefinidoFinalFilter(null);
  setDataAberturaFilter(null);
  
  setIsResettingFilters(false);
  fetchOperacoesCaixa(true);
};
```

### 4. Handler de Mudança de Período

```typescript
const handlePeriodoChange = (opcao: string) => {
  if (isLoadingMore) return;
  
  setPeriodoDropdown(opcao);
  
  // Limpar filtros manuais
  setPeriodoInicialFilter(null);
  setPeriodoFinalFilter(null);
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let inicio: Date | null = null;
  let fim: Date | null = null;
  
  switch (opcao) {
    case 'Hoje':
      inicio = today;
      fim = new Date(today.getTime() + 24*60*60*1000 - 1);
      break;
    case 'Ontem':
      inicio = new Date(today.getTime() - 24*60*60*1000);
      fim = new Date(today.getTime() - 1);
      break;
    case 'Últimos 7 Dias':
      inicio = new Date(today.getTime() - 6*24*60*60*1000);
      fim = new Date(today.getTime() + 24*60*60*1000 - 1);
      break;
    case 'Mês Atual':
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fim = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      fim.setMilliseconds(fim.getMilliseconds() - 1);
      break;
    case 'Mês Passado':
      inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      fim = new Date(now.getFullYear(), now.getMonth(), 1);
      fim.setMilliseconds(fim.getMilliseconds() - 1);
      break;
    case 'Últimos 30 Dias':
      inicio = new Date(today.getTime() - 29*24*60*60*1000);
      fim = new Date(today.getTime() + 24*60*60*1000 - 1);
      break;
    case 'Últimos 60 Dias':
      inicio = new Date(today.getTime() - 59*24*60*60*1000);
      fim = new Date(today.getTime() + 24*60*60*1000 - 1);
      break;
    case 'Últimos 90 Dias':
      inicio = new Date(today.getTime() - 89*24*60*60*1000);
      fim = new Date(today.getTime() + 24*60*60*1000 - 1);
      break;
    case 'Todos':
      inicio = null;
      fim = null;
      break;
  }
  
  setPeriodoPredefinidoInicialFilter(inicio);
  setPeriodoPredefinidoFinalFilter(fim);
  
  fetchOperacoesCaixa(true);
};
```

---

## 🎨 Estilos e CSS

### Classes CSS Principais

```css
/* Container Principal */
.historico-fechamento-container {
  width: 100%;
  height: 100vh;
  display: flex;
  background-color: var(--primary-background);
}

/* Sidebar (Desktop) */
.sidebar-container {
  display: none; /* Oculto em mobile */
}

@media (min-width: 768px) {
  .sidebar-container {
    display: block;
  }
}

/* Conteúdo Principal */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 0 0;
  background-color: var(--primary-background);
}

/* Título */
.page-title {
  padding: 18px;
  font-family: 'Exo', sans-serif;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--primary);
}

/* Barra de Filtros Superiores */
.filters-top-bar {
  padding: 0 8px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-field {
  flex: 2;
  height: 36px;
}

.periodo-label {
  text-align: right;
  font-family: 'Exo', sans-serif;
  font-size: 0.875rem;
  color: var(--primary);
}

.periodo-dropdown {
  flex: 1;
  height: 36px;
}

.por-datas-button {
  flex: 1;
  height: 36px;
}

/* Área de Filtros Avançados */
.filters-advanced-area {
  background-color: rgba(0, 51, 102, 0.1);
  border-radius: 20px 20px 0 0;
  padding: 8px;
}

.filters-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  color: var(--secondary-text);
  font-weight: normal;
}

.filter-input {
  height: 46px;
  background-color: var(--info);
  border-radius: 10px;
  border: none;
  padding: 0 12px;
}

/* Cabeçalho da Tabela */
.table-header {
  background-color: var(--primary);
  padding: 4px 12px;
  display: flex;
  color: var(--info);
  font-size: 14px;
  font-family: 'Nunito', sans-serif;
}

.table-header-cell {
  flex: 1;
  text-align: left;
}

.table-header-cell.center {
  text-align: center;
}

/* Lista de Operações */
.operacoes-list {
  flex: 1;
  overflow-y: auto;
  background-color: var(--primary-background);
}

.operacao-item {
  padding: 8px 10px 4px;
  margin: 0 10px;
  height: 54px;
  border-radius: 10px;
  background-color: var(--info);
  cursor: pointer;
  transition: all 0.2s;
}

.operacao-item:hover {
  background-color: var(--primary-background);
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2);
}

.operacao-item-content {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 8px;
}

.operacao-cell {
  flex: 1;
  font-size: 14px;
  font-family: 'Nunito', sans-serif;
}

.operacao-cell.center {
  text-align: center;
}

/* Loading Indicator */
.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 8px;
}

/* Lista Vazia */
.empty-list {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}
```

---

## 📱 Responsividade

### Breakpoints

- **Mobile:** < 768px
  - Sidebar oculta
  - Filtros em coluna única
  - Tabela com scroll horizontal ou layout adaptado

- **Tablet:** 768px - 1024px
  - Sidebar visível
  - Filtros em wrap (múltiplas linhas)

- **Desktop:** > 1024px
  - Layout completo com sidebar
  - Filtros em linha única quando possível

---

## ✅ Checklist de Implementação

### Funcionalidades Core
- [ ] Layout responsivo com sidebar
- [ ] Campo de busca com debounce
- [ ] Dropdown de período pré-definido
- [ ] Modal de seleção de datas
- [ ] Filtro de status
- [ ] Filtro de terminal
- [ ] Filtro de data de abertura individual
- [ ] Botão limpar filtros
- [ ] Tabela com cabeçalho
- [ ] Lista de operações com scroll infinito
- [ ] Indicador de loading
- [ ] Tratamento de estados vazios e erros
- [ ] Modal de detalhes ao clicar em item

### Integração com API
- [ ] Função de listar operações de caixa
- [ ] Função de listar terminais
- [ ] Função de buscar detalhes de operação
- [ ] Tratamento de erros de API
- [ ] Headers de autenticação

### Lógicas de Negócio
- [ ] Paginação infinita
- [ ] Cálculo de períodos pré-definidos
- [ ] Prioridade de filtros de data
- [ ] Formatação de datas
- [ ] Cálculo de período aberto
- [ ] Debounce de busca

### UI/UX
- [ ] Efeito hover nos itens
- [ ] Loading states
- [ ] Mensagens de erro
- [ ] Componente de lista vazia
- [ ] Estilos consistentes
- [ ] Animações suaves

### Testes
- [ ] Teste de carregamento inicial
- [ ] Teste de filtros
- [ ] Teste de paginação
- [ ] Teste de busca
- [ ] Teste de reset de filtros
- [ ] Teste de modal de detalhes

---

## 🔍 Observações Importantes

1. **Autenticação:** Todas as requisições devem incluir o token de autenticação no header `Authorization: Bearer {token}`

2. **Formato de Datas:** Sempre usar ISO8601 para envio à API e formatar para exibição usando bibliotecas como `date-fns` ou `dayjs`

3. **Performance:** 
   - Implementar debounce na busca
   - Usar `useMemo` e `useCallback` para otimizar re-renders
   - Considerar virtualização da lista se houver muitos itens

4. **Acessibilidade:**
   - Adicionar `aria-labels` nos botões e campos
   - Suporte a navegação por teclado
   - Contraste adequado de cores

5. **Internacionalização:**
   - Usar biblioteca de i18n para textos
   - Formatação de datas conforme locale

6. **Tratamento de Erros:**
   - Exibir mensagens amigáveis ao usuário
   - Log de erros para debugging
   - Retry automático em caso de falha de rede

---

## 📚 Bibliotecas Recomendadas

- **Next.js:** Framework React
- **React Query / SWR:** Gerenciamento de estado de servidor e cache
- **date-fns / dayjs:** Manipulação de datas
- **react-hook-form:** Gerenciamento de formulários (se necessário)
- **zustand / redux:** Gerenciamento de estado global (se necessário)
- **tailwindcss / styled-components:** Estilização
- **react-virtual:** Virtualização de listas (se necessário para performance)

---

Este documento fornece todas as informações necessárias para recriar a página de Histórico de Fechamento de Caixa em Next.js com fidelidade ao comportamento e design da versão Flutter original.

