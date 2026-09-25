import type {
  ConsultarRelatorioProdutosVendidosMvpInput,
  ConsultarRelatorioProdutosVendidosMvpResult,
} from '@/src/application/dto/relatorios/ConsultarRelatorioProdutosVendidosMvpDTO'
import type {
  RelatorioProdutosVendidosMvpComparativoDTO,
  RelatorioProdutosVendidosMvpComplementosDTO,
  RelatorioProdutosVendidosMvpParticipacaoAbcDTO,
  RelatorioProdutosVendidosMvpParticipacaoDTO,
  RelatorioProdutosVendidosMvpResponseDTO,
  RelatorioProdutosVendidosMvpSerieDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

/** Projeção agregada do relatório MVP (sem entidade de domínio). */
export interface IRelatorioProdutosVendidosMvpGateway {
  consultarComplementos(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpComplementosDTO>
  consultarParticipacao(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpParticipacaoDTO>
  consultarParticipacaoAbc(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpParticipacaoAbcDTO>
  consultarSerie(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpSerieDTO>
  consultarComparativo(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpComparativoDTO>
  consultarPaginaOuPrincipal(
    input: ConsultarRelatorioProdutosVendidosMvpInput
  ): Promise<RelatorioProdutosVendidosMvpResponseDTO>
}

export type { ConsultarRelatorioProdutosVendidosMvpResult }
