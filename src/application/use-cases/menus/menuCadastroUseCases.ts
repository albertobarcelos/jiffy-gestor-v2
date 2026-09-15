import type {
  BuscarMenusParams,
  BuscarMenusResponse,
  IMenuRepository,
} from '@/src/domain/repositories/IMenuRepository'
import type { CreateMenuInput, Menu, UpdateMenuInput } from '@/src/shared/types/menus'

export class ListarMenusUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(params: BuscarMenusParams): Promise<BuscarMenusResponse> {
    return this.menuRepository.listarMenus(params)
  }
}

export class CriarMenuUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(input: CreateMenuInput): Promise<Menu> {
    if (!input.nome?.trim()) {
      throw new Error('Nome é obrigatório')
    }
    return this.menuRepository.criarMenu({
      ...input,
      nome: input.nome.trim(),
      tipo: input.tipo ?? 'custom',
    })
  }
}

export class BuscarMenuPorIdUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(menuId: string): Promise<Menu> {
    if (!menuId?.trim()) {
      throw new Error('Menu não informado')
    }
    return this.menuRepository.buscarMenuPorId(menuId.trim())
  }
}

export class AtualizarMenuUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(menuId: string, input: UpdateMenuInput): Promise<Menu> {
    if (!menuId?.trim()) {
      throw new Error('Menu não informado')
    }
    return this.menuRepository.atualizarMenu(menuId.trim(), input)
  }
}

export class ExcluirMenuUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(menuId: string): Promise<void> {
    if (!menuId?.trim()) {
      throw new Error('Menu não informado')
    }
    return this.menuRepository.excluirMenu(menuId.trim())
  }
}
