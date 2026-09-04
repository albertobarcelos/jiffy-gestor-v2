export type AmbienteCertificado = 'HOMOLOGACAO' | 'PRODUCAO' | string

export class CertificadoDigital {
  private constructor(
    readonly id: string,
    readonly ambiente: AmbienteCertificado,
    readonly validadeCertificado: Date | null
  ) {}

  static fromApiResponse(data: Record<string, unknown> | null | undefined): CertificadoDigital | null {
    if (!data?.id) return null

    const validadeRaw = data.validadeCertificado
    const validade =
      typeof validadeRaw === 'string' && validadeRaw.trim()
        ? new Date(validadeRaw)
        : validadeRaw instanceof Date
          ? validadeRaw
          : null

    return new CertificadoDigital(String(data.id), String(data.ambiente ?? ''), validade)
  }

  temValidade(): boolean {
    return this.validadeCertificado != null && !Number.isNaN(this.validadeCertificado.getTime())
  }

  estaExpirado(referencia: Date = new Date()): boolean {
    if (!this.temValidade() || !this.validadeCertificado) return false
    return this.validadeCertificado < referencia
  }

  diasRestantes(referencia: Date = new Date()): number | null {
    if (!this.temValidade() || !this.validadeCertificado) return null
    return Math.ceil(
      (this.validadeCertificado.getTime() - referencia.getTime()) / (1000 * 60 * 60 * 24)
    )
  }
}
