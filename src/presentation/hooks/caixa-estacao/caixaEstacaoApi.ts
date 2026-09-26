/**
 * Re-exporta os helpers de API do caixa-estação a partir da camada de infrastructure.
 * Hooks de presentation importam daqui; infrastructure importa direto de caixaEstacaoBff.
 */
export {
  lerErroCaixaEstacao,
  pathCaixaEstacaoAtual,
  pathMovimentacaoCaixaEstacao,
  pathFechamentoCaixaEstacao,
  pathOperacaoCaixaEstacao,
} from '@/src/infrastructure/api/caixaEstacaoBff'

export { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
