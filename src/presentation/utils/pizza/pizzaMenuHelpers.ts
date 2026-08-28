import { formatPizzaMoney } from '@/src/presentation/components/features/pizza/pizzaDefaults'
import type { PrecoSaborTamanho } from '@/src/shared/types/pizza'

export function isPizzaGrupoProdutoId(
  grupoProdutoId: string | undefined,
  pizzaCategoriaIds: ReadonlySet<string>
): boolean {
  return Boolean(grupoProdutoId && pizzaCategoriaIds.has(grupoProdutoId))
}

export function calcularPrecoMinimoSabores(precosTamanho: PrecoSaborTamanho[] | undefined): number | null {
  const valores = (precosTamanho ?? [])
    .map(p => p.precoCheio)
    .filter(v => Number.isFinite(v) && v > 0)
  if (valores.length === 0) return null
  return Math.min(...valores)
}

export function formatarPrecoAPartirDe(precoMinimo: number | null | undefined): string {
  if (precoMinimo == null || precoMinimo <= 0) return 'Sem preço'
  return `À partir de ${formatPizzaMoney(precoMinimo)}`
}

export function contarTamanhosComPreco(precosTamanho: PrecoSaborTamanho[] | undefined): number {
  return (precosTamanho ?? []).filter(p => p.precoCheio > 0).length
}
