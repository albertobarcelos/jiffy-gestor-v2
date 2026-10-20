import type { IGrupoProdutoStatusWriter } from '@/src/application/ports/IGrupoProdutoStatusWriter'
import type { ReplicarStatusCategoriaBaseNosMenusUseCase } from '@/src/application/use-cases/menus/ReplicarStatusCategoriaBaseNosMenusUseCase'

export interface UpdateGrupoProdutoStatusInput {
  grupoId: string
  novoStatus: boolean
  token: string
}

export class UpdateGrupoProdutoStatusUseCase {
  constructor(
    private readonly grupoStatusWriter: IGrupoProdutoStatusWriter,
    private readonly replicarNosMenus: Pick<
      ReplicarStatusCategoriaBaseNosMenusUseCase,
      'execute'
    >
  ) {}

  async execute(input: UpdateGrupoProdutoStatusInput): Promise<void> {
    if (!input.grupoId.trim()) {
      throw new Error('ID do grupo é obrigatório')
    }

    await this.grupoStatusWriter.atualizarAtivo({
      token: input.token,
      grupoId: input.grupoId.trim(),
      ativo: input.novoStatus,
    })

    await this.replicarNosMenus.execute({
      token: input.token,
      grupoProdutoId: input.grupoId.trim(),
      ativo: input.novoStatus,
    })
  }
}
