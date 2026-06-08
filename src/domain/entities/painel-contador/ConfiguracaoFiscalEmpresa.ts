export type IbptTokenStatus = 'CADASTRADO' | 'NAO_CADASTRADO' | null

export class ConfiguracaoFiscalEmpresa {
  private constructor(
    readonly id: string | null,
    readonly empresaId: string | null,
    readonly uf: string,
    readonly ambiente: string,
    readonly inscricaoEstadual: string,
    readonly inscricaoMunicipal: string,
    readonly codigoRegimeTributario: number | null,
    readonly simplesNacional: boolean,
    readonly contribuinteIcms: boolean,
    readonly ibptTokenStatus: IbptTokenStatus
  ) {}

  static fromApiResponse(data: Record<string, unknown> | null | undefined): ConfiguracaoFiscalEmpresa | null {
    if (!data) return null

    const codigoRaw = data.codigoRegimeTributario
    const codigo =
      typeof codigoRaw === 'string'
        ? parseInt(codigoRaw, 10)
        : typeof codigoRaw === 'number'
          ? codigoRaw
          : null

    const ibpt = data.ibptTokenStatus
    const ibptTokenStatus: IbptTokenStatus =
      ibpt === 'CADASTRADO' || ibpt === 'NAO_CADASTRADO' ? ibpt : null

    return new ConfiguracaoFiscalEmpresa(
      data.id != null ? String(data.id) : null,
      data.empresaId != null ? String(data.empresaId) : null,
      String(data.uf ?? '').trim(),
      String(data.ambiente ?? '').trim(),
      String(data.inscricaoEstadual ?? '').trim(),
      String(data.inscricaoMunicipal ?? '').trim(),
      codigo != null && !Number.isNaN(codigo) ? codigo : null,
      data.simplesNacional === true,
      data.contribuinteIcms === true,
      ibptTokenStatus
    )
  }

  temInscricaoEstadual(): boolean {
    return this.inscricaoEstadual === 'ISENTO' || this.inscricaoEstadual.length > 0
  }

  temRegimeTributario(): boolean {
    return this.codigoRegimeTributario != null && [1, 2, 3].includes(this.codigoRegimeTributario)
  }

  isSimplesNacional(): boolean {
    return this.codigoRegimeTributario === 1 || this.codigoRegimeTributario === 2
  }
}
