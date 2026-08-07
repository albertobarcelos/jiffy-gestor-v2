import type { VendasFiltrosQuerySnapshot } from './vendasListTypes'

function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40)
}

function formatarDataArquivo(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function buildRelatorioVendasFilename(
  filters: VendasFiltrosQuerySnapshot
): string {
  const hoje = formatarDataArquivo(new Date())
  const periodo =
    filters.periodoInicial && filters.periodoFinal
      ? 'por-datas'
      : slugify(filters.periodo || 'periodo')
  return `relatorio-vendas-${periodo}-${hoje}.xlsx`
}
