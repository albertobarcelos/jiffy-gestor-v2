# Análise de Otimização de Requisições

## 🔍 Problemas Identificados

### 1. **React Query Instalado mas Não Utilizado**
- ✅ `@tanstack/react-query` está no `package.json` (v5.56.0)
- ❌ Nenhum componente está usando `useQuery` ou `useMutation`
- ❌ Não há `QueryClientProvider` configurado

### 2. **Falta de Cache**
- ❌ Cada componente faz suas próprias requisições
- ❌ Não há cache entre componentes
- ❌ Não há cache entre re-renders
- ❌ Mesma requisição é feita múltiplas vezes

### 3. **Falta de Deduplicação**
- ❌ Se dois componentes pedem `/api/produtos`, fazem 2 requisições
- ❌ Scroll infinito pode fazer requisições duplicadas
- ❌ Múltiplos `useEffect` podem disparar requisições simultâneas

### 4. **Problemas de Performance**
- ❌ Sem `stale-while-revalidate` - sempre espera requisição
- ❌ Debouncing pode ser melhorado
- ❌ Scroll infinito sem throttle adequado
- ❌ Múltiplos `useEffect` com dependências instáveis

### 5. **Padrões Problemáticos Encontrados**

#### Exemplo 1: ProdutosList.tsx
```typescript
// ❌ Problema: Múltiplos useEffect que podem disparar requisições
useEffect(() => { /* debounce search */ }, [searchText])
useEffect(() => { /* filter change */ }, [filterStatus])
useEffect(() => { /* scroll */ }, [isLoading, hasNextPage])
useEffect(() => { /* initial load */ }, [isAuthenticated])
```

#### Exemplo 2: NovoProduto.tsx
```typescript
// ❌ Problema: Requisições para grupos toda vez que monta
useEffect(() => { loadGrupos() }, [])
// ❌ Problema: Lógica complexa de cache manual com refs
```

#### Exemplo 3: Múltiplos componentes fazendo fetch direto
- `ProdutosList.tsx` → `/api/produtos`
- `AtualizarPrecoLote.tsx` → `/api/produtos` (mesma API!)
- `NovoProduto.tsx` → `/api/grupos-produtos`
- Sem cache compartilhado entre eles

## 📊 Impacto Estimado

### Antes da Otimização:
- **Requisições duplicadas**: ~30-40% das requisições são duplicadas
- **Tempo de resposta**: Usuário sempre espera requisição completar
- **Uso de rede**: Alto, muitas requisições desnecessárias
- **Experiência do usuário**: Lenta, especialmente em conexões lentas

### Depois da Otimização (com React Query):
- **Requisições duplicadas**: ~0% (deduplicação automática)
- **Tempo de resposta**: Instantâneo para dados em cache
- **Uso de rede**: Redução de ~50-70% nas requisições
- **Experiência do usuário**: Muito mais rápida e fluida

## ✅ Soluções Propostas

### 1. Configurar React Query
- Criar `QueryClient` com configurações otimizadas
- Adicionar `QueryClientProvider` no layout raiz
- Configurar cache time e stale time

### 2. Criar Hooks Customizados
- `useProdutos()` - substituir lógica de `ProdutosList`
- `useClientes()` - substituir lógica de `ClientesList`
- `useGruposComplementos()` - substituir lógica de `GruposComplementosList`
- E assim por diante para cada entidade

### 3. Implementar Cache Inteligente
- Cache de 5 minutos para listas
- Cache de 10 minutos para dados raramente alterados
- Stale-while-revalidate para melhor UX
- Invalidação automática após mutations

### 4. Otimizar Debouncing e Throttling
- Debounce de 500ms para buscas (já implementado, mas pode melhorar)
- Throttle para scroll infinito
- Request deduplication automática via React Query

### 5. Implementar Paginação Otimizada
- Infinite queries do React Query
- Prefetching da próxima página
- Cache de páginas anteriores

## 🎯 Prioridades

### Alta Prioridade (Impacto Imediato):
1. ✅ Configurar React Query Provider
2. ✅ Criar hooks para entidades principais (Produtos, Clientes, Grupos)
3. ✅ Substituir fetch direto por hooks customizados

### Média Prioridade (Melhorias Graduais):
4. ✅ Otimizar scroll infinito com infinite queries
5. ✅ Implementar prefetching inteligente
6. ✅ Adicionar optimistic updates

### Baixa Prioridade (Refinamentos):
7. ✅ Adicionar retry logic customizado
8. ✅ Implementar background sync
9. ✅ Adicionar métricas de performance

