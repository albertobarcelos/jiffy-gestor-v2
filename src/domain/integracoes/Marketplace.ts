export const MARKETPLACES = ['AIQFOME'] as const

export type MarketplaceCodigo = (typeof MARKETPLACES)[number]

const MARKETPLACES_SET = new Set<string>(MARKETPLACES)

/**
 * Marketplace conhecido do Gestor. Novos canais entram neste catálogo;
 * a conexão técnica continua a mesma (um único hub).
 */
export class Marketplace {
  private constructor(private readonly _codigo: MarketplaceCodigo) {}

  static criar(value: unknown): Marketplace | null {
    if (typeof value !== 'string') return null
    const codigo = value.trim().toUpperCase()
    if (!MARKETPLACES_SET.has(codigo)) return null
    return new Marketplace(codigo as MarketplaceCodigo)
  }

  get codigo(): MarketplaceCodigo {
    return this._codigo
  }
}
