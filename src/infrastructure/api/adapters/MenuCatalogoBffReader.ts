import type { IMenuCatalogoReader } from '@/src/application/ports/IMenuCatalogoReader'
import { menuBffRepository } from '@/src/infrastructure/api/repositories/MenuBffRepository'

export class MenuCatalogoBffReader implements IMenuCatalogoReader {
  async listar(input: {
    token: string
    limit?: number
    offset?: number
  }): Promise<{ items: Array<{ id: string }> }> {
    const { items } = await menuBffRepository.listarMenus(input.token, {
      limit: input.limit,
      offset: input.offset,
    })
    return { items: items.map(menu => ({ id: menu.id })) }
  }
}

export const menuCatalogoBffReader = new MenuCatalogoBffReader()
