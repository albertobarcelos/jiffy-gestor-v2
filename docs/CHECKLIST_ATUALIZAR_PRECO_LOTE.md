# Checklist: Implementação de Atualizar Preços em Lote

## 📋 Visão Geral

Este documento contém o checklist completo para implementar a funcionalidade de **Atualização de Preços em Lote** de produtos, incluindo:
- Atualização de preços (valor ou percentual)
- Vinculação/desvinculação de impressoras
- Vinculação/desvinculação de grupos de complementos

---

## 🔍 Fase 1: Verificação de Dependências

### Entidades de Domínio
- [ ] **Produto** (`src/domain/entities/Produto.ts`)
  - [ ] Método `getImpressoras()` retorna array de `{ id: string, nome: string, ativo: boolean }`
  - [ ] Método `getGruposComplementos()` retorna array de `{ id: string, nome: string }`
  - [ ] Método `getValor()` retorna `number`
  - [ ] Método `getId()` retorna `string`
  - [ ] Método `getNome()` retorna `string`
  - [ ] Método `getCodigoProduto()` retorna `string`
  - [ ] Método estático `fromJSON(data: any)` mapeia impressoras e grupos de complementos

- [ ] **Impressora** (`src/domain/entities/Impressora.ts`)
  - [ ] Método `getId()` retorna `string`
  - [ ] Método `getNome()` retorna `string`
  - [ ] Método estático `fromJSON(data: any)`

- [ ] **GrupoProduto** (`src/domain/entities/GrupoProduto.ts`)
  - [ ] Método `getId()` retorna `string`
  - [ ] Método `getNome()` retorna `string`

- [ ] **GrupoComplemento** (`src/domain/entities/GrupoComplemento.ts`)
  - [ ] Método `getId()` retorna `string`
  - [ ] Método `getNome()` retorna `string`

### Hooks Customizados
- [ ] **useGruposProdutos** (`src/presentation/hooks/useGruposProdutos.ts`)
  - [ ] Aceita parâmetros: `{ limit?: number, ativo?: boolean | null }`
  - [ ] Retorna: `{ data: GrupoProduto[], isLoading: boolean }`

- [ ] **useGruposComplementos** (`src/presentation/hooks/useGruposComplementos.ts`)
  - [ ] Aceita parâmetros: `{ limit?: number, ativo?: boolean | null }`
  - [ ] Retorna: `{ data: GrupoComplemento[], isLoading: boolean }`

### Rotas API Existentes
- [ ] **GET /api/produtos** (`app/api/produtos/route.ts`)
  - [ ] Aceita query params: `name`, `limit`, `offset`, `ativo`, `ativoLocal`, `ativoDelivery`, `grupoProdutoId`
  - [ ] Retorna: `{ success: boolean, items: Produto[], count: number }`
  - [ ] Produtos retornados já incluem `impressoras[]` e `gruposComplementos[]`

- [ ] **GET /api/impressoras** (`app/api/impressoras/route.ts`)
  - [ ] Aceita query params: `limit`, `offset`, `q`
  - [ ] Retorna: `{ items: Impressora[], count: number }`

### Componentes UI
- [ ] **Button** (`src/presentation/components/ui/button.tsx`)
- [ ] **Input** (`src/presentation/components/ui/input.tsx`)
- [ ] **Checkbox** (`src/presentation/components/ui/checkbox.tsx`)
- [ ] **Skeleton** (`src/presentation/components/ui/skeleton.tsx`)

### Utilitários
- [ ] **transformarParaReal** (`src/shared/utils/formatters.ts`)
  - [ ] Formata número para formato monetário brasileiro (R$ X,XX)

- [ ] **brToEUA** (`src/shared/utils/formatters.ts`)
  - [ ] Converte formato brasileiro (0,00) para formato americano (0.00)

- [ ] **showToast** (`src/shared/utils/toast.ts`)
  - [ ] Métodos: `success()`, `error()`, `loading()`

### Store de Autenticação
- [ ] **useAuthStore** (`src/presentation/stores/authStore.ts`)
  - [ ] Método `auth?.getAccessToken()` retorna token JWT

---

## 🏗️ Fase 2: Arquivos a Criar

### 1. Rota API: Bulk Update
**Arquivo:** `app/api/produtos/bulk-update/route.ts`

**Funcionalidades:**
- [ ] Valida token de autenticação
- [ ] Valida que body é um array
- [ ] Valida que cada item tem `produtoId`
- [ ] Valida que cada item tem pelo menos um campo:
  - `valor?: number`
  - `impressorasIds?: string[]`
  - `impressorasIdsToRemove?: string[]`
  - `gruposComplementosIds?: string[]`
  - `gruposComplementosIdsToRemove?: string[]`
- [ ] Valida que arrays são do tipo correto
- [ ] Chama API externa: `POST /api/v1/cardapio/produtos/bulk-update`
- [ ] Retorna: `{ totalUpdated: number, produtosIds: string[] }`

**Estrutura esperada:**
```typescript
export async function POST(req: NextRequest) {
  // 1. Validação de token
  // 2. Validação de body
  // 3. Validação de cada item
  // 4. Chamada à API externa
  // 5. Retorno de resposta
}
```

### 2. Componente Principal
**Arquivo:** `src/presentation/components/features/produtos/AtualizarPrecoLote.tsx`

**Estrutura do Componente:**
- [ ] Imports necessários
- [ ] Estados do componente (ver seção de estados)
- [ ] Hooks customizados
- [ ] Funções de carregamento
- [ ] Funções de atualização
- [ ] Funções de seleção/toggle
- [ ] Renderização com 3 tabs

**Estados necessários:**
```typescript
- produtos: Produto[]
- produtosSelecionados: Set<string>
- isLoading: boolean
- isUpdating: boolean
- searchText: string
- total: number
- filterStatus: 'Todos' | 'Ativo' | 'Desativado'
- ativoLocalFilter: 'Todos' | 'Sim' | 'Não'
- ativoDeliveryFilter: 'Todos' | 'Sim' | 'Não'
- grupoProdutoFilter: string
- adjustMode: 'valor' | 'percentual'
- adjustAmount: string
- adjustDirection: 'increase' | 'decrease'
- filtersExpanded: boolean
- produtosExpandidos: Set<string>
- impressorasSelecionadas: Set<string>
- impressorasDisponiveis: Impressora[]
- isLoadingImpressoras: boolean
- gruposComplementosSelecionados: Set<string>
- activeTab: 'precos' | 'impressoras' | 'gruposComplementos'
- modoImpressora: 'adicionar' | 'remover'
- modoGrupoComplemento: 'adicionar' | 'remover'
```

### 3. Página Next.js
**Arquivo:** `app/produtos/atualizar-preco/page.tsx`

**Estrutura:**
- [ ] Dynamic import do componente
- [ ] Suspense com loading
- [ ] SSR desabilitado (`ssr: false`)

---

## 🔧 Fase 3: Funcionalidades a Implementar

### 3.1. Carregamento de Dados

#### Buscar Produtos (`buscarProdutos`)
- [ ] Função `useCallback` com dependências corretas
- [ ] Loop paginado (limit: 50) até carregar todos
- [ ] Aplica filtros: `name`, `ativo`, `ativoLocal`, `ativoDelivery`, `grupoProdutoId`
- [ ] Mapeia produtos com `Produto.fromJSON()`
- [ ] Atualiza estado progressivamente
- [ ] Tratamento de erros com toast
- [ ] Debounce de 500ms na busca (via `useEffect`)

#### Carregar Impressoras (`loadAllImpressoras`)
- [ ] Função `useCallback` com dependência `auth`
- [ ] Loop paginado (limit: 50) até carregar todas
- [ ] Mapeia com `Impressora.fromJSON()`
- [ ] Carrega apenas quando `activeTab === 'impressoras'`
- [ ] Tratamento de erros

### 3.2. Atualização de Preços

#### Função `atualizarPrecos`
- [ ] Validação: pelo menos 1 produto selecionado
- [ ] Validação: valor/percentual válido (não vazio, não zero)
- [ ] Validação: valor positivo
- [ ] Validação especial para `decrease`:
  - Modo valor: valor < menor preço selecionado
  - Modo percentual: percentual < 100
- [ ] Cálculo do novo valor:
  - Modo valor: `valorAtual + (directionSign * adjustValue)`
  - Modo percentual: `valorAtual * (1 + (directionSign * adjustValue) / 100)`
- [ ] Arredondamento para 2 casas decimais
- [ ] Validação: novo valor > 0
- [ ] Monta payload: `[{ produtoId, valor }]`
- [ ] POST para `/api/produtos/bulk-update`
- [ ] Delay de 800ms após sucesso
- [ ] Recarrega lista (`buscarProdutos()`)
- [ ] Delay de 500ms
- [ ] Exibe mensagem de sucesso
- [ ] Limpa seleções e campo de ajuste
- [ ] Tratamento de erros

### 3.3. Vinculação de Impressoras

#### Função `adicionarImpressoras`
- [ ] Validação: pelo menos 1 produto selecionado
- [ ] Validação: pelo menos 1 impressora selecionada
- [ ] Para cada produto:
  - [ ] Busca impressoras existentes do produto
  - [ ] Combina com novas impressoras selecionadas
  - [ ] Remove duplicatas
  - [ ] Monta payload: `{ produtoId, impressorasIds: [...] }`
- [ ] POST para `/api/produtos/bulk-update`
- [ ] Recarrega lista após sucesso
- [ ] Limpa seleções
- [ ] Tratamento de erros

#### Função `removerImpressoras`
- [ ] Validação: pelo menos 1 produto selecionado
- [ ] Validação: pelo menos 1 impressora selecionada
- [ ] Monta payload: `{ produtoId, impressorasIdsToRemove: [...] }`
- [ ] POST para `/api/produtos/bulk-update`
- [ ] Recarrega lista após sucesso
- [ ] Limpa seleções
- [ ] Tratamento de erros

#### Função `atualizarImpressoras`
- [ ] Decide entre `adicionarImpressoras` ou `removerImpressoras` baseado em `modoImpressora`

### 3.4. Vinculação de Grupos de Complementos

#### Função `vincularGruposComplementos`
- [ ] Validação: pelo menos 1 produto selecionado
- [ ] Validação: pelo menos 1 grupo selecionado
- [ ] Para cada produto:
  - [ ] Busca grupos existentes do produto
  - [ ] Combina com novos grupos selecionados
  - [ ] Remove duplicatas
  - [ ] Monta payload: `{ produtoId, gruposComplementosIds: [...] }`
- [ ] POST para `/api/produtos/bulk-update`
- [ ] Recarrega lista após sucesso
- [ ] Limpa seleções
- [ ] Tratamento de erros

#### Função `desvincularGruposComplementos`
- [ ] Validação: pelo menos 1 produto selecionado
- [ ] Validação: pelo menos 1 grupo selecionado
- [ ] Monta payload: `{ produtoId, gruposComplementosIdsToRemove: [...] }`
- [ ] POST para `/api/produtos/bulk-update`
- [ ] Recarrega lista após sucesso
- [ ] Limpa seleções
- [ ] Tratamento de erros

#### Função `atualizarGruposComplementos`
- [ ] Decide entre `vincularGruposComplementos` ou `desvincularGruposComplementos` baseado em `modoGrupoComplemento`

### 3.5. Funções Auxiliares

#### Seleção de Produtos
- [ ] `toggleSelecao(produtoId: string)` - adiciona/remove do Set
- [ ] Seleção de todos: quando checkbox do header é clicado
- [ ] Estado visual: produtos selecionados têm background `bg-primary/20`

#### Expansão Mobile
- [ ] `toggleExpansao(produtoId: string)` - adiciona/remove do Set
- [ ] Mostra/oculta detalhes (impressoras e grupos) no mobile

#### Seleção de Impressoras
- [ ] `toggleImpressora(impressoraId: string)` - adiciona/remove do Set
- [ ] Selecionar todas: botão que seleciona todas as impressoras disponíveis

#### Seleção de Grupos
- [ ] `toggleGrupoComplemento(grupoId: string)` - adiciona/remove do Set
- [ ] Selecionar todos: botão que seleciona todos os grupos disponíveis

#### Limpar Filtros
- [ ] `handleClearFilters()` - reseta todos os filtros para valores padrão

---

## 🎨 Fase 4: Interface e UX

### 4.1. Header
- [ ] Título dinâmico baseado em `activeTab`
- [ ] Contador: "Total de itens: X | Selecionados: Y"
- [ ] Tabs: Preços | Impressoras | Grupos Complementos
- [ ] Botão "Cancelar" que redireciona para `/produtos`

### 4.2. Tab: Preços
- [ ] Select: Tipo de ajuste (Valor R$ | Porcentagem %)
- [ ] Checkboxes: Direção (+ ou -)
- [ ] Input: Valor/Percentual (aceita apenas números, vírgula e ponto)
- [ ] Botão: "Aplicar ajuste (X)" - desabilitado quando:
  - `isUpdating === true`
  - `produtosSelecionados.size === 0`
  - `adjustAmount.trim() === ''`
- [ ] Mensagem informativa quando há produtos selecionados

### 4.3. Tab: Impressoras
- [ ] Toggle: Modo (Vincular | Desvincular)
- [ ] Label: "Selecionar Impressoras (X selecionada(s))"
- [ ] Botão: "Selecionar todas" / "Desmarcar todas"
- [ ] Grid de checkboxes: 2 colunas mobile, 4 colunas desktop
- [ ] Loading state: "Carregando impressoras..."
- [ ] Empty state: "Nenhuma impressora disponível"
- [ ] Botão: "Vincular a X produto(s)" / "Desvincular de X produto(s)"
  - Desabilitado quando:
    - `isUpdating === true`
    - `produtosSelecionados.size === 0`
    - `impressorasSelecionadas.size === 0`

### 4.4. Tab: Grupos Complementos
- [ ] Toggle: Modo (Vincular | Desvincular)
- [ ] Label: "Selecionar Grupos de Complementos (X selecionado(s))"
- [ ] Botão: "Selecionar todos" / "Desmarcar todos"
- [ ] Grid de checkboxes: 2 colunas mobile, 4 colunas desktop
- [ ] Loading state: "Carregando grupos de complementos..."
- [ ] Empty state: "Nenhum grupo de complementos disponível"
- [ ] Botão: "Vincular a X produto(s)" / "Desvincular de X produto(s)"
  - Desabilitado quando:
    - `isUpdating === true`
    - `produtosSelecionados.size === 0`
    - `gruposComplementosSelecionados.size === 0`

### 4.5. Filtros
- [ ] Input de busca com ícone de lupa
- [ ] Debounce de 500ms
- [ ] Select: Status (Todos | Ativo | Desativado)
- [ ] Select: Ativo no local (Todos | Sim | Não)
- [ ] Select: Ativo no delivery (Todos | Sim | Não)
- [ ] Select: Grupo de produtos (carregado via hook)
- [ ] Botão: "Limpar filtros"
- [ ] Mobile: Botão para expandir/ocultar filtros

### 4.6. Lista de Produtos

#### Desktop
- [ ] Header da tabela com colunas:
  - Checkbox (selecionar todos)
  - Código
  - Nome
  - Impressoras (select dropdown)
  - Grupos Complementos (select dropdown)
  - Valor atual (alinhado à direita)
- [ ] Linhas alternadas: `bg-gray-50` e `bg-white`
- [ ] Linhas selecionadas: `bg-primary/20`
- [ ] Ordenação alfabética por nome
- [ ] Selects de impressoras/grupos são apenas para visualização (não editáveis)

#### Mobile
- [ ] Card compacto com:
  - Checkbox
  - Código
  - Nome
  - Valor
  - Botão expandir/ocultar
- [ ] Área expansível mostra:
  - Impressoras (select)
  - Grupos Complementos (select)

#### Estados
- [ ] Loading: GIF de loading + texto "Carregando..."
- [ ] Empty: "Nenhum produto encontrado"

---

## ✅ Fase 5: Validações e Regras de Negócio

### Validações de Preços
- [ ] Valor não pode ser vazio
- [ ] Valor não pode ser zero
- [ ] Valor não pode ser negativo
- [ ] Ao diminuir (modo valor): valor < menor preço selecionado
- [ ] Ao diminuir (modo percentual): percentual < 100%
- [ ] Novo valor calculado não pode ser <= 0

### Validações de Seleção
- [ ] Pelo menos 1 produto deve estar selecionado para qualquer ação
- [ ] Pelo menos 1 impressora deve estar selecionada para vincular/desvincular
- [ ] Pelo menos 1 grupo deve estar selecionado para vincular/desvincular

### Validações de Dados
- [ ] Produtos com erro de mapeamento são ignorados (não quebram a lista)
- [ ] Impressoras inválidas são filtradas
- [ ] Grupos inválidos são filtrados

---

## 🔄 Fase 6: Fluxos de Dados

### Fluxo: Atualizar Preços
```
1. Usuário seleciona produtos
2. Define tipo (valor/percentual) e direção (+/-)
3. Informa valor/percentual
4. Clica "Aplicar ajuste"
5. Validações frontend
6. POST /api/produtos/bulk-update
7. Delay 800ms
8. Recarrega lista
9. Delay 500ms
10. Toast de sucesso
11. Limpa seleções
```

### Fluxo: Vincular Impressoras
```
1. Usuário seleciona produtos
2. Seleciona impressoras
3. Clica "Vincular"
4. Validações
5. POST /api/produtos/bulk-update (com impressorasIds combinadas)
6. Recarrega lista
7. Toast de sucesso
8. Limpa seleções
```

### Fluxo: Desvincular Impressoras
```
1. Usuário seleciona produtos
2. Seleciona impressoras para remover
3. Clica "Desvincular"
4. Validações
5. POST /api/produtos/bulk-update (com impressorasIdsToRemove)
6. Recarrega lista
7. Toast de sucesso
8. Limpa seleções
```

### Fluxo: Vincular Grupos
```
1. Usuário seleciona produtos
2. Seleciona grupos
3. Clica "Vincular"
4. Validações
5. POST /api/produtos/bulk-update (com gruposComplementosIds combinados)
6. Recarrega lista
7. Toast de sucesso
8. Limpa seleções
```

### Fluxo: Desvincular Grupos
```
1. Usuário seleciona produtos
2. Seleciona grupos para remover
3. Clica "Desvincular"
4. Validações
5. POST /api/produtos/bulk-update (com gruposComplementosIdsToRemove)
6. Recarrega lista
7. Toast de sucesso
8. Limpa seleções
```

---

## 🧪 Fase 7: Testes e Validação

### Testes Funcionais
- [ ] Busca de produtos funciona com filtros
- [ ] Seleção de produtos (individual e todos)
- [ ] Atualização de preços (valor +)
- [ ] Atualização de preços (valor -)
- [ ] Atualização de preços (percentual +)
- [ ] Atualização de preços (percentual -)
- [ ] Validações impedem valores inválidos
- [ ] Vincular impressoras funciona
- [ ] Desvincular impressoras funciona
- [ ] Vincular grupos funciona
- [ ] Desvincular grupos funciona
- [ ] Lista recarrega após atualizações
- [ ] Estados de loading funcionam
- [ ] Mensagens de erro são exibidas
- [ ] Mensagens de sucesso são exibidas

### Testes de UI
- [ ] Layout responsivo (mobile/desktop)
- [ ] Tabs funcionam corretamente
- [ ] Filtros expandem/colapsam no mobile
- [ ] Cards expandem/colapsam no mobile
- [ ] Seleções visuais funcionam
- [ ] Botões desabilitam corretamente
- [ ] Loading states aparecem

### Testes de Performance
- [ ] Debounce na busca funciona (500ms)
- [ ] Paginação carrega todos os produtos
- [ ] Não há chamadas duplicadas à API
- [ ] Estados não causam re-renders desnecessários

---

## 📝 Fase 8: Pontos de Atenção

### Performance
- ⚠️ Carregamento de produtos: loop paginado pode ser lento com muitos produtos
- ⚠️ Debounce na busca: 500ms pode ser ajustado se necessário
- ⚠️ Delays após atualização: 800ms + 500ms podem ser ajustados

### UX
- ⚠️ Feedback visual: produtos selecionados devem ter destaque claro
- ⚠️ Mensagens: devem ser claras e informativas
- ⚠️ Loading: usuário deve saber que algo está processando

### Segurança
- ⚠️ Validações: tanto frontend quanto backend
- ⚠️ Token: sempre verificar antes de fazer requisições
- ⚠️ Erros: não expor informações sensíveis

### Compatibilidade
- ⚠️ Formato de números: usar `brToEUA` para conversão
- ⚠️ Formato de moeda: usar `transformarParaReal` para exibição
- ⚠️ Arrays: garantir que sempre são arrays válidos

---

## 🚀 Ordem de Implementação Recomendada

1. **Rota API** (`bulk-update/route.ts`)
   - Base para todas as funcionalidades

2. **Estrutura Base do Componente**
   - Estados, imports, estrutura básica

3. **Carregamento de Dados**
   - `buscarProdutos()`
   - `loadAllImpressoras()`
   - Hooks de grupos

4. **Tab: Preços**
   - UI básica
   - Função `atualizarPrecos()`
   - Validações

5. **Tab: Impressoras**
   - UI básica
   - Funções de vincular/desvincular
   - Validações

6. **Tab: Grupos Complementos**
   - UI básica
   - Funções de vincular/desvincular
   - Validações

7. **Filtros e Busca**
   - Input de busca
   - Filtros diversos
   - Debounce

8. **Lista de Produtos**
   - Tabela desktop
   - Cards mobile
   - Seleção e expansão

9. **Ajustes Finais**
   - Loading states
   - Empty states
   - Mensagens de erro/sucesso
   - Responsividade

10. **Testes e Validação**
    - Testar todos os fluxos
    - Ajustar detalhes de UX
    - Verificar performance

---

## 📚 Referências de Código

### Estrutura de Payload para Bulk Update

**Atualizar Preços:**
```json
[
  {
    "produtoId": "uuid",
    "valor": 15.50
  }
]
```

**Vincular Impressoras:**
```json
[
  {
    "produtoId": "uuid",
    "impressorasIds": ["id1", "id2", "id3"]
  }
]
```

**Desvincular Impressoras:**
```json
[
  {
    "produtoId": "uuid",
    "impressorasIdsToRemove": ["id1", "id2"]
  }
]
```

**Vincular Grupos:**
```json
[
  {
    "produtoId": "uuid",
    "gruposComplementosIds": ["id1", "id2"]
  }
]
```

**Desvincular Grupos:**
```json
[
  {
    "produtoId": "uuid",
    "gruposComplementosIdsToRemove": ["id1"]
  }
]
```

### Cálculo de Preços

**Modo Valor (Aumentar):**
```typescript
novoValor = valorAtual + adjustValue
```

**Modo Valor (Diminuir):**
```typescript
novoValor = valorAtual - adjustValue
```

**Modo Percentual (Aumentar):**
```typescript
novoValor = valorAtual * (1 + adjustValue / 100)
```

**Modo Percentual (Diminuir):**
```typescript
novoValor = valorAtual * (1 - adjustValue / 100)
```

**Arredondamento:**
```typescript
novoValor = Number(novoValor.toFixed(2))
```

---

## ✅ Checklist Final

Antes de considerar a implementação completa:

- [ ] Todas as dependências estão disponíveis
- [ ] Rota API `bulk-update` está funcionando
- [ ] Componente principal está completo
- [ ] Todas as 3 tabs estão funcionando
- [ ] Filtros e busca estão funcionando
- [ ] Lista de produtos está renderizando corretamente
- [ ] Validações estão impedindo ações inválidas
- [ ] Mensagens de feedback estão aparecendo
- [ ] Layout responsivo está funcionando
- [ ] Performance está aceitável
- [ ] Não há erros no console
- [ ] Código está seguindo padrões do projeto

---

## 📌 Notas Finais

- Este checklist deve ser usado como guia durante a implementação
- Marque cada item conforme for implementando
- Se encontrar dependências faltando, anote e verifique antes de continuar
- Teste cada funcionalidade isoladamente antes de integrar
- Mantenha o código limpo e seguindo os padrões do projeto
- Documente qualquer decisão de design diferente do esperado

---

**Última atualização:** Criado para recriação da funcionalidade em nova branch baseada na main.
