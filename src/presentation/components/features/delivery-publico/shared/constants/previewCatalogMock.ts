export type PreviewDesignCategory = {
  id: string
  nome: string
  iconName: string
}

export const PREVIEW_DESIGN_CATEGORIES: PreviewDesignCategory[] = [
  { id: 'bebidas', nome: 'Bebidas', iconName: 'local_drink' },
  { id: 'cafeteria', nome: 'Cafeteria', iconName: 'coffee' },
  { id: 'pratos-principais', nome: 'Pratos Principais', iconName: 'restaurant' },
  { id: 'sobremesas', nome: 'Sobremesas', iconName: 'cake' },
  { id: 'lanches', nome: 'Lanches', iconName: 'fastfood' },
]

export const PREVIEW_DESIGN_PRODUTOS = [
  { id: 'suco', nome: 'Suco', preco: 10, grupoId: 'bebidas' },
  { id: 'agua', nome: 'Água Mineral 500 cm³', preco: 10, grupoId: 'bebidas' },
]
