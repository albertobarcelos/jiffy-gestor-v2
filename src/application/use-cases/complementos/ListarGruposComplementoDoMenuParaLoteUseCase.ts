import {
  coletarGruposDosProdutosDoMenu,
  compararNomePt,
  lerComplementosResumoLote,
  type GrupoComplementoLote,
} from '@/src/application/complementos/menuComplementoLote'
import type { IGrupoComplementoRepository } from '@/src/domain/repositories/IGrupoComplementoRepository'
import type { IMenuRepository } from '@/src/domain/repositories/IMenuRepository'
import type { MenuProduto } from '@/src/shared/types/menus'

const PAGINA_PRODUTOS = 100
const MAX_PAGINAS = 50

/**
 * Monta os grupos de complementos usados neste cardápio, com a lista de
 * complementos de cada grupo — base da tela de alterar valor em lote.
 */
export class ListarGruposComplementoDoMenuParaLoteUseCase {
  constructor(
    private readonly menuRepository: IMenuRepository,
    private readonly grupoRepository: IGrupoComplementoRepository
  ) {}

  async execute(menuId: string): Promise<GrupoComplementoLote[]> {
    const id = menuId.trim()
    if (!id) {
      throw new Error('Menu não informado')
    }

    const produtos = await this.listarTodosProdutos(id)
    const porId = coletarGruposDosProdutosDoMenu(produtos)

    const grupos = await Promise.all(
      [...porId.entries()].map(async ([grupoId, info]) => {
        const grupo = await this.grupoRepository.buscarGrupoComplementoPorId(grupoId)
        return {
          id: grupoId,
          nome: grupo?.getNome() || info.nome,
          produtos: info.produtos.size,
          complementos: lerComplementosResumoLote(grupo?.getComplementos()),
        } satisfies GrupoComplementoLote
      })
    )

    return grupos.sort((a, b) => compararNomePt(a.nome, b.nome))
  }

  private async listarTodosProdutos(menuId: string): Promise<MenuProduto[]> {
    const itens: MenuProduto[] = []
    let offset = 0
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const data = await this.menuRepository.listarProdutos(menuId, {
        limit: PAGINA_PRODUTOS,
        offset,
        tipo: 'all',
      })
      itens.push(...data.items)
      if (data.items.length < PAGINA_PRODUTOS) break
      offset += data.items.length
      if (typeof data.count === 'number' && offset >= data.count) break
    }
    return itens
  }
}
