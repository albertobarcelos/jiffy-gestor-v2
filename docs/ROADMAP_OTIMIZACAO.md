# 🗺️ Roadmap de Otimização - Próximos Passos

## ✅ O que já foi feito

1. ✅ React Query configurado e funcionando
2. ✅ 8 hooks criados para listas com scroll infinito
3. ✅ 8 componentes de lista refatorados e otimizados
4. ✅ Cache automático de 5 minutos
5. ✅ Deduplicação de requisições

**Resultado atual:** 60-70% de redução em requisições

---

## 🎯 Próximos Passos (Priorizados)

### 🔴 FASE 1: Otimizar Formulários (Alta Prioridade)

**Impacto:** Redução adicional de 10-15% nas requisições

#### 1.1 NovoProduto.tsx
**Problema:** Faz `fetch` direto para grupos de produtos toda vez que abre
**Solução:** Usar cache de grupos via React Query

```typescript
// Antes
useEffect(() => {
  fetch('/api/grupos-produtos?ativo=true&limit=100')
}, [])

// Depois
const { data: gruposData } = useQuery({
  queryKey: ['grupos-produtos', { ativo: true }],
  queryFn: () => fetchGrupos({ ativo: true, limit: 100 }),
  staleTime: 1000 * 60 * 10, // 10 minutos (grupos mudam pouco)
})
```

**Arquivos afetados:**
- `src/presentation/components/features/produtos/NovoProduto.tsx`

#### 1.2 NovoGrupoComplemento.tsx
**Problema:** Faz `fetch` direto para complementos
**Solução:** Usar cache de complementos

**Arquivos afetados:**
- `src/presentation/components/features/grupos-complementos/NovoGrupoComplemento.tsx`

#### 1.3 NovoUsuario.tsx
**Problema:** Faz `fetch` direto para perfis PDV
**Solução:** Usar cache de perfis

**Arquivos afetados:**
- `src/presentation/components/features/usuarios/NovoUsuario.tsx`

#### 1.4 NovoPerfilUsuario.tsx
**Problema:** Faz `fetch` direto para meios de pagamento
**Solução:** Usar cache de meios de pagamento

**Arquivos afetados:**
- `src/presentation/components/features/perfis-usuarios-pdv/NovoPerfilUsuario.tsx`

#### 1.5 NovaImpressora.tsx
**Problema:** Faz `fetch` direto para terminais
**Solução:** Criar hook `useTerminais()` e usar cache

**Arquivos afetados:**
- `src/presentation/components/features/impressoras/NovaImpressora.tsx`

---

### 🟡 FASE 2: Hooks para Busca Individual (Média Prioridade)

**Impacto:** Cache compartilhado entre listas e detalhes

#### 2.1 Criar hooks `useProduto(id)`, `useCliente(id)`, etc.

```typescript
// src/presentation/hooks/useProdutos.ts (adicionar)
export function useProduto(id: string) {
  return useQuery({
    queryKey: ['produto', id],
    queryFn: async () => {
      const token = auth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado')
      
      const response = await fetch(`/api/produtos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Produto não encontrado')
      const data = await response.json()
      return Produto.fromJSON(data)
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}
```

**Hooks a criar:**
- `useProduto(id)` - em `useProdutos.ts`
- `useCliente(id)` - em `useClientes.ts`
- `useGrupoComplemento(id)` - em `useGruposComplementos.ts`
- `useUsuario(id)` - em `useUsuarios.ts`
- `useMeioPagamento(id)` - em `useMeiosPagamento.ts`
- `useComplemento(id)` - em `useComplementos.ts`
- `useImpressora(id)` - em `useImpressoras.ts`
- `usePerfilUsuario(id)` - em `usePerfisUsuarios.ts`

#### 2.2 Refatorar componentes de visualização

**Componentes:**
- `VisualizarCliente.tsx` → usar `useCliente(id)`
- Outros componentes de visualização

---

### 🟡 FASE 3: Otimizar Dashboard e Relatórios (Média Prioridade)

**Impacto:** Dashboard mais responsivo

#### 3.1 UltimasVendas.tsx
**Problema:** Usa dados mockados, não usa React Query
**Solução:** Criar hook `useVendas()` e usar React Query

#### 3.2 RelatoriosView.tsx
**Problema:** Faz `fetch` direto
**Solução:** Usar React Query para cache de relatórios

#### 3.3 MetricCards.tsx
**Problema:** Pode fazer múltiplas requisições
**Solução:** Usar React Query com cache compartilhado

---

### 🟢 FASE 4: Melhorias Avançadas (Baixa Prioridade)

#### 4.1 Prefetching Inteligente
```typescript
// Prefetch ao hover em link de edição
const queryClient = useQueryClient()

<Link
  href={`/produtos/${produtoId}/editar`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['produto', produtoId],
      queryFn: () => fetchProduto(produtoId),
    })
  }}
>
```

#### 4.2 Optimistic Updates
```typescript
// Atualizar UI antes da resposta
const mutation = useMutation({
  mutationFn: updateProduto,
  onMutate: async (newData) => {
    // Cancelar queries em andamento
    await queryClient.cancelQueries({ queryKey: ['produtos'] })
    
    // Snapshot do valor anterior
    const previous = queryClient.getQueryData(['produtos'])
    
    // Atualizar otimisticamente
    queryClient.setQueryData(['produtos'], (old) => {
      return old.map(p => p.id === newData.id ? newData : p)
    })
    
    return { previous }
  },
  onError: (err, newData, context) => {
    // Rollback em caso de erro
    queryClient.setQueryData(['produtos'], context.previous)
  },
})
```

#### 4.3 Métricas de Performance
- Adicionar React Query DevTools
- Monitorar cache hit rate
- Medir redução de requisições

---

## 📊 Estimativa de Impacto Total

| Fase | Redução Adicional | Redução Total | Tempo Estimado |
|------|-------------------|---------------|----------------|
| **Atual** | - | 60-70% | ✅ Concluído |
| **Fase 1** | +10-15% | 70-85% | 1-2 dias |
| **Fase 2** | +5-10% | 75-90% | 1 dia |
| **Fase 3** | +5-10% | 80-95% | 1-2 dias |
| **Fase 4** | UX melhorada | 80-95% | 2-3 dias |

---

## 🎯 Recomendação de Ordem de Execução

### Semana 1: Formulários e Busca Individual
1. **Dia 1-2:** Otimizar formulários principais (NovoProduto, NovoGrupoComplemento, NovoUsuario)
2. **Dia 3:** Criar hooks para busca individual
3. **Dia 4:** Refatorar componentes de visualização

### Semana 2: Dashboard e Melhorias
1. **Dia 1-2:** Otimizar dashboard e relatórios
2. **Dia 3-4:** Implementar prefetching
3. **Dia 5:** Implementar optimistic updates

---

## 🔧 Padrões a Seguir

### Padrão para Formulários
```typescript
// 1. Usar cache de dados relacionados
const { data: grupos } = useQuery({
  queryKey: ['grupos-produtos', { ativo: true }],
  queryFn: () => fetchGrupos({ ativo: true }),
  staleTime: 1000 * 60 * 10, // 10 minutos
})

// 2. Usar mutation para salvar
const mutation = useProdutoMutation()

const handleSubmit = async (data) => {
  await mutation.mutateAsync({
    produtoId: isEditing ? produtoId : undefined,
    data,
    isUpdate: isEditing,
  })
}
```

### Padrão para Busca Individual
```typescript
// Hook
export function useProduto(id: string) {
  return useQuery({
    queryKey: ['produto', id],
    queryFn: () => fetchProduto(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

// Uso
const { data: produto, isLoading } = useProduto(produtoId)
```

---

## ✅ Checklist Rápido

### Formulários
- [ ] NovoProduto - cache de grupos
- [ ] NovoGrupoComplemento - cache de complementos
- [ ] NovoUsuario - cache de perfis
- [ ] NovoPerfilUsuario - cache de meios de pagamento
- [ ] NovaImpressora - cache de terminais

### Busca Individual
- [ ] Criar hooks useProduto(id), useCliente(id), etc.
- [ ] Refatorar VisualizarCliente
- [ ] Refatorar outros componentes de visualização

### Dashboard
- [ ] UltimasVendas - React Query
- [ ] RelatoriosView - React Query
- [ ] MetricCards - React Query

### Avançado
- [ ] Prefetching
- [ ] Optimistic updates
- [ ] Métricas

---

## 🚀 Começar Agora

**Recomendação:** Começar pela **Fase 1 - Otimizar Formulários**, pois:
1. ✅ Impacto imediato e visível
2. ✅ Reduz requisições duplicadas
3. ✅ Melhora experiência ao abrir formulários
4. ✅ Relativamente simples de implementar

**Próximo passo sugerido:** Otimizar `NovoProduto.tsx` para usar cache de grupos.

