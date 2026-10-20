import type {
  AtualizarEstacaoImpressaoPatch,
  EstacaoImpressaoMapeamento,
  EstacaoImpressaoResumo,
  ImpressoraLogica,
  MapeamentoEstacaoParaSalvar,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'

/**
 * Porta de saída para estações de impressão (BFF → API gestor).
 * @see docs/arquitetura-jiffy/2.domain/4.PORTS.md §2.2
 */
export interface IEstacaoImpressaoGateway {
  criar(nome: string): Promise<EstacaoImpressaoResumo>
  atualizar(estacaoId: string, patch: AtualizarEstacaoImpressaoPatch): Promise<EstacaoImpressaoResumo>
  listar(): Promise<EstacaoImpressaoResumo[]>
  listarImpressorasLogicas(): Promise<ImpressoraLogica[]>
  buscarMapeamentos(estacaoId: string): Promise<EstacaoImpressaoMapeamento[]>
  salvarMapeamentos(
    estacaoId: string,
    mapeamentos: MapeamentoEstacaoParaSalvar[]
  ): Promise<EstacaoImpressaoMapeamento[]>
  invalidarCacheMapeamentos(estacaoId?: string): void
}
