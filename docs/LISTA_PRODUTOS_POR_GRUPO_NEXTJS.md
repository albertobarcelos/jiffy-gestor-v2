# Guia de Implementação: Lista de Produtos Atrelados ao Grupo em NextJS

## 📋 Análise do Funcionamento Atual (Flutter/Dart)

### 1. Contexto e Propósito

O componente `ListarProdutosPorGrupoWidget` exibe uma lista de produtos que estão associados a um grupo de produtos específico. Este componente **só é exibido no modo de edição** de um grupo, permitindo visualizar e reordenar os produtos pertencentes aquele grupo.

### 2. Condição de Exibição

O componente só aparece quando:
```dart
if (_editarGrupoModel.isEditing)
  // Exibe o componente ListarProdutosPorGrupoWidget
else
  // Exibe mensagem: "A lista de produtos atrelados aparece no modo de edição."
```

**Importante**: A lista só é carregada quando:
1. O grupo está em modo de edição (`isEditing = true`)
2. O `grupoProdutoId` está disponível (ID do grupo sendo editado)

### 3. Arquitetura do Componente

#### 3.1. Padrão Provider/ChangeNotifier

O componente usa o padrão **Provider** com **ChangeNotifier** para gerenciar estado:

```dart
ChangeNotifierProvider(
  create: (context) {
    final model = ListarProdutosPorGrupoModel();
    model.grupoProdutoId = _editarGrupoModel.idGrupo!;
    model.fetchProducts(); // Carrega produtos após definir o ID
    return model;
  },
  child: ListarProdutosPorGrupoWidget(
    grupoProdutoId: _editarGrupoModel.idGrupo!,
  ),
)
```

#### 3.2. Modelo de Estado

O `ListarProdutosPorGrupoModel` gerencia:
- **produtos**: Lista de produtos carregados
- **isLoading**: Estado de carregamento
- **hasMore**: Indica se há mais produtos para carregar
- **currentPage**: Página atual da paginação
- **pageSize**: Tamanho da página (padrão: 10)
- **scrollController**: Controlador para scroll infinito
- **grupoProdutoId**: ID do grupo de produtos

### 4. API de Listagem de Produtos

#### 4.1. Endpoint
```
GET /cardapio/produtos
```

#### 4.2. Base URL
```
https://jiffy-backend-hom.nexsyn.com.br/api/v1/cardapio/produtos
```

#### 4.3. Query Parameters
- **grupoProdutoId** (string, obrigatório): ID do grupo de produtos
- **limit** (int, opcional): Número de itens por página (padrão: 10)
- **offset** (int, opcional): Número de itens a pular (para paginação)

**Exemplo de URL:**
```
GET /cardapio/produtos?grupoProdutoId=123&limit=10&offset=0
```

#### 4.4. Headers
```json
{
  "accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

#### 4.5. Resposta da API

A API retorna um objeto com a propriedade `items` contendo um array de produtos:

```json
{
  "items": [
    {
      "id": "produto-1",
      "nome": "Produto Exemplo",
      "valor": 25.50,
      "ativo": true,
      "ordem": 1,
      ...
    },
    ...
  ],
  "count": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "hasNext": true,
  "hasPrevious": false
}
```

#### 4.6. Processamento da Resposta

```dart
final newProducts = ProdutosGroup.listarProdutosCall.pProduto(response.jsonBody) ?? [];
// pProduto extrai: response.jsonBody['items']
produtos.addAll(newProducts);
currentPage++;
hasMore = newProducts.length == pageSize; // Se retornou menos que pageSize, não há mais
```

### 5. Scroll Infinito (Infinite Scroll)

#### 5.1. Implementação

O componente usa um `ScrollController` que detecta quando o usuário chegou ao final da lista:

```dart
void _onScroll() {
  if (scrollController.position.pixels == scrollController.position.maxScrollExtent) {
    fetchProducts(); // Carrega mais produtos
  }
}
```

#### 5.2. Indicador de Carregamento

No final da lista, exibe um indicador quando está carregando mais itens:

```dart
if (index == model.produtos.length) {
  return model.isLoading
    ? CircularProgressIndicator()
    : (model.hasMore ? Text('Carregando mais produtos...') : SizedBox.shrink());
}
```

### 6. Reordenação de Produtos

#### 6.1. Componente de Reordenação

Usa `ReorderableListView.builder` para permitir drag-and-drop:

```dart
ReorderableListView.builder(
  scrollController: model.scrollController,
  itemCount: model.produtos.length + (model.hasMore ? 1 : 0),
  onReorder: (int oldIndex, int newIndex) async {
    // Lógica de reordenação
  },
  itemBuilder: (context, index) {
    // Renderiza cada item
  },
)
```

#### 6.2. Lógica de Reordenação

```dart
onReorder: (int oldIndex, int newIndex) async {
  // Ajuste de índices quando move para baixo
  if (oldIndex < newIndex) {
    newIndex -= 1;
  }
  
  // Atualização otimista da UI
  final item = model.produtos.removeAt(oldIndex);
  model.produtos.insert(newIndex, item);
  model.notifyListeners();
  
  // Chamada à API
  final productId = getJsonField(item, r'$.id')?.toString();
  final newPosition = newIndex + 1; // Posição começa em 1
  
  if (productId != null) {
    final apiResult = await model.reorderProduct(productId, newPosition);
    // Tratamento de sucesso/erro
  }
}
```

### 7. API de Reordenação de Produtos

#### 7.1. Endpoint
```
PATCH /cardapio/produtos/{idproduto}/reordena-produto
```

#### 7.2. Headers
```json
{
  "accept": "application/json",
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

#### 7.3. Request Body
```json
{
  "novaPosicao": 3
}
```

#### 7.4. Parâmetros
- **idproduto** (path parameter): ID do produto que está sendo movido
- **novaPosicao** (body, int): Nova posição desejada (começa em 1, não em 0)

### 8. Estrutura da Lista

#### 8.1. Cabeçalho da Tabela

A lista exibe um cabeçalho com as colunas:
- **Ordem** (flex: 1): Número da ordem do produto
- **Produto** (flex: 4): Nome do produto
- **Valor** (flex: 2): Preço do produto formatado como "R$ X.XX"
- **Reordenar** (flex: 1): Espaço reservado (vazio, mas mantém layout)

#### 8.2. Item da Lista

Cada item exibe:
- **Ordem**: `index + 1` (baseado na posição na lista)
- **Nome**: `produto['nome']` com ellipsis para nomes longos
- **Valor**: `produto['valor']` formatado como "R$ X.XX"
- **Chave única**: `ValueKey(produto['id'])` para o ReorderableListView

---

## 🚀 Implementação em NextJS

### 1. Estrutura do Componente

#### 1.1. Componente Principal

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Produto {
  id: string;
  nome: string;
  valor: number;
  ativo: boolean;
  ordem?: number;
}

interface ListarProdutosPorGrupoProps {
  grupoProdutoId: string;
  isEditing: boolean;
}

export default function ListarProdutosPorGrupo({
  grupoProdutoId,
  isEditing,
}: ListarProdutosPorGrupoProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isReordering, setIsReordering] = useState(false);
  const pageSize = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Carregar produtos quando o componente é montado ou grupoProdutoId muda
  useEffect(() => {
    if (isEditing && grupoProdutoId) {
      // Resetar estado
      setProdutos([]);
      setCurrentPage(0);
      setHasMore(true);
      fetchProducts(0, true);
    }
  }, [isEditing, grupoProdutoId]);

  // Função para carregar produtos
  const fetchProducts = async (page: number, reset: boolean = false) => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const token = getAuthToken();
      const offset = page * pageSize;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cardapio/produtos?grupoProdutoId=${grupoProdutoId}&limit=${pageSize}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data = await response.json();
      const newProducts = data.items || [];

      if (reset) {
        setProdutos(newProducts);
      } else {
        setProdutos((prev) => [...prev, ...newProducts]);
      }

      setHasMore(newProducts.length === pageSize);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll infinito usando Intersection Observer
  useEffect(() => {
    if (!scrollContainerRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchProducts(currentPage + 1);
        }
      },
      { threshold: 1.0 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, currentPage]);

  // Handler de reordenação
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = produtos.findIndex((p) => p.id === active.id);
    const newIndex = produtos.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newOrder = newIndex + 1; // Posição começa em 1

    // Atualização otimista
    const newProdutos = arrayMove(produtos, oldIndex, newIndex);
    setProdutos(newProdutos);
    setIsReordering(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cardapio/produtos/${active.id}/reordena-produto`,
        {
          method: 'PATCH',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            novaPosicao: newOrder,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao reordenar produto');
      }

      // Sucesso - notificação pode ser adicionada aqui
      showNotification('Sucesso', 'Ordem do produto atualizada!', 'success');
    } catch (error) {
      // Reverter em caso de erro
      setProdutos(produtos);
      showNotification('Erro', 'Falha ao reordenar produto.', 'error');
    } finally {
      setIsReordering(false);
    }
  };

  // Se não estiver em modo de edição
  if (!isEditing) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">
          A lista de produtos atrelados aparece no modo de edição.
        </p>
      </div>
    );
  }

  // Estados de carregamento inicial
  if (produtos.length === 0 && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Lista vazia
  if (produtos.length === 0 && !isLoading && !hasMore) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">
          Nenhum produto encontrado para este grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-4 pt-8 pb-5">
        <h3 className="text-lg font-semibold text-gray-700">
          Produtos atrelados ao grupo
        </h3>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-600">
          <div className="col-span-1">Ordem</div>
          <div className="col-span-5">Produto</div>
          <div className="col-span-2">Valor</div>
          <div className="col-span-1">Reordenar</div>
        </div>
      </div>

      {/* Lista de produtos */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={produtos.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {produtos.map((produto, index) => (
              <ProdutoItem
                key={produto.id}
                produto={produto}
                index={index}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Sentinel para scroll infinito */}
        <div id="scroll-sentinel" className="h-4">
          {isLoading && hasMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de item de produto
function ProdutoItem({ produto, index }: { produto: Produto; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: produto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-12 gap-4 py-2 border-b border-gray-200 items-center"
    >
      <div className="col-span-1 text-sm font-semibold">{index + 1}</div>
      <div className="col-span-5 text-sm truncate">{produto.nome}</div>
      <div className="col-span-2 text-sm">{formatCurrency(produto.valor)}</div>
      <div
        className="col-span-1 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>
    </div>
  );
}
```

### 2. Hook Customizado para Gerenciar Estado

Para melhor organização, você pode criar um hook customizado:

```typescript
// hooks/useProdutosPorGrupo.ts
import { useState, useEffect, useCallback } from 'react';

interface UseProdutosPorGrupoProps {
  grupoProdutoId: string;
  isEditing: boolean;
  pageSize?: number;
}

export function useProdutosPorGrupo({
  grupoProdutoId,
  isEditing,
  pageSize = 10,
}: UseProdutosPorGrupoProps) {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(
    async (page: number, reset: boolean = false) => {
      if (isLoading || !hasMore || !isEditing || !grupoProdutoId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const offset = page * pageSize;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/cardapio/produtos?grupoProdutoId=${grupoProdutoId}&limit=${pageSize}&offset=${offset}`,
          {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Erro ao carregar produtos');
        }

        const data = await response.json();
        const newProducts = data.items || [];

        if (reset) {
          setProdutos(newProducts);
        } else {
          setProdutos((prev) => [...prev, ...newProducts]);
        }

        setHasMore(newProducts.length === pageSize);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [grupoProdutoId, isEditing, pageSize, isLoading, hasMore]
  );

  const reorderProduct = useCallback(
    async (productId: string, newPosition: number) => {
      try {
        const token = getAuthToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/cardapio/produtos/${productId}/reordena-produto`,
          {
            method: 'PATCH',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              novaPosicao: newPosition,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Erro ao reordenar produto');
        }

        return await response.json();
      } catch (error) {
        console.error('Erro ao reordenar produto:', error);
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    if (isEditing && grupoProdutoId) {
      setProdutos([]);
      setCurrentPage(0);
      setHasMore(true);
      fetchProducts(0, true);
    }
  }, [isEditing, grupoProdutoId, fetchProducts]);

  return {
    produtos,
    isLoading,
    hasMore,
    currentPage,
    error,
    fetchProducts,
    reorderProduct,
    setProdutos, // Para atualização otimista
  };
}
```

### 3. Uso no Componente de Edição de Grupo

```typescript
'use client';

import { useState } from 'react';
import ListarProdutosPorGrupo from '@/components/ListarProdutosPorGrupo';

export default function EditarGrupoPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [grupoId, setGrupoId] = useState<string | null>(null);

  // ... lógica de edição ...

  return (
    <div className="flex h-screen">
      {/* Formulário de edição */}
      <div className="flex-1">
        {/* ... campos do formulário ... */}
      </div>

      {/* Lista de produtos (apenas no modo de edição) */}
      {isEditing && grupoId && (
        <div className="flex-1 border-l">
          <ListarProdutosPorGrupo
            grupoProdutoId={grupoId}
            isEditing={isEditing}
          />
        </div>
      )}
    </div>
  );
}
```

### 4. Scroll Infinito com Intersection Observer

```typescript
useEffect(() => {
  if (!hasMore || isLoading) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        fetchProducts(currentPage + 1);
      }
    },
    {
      root: scrollContainerRef.current,
      rootMargin: '100px', // Carregar 100px antes do final
      threshold: 0.1,
    }
  );

  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    observer.observe(sentinel);
  }

  return () => {
    if (sentinel) {
      observer.unobserve(sentinel);
    }
    observer.disconnect();
  };
}, [hasMore, isLoading, currentPage]);
```

### 5. Estilização com Tailwind CSS

```typescript
// Estilos para o item arrastável
<div
  className={`
    grid grid-cols-12 gap-4 py-2 border-b border-gray-200 items-center
    transition-opacity duration-200
    ${isDragging ? 'opacity-50 bg-gray-50' : 'bg-white'}
    hover:bg-gray-50
  `}
>
  {/* Conteúdo */}
</div>

// Handle de arrastar
<div
  className="cursor-grab active:cursor-grabbing hover:text-gray-600"
  {...attributes}
  {...listeners}
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
  </svg>
</div>
```

### 6. Tratamento de Erros

```typescript
const [error, setError] = useState<string | null>(null);

// No fetchProducts:
catch (err) {
  setError('Não foi possível carregar os produtos. Tente novamente.');
  console.error('Erro ao carregar produtos:', err);
}

// No JSX:
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
    {error}
    <button
      onClick={() => fetchProducts(0, true)}
      className="ml-2 underline"
    >
      Tentar novamente
    </button>
  </div>
)}
```

### 7. Notificações

```typescript
import { toast } from 'react-hot-toast';

// Sucesso
toast.success('Ordem do produto atualizada com sucesso!');

// Erro
toast.error('Falha ao atualizar a ordem do produto.');
```

---

## 📝 Resumo das Diferenças e Considerações

### Diferenças entre Flutter e NextJS

1. **Gerenciamento de Estado**
   - Flutter: `ChangeNotifier` com `Provider`
   - NextJS: `useState` e hooks customizados

2. **Scroll Infinito**
   - Flutter: `ScrollController` com listener
   - NextJS: `IntersectionObserver` API

3. **Reordenação**
   - Flutter: `ReorderableListView` nativo
   - NextJS: `@dnd-kit` library

4. **Formatação de Moeda**
   - Flutter: `toStringAsFixed(2)` manual
   - NextJS: `Intl.NumberFormat` nativo

5. **Condição de Exibição**
   - Flutter: Renderização condicional no build
   - NextJS: Early return ou renderização condicional

### Pontos Críticos a Observar

1. ✅ **Condição de Exibição**: Só carregar quando `isEditing = true` e `grupoProdutoId` existe
2. ✅ **Paginação**: Usar `offset` e `limit` para paginação
3. ✅ **Resposta da API**: Extrair `items` do objeto de resposta
4. ✅ **Posição na Reordenação**: Começa em 1, não em 0
5. ✅ **Atualização Otimista**: Atualizar UI antes da confirmação da API
6. ✅ **Reversão em Erro**: Reverter mudanças se a API falhar
7. ✅ **Scroll Infinito**: Carregar mais quando chegar ao final
8. ✅ **Loading States**: Mostrar indicadores apropriados

---

## ✅ Checklist de Implementação

- [ ] Criar componente `ListarProdutosPorGrupo`
- [ ] Implementar condição de exibição (só no modo de edição)
- [ ] Criar hook customizado para gerenciar estado
- [ ] Implementar função de carregamento de produtos
- [ ] Implementar scroll infinito com Intersection Observer
- [ ] Implementar reordenação com `@dnd-kit`
- [ ] Adicionar tratamento de erros
- [ ] Adicionar estados de loading
- [ ] Implementar formatação de moeda
- [ ] Adicionar notificações de sucesso/erro
- [ ] Testar paginação
- [ ] Testar reordenação
- [ ] Testar scroll infinito
- [ ] Integrar com página de edição de grupo

---

## 🔍 Exemplo Completo Simplificado

```typescript
'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ListarProdutosPorGrupo({ grupoProdutoId, isEditing }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && grupoProdutoId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/cardapio/produtos?grupoProdutoId=${grupoProdutoId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((res) => res.json())
        .then((data) => setProdutos(data.items || []));
    }
  }, [isEditing, grupoProdutoId]);

  if (!isEditing) {
    return <div className="text-center text-gray-500 p-8">A lista aparece no modo de edição.</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Produtos atrelados ao grupo</h3>
      <div className="space-y-2">
        {produtos.map((produto, index) => (
          <div key={produto.id} className="flex justify-between border-b pb-2">
            <span>{index + 1}</span>
            <span>{produto.nome}</span>
            <span>R$ {produto.valor.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

**Nota Final**: Este guia foi baseado na análise do código Flutter/Dart existente. A lógica principal é a mesma: exibir produtos apenas no modo de edição, carregar com paginação, permitir reordenação e usar scroll infinito. As principais diferenças estão na sintaxe e nas bibliotecas específicas de cada framework.

