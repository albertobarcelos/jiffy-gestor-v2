export interface ImpostosNcm {
  cfop?: string
  csosn?: string
  icms?: { origem?: number; cst?: string; aliquota?: number }
  pis?: { cst?: string; aliquota?: number }
  cofins?: { cst?: string; aliquota?: number }
}

export class ConfiguracaoNcmImpostos {
  constructor(
    readonly codigo: string,
    readonly descricao: string,
    readonly impostos: ImpostosNcm
  ) {}

  static fromApiResponse(data: Record<string, unknown>): ConfiguracaoNcmImpostos | null {
    const codigo = String(data.codigo ?? '').trim()
    if (codigo.length !== 8) return null

    const impostos = (data.impostos as ImpostosNcm | undefined) ?? {}

    return new ConfiguracaoNcmImpostos(
      codigo,
      String(data.descricao ?? '').trim(),
      impostos
    )
  }

  temConfiguracaoObrigatoria(isSimplesNacional: boolean): boolean {
    if (isSimplesNacional) {
      return !!this.impostos.csosn?.trim()
    }
    return !!this.impostos.icms?.cst?.trim()
  }
}
