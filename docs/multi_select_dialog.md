## MultiSelectDialog (Flutter) — Guia para portar p/ Next.js

### Visão geral
- Componente `Dialog` que mostra uma lista paginável (entregue por `availableItems`) para seleção múltipla.
- Traz barra de busca local, destaque visual do item selecionado e limitações `minSelection`/`maxSelection`.
- Retorna a lista selecionada via `Navigator.pop(context, _tempSelectedItems)`.

### Propriedades esperadas
- `availableItems`: lista completa de objetos com ao menos `{ [itemIdKey]: string, [itemDisplayNameKey]: string }`.
- `initialSelectedItems`: itens inicialmente marcados (mesmo formato de `availableItems`).
- `title`: rótulo do modal.
- `itemDisplayNameKey` / `itemIdKey`: nomes das chaves usadas para exibir/identificar.
- `itemPrefixIcon`: ícone opcional exibido antes do texto.
- `minSelection` / `maxSelection`: limites usados para validação antes de confirmar.

### Estado interno
- `_tempSelectedItems`: cópia mutável das seleções (array de objetos completos).
- `_searchQuery`, `_isSearchFocused`: controlam filtro e estilos do campo de busca.
- `TextEditingController` e `FocusNode` vinculados ao input de busca.

### Fluxo de interação
1. **Init**: copia `initialSelectedItems` para `_tempSelectedItems` e configura listeners de busca/foco.
2. **Busca local**: `_filteredItems` aplica `contains` case insensitive sobre `itemDisplayNameKey`.
3. **Renderização**:
   - `Dialog` com largura máxima de 40% e altura máxima de 50% da tela.
   - Campo de busca com bordas/cores reativas ao foco.
   - `CheckboxListTile` para cada item filtrado, com highlight quando selecionado.
4. **Seleção**:
   - Ao marcar, adiciona o objeto completo em `_tempSelectedItems`.
   - Ao desmarcar, remove comparando `itemIdKey`.
   - Se `maxSelection` atingido, exibe `NotifyComponentPuro` e impede nova marcação.
5. **Ações**:
   - **Cancelar**: `Navigator.pop` sem payload.
   - **Confirmar**:
     - Valida `minSelection` e `maxSelection`.
     - Caso ok, `Navigator.pop` passando `_tempSelectedItems`.

### Pontos a replicar no Next.js
- **Estado**: usar `useState` para `tempSelectedItems`, `searchQuery`, `isModalOpen`; `useEffect` opcional para sincronizar `initialSelectedItems`.
- **Filtro**: aplicar `items.filter((item) => item.nome.toLowerCase().includes(searchQuery.toLowerCase()))`.
- **Seleção**:
  ```tsx
  const toggleItem = (item: Item) => {
    setTempSelected((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (exists) return prev.filter((s) => s.id !== item.id);
      if (max && prev.length >= max) {
        toast.warn(`Você atingiu o limite de ${max} complementos`);
        return prev;
      }
      return [...prev, item];
    });
  };
  ```
- **Validação**: antes de fechar o modal, conferir `tempSelected.length >= min` e `<= max`.
- **Retorno**: em React, chamar `onConfirm(tempSelected)` ou resolver `Promise` de hook custom.
- **Estilização**: manter chips/checkboxes com feedback visual similar; usar Radix/Dialog + Checkbox ou Headless UI.
- **Notificações**: substituir `NotifyComponentPuro.showNotify` por lib equivalente (`react-hot-toast`, `sonner`, etc.).

### Estrutura sugerida no Next.js
1. `MultiSelectDialog.tsx`: componente controlado com props:
   ```ts
   type MultiSelectDialogProps = {
     isOpen: boolean;
     title: string;
     items: Item[];
     initialSelected: Item[];
     minSelection?: number;
     maxSelection?: number;
     onConfirm(selected: Item[]): void;
     onClose(): void;
   };
   ```
2. `useMultiSelectDialog`: hook que empacota abertura/fechamento e garante `initialSelected`.
3. `ComplementosStep.tsx`: botão que abre o modal, exibe chips e envia `selectedIds` ao salvar o produto.

Com este guia, basta mapear cada responsabilidade do Flutter para o equivalente React (estado local, eventos, validação) e reutilizar os mesmos formatos de dados/validações para manter a experiência consistente.

