import type { EstadoPapelReceptoraDelivery } from '@/src/domain/policies/estacao/EmissaoAutomaticaEstacaoPolicy'
import type { AtualizarEstacaoImpressaoPatch } from '@/src/domain/estacao-impressao/EstacaoImpressao'

/** Traduz decisão de domínio para o patch do gateway de estação. */
export function montarPatchPapelReceptora(
  estado: EstadoPapelReceptoraDelivery
): AtualizarEstacaoImpressaoPatch {
  const patch: AtualizarEstacaoImpressaoPatch = {
    gestorDelivery: estado.gestorDelivery,
  }
  if (estado.emissaoAutomaticaAoFinalizar !== undefined) {
    patch.emissaoAutomaticaAoFinalizar = estado.emissaoAutomaticaAoFinalizar
  }
  return patch
}

export function montarPatchEmissaoAutomatica(ativo: boolean): AtualizarEstacaoImpressaoPatch {
  return { emissaoAutomaticaAoFinalizar: ativo }
}
