import { Produto } from '@/src/domain/entities/Produto'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'

export type CanalVendaCatalogo = 'balcao' | 'entrega'

export interface INovoPedidoReadRepository {
  listarEntregadores(token: string): Promise<UsuarioPdvEntregadorOption[]>

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

  buscarAuthMe(token: string): Promise<Record<string, unknown> | null>

  buscarUsuarioGestor(
    usuarioId: string,
    token: string
  ): Promise<Record<string, unknown> | null>
}
