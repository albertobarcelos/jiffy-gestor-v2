import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import {
  usosParaPropagar,
  type OrigemUsoComplemento,
} from '@/src/domain/policies/complemento/propagarAlteracaoComplemento'
import { BuscarComplementoCompletoGestorUseCase } from '@/src/application/use-cases/complementos/BuscarComplementoCompletoGestorUseCase'

export class ListarUsosParaPropagarComplementoUseCase {
  constructor(private readonly buscarComplemento: BuscarComplementoCompletoGestorUseCase) {}

  async execute(input: {
    complementoId: string
    token: string
    origem?: OrigemUsoComplemento
  }): Promise<ComplementoUsoNoMenu[]> {
    const completo = await this.buscarComplemento.execute({
      complementoId: input.complementoId,
      token: input.token,
    })
    return usosParaPropagar(completo.vinculos, input.origem)
  }
}
