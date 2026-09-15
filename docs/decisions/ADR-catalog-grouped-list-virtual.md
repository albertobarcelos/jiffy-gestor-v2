# ADR: @tanstack/react-virtual na lista do cardápio

## Contexto

A tela Cardápio (`MenuEditor` → `CatalogGroupedList`) montava todas as linhas
(grupos + produtos + inputs MUI + fotos) no DOM. Em menus grandes isso
degradava scroll e interação.

## Decisão

Usar `@tanstack/react-virtual` (já alinhado ao ecossistema TanStack Query do
Gestor) com prop opcional `virtualize` em `CatalogGroupedList`.

- Ativado só no cardápio (`MenuEditor`).
- Terminais e outros consumidores continuam sem virtualizar.
- Scroll parent = o próprio container da lista (`h-full overflow-y-auto`).

## Consequências

- Menos nós no DOM; overscan ~8 linhas.
- Altura estimada por tipo de linha (header / item / hint recolhido); medida
  dinâmica via `measureElement` quando o browser permitir.
- Sticky de header de grupo fica no fluxo virtual (headers virtuais); o sticky
  CSS antigo no header deixa de aplicar em modo virtual — trade-off aceitável
  vs. performance.
