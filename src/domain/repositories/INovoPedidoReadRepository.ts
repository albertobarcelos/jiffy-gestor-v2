import { Produto } from '@/src/domain/entities/Produto'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'

export type CanalVendaCatalogo = 'balcao' | 'entrega'

export interface INovoPedidoReadRepository {
  listarEntregadores(token: string): Promise<UsuarioPdvEntregadorOption[]>

  listarEntregadoresDelivery(token: string): Promise<UsuarioPdvEntregadorOption[]>

  listarGruposDoMenu(menuId: string, token: string): Promise<GrupoProduto[]>

  listarProdutosDoGrupo(
    grupoId: string,
    token: string,
    menuId: string | null
  ): Promise<{ produtos: Produto[]; count: number }>

  listarProdutosCatalogoPagina(
    token: string,
    menuId: string,
    params: {
      grupoProdutoId?: string
      q?: string
      limit: number
      offset: number
    }
  ): Promise<{ produtos: Produto[]; count: number; hasMore: boolean }>

  listarGrupoIdsComProdutosAtivos(token: string, menuId: string | null): Promise<Set<string>>

  buscarProdutoPorId(
    produtoId: string,
    token: string,
    menuId?: string | null
  ): Promise<Produto | null>

  buscarProdutosPorNome(nome: string, token: string, menuId: string | null): Promise<Produto[]>

  buscarClienteJson(clienteId: string, token: string): Promise<Record<string, unknown> | null>

  atualizarPagamentosVendaGestor(
    vendaId: string,
    token: string,
    pagamentos: Array<{ meioPagamentoId: string; valor: number }>
  ): Promise<void>

  buscarPedidoDelivery(pedidoId: string, token: string): Promise<Record<string, unknown>>

  patchPedidoDelivery(
    pedidoId: string,
    token: string,
    body: Record<string, unknown>
  ): Promise<void>

  transicionarStatusPedidoDelivery(
    pedidoId: string,
    token: string,
    body: { toStatus: string; motivoCancelamento?: string }
  ): Promise<void>

  emitirNotaPedidoDelivery(
    pedidoId: string,
    token: string,
    modelo: 55 | 65
  ): Promise<Record<string, unknown>>

  buscarAuthMe(token: string): Promise<Record<string, unknown> | null>

  buscarUsuarioGestor(
    usuarioId: string,
    token: string
  ): Promise<Record<string, unknown> | null>
}
