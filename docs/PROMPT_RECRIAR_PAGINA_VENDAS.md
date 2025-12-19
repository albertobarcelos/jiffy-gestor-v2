# Prompt para Recriar Página de Histórico de Vendas e Modal de Detalhes em NextJS

## 📋 Contexto e Análise da Página

### Estrutura Geral
A página de vendas é uma página completa de listagem com:
- **Barra de pesquisa e filtros avançados** na parte superior
- **Cards de métricas** (4 cards com estatísticas)
- **Tabela de vendas** com scroll infinito (paginação)
- **Modal de detalhes** que abre ao clicar no botão "Cupom" de cada venda

### Observações Importantes
- A página usa **paginação infinita** (scroll infinito) - carrega mais itens ao chegar ao final da lista
- Todos os filtros usam **debounce de 1 segundo** antes de aplicar
- A busca por código/identificação é acionada com **Enter** ou após debounce
- Os campos de valor (mínimo/máximo) são formatados como **moeda brasileira** em tempo real
- O status padrão inicial é **"FINALIZADA"** (vendas finalizadas e canceladas)

---

## 🎨 Estrutura Visual e Layout

### Layout Principal
- **Sidebar**: Visível apenas em desktop (tablet/phone oculto)
- **Área principal**: Container com border radius (20px top, 10px bottom)
- **Background**: Cor `primaryBackground` do tema
- **Padding**: 18px horizontal, 18px top, 8px bottom no título

### Título da Página
- **Texto**: "Histórico de Vendas"
- **Fonte**: Google Fonts "Exo", cor primária
- **Tamanho**: `titleMedium`
- **Alinhamento**: Esquerda

---

## 🔍 Seção de Filtros Superiores (Primeira Linha)

### Layout
- **Container**: Row com espaçamento de 12px entre elementos
- **Altura fixa**: 36px para todos os campos

### 1. Campo de Pesquisa (Flex: 2)
- **Placeholder**: "Pesquisar por Código ou Identificação da Venda"
- **Ícone**: Ícone de busca (Icons.search) no prefix
- **Background**: Cor `info` do tema
- **Border**: Nenhum (borderSide: none)
- **Border radius**: 12px
- **Box shadow**: Sombra suave (blur: 4px, offset: 0,2)
- **Comportamento**:
  - Debounce de 1 segundo ao digitar
  - Aciona busca ao pressionar Enter
  - Chama `_fetchVendas(resetPage: true)` após debounce/Enter

### 2. Campo Valor Mínimo
- **Placeholder**: "Valor Mínimo"
- **Ícone**: Ícone de dinheiro (Icons.attach_money) no prefix
- **Tipo de input**: `TextInputType.number`
- **Formatação**: Formatação automática como moeda brasileira (R$)
- **Comportamento**:
  - Formata enquanto digita (remove caracteres não numéricos, divide por 100, formata)
  - Aciona busca ao pressionar Enter
  - Normaliza valor antes de enviar à API (remove formatação, converte para número)

### 3. Campo Valor Máximo
- **Placeholder**: "Valor Máximo"
- **Ícone**: Ícone de dinheiro (Icons.attach_money) no prefix
- **Tipo de input**: `TextInputType.number`
- **Formatação**: Mesma formatação de moeda do campo mínimo
- **Comportamento**: Idêntico ao campo mínimo

### 4. Label "Período:"
- **Texto**: "Período:"
- **Alinhamento**: Direita
- **Fonte**: Google Fonts "Exo", cor primária, `titleSmall`

### 5. Dropdown de Período
- **Opções**: Vem de `FFAppState().FiltraDataOpcoes` (provavelmente: "Todos", "Hoje", "Ontem", "Últimos 7 Dias", "Mês Atual", "Mês Passado", "Últimos 30 Dias", "Últimos 60 Dias", "Últimos 90 Dias")
- **Valor inicial**: "Todos"
- **Altura**: 36px
- **Background**: Cor primária do tema
- **Texto**: Branco, 13px
- **Ícone**: Branco (keyboard_arrow_down_rounded)
- **Comportamento**:
  - Ao selecionar, calcula `periodoInicialFilter` e `periodoFinalFilter` baseado na opção
  - Chama `_fetchVendas(resetPage: true)` imediatamente após seleção
  - Se "Todos": limpa os filtros de data (null)

**Lógica de Períodos**:
- **Hoje**: `periodoInicial = hoje 00:00`, `periodoFinal = hoje 23:59:59`
- **Ontem**: `periodoInicial = ontem 00:00`, `periodoFinal = hoje 00:00 - 1ms`
- **Últimos 7 Dias**: `periodoInicial = hoje - 6 dias`, `periodoFinal = hoje 23:59:59`
- **Mês Atual**: `periodoInicial = primeiro dia do mês`, `periodoFinal = último dia do mês`
- **Mês Passado**: `periodoInicial = primeiro dia do mês passado`, `periodoFinal = último dia do mês passado`
- **Últimos 30/60/90 Dias**: Similar aos 7 dias, mas com mais dias

### 6. Botão "Por datas"
- **Texto**: "Por datas"
- **Ícone**: Ícone de calendário (FFIcons.kcalendarDateRange) no final
- **Background**: Cor primária
- **Altura**: 36px
- **Comportamento**:
  - Abre um modal/dialog (`EscolheDatas1Widget`) para seleção de data inicial e final
  - Ao selecionar datas, atualiza `periodoInicialFilter` e `periodoFinalFilter`
  - Chama `_fetchVendas(resetPage: true)` após seleção

---

## 🎛️ Seção de Filtros Avançados (Segunda Linha)

### Container
- **Background**: Cor `#18003366` (azul com opacidade)
- **Border radius**: 20px apenas no topo
- **Padding**: 8px horizontal, 6px top, 8px bottom
- **Layout**: Wrap (permite quebra de linha em telas menores)
- **Espaçamento**: 6px horizontal, 16px vertical entre linhas

### Ícone de Filtros
- **Ícone**: FFIcons.kadjustmentsHorizontal
- **Cor**: Cor primária
- **Tamanho**: 24px

### Filtros Disponíveis (Cada um em uma Column)

#### 1. Status da Venda
- **Label**: "Status da Venda" (12px, cor secundária)
- **Dropdown**:
  - **Opções**: "Aberta", "Finalizada", "Cancelada"
  - **Placeholder**: "Selecione..."
  - **Background**: Cor `info`
  - **Border**: Transparente (focused: primária, 1px)
  - **Ícone de limpar**: Aparece quando há valor selecionado (ícone X no canto direito)
  - **Comportamento**:
    - Ao selecionar, limpa filtros de data manual
    - Aplica debounce de 1 segundo
    - Se null: API recebe `['FINALIZADA', 'CANCELADA']`
    - Se selecionado: API recebe `[valor.toUpperCase()]`

#### 2. Tipo de Venda
- **Label**: "Tipo de Venda" (12px)
- **Dropdown**:
  - **Opções**: "Balcao", "Mesa"
  - **Display**: "Balcão" (com acento) para "Balcao"
  - **Placeholder**: "Selecione..."
  - **Comportamento**: Debounce de 1 segundo, envia em lowercase para API

#### 3. Meio de Pagamento
- **Label**: "Meio de Pagamento" (12px)
- **Dropdown**:
  - **Opções**: Carregadas da API (lista de meios de pagamento ativos)
  - **Value**: ID do meio de pagamento
  - **Label**: Nome do meio de pagamento
  - **Menu height**: 400px
  - **Loading**: Desabilitado enquanto carrega meios de pagamento
  - **Comportamento**: 
    - Busca TODOS os meios de pagamento (paginação completa)
    - Loop enquanto `hasNext === true`
    - Limite por página: 100

#### 4. Vendas por Usuário
- **Label**: "Vendas por Usuário" (12px)
- **Dropdown**:
  - **Opções**: Lista de usuários PDV (carregados no initState)
  - **Value**: ID do usuário
  - **Label**: Nome do usuário
  - **Menu height**: 400px
  - **Comportamento**: Usa lista já carregada de usuários PDV

#### 5. Terminal
- **Label**: "Terminal" (12px)
- **Dropdown**:
  - **Opções**: Lista de terminais (carregados no initState)
  - **Value**: ID do terminal
  - **Label**: Nome do terminal
  - **Menu height**: 400px
  - **Loading**: Desabilitado enquanto carrega terminais
  - **Comportamento**:
    - Busca TODOS os terminais (paginação completa)
    - Loop enquanto `hasNext === true`
    - Limite por página: 50

#### 6. Usuário Cancelou
- **Label**: "Usuário Cancelou" (12px)
- **Dropdown**:
  - **Opções**: Mesma lista de usuários PDV
  - **Value**: ID do usuário
  - **Label**: Nome do usuário
  - **Menu height**: 400px

#### 7. Botão "Limpar Filtros"
- **Texto**: "Limpar Filtros"
- **Ícone**: Icons.filter_alt_off_outlined
- **Background**: Cor `alternate`
- **Altura**: 46px
- **Comportamento**:
  - Limpa TODOS os filtros
  - Reseta dropdowns para null/vazio
  - Limpa campos de texto
  - Reseta período para "Todos"
  - Chama `_fetchVendas(resetPage: true, initialStatus: 'FINALIZADA')`

---

## 📊 Cards de Métricas

### Layout
- **Container**: Flex horizontal com 4 cards
- **Espaçamento**: 30px entre cards
- **Altura**: 80px por card
- **Background**: Cor `info` do tema
- **Border radius**: 10px
- **Padding interno**: 8px

### Estrutura de Cada Card
- **Ícone**: Círculo de 48x48px com ícone centralizado
- **Conteúdo**: Column alinhada à direita com:
  - Label (12px, cor secundária)
  - Valor (22px, cor primária, fonte Exo)

### Cards

#### 1. Vendas Finalizadas/Em Aberto
- **Ícone**: FFIcons.kbasket (cesta)
- **Cor do círculo**: Cor `alternate`
- **Cor do ícone**: Cor `info`
- **Label**: 
  - Se `statusFilterValue === 'Aberta'`: "Vendas em Aberto"
  - Caso contrário: "Vendas Finalizadas"
- **Valor**: `vendasEfetivadas` (número)

#### 2. Vendas Canceladas
- **Ícone**: Icons.close_rounded (X)
- **Cor do círculo**: Cor `error`
- **Cor do ícone**: Cor `info`
- **Label**: "Vendas Canceladas"
- **Valor**: `vendasCanceladas` (número)

#### 3. Total de Produtos Vendidos
- **Ícone**: FontAwesomeIcons.plateWheat
- **Cor do círculo**: Cor `warning`
- **Cor do ícone**: Cor `info`
- **Label**: "Total de Produtos Vendidos"
- **Valor**: `produtosVendidos` (número)

#### 4. Total Faturado
- **Ícone**: FontAwesomeIcons.sackDollar
- **Cor do círculo**: Cor `accent1`
- **Cor do ícone**: Cor `info`
- **Label**: "Total Faturado"
- **Valor**: `totalFaturado` formatado como moeda brasileira (R$)

---

## 📋 Tabela de Vendas

### Cabeçalho da Tabela
- **Background**: Cor primária
- **Padding**: 12px horizontal, 4px vertical
- **Colunas** (visíveis apenas em desktop, ocultas em mobile):
  1. **Código Venda** (flex: 1)
  2. **Data/Hora** (flex: 1, centralizado)
  3. **Tipo Venda** (flex: 1, centralizado)
  4. **Cód. Terminal** (flex: 1, centralizado)
  5. **Usuário PDV** (flex: 2, centralizado)
  6. **Valor Final** (flex: 1, alinhado à esquerda)
  7. **Cupom** (flex: 1, alinhado à direita)

### Linhas da Tabela
- **Background**: Cor `info` (normal), `primaryBackground` (hover)
- **Altura**: 54px
- **Border radius**: 10px
- **Padding**: 10px horizontal, 8px top, 4px bottom
- **Box shadow**: Aparece no hover (blur: 5px, offset: 0,3)
- **Hover**: Muda background e adiciona sombra

### Conteúdo das Colunas

#### 1. Código Venda
- **Formato**: `#${codigoVenda}`
- **Fonte**: Google Fonts "Nunito", 14px, semibold

#### 2. Data/Hora
- **Data**: Formato "dd, MMM" (ex: "15, Jan")
- **Hora**: Formato "HH:mm" (ex: "14:30")
- **Layout**: Column com data acima e hora abaixo
- **Alinhamento**: Centralizado

#### 3. Tipo Venda
- **Se `tipoVenda === 'mesa'`**:
  - Ícone de mesa (FFIcons.ktableIconLalicamargo) com número da mesa centralizado
  - Círculo branco com borda ao redor do número
- **Se `tipoVenda === 'balcao'`**:
  - Ícone de bar (Icons.sports_bar_rounded)
  - Texto "Balcão" abaixo

#### 4. Cód. Terminal
- **Formato**: `#${codigoTerminal}`
- **Alinhamento**: Centralizado

#### 5. Usuário PDV
- **Valor**: Nome do usuário (buscado via API se necessário)
- **Fallback**: ID do usuário se nome não disponível
- **Alinhamento**: Centralizado

#### 6. Valor Final
- **Formato**: Moeda brasileira (R$ X,XX)
- **Fonte**: Google Fonts "Nunito", 14px, bodyLarge
- **Alinhamento**: À esquerda

#### 7. Cupom
- **Botão**: FlutterFlowIconButton
  - Ícone: FFIcons.kpaperNoteA4Alt
  - Cor: Cor primária
  - Tamanho: 40x40px
  - Tooltip: "Comprovante de Venda" (aparece ao tocar/clicar)
- **Comportamento**: Abre modal de detalhes da venda

### Estados Especiais

#### Nenhuma Venda Encontrada
- Exibe widget `ListaVendasVaziaWidget` quando `id === 'no_results'`

#### Erro ao Carregar
- Exibe widget `ListaVendasVaziaWidget` quando `id === 'error_loading'`

#### Loading (Paginação)
- Exibe `CircularProgressIndicator` no final da lista quando `canLoadMore === true`

---

## 🔌 Integrações de API

### Base URL
Todas as APIs de vendas usam: `${BASE_API_URL}/operacao-pdv`

### Headers Padrão
```json
{
  "Content-Type": "application/json",
  "accept": "application/json",
  "Authorization": "Bearer {token}"
}
```

### 1. Listar Vendas
**Endpoint**: `GET /operacao-pdv/vendas`

**Parâmetros de Query**:
- `offset`: Número da página * pageSize (inicia em 0)
- `limit`: Tamanho da página (padrão: 10)
- `q`: String de busca (código ou identificação) - null se vazio
- `tipoVenda`: "balcao" ou "mesa" (lowercase) - "" se "Todos"
- `status`: Array de strings (ex: ["FINALIZADA", "CANCELADA"]) - múltiplos valores permitidos
- `abertoPorId`: ID do usuário - "" se "Todos"
- `canceladoPorId`: ID do usuário - "" se "Todos"
- `valorFinalMinimo`: Número (double) - null se vazio
- `valorFinalMaximo`: Número (double) - null se vazio
- `meioPagamentoId`: ID do meio de pagamento - "" se "Todos"
- `terminalId`: ID do terminal - "" se "Todos"
- `periodoInicial`: ISO8601 string (ex: "2024-01-01T00:00:00.000Z") - null se vazio
- `periodoFinal`: ISO8601 string - null se vazio

**Observações Importantes**:
- `status` pode receber múltiplos valores: `?status=FINALIZADA&status=CANCELADA`
- Se `statusFilterValue === null`: envia `['FINALIZADA', 'CANCELADA']`
- Se `statusFilterValue` tem valor: envia `[valor.toUpperCase()]`

**Resposta**:
```json
{
  "items": [
    {
      "id": "string",
      "numeroVenda": number,
      "codigoVenda": "string",
      "numeroMesa": number,
      "valorFinal": number,
      "tipoVenda": "balcao" | "mesa",
      "abertoPorId": "string",
      "codigoTerminal": "string",
      "terminalId": "string",
      "dataCriacao": "ISO8601",
      "dataCancelamento": "ISO8601",
      "dataFinalizacao": "ISO8601",
      "metodoPagamento": "string",
      "status": "string"
    }
  ],
  "count": number,
  "page": number,
  "limit": number,
  "totalPages": number,
  "hasNext": boolean,
  "hasPrevious": boolean,
  "metricas": {
    "totalFaturado": number,
    "countVendasEfetivadas": number,
    "countVendasCanceladas": number,
    "countProdutosVendidos": number
  }
}
```

**Mapeamento**:
- `response.items` → lista de vendas
- `response.metricas.totalFaturado` → `totalFaturado`
- `response.metricas.countVendasEfetivadas` → `vendasEfetivadas`
- `response.metricas.countVendasCanceladas` → `vendasCanceladas`
- `response.metricas.countProdutosVendidos` → `produtosVendidos`
- `response.hasNext` → `canLoadMore`

### 2. Buscar Usuários PDV (Para Dropdown)
**Endpoint**: `GET /preferencias/usuarios-pdv`

**Parâmetros**:
- `limit`: 100
- `offset`: número da página * 100
- `ativo`: true

**Comportamento**: Loop de paginação para buscar TODOS os usuários

### 3. Buscar Meios de Pagamento (Para Dropdown)
**Endpoint**: `GET /preferencias/impressoras/meios-pagamento` (verificar endpoint correto)

**Parâmetros**:
- `limit`: 100
- `offset`: número da página * 100
- `ativo`: true

**Comportamento**: Loop de paginação para buscar TODOS os meios de pagamento

### 4. Buscar Terminais (Para Dropdown)
**Endpoint**: `GET /preferencias/terminais`

**Parâmetros**:
- `limit`: 50
- `offset`: número da página * 50

**Comportamento**: Loop de paginação para buscar TODOS os terminais

### 5. Buscar Nome de Usuário (Opcional - Lazy Loading)
**Endpoint**: `GET /preferencias/usuarios-pdv/{id}`

**Comportamento**: 
- Busca nome do usuário quando necessário (se não estiver na lista)
- Armazena em cache (`_userNames` map)

---

## 🔄 Fluxo de Dados e Estados

### Estados Necessários
```typescript
interface VendasPageState {
  // Filtros
  searchQuery: string;
  valorMinimo: string; // Formatado como moeda
  valorMaximo: string; // Formatado como moeda
  periodo: string | null;
  statusFilter: string | null;
  tipoVendaFilter: string | null;
  metodoPagamentoFilter: string | null;
  usuarioAbertoPorFilter: string | null;
  terminalFilter: string | null;
  usuarioCancelouFilter: string | null;
  periodoInicial: Date | null;
  periodoFinal: Date | null;
  
  // Dados
  vendas: Venda[];
  usuariosPDV: UserPDV[];
  meiosPagamento: MeioPagamento[];
  terminais: Terminal[];
  
  // Paginação
  currentPage: number;
  pageSize: number;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  
  // Métricas
  totalFaturado: number;
  vendasEfetivadas: number;
  vendasCanceladas: number;
  produtosVendidos: number;
  
  // UI
  hoveredIndex: number | null;
  isLoadingMeiosPagamento: boolean;
  isLoadingTerminais: boolean;
}
```

### Inicialização
1. Ao montar o componente:
   - Carregar lista de usuários PDV (paginação completa)
   - Carregar lista de meios de pagamento (paginação completa)
   - Carregar lista de terminais (paginação completa)
   - Carregar primeira página de vendas com status "FINALIZADA" (padrão)

### Paginação Infinita
- **Scroll Listener**: Detecta quando usuário chega ao final da lista
- **Condições para carregar mais**:
  - `canLoadMore === true`
  - `isLoadingMore === false`
  - Scroll chegou ao final (`scrollPosition === maxScrollExtent`)
- **Ao carregar mais**:
  - Incrementa `currentPage`
  - Chama API com novo offset
  - Adiciona novos itens à lista existente
  - Atualiza `canLoadMore` baseado em `hasNext`

### Formatação de Moeda
**Função de Formatação**:
```typescript
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
```

**Normalização (Remover Formatação)**:
```typescript
function normalizeCurrency(value: string): number | null {
  if (!value) return null;
  // Remove tudo exceto números e vírgula
  const clean = value.replace(/[^\d,]/g, '');
  // Remove pontos de milhar
  const withoutThousands = clean.replace(/\./g, '');
  // Troca vírgula por ponto
  const withDot = withoutThousands.replace(',', '.');
  return parseFloat(withDot) || null;
}
```

**Formatação em Tempo Real (Input)**:
- Remove caracteres não numéricos
- Divide por 100 (para centavos)
- Formata como moeda
- Atualiza cursor para o final

### Debounce
- **Tempo**: 1000ms (1 segundo)
- **Aplicado em**: 
  - Campo de pesquisa (q)
  - Todos os dropdowns de filtro
- **Não aplicado em**:
  - Campos de valor (acionam apenas com Enter)
  - Dropdown de período (aciona imediatamente)

---

## 🎯 Modal de Detalhes da Venda

### Estrutura Geral
- **Tipo**: Dialog/Modal centralizado
- **Largura máxima**: 620px (desktop)
- **Background**: Cor `info` do tema
- **Border radius**: 22px
- **Elevation**: 12px
- **Padding**: 16px

### AppBar do Modal
- **Background**: Cor primária
- **Título**: 
  - Ícone do tipo de venda (balcão ou mesa) + número da mesa (se mesa)
  - "Venda Nº. {numeroVenda}"
  - "#{codigoVenda}"
- **Botão fechar**: Ícone X no canto esquerdo
- **Border radius**: 20px em todos os cantos

### Conteúdo do Modal

#### 1. Card "Informações da Venda"
- **Título**: "Informações da Venda" (18px, bold, fonte Exo)
- **Divisor**: Linha tracejada
- **Campos** (cada um em um Container com borda e sombra):
  - **Status da Venda**: 
    - "CANCELADA" (se `canceladoPorId` existe)
    - "FINALIZADA" (se `dataFinalizacao` existe)
    - "EM ABERTO" (caso contrário)
    - Background colorido baseado no status
  - **Aberto por**: Nome do usuário
  - **Finalizado Por**: Nome do usuário (se existe `ultimoResponsavelId`)
  - **Cancelado Por**: Nome do usuário (se existe `canceladoPorId`)
  - **Código do Terminal**: `#${codigoTerminal}`
  - **Data/Hora de Criação**: Formatado como "dd/MMM/yyyy - HH:mm"
  - **Data/Hora de Finalização**: Formatado (se existe)
  - **Cliente Vinculado**: Nome do cliente (se existe `clienteId`)
  - **Identificação da Venda**: Texto (se existe)

#### 2. Card "Produtos Lançados"
- **Título**: "Produtos Lançados" (18px, bold)
- **Divisor**: Linha tracejada
- **Lista de produtos**:
  - Cada produto em um Container
  - **Se removido**: Background vermelho (cor `error`)
  - **Estrutura do item**:
    - Ícone de comida (Icons.local_dining)
    - **Linha principal**:
      - Quantidade (ex: "2x")
      - Nome do produto + valor unitário + descontos/acréscimos
      - Valor total (pode quebrar linha se muito grande)
    - **Complementos** (se existirem):
      - Cada complemento em uma linha
      - Prefixo: "+ " (aumenta), "- " (diminui), ou vazio (nenhum impacto)
      - Quantidade + nome + valor
    - **Metadados**:
      - "Lançado: {data/hora}"
      - "Usuário: {nome}"
- **Total da Venda**: Último item, destacado (bold, 16px)

#### 3. Card "Pagamentos Realizados"
- **Título**: "Pagamentos Realizados" (18px, bold)
- **Divisor**: Linha tracejada
- **Lista de pagamentos confirmados** (apenas `cancelado === false`):
  - Cada pagamento em um Container verde (#4BD08A)
  - **Estrutura**:
    - **Ícone à esquerda** (68x62px):
      - Background: Cor primária
      - Ícone baseado em `formaPagamentoFiscal`:
        - Dinheiro: FontAwesomeIcons.moneyBillWave
        - Crédito/Débito: FontAwesomeIcons.creditCard
        - PIX: FontAwesomeIcons.moneyCheckAlt
        - Outros: Icons.payments_rounded
    - **Detalhes à direita**:
      - Nome do meio de pagamento (bold, primária)
      - Data/hora (small, secundária)
      - Valor formatado (bold, primária)
      - "PDV Resp.: {nome usuário}" (small, secundária)
- **Troco** (se existe pagamento em dinheiro e `troco > 0`):
  - Linha adicional: "Troco: {valor formatado}"

### APIs do Modal

#### 1. Buscar Detalhes da Venda
**Endpoint**: `GET /operacao-pdv/vendas/{id}`

**Resposta**:
```json
{
  "id": "string",
  "numeroVenda": number,
  "codigoVenda": "string",
  "numeroMesa": number,
  "valorFinal": number,
  "tipoVenda": "balcao" | "mesa",
  "abertoPorId": "string",
  "codigoTerminal": "string",
  "terminalId": "string",
  "dataCriacao": "ISO8601",
  "dataCancelamento": "ISO8601",
  "dataFinalizacao": "ISO8601",
  "canceladoPorId": "string",
  "ultimoResponsavelId": "string",
  "clienteId": "string",
  "identificacao": "string",
  "troco": number,
  "produtosLancados": [
    {
      "nomeProduto": "string",
      "quantidade": number,
      "valorUnitario": number,
      "desconto": string | number,
      "tipoDesconto": "porcentagem" | "fixo",
      "acrescimo": string | number,
      "tipoAcrescimo": "porcentagem" | "fixo",
      "complementos": [
        {
          "nomeComplemento": "string",
          "quantidade": number,
          "valorUnitario": number,
          "tipoImpactoPreco": "aumenta" | "diminui" | "nenhum"
        }
      ],
      "dataLancamento": "ISO8601",
      "lancadoPorId": "string",
      "vendaId": "string",
      "removido": boolean
    }
  ],
  "pagamentos": [
    {
      "meioPagamentoId": "string",
      "valor": number,
      "dataCriacao": "ISO8601",
      "realizadoPorId": "string",
      "canceladoPorId": "string",
      "cancelado": boolean
    }
  ]
}
```

#### 2. Buscar Nome de Usuário PDV
**Endpoint**: `GET /preferencias/usuarios-pdv/{id}`

**Resposta**: `{ "nome": "string" }`

**Comportamento**: 
- Busca todos os IDs únicos de usuários necessários
- Faz chamadas em paralelo (ou sequencial)
- Armazena em cache (`nomesUsuariosPDV` map)

#### 3. Buscar Nome de Meio de Pagamento
**Endpoint**: `GET /preferencias/meios-pagamento/{id}` (verificar endpoint)

**Resposta**: `{ "nome": "string", "formaPagamentoFiscal": "string" }`

**Comportamento**: Similar aos usuários, armazena em cache

#### 4. Buscar Nome de Cliente
**Endpoint**: `GET /preferencias/clientes/{id}` (verificar endpoint)

**Resposta**: `{ "nome": "string" }`

---

## 🎨 Componentes NextJS Necessários

### 1. Página Principal
- Layout com sidebar (condicional por breakpoint)
- Container principal com border radius
- Seção de filtros superiores
- Seção de filtros avançados (Wrap)
- Cards de métricas
- Tabela com scroll infinito

### 2. Componentes de Filtro
- Input de pesquisa com ícone
- Input de moeda (valor mínimo/máximo)
- Dropdown customizado (Select)
- Botão de período
- Modal de seleção de datas

### 3. Componentes de Tabela
- Header da tabela
- Linha de venda (com hover)
- Ícone de tipo de venda (mesa/balcão)
- Botão de cupom com tooltip

### 4. Modal de Detalhes
- Dialog/Modal component
- AppBar customizado
- Cards de informação
- Lista de produtos
- Lista de pagamentos
- Divisor tracejado

### 5. Utilitários
- Formatação de moeda
- Normalização de moeda
- Formatação de data/hora
- Debounce hook
- Scroll infinito hook

---

## 📐 Estrutura de Arquivos Sugerida

```
app/
  (ou pages/)
    vendas/
      page.tsx                    # Página principal
      components/
        FiltrosSuperiores.tsx     # Primeira linha de filtros
        FiltrosAvancados.tsx      # Segunda linha de filtros
        CardsMetricas.tsx         # 4 cards de métricas
        TabelaVendas.tsx          # Tabela com scroll infinito
        LinhaVenda.tsx            # Componente de linha
        ModalDetalhesVenda.tsx    # Modal completo
        CardInfoVenda.tsx         # Card de informações
        ListaProdutos.tsx         # Lista de produtos
        ItemProduto.tsx           # Item individual
        ListaPagamentos.tsx       # Lista de pagamentos
        ItemPagamento.tsx         # Item individual
      hooks/
        useVendas.ts              # Hook para buscar vendas
        useUsuariosPDV.ts         # Hook para buscar usuários
        useMeiosPagamento.ts      # Hook para buscar meios
        useTerminais.ts           # Hook para buscar terminais
        useDetalhesVenda.ts       # Hook para detalhes
        useInfiniteScroll.ts      # Hook para scroll infinito
        useDebounce.ts            # Hook para debounce
      utils/
        currency.ts               # Formatação de moeda
        date.ts                   # Formatação de data
      types/
        venda.types.ts            # Tipos TypeScript
        filtros.types.ts          # Tipos de filtros
      api/
        vendas.api.ts             # Funções de API
        usuarios.api.ts           # Funções de API
        meios-pagamento.api.ts    # Funções de API
        terminais.api.ts          # Funções de API
```

---

## ✅ Checklist de Implementação

### Funcionalidades Core
- [ ] Carregamento inicial de vendas (status FINALIZADA)
- [ ] Paginação infinita (scroll)
- [ ] Campo de pesquisa com debounce
- [ ] Campos de valor com formatação de moeda
- [ ] Dropdown de período com cálculo de datas
- [ ] Modal de seleção de datas
- [ ] Todos os filtros avançados funcionando
- [ ] Botão limpar filtros
- [ ] Cards de métricas atualizados
- [ ] Tabela responsiva (ocultar colunas em mobile)
- [ ] Hover nas linhas da tabela
- [ ] Modal de detalhes abrindo corretamente
- [ ] Busca de nomes de usuários/clientes/meios no modal
- [ ] Formatação correta de produtos e complementos
- [ ] Cálculo de valores com descontos/acréscimos
- [ ] Exibição de troco (se aplicável)

### UI/UX
- [ ] Loading states apropriados
- [ ] Estados vazios (nenhuma venda encontrada)
- [ ] Estados de erro
- [ ] Tooltips onde necessário
- [ ] Animações suaves
- [ ] Responsividade completa
- [ ] Acessibilidade (ARIA labels, keyboard navigation)

### Integrações
- [ ] Autenticação (token Bearer)
- [ ] Tratamento de erros de API
- [ ] Retry logic (opcional)
- [ ] Cache de dados (opcional, para performance)

---

## 🚨 Pontos de Atenção

1. **Paginação de Dropdowns**: Meios de pagamento e terminais devem buscar TODAS as páginas, não apenas a primeira.

2. **Status Padrão**: Ao carregar inicialmente, a API deve receber `['FINALIZADA', 'CANCELADA']` mesmo que o dropdown esteja vazio.

3. **Formatação de Moeda**: Os campos de valor devem formatar em tempo real, mas normalizar antes de enviar à API.

4. **Debounce**: Aplicar debounce de 1 segundo em todos os filtros exceto período (imediato) e valores (apenas Enter).

5. **Scroll Infinito**: Detectar quando o usuário chega ao final e carregar próxima página automaticamente.

6. **Cálculo de Valores no Modal**: 
   - Produtos: `valorUnitario` com descontos/acréscimos aplicados
   - Descontos podem ser porcentagem ou fixo
   - Acréscimos podem ser porcentagem ou fixo
   - Complementos podem aumentar, diminuir ou não impactar o preço

7. **Múltiplos Status**: A API aceita múltiplos valores de status na query string: `?status=FINALIZADA&status=CANCELADA`

8. **Busca de Nomes no Modal**: Buscar todos os IDs únicos primeiro, depois fazer chamadas em paralelo para melhor performance.

9. **Formatação de Data**: 
   - Lista: "dd, MMM" e "HH:mm" separados
   - Modal: "dd/MMM/yyyy - HH:mm"

10. **Responsividade**: Em mobile, ocultar algumas colunas da tabela (Data/Hora, Tipo Venda, Cód. Terminal, Usuário PDV).

---

## 📝 Exemplo de Código TypeScript (Estrutura)

```typescript
// types/venda.types.ts
export interface Venda {
  id: string;
  numeroVenda: number;
  codigoVenda: string;
  numeroMesa?: number;
  valorFinal: number;
  tipoVenda: 'balcao' | 'mesa';
  abertoPorId: string;
  codigoTerminal: string;
  terminalId: string;
  dataCriacao: string;
  dataCancelamento?: string;
  dataFinalizacao?: string;
  metodoPagamento?: string;
  status?: string;
}

export interface VendaDetalhes extends Venda {
  canceladoPorId?: string;
  ultimoResponsavelId?: string;
  clienteId?: string;
  identificacao?: string;
  troco?: number;
  produtosLancados: ProdutoLancado[];
  pagamentos: Pagamento[];
}

export interface ProdutoLancado {
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  desconto?: string | number;
  tipoDesconto?: 'porcentagem' | 'fixo';
  acrescimo?: string | number;
  tipoAcrescimo?: 'porcentagem' | 'fixo';
  complementos: Complemento[];
  dataLancamento: string;
  lancadoPorId: string;
  vendaId: string;
  removido: boolean;
}

export interface Complemento {
  nomeComplemento: string;
  quantidade: number;
  valorUnitario: number;
  tipoImpactoPreco: 'aumenta' | 'diminui' | 'nenhum';
}

export interface Pagamento {
  meioPagamentoId: string;
  valor: number;
  dataCriacao: string;
  realizadoPorId: string;
  canceladoPorId?: string;
  cancelado: boolean;
}

export interface MetricasVendas {
  totalFaturado: number;
  countVendasEfetivadas: number;
  countVendasCanceladas: number;
  countProdutosVendidos: number;
}

// hooks/useVendas.ts
export function useVendas(filters: VendasFilters) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null);
  const [loading, setLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const fetchVendas = async (reset = false) => {
    if (loading || (!canLoadMore && !reset)) return;
    
    setLoading(true);
    const page = reset ? 0 : currentPage;
    
    try {
      const response = await listarVendas({
        offset: page * pageSize,
        limit: pageSize,
        ...filters
      });
      
      if (reset) {
        setVendas(response.items);
        setCurrentPage(1);
      } else {
        setVendas(prev => [...prev, ...response.items]);
        setCurrentPage(prev => prev + 1);
      }
      
      setMetricas(response.metricas);
      setCanLoadMore(response.hasNext);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  return { vendas, metricas, loading, canLoadMore, fetchVendas };
}
```

---

## 🎯 Prompt Final para o Agente IA

Use este prompt completo no Cursor para recriar a página:

---

**PROMPT:**

Crie uma página de histórico de vendas em NextJS com as seguintes especificações:

1. **Estrutura Principal**:
   - Sidebar visível apenas em desktop
   - Container principal com border radius (20px top, 10px bottom)
   - Título "Histórico de Vendas" (fonte Exo, cor primária)

2. **Filtros Superiores (Primeira Linha)**:
   - Campo de pesquisa (flex: 2) com ícone de busca, debounce 1s, aciona com Enter
   - Campo valor mínimo com formatação de moeda em tempo real, aciona com Enter
   - Campo valor máximo com formatação de moeda em tempo real, aciona com Enter
   - Label "Período:" alinhado à direita
   - Dropdown de período (opções: Todos, Hoje, Ontem, Últimos 7 Dias, Mês Atual, Mês Passado, Últimos 30/60/90 Dias) - aciona imediatamente
   - Botão "Por datas" que abre modal de seleção de datas

3. **Filtros Avançados (Segunda Linha)**:
   - Container com background azul translúcido, layout Wrap
   - Dropdowns: Status (Aberta/Finalizada/Cancelada), Tipo Venda (Balcão/Mesa), Meio de Pagamento, Vendas por Usuário, Terminal, Usuário Cancelou
   - Cada dropdown com ícone de limpar quando há valor
   - Debounce de 1s em todos os dropdowns
   - Botão "Limpar Filtros" que reseta tudo

4. **Cards de Métricas (4 cards)**:
   - Vendas Finalizadas/Em Aberto (ícone cesta)
   - Vendas Canceladas (ícone X)
   - Total de Produtos Vendidos (ícone prato)
   - Total Faturado (ícone dinheiro)
   - Cada card: ícone em círculo colorido + label + valor

5. **Tabela de Vendas**:
   - Cabeçalho com background primário
   - Colunas: Código Venda, Data/Hora, Tipo Venda, Cód. Terminal, Usuário PDV, Valor Final, Cupom
   - Scroll infinito (carrega mais ao chegar ao final)
   - Hover: muda background e adiciona sombra
   - Tipo Venda: ícone de mesa com número ou ícone de bar
   - Botão Cupom: abre modal de detalhes

6. **Modal de Detalhes**:
   - Largura máxima 620px, centralizado
   - AppBar com ícone do tipo de venda + título
   - 3 cards: Informações da Venda, Produtos Lançados, Pagamentos Realizados
   - Produtos: exibir descontos/acréscimos, complementos, metadados
   - Pagamentos: ícones baseados em formaPagamentoFiscal, exibir troco se aplicável

7. **APIs**:
   - GET `/operacao-pdv/vendas` com todos os filtros como query params
   - Status pode ser array: `?status=FINALIZADA&status=CANCELADA`
   - Resposta inclui `metricas` com totais
   - GET `/operacao-pdv/vendas/{id}` para detalhes
   - Buscar nomes de usuários/meios/clientes quando necessário

8. **Comportamentos**:
   - Paginação infinita (scroll)
   - Debounce de 1s em filtros (exceto período)
   - Formatação de moeda em tempo real nos inputs
   - Status padrão inicial: FINALIZADA e CANCELADA
   - Loading states apropriados
   - Estados vazios e de erro

9. **Formatações**:
   - Moeda: R$ X,XX (pt-BR)
   - Data lista: "dd, MMM" e "HH:mm"
   - Data modal: "dd/MMM/yyyy - HH:mm"

10. **Observações**:
    - Buscar TODAS as páginas de meios de pagamento e terminais para dropdowns
    - Normalizar valores de moeda antes de enviar à API
    - Calcular valores de produtos com descontos/acréscimos no modal
    - Responsivo: ocultar colunas em mobile

Use TypeScript, React Hook Form para formulários, React Query ou SWR para gerenciamento de estado de servidor, e siga as melhores práticas do NextJS 13+ (App Router se aplicável).

---

## 📚 Recursos Adicionais

- Considere usar `react-query` ou `SWR` para gerenciamento de estado de servidor
- Use `zod` para validação de schemas
- Implemente debounce com `use-debounce` ou hook customizado
- Use `react-window` ou `react-virtualized` para listas muito grandes (opcional)
- Adicione testes unitários para lógica crítica
- Documente os tipos TypeScript adequadamente
- Considere usar `date-fns` ou `dayjs` para manipulação de datas

---

**Fim do Documento**

