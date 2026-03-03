# Análise: O que falta implementar no AtualizarPrecoLote

## 📊 Status Atual da Implementação

### ✅ O que JÁ EXISTE:

1. **Estrutura Base:**
   - ✅ Componente criado (`AtualizarPrecoLote.tsx`)
   - ✅ Página Next.js criada (`app/produtos/atualizar-preco/page.tsx`)
   - ✅ Imports básicos
   - ✅ Estados principais para preços

2. **Busca e Filtros:**
   - ✅ Função `buscarProdutos()` com paginação
   - ✅ Debounce de 500ms na busca
   - ✅ Filtros: Status, Ativo Local, Ativo Delivery, Grupo Produto, Grupo Complemento
   - ✅ Função `handleClearFilters()`

3. **Tab: Preços (Parcial):**
   - ✅ UI básica (select tipo, checkboxes direção, input valor)
   - ✅ Função `atualizarPrecos()` - **MAS usa PATCH individual** (precisa mudar para bulk-update)
   - ✅ Validações básicas
   - ✅ Botão "Aplicar ajuste"

4. **Lista de Produtos:**
   - ✅ Renderização básica
   - ✅ Seleção individual e "selecionar todos"
   - ✅ Ordenação alfabética
   - ✅ Estados de loading e empty
   - ✅ Colunas: Código, Nome, Grupo Produto, Grupos Complementos, Status, Valor

---

## ❌ O que FALTA IMPLEMENTAR:

### 1. Rota API: Bulk Update
**Arquivo:** `app/api/produtos/bulk-update/route.ts`
- ❌ **NÃO EXISTE** - Precisa ser criada
- Deve aceitar array de atualizações
- Deve suportar: `valor`, `impressorasIds`, `impressorasIdsToRemove`, `gruposComplementosIds`, `gruposComplementosIdsToRemove`

### 2. Entidade Produto: Suporte a Impressoras
**Arquivo:** `src/domain/entities/Produto.ts`
- ❌ **FALTA:** Propriedade `impressoras` na entidade
- ❌ **FALTA:** Método `getImpressoras()` 
- ❌ **FALTA:** Mapeamento de impressoras no `fromJSON()`
- ❌ **FALTA:** Interface `ProdutoImpressoraResumo`

**Estrutura necessária:**
```typescript
interface ProdutoImpressoraResumo {
  id: string
  nome: string
  ativo?: boolean
}
```

### 3. Estados Faltantes no Componente
**Arquivo:** `AtualizarPrecoLote.tsx`
- ❌ `activeTab: 'precos' | 'impressoras' | 'gruposComplementos'`
- ❌ `impressorasSelecionadas: Set<string>`
- ❌ `impressorasDisponiveis: Impressora[]`
- ❌ `isLoadingImpressoras: boolean`
- ❌ `gruposComplementosSelecionados: Set<string>`
- ❌ `modoImpressora: 'adicionar' | 'remover'`
- ❌ `modoGrupoComplemento: 'adicionar' | 'remover'`
- ❌ `produtosExpandidos: Set<string>` (para mobile)

### 4. Funções Faltantes

#### Carregamento:
- ❌ `loadAllImpressoras()` - Carrega todas as impressoras disponíveis

#### Impressoras:
- ❌ `toggleImpressora(impressoraId: string)`
- ❌ `adicionarImpressoras()`
- ❌ `removerImpressoras()`
- ❌ `atualizarImpressoras()` - função unificada

#### Grupos de Complementos:
- ❌ `toggleGrupoComplemento(grupoId: string)`
- ❌ `vincularGruposComplementos()`
- ❌ `desvincularGruposComplementos()`
- ❌ `atualizarGruposComplementos()` - função unificada

#### Mobile:
- ❌ `toggleExpansao(produtoId: string)` - para expandir cards no mobile

### 5. Atualização da Função `atualizarPrecos`
**Problema atual:**
- ❌ Usa loop com PATCH individual (`/api/produtos/${produtoId}`)
- ❌ Deve usar bulk-update (`POST /api/produtos/bulk-update`)

**O que precisa mudar:**
- ❌ Trocar loop de PATCHs por uma única chamada POST
- ❌ Montar payload: `[{ produtoId, valor }]`
- ❌ Adicionar delays após sucesso (800ms + 500ms)
- ❌ Melhorar mensagens de loading

### 6. UI: Tabs
- ❌ Sistema de tabs no header (Preços | Impressoras | Grupos Complementos)
- ❌ Título dinâmico baseado em `activeTab`
- ❌ Lógica para mostrar/ocultar conteúdo baseado na tab ativa

### 7. UI: Tab Impressoras
- ❌ Toggle: Vincular | Desvincular
- ❌ Label com contador de selecionadas
- ❌ Botão "Selecionar todas" / "Desmarcar todas"
- ❌ Grid de checkboxes (2 col mobile, 4 col desktop)
- ❌ Loading state
- ❌ Empty state
- ❌ Botão de ação (Vincular/Desvincular)

### 8. UI: Tab Grupos Complementos
- ❌ Toggle: Vincular | Desvincular
- ❌ Label com contador de selecionados
- ❌ Botão "Selecionar todos" / "Desmarcar todos"
- ❌ Grid de checkboxes (2 col mobile, 4 col desktop)
- ❌ Loading state
- ❌ Empty state
- ❌ Botão de ação (Vincular/Desvincular)

### 9. Lista de Produtos: Melhorias
- ❌ Adicionar coluna "Impressoras" (desktop)
- ❌ Mostrar impressoras em select dropdown (como grupos)
- ❌ Expansão mobile para mostrar impressoras e grupos
- ❌ Botão expandir/ocultar no mobile

### 10. Ajustes na Função `buscarProdutos`
- ⚠️ `limit` está como 10 - deveria ser 50 (conforme checklist)
- ⚠️ Falta atualização progressiva durante carregamento
- ⚠️ Falta tratamento de erro com toast

---

## 🔧 Ordem de Implementação Recomendada

### Fase 1: Preparação (Dependências)
1. **Adicionar suporte a impressoras na entidade Produto**
   - Criar interface `ProdutoImpressoraResumo`
   - Adicionar propriedade `impressoras` no construtor
   - Adicionar no `create()` e `fromJSON()`
   - Adicionar método `getImpressoras()`

2. **Criar rota API bulk-update**
   - `app/api/produtos/bulk-update/route.ts`
   - Validações completas
   - Chamada à API externa

### Fase 2: Melhorias na Tab Preços
3. **Atualizar função `atualizarPrecos()`**
   - Trocar PATCH individual por bulk-update
   - Adicionar delays
   - Melhorar mensagens

4. **Ajustar `buscarProdutos()`**
   - Mudar limit para 50
   - Adicionar atualização progressiva
   - Melhorar tratamento de erros

### Fase 3: Sistema de Tabs
5. **Adicionar estados de tabs**
6. **Criar UI de tabs no header**
7. **Implementar lógica de mostrar/ocultar conteúdo**

### Fase 4: Tab Impressoras
8. **Adicionar estados de impressoras**
9. **Criar função `loadAllImpressoras()`**
10. **Criar funções de vincular/desvincular**
11. **Criar UI da tab**

### Fase 5: Tab Grupos Complementos
12. **Adicionar estados de grupos**
13. **Criar funções de vincular/desvincular**
14. **Criar UI da tab**

### Fase 6: Melhorias na Lista
15. **Adicionar coluna Impressoras (desktop)**
16. **Implementar expansão mobile**
17. **Adicionar botão expandir/ocultar**

---

## 📝 Detalhamento das Mudanças Necessárias

### Mudança 1: Entidade Produto

**Adicionar:**
```typescript
interface ProdutoImpressoraResumo {
  id: string
  nome: string
  ativo?: boolean
}
```

**No construtor:**
```typescript
private readonly impressoras?: ProdutoImpressoraResumo[]
```

**No create():**
```typescript
impressoras?: ProdutoImpressoraResumo[]
```

**No fromJSON():**
```typescript
Array.isArray(data.impressoras)
  ? data.impressoras.map((imp: any) => ({
      id: imp.id?.toString() || '',
      nome: imp.nome?.toString() || 'Impressora',
      ativo: imp.ativo === true || imp.ativo === 'true' || imp.ativo === undefined,
    }))
  : []
```

**Novo método:**
```typescript
getImpressoras(): ProdutoImpressoraResumo[] {
  return this.impressoras || []
}
```

### Mudança 2: Rota API Bulk Update

**Criar arquivo:** `app/api/produtos/bulk-update/route.ts`

**Estrutura completa conforme checklist**

### Mudança 3: Componente - Estados Adicionais

**Adicionar após linha 35:**
```typescript
const [produtosExpandidos, setProdutosExpandidos] = useState<Set<string>>(new Set())
const [impressorasSelecionadas, setImpressorasSelecionadas] = useState<Set<string>>(new Set())
const [impressorasDisponiveis, setImpressorasDisponiveis] = useState<Impressora[]>([])
const [isLoadingImpressoras, setIsLoadingImpressoras] = useState(false)
const [gruposComplementosSelecionados, setGruposComplementosSelecionados] = useState<Set<string>>(new Set())
const [activeTab, setActiveTab] = useState<'precos' | 'impressoras' | 'gruposComplementos'>('precos')
const [modoImpressora, setModoImpressora] = useState<'adicionar' | 'remover'>('adicionar')
const [modoGrupoComplemento, setModoGrupoComplemento] = useState<'adicionar' | 'remover'>('adicionar')
```

### Mudança 4: Função atualizarPrecos - Refatorar

**Substituir o loop de PATCHs (linhas 238-282) por:**
```typescript
// Preparar payload para bulk update
const payload = produtosSelecionadosDados
  .map((produto) => {
    const valorAtual = produto.getValor()
    const directionSign = adjustDirection === 'increase' ? 1 : -1
    let novoValor =
      adjustMode === 'valor'
        ? valorAtual + directionSign * adjustValue
        : valorAtual * (1 + (directionSign * adjustValue) / 100)
    novoValor = Number(novoValor.toFixed(2))

    if (novoValor <= 0) {
      return null
    }

    return {
      produtoId: produto.getId(),
      valor: novoValor,
    }
  })
  .filter((item): item is { produtoId: string; valor: number } => item !== null)

// Fazer uma única requisição bulk update
const response = await fetch('/api/produtos/bulk-update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
})
```

### Mudança 5: Header com Tabs

**Substituir header atual (linhas 319-334) por versão com tabs**

### Mudança 6: Conteúdo Condicional por Tab

**Envolver seção de preços (linhas 336-445) em condicional:**
```typescript
{activeTab === 'precos' && (
  // ... conteúdo atual
)}
```

**Adicionar tabs de impressoras e grupos após**

### Mudança 7: Lista - Adicionar Coluna Impressoras

**No header da tabela (linha 611):**
```typescript
<div className="flex-[1.2] text-center hidden md:flex">Impressoras</div>
```

**Na renderização (após linha 660):**
```typescript
<div className="flex-[1.2] justify-center hidden md:flex">
  {impressorasDoProduto.length === 0 ? (
    <span className="text-xs text-secondary-text">Nenhuma</span>
  ) : (
    <select>...</select>
  )}
</div>
```

---

## 🎯 Resumo Executivo

### Arquivos a Criar:
1. `app/api/produtos/bulk-update/route.ts` ❌

### Arquivos a Modificar:
1. `src/domain/entities/Produto.ts` - Adicionar impressoras ❌
2. `src/presentation/components/features/produtos/AtualizarPrecoLote.tsx` - Completar implementação ❌

### Funcionalidades Faltantes:
- ❌ Sistema de tabs (3 tabs)
- ❌ Tab Impressoras (completa)
- ❌ Tab Grupos Complementos (completa)
- ❌ Bulk update (atualmente usa PATCH individual)
- ❌ Coluna Impressoras na lista
- ❌ Expansão mobile
- ❌ Carregamento de impressoras

### Funcionalidades Parciais:
- ⚠️ Tab Preços (funciona mas precisa usar bulk-update)
- ⚠️ Busca e filtros (funciona mas limit=10 deveria ser 50)

---

## ✅ Próximos Passos

1. **Primeiro:** Adicionar suporte a impressoras na entidade Produto
2. **Segundo:** Criar rota API bulk-update
3. **Terceiro:** Refatorar `atualizarPrecos()` para usar bulk-update
4. **Quarto:** Adicionar sistema de tabs
5. **Quinto:** Implementar tab Impressoras
6. **Sexto:** Implementar tab Grupos Complementos
7. **Sétimo:** Melhorar lista (coluna impressoras + mobile)

---

**Status:** Implementação ~40% completa
**Prioridade:** Completar funcionalidades faltantes seguindo a ordem acima
