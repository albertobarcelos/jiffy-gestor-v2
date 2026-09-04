const MINIMO_CARACTERES = 15

export class JustificativaInutilizacaoPolicy {
  static check(justificativa: string): { valida: boolean; motivo?: string } {
    const texto = justificativa.trim()
    if (texto.length < MINIMO_CARACTERES) {
      return {
        valida: false,
        motivo: `Justificativa deve ter no mínimo ${MINIMO_CARACTERES} caracteres.`,
      }
    }
    return { valida: true }
  }
}
