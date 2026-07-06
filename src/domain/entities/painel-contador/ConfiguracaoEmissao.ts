export type AmbienteFiscal = 'HOMOLOGACAO' | 'PRODUCAO'

export class ConfiguracaoEmissao {
  constructor(
    readonly id: string,
    readonly modelo: 55 | 65,
    readonly serie: number,
    readonly proximoNumero: number,
    readonly numeroInicial: number,
    readonly ativo: boolean,
    readonly terminalId: string | null,
    readonly nfeAtivo: boolean,
    readonly nfceAtivo: boolean,
    readonly nfceCscId: string,
    readonly nfceCscCodigo: string,
    readonly ambiente: AmbienteFiscal | null
  ) {}

  static fromApiResponse(data: Record<string, unknown>): ConfiguracaoEmissao | null {
    const modelo = Number(data.modelo)
    if (modelo !== 55 && modelo !== 65) return null

    return new ConfiguracaoEmissao(
      String(data.id ?? ''),
      modelo as 55 | 65,
      Number(data.serie ?? 0),
      Number(data.proximoNumero ?? data.numeroInicial ?? 0),
      Number(data.numeroInicial ?? 0),
      data.ativo === true,
      data.terminalId != null ? String(data.terminalId) : null,
      data.nfeAtivo === true,
      data.nfceAtivo === true,
      String(data.nfceCscId ?? '').trim(),
      String(data.nfceCscCodigo ?? '').trim(),
      data.ambiente === 'HOMOLOGACAO' || data.ambiente === 'PRODUCAO'
        ? data.ambiente
        : null
    )
  }

  isPrincipal(): boolean {
    return !this.terminalId
  }

  estaCompleta(): boolean {
    if (this.modelo === 55) {
      return (
        this.nfeAtivo &&
        !!this.ambiente &&
        this.serie > 0 &&
        this.proximoNumero > 0
      )
    }
    return (
      this.nfceAtivo &&
      !!this.ambiente &&
      this.serie > 0 &&
      this.proximoNumero > 0 &&
      this.nfceCscId.length > 0 &&
      this.nfceCscCodigo.length >= 8
    )
  }

  estaAtiva(): boolean {
    return this.modelo === 55 ? this.nfeAtivo : this.nfceAtivo
  }
}
