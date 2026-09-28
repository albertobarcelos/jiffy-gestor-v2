import type {
  ConsultarRelatorioProdutosVendidosMvpInput,
  ConsultarRelatorioProdutosVendidosMvpResult,
} from '@/src/application/dto/relatorios/ConsultarRelatorioProdutosVendidosMvpDTO'
import type { IRelatorioProdutosVendidosMvpGateway } from '@/src/application/ports/IRelatorioProdutosVendidosMvpGateway'

export class ConsultarRelatorioProdutosVendidosMvpUseCase {
  constructor(private readonly gateway: IRelatorioProdutosVendidosMvpGateway) {}

  execute(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<ConsultarRelatorioProdutosVendidosMvpResult> {
    if (input.somenteComplementos) {
      return this.gateway.consultarComplementos(input)
    }
    if (input.somenteParticipacao) {
      return this.gateway.consultarParticipacao(input)
    }
    if (input.somenteParticipacaoAbc) {
      return this.gateway.consultarParticipacaoAbc(input)
    }
    if (input.somenteSerie) {
      return this.gateway.consultarSerie(input)
    }
    if (input.somenteComparativo) {
      return this.gateway.consultarComparativo(input)
    }
    return this.gateway.consultarPaginaOuPrincipal(input)
  }
}
