export interface ImpostosNcm {
  cfop?: string
  csosn?: string
  codigoBeneficioFiscal?: string
  icms?: { origem?: number; cst?: string; aliquota?: number; reducaoBase?: number }
  pis?: { cst?: string; aliquota?: number }
  cofins?: { cst?: string; aliquota?: number }
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export class ConfiguracaoNcmImpostos {
  constructor(
    readonly codigo: string,
    readonly descricao: string,
    readonly impostos: ImpostosNcm
  ) {}

  static fromApiResponse(data: Record<string, unknown>): ConfiguracaoNcmImpostos | null {
    const ncmNested =
      data.ncm && typeof data.ncm === 'object' && !Array.isArray(data.ncm)
        ? (data.ncm as Record<string, unknown>)
        : null

    const codigo = String(data.codigo ?? ncmNested?.codigo ?? '').trim()
    if (codigo.length !== 8) return null

    const impostosRaw = (data.impostos as ImpostosNcm | undefined) ?? {}
    const icmsRaw =
      impostosRaw.icms && typeof impostosRaw.icms === 'object'
        ? (impostosRaw.icms as Record<string, unknown>)
        : undefined

    const impostos: ImpostosNcm = {
      ...impostosRaw,
      codigoBeneficioFiscal:
        impostosRaw.codigoBeneficioFiscal ??
        (typeof data.codigoBeneficioFiscal === 'string' ? data.codigoBeneficioFiscal : undefined),
      icms: icmsRaw
        ? {
            origem: asNumber(icmsRaw.origem),
            cst: typeof icmsRaw.cst === 'string' ? icmsRaw.cst : undefined,
            aliquota: asNumber(icmsRaw.aliquota),
            reducaoBase: asNumber(icmsRaw.reducaoBase),
          }
        : impostosRaw.icms,
    }

    const descricao = String(data.descricao ?? ncmNested?.descricao ?? '').trim()

    return new ConfiguracaoNcmImpostos(codigo, descricao, impostos)
  }

  temConfiguracaoObrigatoria(isSimplesNacional: boolean): boolean {
    if (isSimplesNacional) {
      return !!this.impostos.csosn?.trim()
    }
    return !!this.impostos.icms?.cst?.trim()
  }
}
