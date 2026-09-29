const MERCHANT_ID_OD_MAX = 64
const MERCHANT_ID_OD_PATTERN = /^[A-Za-z0-9._-]+$/

/** Identificador da loja no marketplace de origem (ex.: ID no Geraldo). */
export class MerchantIdOd {
  private constructor(private readonly _valor: string) {}

  static criar(value: unknown): MerchantIdOd | null {
    if (typeof value !== 'string') return null
    const valor = value.trim()
    if (!valor || valor.length > MERCHANT_ID_OD_MAX) return null
    if (!MERCHANT_ID_OD_PATTERN.test(valor)) return null
    return new MerchantIdOd(valor)
  }

  get valor(): string {
    return this._valor
  }
}
