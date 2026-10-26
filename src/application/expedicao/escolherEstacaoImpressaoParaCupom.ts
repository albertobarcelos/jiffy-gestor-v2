import { resolverEstacaoReceptoraDelivery } from '@/src/domain/caixa-estacao/estacaoReceptoraDelivery'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'

/**
 * Cupom de delivery/expedição usa só a receptora da loja (`gestorDelivery`).
 * Não usa a estação gravada neste navegador — essa chave é do caixa/agente deste PC.
 */
export function escolherEstacaoImpressaoParaCupom(
  estacoes: readonly EstacaoImpressaoResumo[]
): string | null {
  const ativas = estacoes.filter(estacao => estacao.ativo !== false && estacao.id.trim())
  return resolverEstacaoReceptoraDelivery(ativas)?.id ?? null
}
