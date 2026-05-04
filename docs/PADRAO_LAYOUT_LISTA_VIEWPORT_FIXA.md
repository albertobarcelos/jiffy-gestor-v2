# Padrão: telas de lista em viewport fixa (sem barra de rolagem no `body`)

## Contexto

Em telas com **lista longa**, **header fixo** e **área rolável só no miolo**, é comum aparecer **barra de rolagem na página inteira** e/ou **espaço em branco** abaixo do conteúdo quando se usa apenas:

- `min-h-screen` ou `h-dvh` no fluxo normal do documento, **ou**
- cadeia `flex` com `flex-1` + `max-height` em `vh` + **margem** (`mt-*`) em filho flex, **ou**
- `main` forçando `[&>*]:flex-1` em todos os filhos sem encadear `min-h-0` corretamente.

O `scrollHeight` do `document` acaba maior que a viewport, mesmo com overflow interno na lista.

## Solução adotada (referência: cadastro de complementos)

### 1. Layout da rota (`app/.../layout.tsx`)

Usar um **shell fora do fluxo** com **`fixed inset-0`**, em coluna, com overflow cortado:

- O bloco **não aumenta** a altura rolável do `body`.
- **TopNav** (ou equivalente) em `shrink-0`.
- **`main`** com `flex min-h-0 flex-1 flex-col overflow-hidden` + paddings laterais.

```tsx
<div className="fixed inset-0 z-[40] flex flex-col overflow-hidden overscroll-none bg-gray-50">
  <div className="shrink-0">
    <TopNav />
  </div>
  <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:px-6 px-1">
    {children}
  </main>
</div>
```

**`z-[40]`:** abaixo de modais MUI (~1300). Se algum menu da TopNav ficar coberto, revisar stacking.

### 2. Página (`page.tsx`)

Encadear **`flex-1 min-h-0 flex flex-col overflow-hidden`** até o componente da lista. Se usar **`Suspense`**, um **`div`** wrapper com essas classes evita quebra da cadeia flex.

### 3. Lista (`*List.tsx`)

- Raiz: `flex flex-1 min-h-0 flex-col overflow-hidden`.
- Tudo **acima** da área rolável (título, filtros, cabeçalho das colunas): `flex-shrink-0`.
- **Somente as linhas:** `flex-1 min-h-0 overflow-y-auto` — **sem** `max-h` fixo em `vh` se a cadeia acima estiver correta.

Evitar **margem superior** no bloco `flex-1` rolável; preferir **`padding`** dentro dele (`pt-*`) se precisar de espaço.

## Referência no repositório

- Layout: `app/cadastros/complementos/layout.tsx`
- Página: `app/cadastros/complementos/page.tsx`
- Lista: `src/presentation/components/features/complementos/ComplementosList.tsx`

## Ao replicar em outras telas

1. Copiar o **mesmo padrão de layout** (`fixed inset-0` + `main` flex).
2. Manter **`min-h-0`** em cada nível flex que deve **encolher** antes do scroll interno.
3. Não combinar **`flex-1`** com **`mt-*`** no mesmo elemento rolável (margem soma e pode estourar o pai).

---

*Documento criado para alinhar futuras telas de cadastro/lista ao comportamento validado em complementos.*
