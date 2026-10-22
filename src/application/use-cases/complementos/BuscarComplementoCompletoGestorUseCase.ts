import type { ComplementoCompleto } from '@/src/domain/complemento/tipos'
import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'

export class BuscarComplementoCompletoGestorUseCase {
  constructor(private readonly propagacao: IPropagacaoComplemento) {}

  async execute(input: { complementoId: string; token: string }): Promise<ComplementoCompleto> {
    const complementoId = input.complementoId.trim()
    if (!complementoId) {
      throw new Error('ID do complemento é obrigatório')
    }
    const token = input.token.trim()
    if (!token) {
      throw new Error('Token não encontrado. Faça login novamente.')
    }
    return this.propagacao.buscarCompleto(complementoId, token)
  }
}
