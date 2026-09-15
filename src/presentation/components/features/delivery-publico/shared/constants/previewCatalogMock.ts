export type PreviewDesignCategory = {
  id: string
  nome: string
  iconName: string
}

/**
 * Placeholder neutro (cinza) só para o catálogo mock sem grupos reais.
 * Não usar enquanto as imagens da API ainda estão a carregar — evita “bolas coloridas”.
 */
export function previewGrupoFallbackImagemUrl(_seed?: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#d4d4d4"/>
      <stop offset="55%" stop-color="#a3a3a3"/>
      <stop offset="100%" stop-color="#737373"/>
    </radialGradient>
  </defs>
  <circle cx="140" cy="140" r="140" fill="url(#g)"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const PREVIEW_DESIGN_CATEGORIES: PreviewDesignCategory[] = [
  { id: 'bebidas', nome: 'Bebidas', iconName: 'local_drink' },
  { id: 'cafeteria', nome: 'Cafeteria', iconName: 'coffee' },
  { id: 'pratos-principais', nome: 'Pratos Principais', iconName: 'restaurant' },
  { id: 'sobremesas', nome: 'Sobremesas', iconName: 'cake' },
  { id: 'lanches', nome: 'Lanches', iconName: 'fastfood' },
]

export const PREVIEW_DESIGN_PRODUTOS = [
  {
    id: 'suco',
    nome: 'Suco',
    descricao: 'Suco natural da fruta, gelado',
    preco: 10,
    grupoId: 'bebidas',
  },
  { id: 'agua', nome: 'Água Mineral 500 cm³', preco: 10, grupoId: 'bebidas' },
  {
    id: 'cafe',
    nome: 'Café expresso',
    descricao: 'Visualização no preview do design',
    preco: 8,
    grupoId: 'cafeteria',
  },
  {
    id: 'prato-dia',
    nome: 'Prato do dia',
    descricao: 'Visualização no preview do design',
    preco: 28,
    grupoId: 'pratos-principais',
  },
  {
    id: 'sobremesa',
    nome: 'Sobremesa da casa',
    descricao: 'Visualização no preview do design',
    preco: 14,
    grupoId: 'sobremesas',
  },
  {
    id: 'lanche',
    nome: 'Lanche exemplo',
    descricao: 'Visualização no preview do design',
    preco: 22,
    grupoId: 'lanches',
  },
]
