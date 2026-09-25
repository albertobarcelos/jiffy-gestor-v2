import { ReplicarStatusCategoriaBaseNosMenusUseCase } from '@/src/application/use-cases/menus/ReplicarStatusCategoriaBaseNosMenusUseCase'
import { StatusCategoriaNoMenuUseCase } from '@/src/application/use-cases/menus/StatusCategoriaNoMenuUseCase'
import { UpdateGrupoProdutoStatusUseCase } from '@/src/application/use-cases/produtos/UpdateGrupoProdutoStatusUseCase'
import { grupoProdutoStatusBffWriter } from '@/src/infrastructure/api/adapters/GrupoProdutoStatusBffWriter'
import { menuCatalogoBffReader } from '@/src/infrastructure/api/adapters/MenuCatalogoBffReader'
import { menuGrupoSnapshotBffWriter } from '@/src/infrastructure/api/adapters/MenuGrupoSnapshotBffWriter'

export const statusCategoriaNoMenuUseCase = new StatusCategoriaNoMenuUseCase(
  menuGrupoSnapshotBffWriter
)

export const replicarStatusCategoriaBaseNosMenusUseCase =
  new ReplicarStatusCategoriaBaseNosMenusUseCase(
    menuCatalogoBffReader,
    menuGrupoSnapshotBffWriter
  )

export const updateGrupoProdutoStatusUseCase = new UpdateGrupoProdutoStatusUseCase(
  grupoProdutoStatusBffWriter,
  replicarStatusCategoriaBaseNosMenusUseCase
)
