/**
 * No delivery, emissão ao FINALIZADO só vale na receptora (`gestorDelivery`).
 * Desligar a receptora zera o auto — decisão de domínio, sem formato de API.
 */
export const MENSAGEM_EMISSAO_AUTOMATICA_SO_RECEPTORA =
  'A emissão automática só pode ser ligada na estação principal do delivery.'

export const MENSAGEM_ESTACAO_PRINCIPAL_OBRIGATORIA =
  'Selecione a estação principal do delivery.'

export type EmissaoAutomaticaEstacaoCheck = {
  permitida: boolean
  motivo: string | null
}

export type EstadoPapelReceptoraDelivery = {
  gestorDelivery: boolean
  emissaoAutomaticaAoFinalizar?: boolean
}

export class EmissaoAutomaticaEstacaoPolicy {
  static check(input: { ehReceptora: boolean; ativar: boolean }): EmissaoAutomaticaEstacaoCheck {
    if (!input.ativar) {
      return { permitida: true, motivo: null }
    }
    if (input.ehReceptora) {
      return { permitida: true, motivo: null }
    }
    return { permitida: false, motivo: MENSAGEM_EMISSAO_AUTOMATICA_SO_RECEPTORA }
  }

  static assert(input: { ehReceptora: boolean; ativar: boolean }): void {
    const resultado = this.check(input)
    if (!resultado.permitida) {
      throw new Error(resultado.motivo ?? MENSAGEM_EMISSAO_AUTOMATICA_SO_RECEPTORA)
    }
  }

  static podeAtivar(ehReceptora: boolean): boolean {
    return this.check({ ehReceptora, ativar: true }).permitida
  }

  static valorEfetivo(ehReceptora: boolean, desejado: boolean): boolean {
    return this.check({ ehReceptora, ativar: desejado }).permitida && desejado === true
  }

  static estadoAoDesligarReceptora(): EstadoPapelReceptoraDelivery {
    return {
      gestorDelivery: false,
      emissaoAutomaticaAoFinalizar: false,
    }
  }

  static estadoAoLigarReceptora(): EstadoPapelReceptoraDelivery {
    return { gestorDelivery: true }
  }
}
