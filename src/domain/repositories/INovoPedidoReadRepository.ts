import { Produto } from '@/src/domain/entities/Produto'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'

export type CanalVendaCatalogo = 'balcao' | 'entrega'

export interface INovoPedidoReadRepository {
  listarEntregadores(token: string): Promise<UsuarioPdvEntregadorOption[]>

  listarEntregadoresDelivery(token: string): Promise<UsuarioPdvEntregadorOption[]>

  listarProdutosDoGrupo(
    grupoId: string,
    token: string
  ): Promise<{ produtos: Produto[]; count: number }>

  listarGrupoIdsComProdutosAtivos(
    token: string,
    canal: CanalVendaCatalogo
  ): Promise<Set<string>>

  buscarProdutoPorId(produtoId: string, token: string): Promise<Produto | null>

  buscarProdutosPorNome(nome: string, token: string): Promise<Produto[]>

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
