import { AlterarTipoEntregaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AlterarTipoEntregaPedidoDeliveryUseCase'
import { AtualizarCobrancasPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarCobrancasPedidoDeliveryUseCase'
import { AtualizarEnderecoEntregaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarEnderecoEntregaPedidoDeliveryUseCase'
import { AtualizarProdutosPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/AtualizarProdutosPedidoDeliveryUseCase'
import { ConfirmarCobrancaPendentePedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/ConfirmarCobrancaPendentePedidoDeliveryUseCase'
import { CriarPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/CriarPedidoDeliveryUseCase'
import { EmitirNotaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/EmitirNotaPedidoDeliveryUseCase'
import { ListarEntregadoresDeliveryUseCase } from '@/src/application/use-cases/delivery/ListarEntregadoresDeliveryUseCase'
import { ReemitirNotaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/ReemitirNotaPedidoDeliveryUseCase'
import { SalvarTaxaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/SalvarTaxaPedidoDeliveryUseCase'
import { BuscarClienteParaEntregaUseCase } from '@/src/application/use-cases/clientes/BuscarClienteParaEntregaUseCase'
import { AtualizarPagamentoEntregaGestorUseCase } from '@/src/application/use-cases/vendas/AtualizarPagamentoEntregaGestorUseCase'
import { CarregarPedidoKanbanQuickViewUseCase } from '@/src/application/use-cases/vendas/CarregarPedidoKanbanQuickViewUseCase'
import { CarregarVendaDetalheUseCase } from '@/src/application/use-cases/vendas/CarregarVendaDetalheUseCase'
import {
  BuscarProdutoCatalogoPorIdUseCase,
  ListarGruposCatalogoVendaUseCase,
  ListarProdutosCatalogoVendaPaginaUseCase,
} from '@/src/application/use-cases/vendas/ListarProdutosCatalogoUseCase'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'

export const atualizarCobrancasPedidoDeliveryUseCase =
  new AtualizarCobrancasPedidoDeliveryUseCase(novoPedidoReadRepository)
export const criarPedidoDeliveryUseCase = new CriarPedidoDeliveryUseCase(
  atualizarCobrancasPedidoDeliveryUseCase,
  novoPedidoReadRepository
)
export const emitirNotaPedidoDeliveryUseCase = new EmitirNotaPedidoDeliveryUseCase(
  novoPedidoReadRepository
)
export const reemitirNotaPedidoDeliveryUseCase = new ReemitirNotaPedidoDeliveryUseCase(
  novoPedidoReadRepository
)
export const atualizarProdutosPedidoDeliveryUseCase =
  new AtualizarProdutosPedidoDeliveryUseCase(novoPedidoReadRepository)
export const salvarTaxaPedidoDeliveryUseCase = new SalvarTaxaPedidoDeliveryUseCase(
  novoPedidoReadRepository
)
export const listarEntregadoresDeliveryUseCase = new ListarEntregadoresDeliveryUseCase(
  novoPedidoReadRepository
)
export const confirmarCobrancaPendentePedidoDeliveryUseCase =
  new ConfirmarCobrancaPendentePedidoDeliveryUseCase(novoPedidoReadRepository)
export const atualizarEnderecoEntregaPedidoDeliveryUseCase =
  new AtualizarEnderecoEntregaPedidoDeliveryUseCase(novoPedidoReadRepository)
export const alterarTipoEntregaPedidoDeliveryUseCase =
  new AlterarTipoEntregaPedidoDeliveryUseCase(novoPedidoReadRepository)
export const buscarClienteParaEntregaUseCase = new BuscarClienteParaEntregaUseCase(
  novoPedidoReadRepository
)
export const atualizarPagamentoEntregaGestorUseCase =
  new AtualizarPagamentoEntregaGestorUseCase(novoPedidoReadRepository)
export const listarProdutosCatalogoVendaPaginaUseCase =
  new ListarProdutosCatalogoVendaPaginaUseCase(novoPedidoReadRepository)
export const listarGruposCatalogoVendaUseCase = new ListarGruposCatalogoVendaUseCase(
  novoPedidoReadRepository
)
export const buscarProdutoCatalogoPorIdUseCase = new BuscarProdutoCatalogoPorIdUseCase(
  novoPedidoReadRepository
)
export const carregarVendaDetalheUseCase = new CarregarVendaDetalheUseCase(
  vendaDetalheReadRepository
)
export const carregarPedidoKanbanQuickViewUseCase = new CarregarPedidoKanbanQuickViewUseCase(
  vendaDetalheReadRepository
)
