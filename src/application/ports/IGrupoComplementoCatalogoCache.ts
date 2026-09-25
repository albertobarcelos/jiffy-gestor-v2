/**
 * Cache de sessão dos grupos de complemento do catálogo de venda.
 * Não é persistência: hidratação local entre Lançar na mesma sessão.
 */
export interface IGrupoComplementoCatalogoCache {
  limpar(): void
  removerPorIds(ids: string[]): void
  removerPorComplementoId(complementoId: string): void
}
