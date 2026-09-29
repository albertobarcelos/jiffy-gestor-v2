import { ConsultarRelatorioProdutosVendidosMvpUseCase } from '@/src/application/use-cases/relatorios/ConsultarRelatorioProdutosVendidosMvpUseCase'
import { RelatorioProdutosVendidosMvpGateway } from '@/src/infrastructure/relatorios/RelatorioProdutosVendidosMvpGateway'

export const consultarRelatorioProdutosVendidosMvpUseCase =
  new ConsultarRelatorioProdutosVendidosMvpUseCase(new RelatorioProdutosVendidosMvpGateway())
