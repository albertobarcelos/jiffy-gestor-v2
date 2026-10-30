import { ReplicacaoStatusCategoriaFalhouError } from '@/src/application/errors/ReplicacaoStatusCategoriaFalhouError'
import type { IGrupoProdutoStatusWriter } from '@/src/application/ports/IGrupoProdutoStatusWriter'
import type { ReplicarStatusCategoriaBaseNosMenusUseCase } from '@/src/application/use-cases/menus/ReplicarStatusCategoriaBaseNosMenusUseCase'

export interface UpdateGrupoProdutoStatusInput {
  grupoId: string
  novoStatus: boolean
  token: string
}

export interface UpdateGrupoProdutoStatusHooks {
  /** Depois que o cadastro base gravou, antes de publicar o status nos cardápios. */
  aposGravarBase?: () => Promise<void>
}

export class UpdateGrupoProdutoStatusUseCase {
  constructor(
    private readonly grupoStatusWriter: IGrupoProdutoStatusWriter,
    private readonly replicarNosMenus: Pick<
      ReplicarStatusCategoriaBaseNosMenusUseCase,
      'execute'
    >
  ) {}

  /**
   * Única orquestração: grava o cadastro, avisa a UI, publica nos cardápios.
   * Se a publicação falhar, a base já está persistida — lança `ReplicacaoStatusCategoriaFalhouError`.
   */
  async execute(
    input: UpdateGrupoProdutoStatusInput,
    hooks?: UpdateGrupoProdutoStatusHooks
  ): Promise<void> {
    const grupoId = input.grupoId.trim()
    if (!grupoId) {
      throw new Error('ID do grupo é obrigatório')
    }

    await this.grupoStatusWriter.atualizarAtivo({
      token: input.token,
      grupoId,
      ativo: input.novoStatus,
    })

    await hooks?.aposGravarBase?.()

    try {
      await this.replicarNosMenus.execute({
        token: input.token,
        grupoProdutoId: grupoId,
        ativo: input.novoStatus,
      })
    } catch (error) {
      if (error instanceof ReplicacaoStatusCategoriaFalhouError) throw error
      throw new ReplicacaoStatusCategoriaFalhouError()
    }
  }
}
