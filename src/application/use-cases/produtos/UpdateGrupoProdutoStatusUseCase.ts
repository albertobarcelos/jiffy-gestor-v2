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

  /** Atualiza só o `ativo` da categoria base (sem tocar nos cardápios). */
  async atualizarAtivoBase(input: UpdateGrupoProdutoStatusInput): Promise<void> {
    if (!input.grupoId.trim()) {
      throw new Error('ID do grupo é obrigatório')
    }

    await this.grupoStatusWriter.atualizarAtivo({
      token: input.token,
      grupoId: input.grupoId.trim(),
      ativo: input.novoStatus,
    })
  }

  /**
   * Atualiza a categoria base e replica o status nos menus.
   * Prefira `atualizarAtivoBase` + replicação separada quando a UI precisar
   * refrescar a lista antes da sincronização dos cardápios.
   */
  async execute(input: UpdateGrupoProdutoStatusInput): Promise<void> {
    await this.atualizarAtivoBase(input)

    await this.replicarNosMenus.execute({
      token: input.token,
      grupoProdutoId: input.grupoId.trim(),
      ativo: input.novoStatus,
    })
  }
}
