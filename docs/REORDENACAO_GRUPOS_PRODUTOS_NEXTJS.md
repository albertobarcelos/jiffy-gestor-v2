# Guia de Implementação: Reordenação de Grupos de Produtos em NextJS

## 📋 Análise do Funcionamento Atual (Flutter/Dart)

### 1. Componente de Reordenação

O componente Flutter utiliza `ReorderableListView.builder` que fornece uma interface drag-and-drop nativa. Quando um item é arrastado e solto em uma nova posição, o callback `onReorder` é acionado.

### 2. Fluxo de Reordenação

#### 2.1. Evento de Reordenação
```dart
onReorder: (int oldIndex, int newIndex) async {
  // 1. Captura o item que está sendo movido
  final itemToMove = _model.psListaGrupo[oldIndex];
  final newOrder = newIndex + 1; // Posição começa em 1, não em 0
  
  // 2. Atualização otimista da UI (atualiza antes da confirmação da API)
  setState(() {
    if (oldIndex < newIndex) {
      newIndex -= 1; // Ajuste necessário quando move para baixo
    }
    final item = _model.psListaGrupo.removeAt(oldIndex);
    _model.psListaGrupo.insert(newIndex, item);
  });
  
  // 3. Chamada à API para persistir a mudança
  // ... (ver seção API abaixo)
}
```

#### 2.2. Ajuste de Índices
**IMPORTANTE**: Quando `oldIndex < newIndex` (movendo item para baixo), é necessário decrementar `newIndex` em 1 antes de inserir, porque ao remover um item da lista, todos os índices após ele são deslocados para baixo.

**Exemplo prático:**
- Lista: [A, B, C, D] (índices 0, 1, 2, 3)
- Mover A (índice 0) para posição 3
- Após remover A: [B, C, D] (índices 0, 1, 2)
- Para inserir na posição 3, precisa usar índice 2 (newIndex - 1)

#### 2.3. Cálculo da Nova Posição
A posição enviada para a API é `newIndex + 1`, assumindo que o backend espera posições começando em 1 (não em 0).

### 3. API de Reordenação

#### 3.1. Endpoint
```
PATCH /cardapio/grupos-produtos/{idgrupo}/reordena-grupo
```

#### 3.2. Headers
```json
{
  "Content-Type": "application/json",
  "accept": "application/json",
  "Authorization": "Bearer {token}"
}
```

#### 3.3. Request Body
```json
{
  "novaPosicao": 3
}
```

#### 3.4. Parâmetros
- **idgrupo** (path parameter): ID do grupo que está sendo movido
- **novaPosicao** (body): Nova posição desejada (número inteiro, começa em 1)

#### 3.5. Resposta de Sucesso
A API retorna sucesso quando a reordenação é aplicada. Não há necessidade de recarregar a lista completa, pois a UI já foi atualizada otimisticamente.

### 4. Tratamento de Erros

Se a API falhar:
- A notificação de erro é exibida
- A lista pode ser recarregada para reverter ao estado original (comentado no código, mas é uma opção)
- Alternativamente, pode-se reverter a mudança local manualmente

---

## 🚀 Implementação em NextJS

### 1. Bibliotecas Recomendadas

Para implementar drag-and-drop em NextJS/React, recomenda-se usar uma das seguintes bibliotecas:

#### Opção 1: `@dnd-kit/core` + `@dnd-kit/sortable` (Recomendado)
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Vantagens:**
- Moderna e performática
- Acessibilidade integrada
- Suporte a touch devices
- Flexível e customizável

#### Opção 2: `react-beautiful-dnd` (Alternativa)
```bash
npm install react-beautiful-dnd
```

**Vantagens:**
- Mais simples de usar
- Boa documentação
- Amplamente utilizada

**Desvantagens:**
- Não funciona bem com React 18 Strict Mode
- Menos flexível

### 2. Estrutura do Componente

```typescript
'use client'; // NextJS 13+ App Router

import { useState, useEffect } from 'react';
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

interface GrupoProduto {
  id: string;
  nome: string;
  ativo: boolean;
  corHex: string;
  iconName: string;
  ordem?: number;
}

export default function GruposProdutosReorderable() {
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Configuração dos sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Função para carregar grupos da API
  const loadGroups = async (resetPagination = false) => {
    // Implementar chamada à API
    // Similar ao _loadGroups do Flutter
  };

  // Handler quando o drag termina
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = grupos.findIndex((item) => item.id === active.id);
    const newIndex = grupos.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Calcular a nova posição (começando em 1, não em 0)
    const newOrder = newIndex + 1;

    // Atualização otimista da UI
    const newGrupos = arrayMove(grupos, oldIndex, newIndex);
    setGrupos(newGrupos);
    setIsReordering(true);

    try {
      // Chamada à API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cardapio/grupos-produtos/${active.id}/reordena-grupo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`, // Sua função de token
          },
          body: JSON.stringify({
            novaPosicao: newOrder,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao reordenar grupo');
      }

      // Sucesso - mostrar notificação
      showNotification('Sucesso', 'Ordem do grupo atualizada com sucesso!', 'success');
      
      // Opcional: recarregar a lista se necessário
      // await loadGroups(true);
    } catch (error) {
      // Erro - reverter mudança e mostrar notificação
      setGrupos(grupos); // Reverter para o estado anterior
      showNotification('Erro', 'Falha ao atualizar a ordem do grupo.', 'error');
      
      // Opcional: recarregar a lista para garantir sincronização
      // await loadGroups(true);
    } finally {
      setIsReordering(false);
    }
  };

  useEffect(() => {
    loadGroups(true);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={grupos.map((g) => g.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grupos-list">
          {grupos.map((grupo) => (
            <SortableItem key={grupo.id} grupo={grupo} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Componente de item sortable
function SortableItem({ grupo }: { grupo: GrupoProduto }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: grupo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="grupo-item"
    >
      {/* Conteúdo do item aqui */}
      <div>{grupo.nome}</div>
      {/* ... outros campos ... */}
    </div>
  );
}
```

### 3. Lógica de Reordenação Detalhada

#### 3.1. Cálculo Correto da Nova Posição

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (!over || active.id === over.id) return;

  const oldIndex = grupos.findIndex((item) => item.id === active.id);
  const newIndex = grupos.findIndex((item) => item.id === over.id);

  // A biblioteca @dnd-kit já faz o ajuste de índices automaticamente
  // Mas a posição para a API deve ser newIndex + 1 (começando em 1)
  const newOrder = newIndex + 1;

  // Atualização otimista
  const newGrupos = arrayMove(grupos, oldIndex, newIndex);
  setGrupos(newGrupos);

  // Chamada à API
  await reorderGroup(active.id, newOrder);
};
```

#### 3.2. Função de Chamada à API

```typescript
async function reorderGroup(grupoId: string, novaPosicao: number) {
  try {
    const token = getAuthToken(); // Sua função para obter o token
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/cardapio/grupos-produtos/${grupoId}/reordena-grupo`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          novaPosicao: novaPosicao,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao reordenar grupo');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao reordenar grupo:', error);
    throw error;
  }
}
```

### 4. Tratamento de Estados

#### 4.1. Estado de Carregamento Durante Reordenação

```typescript
const [isReordering, setIsReordering] = useState(false);

// No handleDragEnd:
setIsReordering(true);
try {
  await reorderGroup(active.id, newOrder);
} finally {
  setIsReordering(false);
}
```

#### 4.2. Feedback Visual Durante o Drag

```typescript
function SortableItem({ grupo }: { grupo: GrupoProduto }) {
  const { isDragging, ... } = useSortable({ id: grupo.id });

  return (
    <div
      className={`grupo-item ${isDragging ? 'dragging' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Conteúdo */}
    </div>
  );
}
```

### 5. Estilização CSS

```css
.grupo-item {
  padding: 16px;
  margin: 4px 0;
  background: #fff;
  border-radius: 8px;
  cursor: grab;
  transition: opacity 0.2s, transform 0.2s;
}

.grupo-item:active {
  cursor: grabbing;
}

.grupo-item.dragging {
  opacity: 0.5;
  transform: scale(1.05);
}

.grupos-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

### 6. Integração com Paginação Infinita

Se você tiver paginação infinita (scroll infinito), é importante considerar:

```typescript
// Ao reordenar, pode ser necessário recarregar apenas a página atual
// ou todas as páginas se a ordem afetar outras páginas

const handleDragEnd = async (event: DragEndEvent) => {
  // ... lógica de reordenação ...
  
  // Se a reordenação for bem-sucedida e você quiser garantir sincronização:
  if (response.ok) {
    // Opção 1: Recarregar apenas a página atual
    await loadCurrentPage();
    
    // Opção 2: Recarregar tudo (mais seguro, mas mais lento)
    // await loadGroups(true);
  }
};
```

### 7. Notificações

Implemente um sistema de notificações similar ao Flutter:

```typescript
// Usando react-hot-toast ou similar
import toast from 'react-hot-toast';

const handleDragEnd = async (event: DragEndEvent) => {
  // ... lógica ...
  
  try {
    await reorderGroup(active.id, newOrder);
    toast.success('Ordem do grupo atualizada com sucesso!');
  } catch (error) {
    toast.error('Falha ao atualizar a ordem do grupo.');
    // Reverter mudança
    setGrupos(grupos);
  }
};
```

### 8. Acessibilidade

O `@dnd-kit` já fornece suporte a acessibilidade, mas você pode melhorar:

```typescript
<div
  role="button"
  tabIndex={0}
  aria-label={`Arrastar grupo ${grupo.nome}`}
  {...attributes}
  {...listeners}
>
  {/* Conteúdo */}
</div>
```

---

## 📝 Resumo das Diferenças e Considerações

### Diferenças entre Flutter e NextJS

1. **Biblioteca de Drag-and-Drop**
   - Flutter: `ReorderableListView` nativo
   - NextJS: Precisa de biblioteca externa (`@dnd-kit` ou `react-beautiful-dnd`)

2. **Ajuste de Índices**
   - Flutter: Precisa ajustar manualmente quando `oldIndex < newIndex`
   - NextJS: `arrayMove` do `@dnd-kit` já faz isso automaticamente

3. **Estado da UI**
   - Flutter: `setState()` para atualização otimista
   - NextJS: `setState` do React ou hooks (`useState`)

4. **Chamadas de API**
   - Flutter: Usa classes geradas (`GrupoProdutosGroup.reordenaGrupoCall`)
   - NextJS: Usa `fetch` nativo ou biblioteca como `axios`

### Pontos Críticos a Observar

1. ✅ **Posição começa em 1**: A API espera `novaPosicao` começando em 1, não em 0
2. ✅ **Atualização Otimista**: Sempre atualize a UI antes da chamada à API
3. ✅ **Tratamento de Erro**: Reverter mudanças locais se a API falhar
4. ✅ **Feedback Visual**: Mostrar estado de "arrastando" e "carregando"
5. ✅ **Chave Única**: Use o ID do grupo como chave única para cada item
6. ✅ **Token de Autenticação**: Sempre inclua o token Bearer no header Authorization

---

## 🔍 Exemplo Completo Simplificado

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Grupo {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = grupos.findIndex((g) => g.id === active.id);
    const newIndex = grupos.findIndex((g) => g.id === over.id);
    const newOrder = newIndex + 1; // API espera posição começando em 1

    // Atualização otimista
    setGrupos(arrayMove(grupos, oldIndex, newIndex));

    // API call
    try {
      const res = await fetch(
        `/api/cardapio/grupos-produtos/${active.id}/reordena-grupo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ novaPosicao: newOrder }),
        }
      );
      if (!res.ok) throw new Error('Falha na reordenação');
    } catch (error) {
      setGrupos(grupos); // Reverter em caso de erro
      alert('Erro ao reordenar');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={grupos.map((g) => g.id)}
        strategy={verticalListSortingStrategy}
      >
        {grupos.map((grupo) => (
          <GrupoItem key={grupo.id} grupo={grupo} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function GrupoItem({ grupo }: { grupo: Grupo }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: grupo.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-4 bg-white rounded-lg"
    >
      {grupo.nome}
    </div>
  );
}
```

---

## ✅ Checklist de Implementação

- [ ] Instalar biblioteca de drag-and-drop (`@dnd-kit` ou `react-beautiful-dnd`)
- [ ] Criar componente de lista reordenável
- [ ] Implementar função de chamada à API de reordenação
- [ ] Implementar atualização otimista da UI
- [ ] Adicionar tratamento de erros com reversão
- [ ] Adicionar feedback visual durante o drag
- [ ] Adicionar notificações de sucesso/erro
- [ ] Testar com diferentes cenários (mover para cima, para baixo, etc.)
- [ ] Garantir que a posição enviada à API começa em 1
- [ ] Incluir token de autenticação nas requisições
- [ ] Adicionar estados de loading durante a reordenação
- [ ] Testar acessibilidade (teclado, screen readers)

---

**Nota Final**: Este guia foi baseado na análise do código Flutter/Dart existente. A lógica principal é a mesma: capturar o evento de reordenação, atualizar a UI otimisticamente, chamar a API e tratar erros revertendo se necessário. A principal diferença está nas bibliotecas e na sintaxe específica de cada framework.

