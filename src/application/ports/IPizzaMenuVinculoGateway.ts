import type {
  Menu,
  MenuGrupoProduto,
  MenuProduto,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

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
      /** Preferir `all` na detecção/desvínculo: o backend defaulta para `padrao` se omitido. */
      tipo?: 'all' | 'padrao' | 'pizza' | string
    }
  ): Promise<{ items: MenuProduto[]; count: number }>

  listarGrupos(
    token: string,
    menuId: string,
    params: {
      q?: string
      limit?: number
      offset?: number
      ativo?: boolean | null
      grupoProdutoId?: string
      /** Obrigatório passar `all` ou `pizza`: sem isso o backend filtra só `padrao`. */
      tipo?: 'all' | 'padrao' | 'pizza' | string
    }
  ): Promise<{ items: MenuGrupoProduto[]; count: number }>

  atualizarProdutos(
    token: string,
    menuId: string,
    input: UpdateMenuProdutosBatchInput
  ): Promise<Menu>
}
