import type { Menu, MenuProduto, UpdateMenuProdutosBatchInput } from '@/src/shared/types/menus'

/**
 * Operações de menu necessárias para vincular sabores/categoria pizza ao cardápio.
 * Evita acoplar o use case de pizza ao MenuBffRepository concreto.
 */
export interface IPizzaMenuVinculoGateway {
  listarProdutos(
    token: string,
    menuId: string,
    params: {
      q?: string
      limit?: number
      offset?: number
      ativo?: boolean | null
      favorito?: boolean | null
      grupoProdutoId?: string
      grupoComplementosId?: string
      tipo?: 'pizza' | string
    }
  ): Promise<{ items: MenuProduto[]; count: number }>

  atualizarProdutos(
    token: string,
    menuId: string,
    input: UpdateMenuProdutosBatchInput
  ): Promise<Menu>
}
