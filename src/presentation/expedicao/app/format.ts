export function formatarMoedaApp(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function inicialNome(nome: string): string {
  const letra = nome.trim().charAt(0)
  return letra ? letra.toUpperCase() : '?'
}
