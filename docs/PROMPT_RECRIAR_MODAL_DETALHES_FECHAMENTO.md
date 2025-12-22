# Prompt Detalhado: Recriar Modal de Detalhes de Fechamento de Caixa em Next.js

## 📋 Visão Geral

Este modal exibe os detalhes completos de uma operação de fechamento de caixa em formato de cupom fiscal. O modal é aberto quando o usuário clica em um item da lista de operações de caixa na página de histórico. O design simula um cupom fiscal impresso, com fundo amarelo claro e fonte monoespaçada.

**Tipo:** Modal/Dialog  
**Trigger:** Clique em item da lista de operações de caixa  
**Prop:** `idOperacaoCaixa` (string)

---

## 🎨 Estrutura de Layout

### Layout do Modal

O modal possui um estilo de cupom fiscal com as seguintes características:

```
┌─────────────────────────────────────────────┐
│ [X]                                        │ ← Header (40px altura)
├─────────────────────────────────────────────┤
│ FECHAMENTO TERMINAL # [código]            │ ← Título principal
│ ─────────────────────────────────────────  │ ← Divisor
│ Empresa: [nome]                            │
│ Responsável: [nome]                        │ ← Informações básicas
│ Data aber.: [data/hora]                    │
│ Data fech.: [data/hora]                    │
│ Tempo op.: [duração]                       │
│ ─────────────────────────────────────────  │
│                                             │
│ RESUMO VENDAS                              │ ← Seção de resumo
│ ┌─────────────────────────────────────┐   │
│ │ Campo              │ Valor          │   │ ← Tabela
│ ├─────────────────────────────────────┤   │
│ │ TOT. VENDA PROD.   │ R$ X.XXX,XX   │   │
│ │ TOT. DESC.         │ R$ X.XXX,XX   │   │
│ │ TOT. ACRES.        │ R$ X.XXX,XX   │   │
│ │ TOT. ADICIONAIS    │ R$ X.XXX,XX   │   │
│ │ TOT. REMOÇÕES      │ R$ X.XXX,XX   │   │
│ └─────────────────────────────────────┘   │
│ ─────────────────────────────────────────  │
│                    FAT. LIQUIDO: R$ X.XXX,XX│ ← Total alinhado à direita
│ ─────────────────────────────────────────  │
│                                             │
│ RESUMO PAGAMENTOS                           │
│ ┌─────────────────────────────────────┐   │
│ │ Meio de Pagamento │ Valor            │   │
│ ├─────────────────────────────────────┤   │
│ │ [Dinâmico]        │ R$ X.XXX,XX     │   │ ← Lista dinâmica
│ │ TOT. TROCO        │ -R$ X.XXX,XX    │   │
│ └─────────────────────────────────────┘   │
│ ─────────────────────────────────────────  │
│                    TOT. LIQUIDO: R$ X.XXX,XX│
│ ─────────────────────────────────────────  │
│                                             │
│ RESUMO CAIXA                                │
│ ┌─────────────────────────────────────┐   │
│ │ Campo              │ Valor          │   │
│ ├─────────────────────────────────────┤   │
│ │ RECEBIMENTOS DIN.  │ R$ X.XXX,XX   │   │
│ │ TOT. SANGRIAS      │ -R$ X.XXX,XX   │   │
│ │ TOT. SUPRIMENTOS   │ +R$ X.XXX,XX   │   │
│ │ TOT. TROCO         │ -R$ X.XXX,XX   │   │
│ └─────────────────────────────────────┘   │
│ ─────────────────────────────────────────  │
│                    TOT. CAIXA: R$ X.XXX,XX │
│ ─────────────────────────────────────────  │
│                                             │
│ CONFERÊNCIA CAIXA                           │
│ ┌─────────────────────────────────────┐   │
│ │ CONT. │ FORN. │ DIF.                │   │
│ ├─────────────────────────────────────┤   │
│ │ R$ X  │ R$ X  │ +/- R$ X.XXX,XX    │   │
│ └─────────────────────────────────────┘   │
│ ─────────────────────────────────────────  │
│                                             │
│ PRODUTOS VENDIDOS                          │
│ ┌─────────────────────────────────────┐   │
│ │ Produtos            │ Valor         │   │
│ ├─────────────────────────────────────┤   │
│ │ [Lista dinâmica]    │ R$ X.XXX,XX  │   │
│ └─────────────────────────────────────┘   │
│ ─────────────────────────────────────────  │
│                                             │
│ ADICIONAIS VENDIDOS                        │
│ ┌─────────────────────────────────────┐   │
│ │ Adicionais          │ Valor         │   │
│ ├─────────────────────────────────────┤   │
│ │ [Lista dinâmica]    │ R$ X.XXX,XX  │   │
│ └─────────────────────────────────────┘   │
│ ─────────────────────────────────────────  │
└─────────────────────────────────────────────┘
```

### Dimensões e Espaçamentos

- **Largura do Modal:** 80% da largura da tela (máximo 580px)
- **Border Radius:** 12px
- **Padding Interno:** 16px em todos os lados
- **Altura do Header:** 40px
- **Espaçamento entre Seções:** 8px
- **Espaçamento entre Título e Tabela:** 4px
- **Padding das Células da Tabela:** 4px
- **Espessura dos Divisores:** 0.5px

### Cores e Estilos

- **Cor de Fundo:** `#FFFFD9` (amarelo claro, simula papel de cupom)
- **Cor do Texto:** `#000000` (preto)
- **Cor dos Divisores:** `rgba(0, 0, 0, 0.54)` (preto com 54% de opacidade)
- **Fonte:** `'Roboto Mono'` ou fonte monoespaçada equivalente
- **Tamanho de Fonte Títulos:** `titleMedium` (geralmente 16-18px)
- **Tamanho de Fonte Corpo:** `bodyMedium` (geralmente 14px)
- **Tamanho de Fonte Pequeno:** `titleSmall` (geralmente 12-14px)
- **Font Weight Títulos:** `bold` (700)
- **Font Weight Corpo:** `normal` (400)

---

## 🔌 API e Endpoint

### Buscar Detalhes de Operação de Caixa

**Endpoint:** `GET /caixa/operacao-caixa-terminal/{id}`

**Headers:**
```
Content-Type: application/json
accept: application/json
Authorization: Bearer {token}
```

**Query Parameters:**
- `tipoRetorno` (string, opcional): Tipo de retorno (padrão: 'detalhado')

**Exemplo de Requisição:**
```javascript
GET /caixa/operacao-caixa-terminal/123456789?tipoRetorno=detalhado
```

**Resposta:**
```json
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
  "dataFechamento": "2024-01-15T18:45:00.000Z",
  "nomeEmpresa": "string",
  "resumoFechamento": {
    "responsavelFechamento": "string",
    "dataFechamento": "2024-01-15T18:45:00.000Z",
    "tempoOperacaoInSeconds": 30000,
    "valorFornecido": 1500.00,
    "diferencaValorFornecidoEValorCaixa": 0.00
  },
  "resumoOperacao": {
    "totalProdutoBruto": 2000.00,
    "totalDescontoProdutos": 100.00,
    "totalAcrescimoProdutos": 50.00,
    "totalComplementoAumenta": 30.00,
    "totalComplementoDiminui": 20.00,
    "totalLiquido": 1960.00
  },
  "resumoPagamentos": {
    "meiosPagamento": [
      {
        "nomeMeioPagamento": "Dinheiro",
        "valorContabilizado": 1000.00
      },
      {
        "nomeMeioPagamento": "Cartão de Débito",
        "valorContabilizado": 960.00
      }
    ],
    "totalTroco": 40.00,
    "totalLiquido": 1920.00
  },
  "resumoCaixa": {
    "totalDinheiro": 1000.00,
    "totalSangria": 200.00,
    "totalSuprimento": 100.00,
    "totalTroco": 40.00,
    "valorLiquidoDinheiroCaixa": 860.00
  },
  "totalProdutosVendidos": [
    {
      "quantidade": 2,
      "nome": "Produto A",
      "valorLiquidoFinal": 50.00
    },
    {
      "quantidade": 1,
      "nome": "Produto B",
      "valorLiquidoFinal": 30.00
    }
  ],
  "totalAdicionaisVendidos": [
    {
      "quantidade": 1,
      "nome": "Adicional X",
      "valorLiquidoFinal": 10.00
    }
  ]
}
```

---

## 🧠 Lógicas de Negócio

### 1. Carregamento de Dados

- **Estado Inicial:** `isLoading = true`
- **Ao Montar:** Buscar dados da API usando `idOperacaoCaixa`
- **Após Sucesso:** Atualizar estado com dados e definir `isLoading = false`
- **Em Caso de Erro:** Exibir mensagem de erro e definir `isLoading = false`

### 2. Formatação de Valores Monetários

**Formato:** `R$ X.XXX,XX` (padrão brasileiro)

**Implementação:**
```javascript
const formatMoney = (value) => {
  if (value == null || value === undefined) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};
```

### 3. Formatação de Duração

**Formato:** `XXh XXm XXs` (horas, minutos, segundos)

**Implementação:**
```javascript
const formatDuration = (seconds) => {
  if (seconds == null || seconds === undefined) return 'N/A';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (n) => n.toString().padStart(2, '0');
  
  return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
};
```

### 4. Formatação de Diferença (Conferência)

**Formato:** `+ R$ X.XXX,XX` ou `- R$ X.XXX,XX` ou `R$ 0,00`

**Implementação:**
```javascript
const formatDifference = (difference) => {
  if (difference == null || difference === undefined) return 'R$ 0,00';
  
  const absValue = Math.abs(difference);
  const formatted = formatMoney(absValue);
  
  if (difference > 0) {
    return `+ R$ ${formatted}`;
  } else if (difference < 0) {
    return `- R$ ${formatted}`;
  } else {
    return `R$ ${formatted}`;
  }
};
```

### 5. Formatação de Datas

**Formato:** `dd/MM/yyyy HH:mm` (ex: "15/01/2024 10:30")

**Implementação:**
```javascript
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
```

### 6. Parsing Seguro de Datas

**Implementação:**
```javascript
const safeParseDateTime = (dateString) => {
  if (!dateString || dateString === '') return null;
  
  try {
    return new Date(dateString);
  } catch (e) {
    console.error('Erro ao analisar data:', dateString, e);
    return null;
  }
};
```

### 7. Tratamento de Valores Nulos

- Todos os valores devem ter fallback para `'N/A'` ou `'0,00'` conforme o contexto
- Usar optional chaining (`?.`) e nullish coalescing (`??`) para acesso seguro

---

## 📊 Estrutura de Dados

### Interface OperacaoCaixaDetalhada

```typescript
interface OperacaoCaixaDetalhada {
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
  nomeEmpresa?: string;
  
  resumoFechamento?: {
    responsavelFechamento?: string;
    dataFechamento?: string; // ISO8601
    tempoOperacaoInSeconds?: number;
    valorFornecido?: number;
    diferencaValorFornecidoEValorCaixa?: number;
  };
  
  resumoOperacao?: {
    totalProdutoBruto?: number;
    totalDescontoProdutos?: number;
    totalAcrescimoProdutos?: number;
    totalComplementoAumenta?: number;
    totalComplementoDiminui?: number;
    totalLiquido?: number;
  };
  
  resumoPagamentos?: {
    meiosPagamento?: Array<{
      nomeMeioPagamento?: string;
      valorContabilizado?: number;
    }>;
    totalTroco?: number;
    totalLiquido?: number;
  };
  
  resumoCaixa?: {
    totalDinheiro?: number;
    totalSangria?: number;
    totalSuprimento?: number;
    totalTroco?: number;
    valorLiquidoDinheiroCaixa?: number;
  };
  
  totalProdutosVendidos?: Array<{
    quantidade?: number;
    nome?: string;
    valorLiquidoFinal?: number;
  }>;
  
  totalAdicionaisVendidos?: Array<{
    quantidade?: number;
    nome?: string;
    valorLiquidoFinal?: number;
  }>;
}
```

### Estado do Componente

```typescript
interface DetalhesFechamentoState {
  operacaoCaixa: OperacaoCaixaDetalhada | null;
  isLoading: boolean;
  error: string | null;
}
```

---

## 🎯 Componentes Necessários

### 1. Componente Principal

#### `ModalDetalhesFechamento`
- Componente principal do modal
- Gerencia estado e lógica de carregamento
- Renderiza conteúdo baseado no estado

### 2. Subcomponentes

#### `ModalHeader`
- Header do modal com botão de fechar
- Altura fixa de 40px
- Botão de fechar no canto esquerdo

#### `InformacoesBasicas`
- Exibe informações básicas da operação
- Código do terminal, empresa, responsável, datas, tempo

#### `ResumoVendas`
- Tabela com resumo de vendas
- Total de vendas, descontos, acréscimos, adicionais, remoções
- Total líquido alinhado à direita

#### `ResumoPagamentos`
- Tabela com meios de pagamento (dinâmica)
- Total de troco
- Total líquido alinhado à direita

#### `ResumoCaixa`
- Tabela com resumo de caixa
- Recebimentos, sangrias, suprimentos, troco
- Total de caixa alinhado à direita

#### `ConferenciaCaixa`
- Tabela de conferência
- Contabilizado, fornecido, diferença

#### `ListaProdutos`
- Tabela com produtos vendidos (dinâmica)
- Quantidade x Nome e valor

#### `ListaAdicionais`
- Tabela com adicionais vendidos (dinâmica)
- Quantidade x Nome e valor

#### `Divisor`
- Componente de divisor visual
- Linha horizontal com espessura de 0.5px

---

## 🔧 Implementação Detalhada

### 1. Função de Busca de Detalhes

```typescript
const fetchDetalhesOperacaoCaixa = async (idOperacaoCaixa: string) => {
  if (!idOperacaoCaixa) {
    setError('ID da operação de caixa não fornecido.');
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch(
      `/api/caixa/operacao-caixa-terminal/${idOperacaoCaixa}?tipoRetorno=detalhado`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao carregar detalhes: ${response.status}`);
    }

    const data = await response.json();
    setOperacaoCaixa(data);
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    setError('Não foi possível carregar os detalhes da operação de caixa.');
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Funções de Formatação

```typescript
// Formatação de dinheiro
const formatMoney = (value: number | null | undefined): string => {
  if (value == null || value === undefined) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Formatação de duração
const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || seconds === undefined) return 'N/A';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (n: number): string => n.toString().padStart(2, '0');
  
  return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
};

// Formatação de diferença
const formatDifference = (difference: number | null | undefined): string => {
  if (difference == null || difference === undefined) return 'R$ 0,00';
  
  const absValue = Math.abs(difference);
  const formatted = formatMoney(absValue);
  
  if (difference > 0) {
    return `+ R$ ${formatted}`;
  } else if (difference < 0) {
    return `- R$ ${formatted}`;
  } else {
    return `R$ ${formatted}`;
  }
};

// Formatação de data/hora
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    console.error('Erro ao formatar data:', dateString, e);
    return 'N/A';
  }
};

// Parsing seguro de data
const safeParseDateTime = (dateString: string | null | undefined): Date | null => {
  if (!dateString || dateString === '') return null;
  
  try {
    return new Date(dateString);
  } catch (e) {
    console.error('Erro ao analisar data:', dateString, e);
    return null;
  }
};
```

### 3. Estrutura do Componente Principal

```typescript
const ModalDetalhesFechamento: React.FC<{
  idOperacaoCaixa: string;
  onClose: () => void;
}> = ({ idOperacaoCaixa, onClose }) => {
  const [operacaoCaixa, setOperacaoCaixa] = useState<OperacaoCaixaDetalhada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetalhesOperacaoCaixa(idOperacaoCaixa);
  }, [idOperacaoCaixa]);

  if (isLoading) {
    return (
      <Modal onClose={onClose}>
        <div className="modal-loading">
          <CircularProgress />
        </div>
      </Modal>
    );
  }

  if (error || !operacaoCaixa) {
    return (
      <Modal onClose={onClose}>
        <div className="modal-error">
          <p>{error || 'Não foi possível carregar os detalhes da operação de caixa.'}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="detalhes-fechamento-container">
        <ModalHeader onClose={onClose} />
        <div className="detalhes-content">
          <InformacoesBasicas operacaoCaixa={operacaoCaixa} />
          <ResumoVendas resumoOperacao={operacaoCaixa.resumoOperacao} />
          <ResumoPagamentos resumoPagamentos={operacaoCaixa.resumoPagamentos} />
          <ResumoCaixa resumoCaixa={operacaoCaixa.resumoCaixa} />
          <ConferenciaCaixa 
            resumoOperacao={operacaoCaixa.resumoOperacao}
            resumoFechamento={operacaoCaixa.resumoFechamento}
          />
          <ListaProdutos produtos={operacaoCaixa.totalProdutosVendidos} />
          <ListaAdicionais adicionais={operacaoCaixa.totalAdicionaisVendidos} />
        </div>
      </div>
    </Modal>
  );
};
```

---

## 🎨 Estilos e CSS

### Classes CSS Principais

```css
/* Container Principal do Modal */
.detalhes-fechamento-container {
  width: 80%;
  max-width: 580px;
  background-color: #FFFFD9;
  border-radius: 12px;
  overflow: hidden;
  font-family: 'Roboto Mono', 'Courier New', monospace;
  color: #000000;
}

/* Header do Modal */
.modal-header {
  height: 40px;
  background-color: #FFFFD9;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: none;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.close-icon {
  width: 24px;
  height: 24px;
  color: #000000;
}

/* Conteúdo do Modal */
.detalhes-content {
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 40px - 32px);
}

/* Título Principal */
.titulo-principal {
  font-size: 18px;
  font-weight: bold;
  color: #000000;
  margin-bottom: 8px;
  font-family: 'Roboto Mono', monospace;
}

/* Divisor */
.divisor {
  height: 0.5px;
  background-color: rgba(0, 0, 0, 0.54);
  margin: 8px 0;
  border: none;
}

/* Informações Básicas */
.info-basica {
  font-size: 14px;
  color: #000000;
  margin-bottom: 4px;
  font-family: 'Roboto Mono', monospace;
}

/* Títulos de Seção */
.titulo-secao {
  font-size: 18px;
  font-weight: bold;
  color: #000000;
  margin-top: 8px;
  margin-bottom: 4px;
  font-family: 'Roboto Mono', monospace;
}

/* Tabelas */
.detalhes-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}

.detalhes-table th,
.detalhes-table td {
  padding: 4px;
  text-align: left;
  font-family: 'Roboto Mono', monospace;
  font-size: 14px;
  color: #000000;
}

.detalhes-table th {
  font-weight: bold;
  font-size: 12px;
}

.detalhes-table td.text-right {
  text-align: right;
}

.detalhes-table td.text-center {
  text-align: center;
}

/* Colunas da Tabela */
.col-campo {
  flex: 2;
}

.col-valor {
  flex: 1;
}

.col-produto {
  flex: 3;
}

/* Totais Alinhados à Direita */
.total-direita {
  text-align: right;
  font-size: 18px;
  font-weight: bold;
  margin-top: 8px;
  margin-bottom: 8px;
  font-family: 'Roboto Mono', monospace;
}

/* Estados de Loading e Erro */
.modal-loading,
.modal-error {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 40px;
}

.modal-error p {
  color: #000000;
  font-family: 'Roboto Mono', monospace;
  text-align: center;
}

/* Responsividade */
@media (max-width: 768px) {
  .detalhes-fechamento-container {
    width: 95%;
  }
  
  .detalhes-content {
    padding: 12px;
  }
  
  .titulo-principal,
  .titulo-secao {
    font-size: 16px;
  }
  
  .info-basica,
  .detalhes-table th,
  .detalhes-table td {
    font-size: 12px;
  }
}
```

### Estrutura de Tabela (HTML/JSX)

```jsx
<table className="detalhes-table">
  <thead>
    <tr>
      <th className="col-campo">Campo</th>
      <th className="col-valor text-right">Valor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>TOT. VENDA PROD.</td>
      <td className="text-right">R$ {formatMoney(resumoOperacao?.totalProdutoBruto)}</td>
    </tr>
    {/* Mais linhas... */}
  </tbody>
</table>
```

---

## 📱 Responsividade

### Breakpoints

- **Desktop:** > 768px
  - Largura: 80% (máx 580px)
  - Padding: 16px

- **Mobile:** ≤ 768px
  - Largura: 95%
  - Padding: 12px
  - Fontes reduzidas

---

## ✅ Checklist de Implementação

### Funcionalidades Core
- [ ] Modal com overlay e fechamento ao clicar fora
- [ ] Header com botão de fechar funcional
- [ ] Estado de loading durante busca
- [ ] Tratamento de erros
- [ ] Exibição de informações básicas
- [ ] Seção de Resumo de Vendas
- [ ] Seção de Resumo de Pagamentos (com lista dinâmica)
- [ ] Seção de Resumo de Caixa
- [ ] Seção de Conferência de Caixa
- [ ] Seção de Produtos Vendidos (lista dinâmica)
- [ ] Seção de Adicionais Vendidos (lista dinâmica)

### Formatação
- [ ] Formatação de valores monetários (R$ X.XXX,XX)
- [ ] Formatação de duração (XXh XXm XXs)
- [ ] Formatação de diferença (+/- R$ X.XXX,XX)
- [ ] Formatação de data/hora (dd/MM/yyyy HH:mm)
- [ ] Parsing seguro de datas

### Integração com API
- [ ] Função de buscar detalhes da operação
- [ ] Headers de autenticação
- [ ] Tratamento de erros de API
- [ ] Query parameter tipoRetorno

### UI/UX
- [ ] Estilo de cupom fiscal (fundo amarelo claro)
- [ ] Fonte monoespaçada (Roboto Mono)
- [ ] Divisores entre seções
- [ ] Tabelas sem bordas visíveis
- [ ] Totais alinhados à direita
- [ ] Scroll interno quando necessário
- [ ] Animações suaves de abertura/fechamento

### Acessibilidade
- [ ] Botão de fechar com aria-label
- [ ] Modal com role="dialog"
- [ ] Foco gerenciado corretamente
- [ ] Suporte a navegação por teclado (ESC para fechar)

### Testes
- [ ] Teste de carregamento inicial
- [ ] Teste de exibição de dados
- [ ] Teste de formatação de valores
- [ ] Teste de listas dinâmicas vazias
- [ ] Teste de tratamento de erros
- [ ] Teste de fechamento do modal

---

## 🔍 Observações Importantes

1. **Estilo de Cupom Fiscal:**
   - O modal deve simular visualmente um cupom fiscal impresso
   - Fundo amarelo claro (#FFFFD9)
   - Fonte monoespaçada obrigatória
   - Texto preto sobre fundo claro

2. **Dados Dinâmicos:**
   - Listas de meios de pagamento, produtos e adicionais podem estar vazias
   - Sempre tratar casos de arrays vazios ou nulos
   - Exibir mensagem apropriada ou simplesmente não renderizar a seção

3. **Formatação Consistente:**
   - Todos os valores monetários devem usar a mesma formatação
   - Datas devem seguir o padrão brasileiro
   - Duração deve ser sempre no formato XXh XXm XXs

4. **Performance:**
   - O modal pode conter muitos dados
   - Considerar virtualização se as listas forem muito grandes
   - Lazy loading não é necessário (dados já vêm da API)

5. **Acessibilidade:**
   - Modal deve capturar foco ao abrir
   - Fechar com ESC
   - Foco deve retornar ao elemento que abriu o modal ao fechar

6. **Bibliotecas Recomendadas:**
   - **React Modal:** Para estrutura básica do modal
   - **date-fns ou dayjs:** Para manipulação de datas
   - **react-aria-modal ou @headlessui/react:** Para modais acessíveis

---

## 📚 Exemplo de Uso

```typescript
// Na página de histórico de fechamento
const [modalOpen, setModalOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);

const handleItemClick = (id: string) => {
  setSelectedId(id);
  setModalOpen(true);
};

const handleCloseModal = () => {
  setModalOpen(false);
  setSelectedId(null);
};

return (
  <>
    {/* Lista de operações */}
    {operacoesCaixa.map((operacao) => (
      <div 
        key={operacao.id} 
        onClick={() => handleItemClick(operacao.id!)}
      >
        {/* Item da lista */}
      </div>
    ))}
    
    {/* Modal */}
    {modalOpen && selectedId && (
      <ModalDetalhesFechamento
        idOperacaoCaixa={selectedId}
        onClose={handleCloseModal}
      />
    )}
  </>
);
```

---

Este documento fornece todas as informações necessárias para recriar o modal de Detalhes de Fechamento de Caixa em Next.js com fidelidade ao comportamento e design da versão Flutter original, mantendo o estilo de cupom fiscal característico.

