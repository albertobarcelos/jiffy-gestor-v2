import type { MapeamentoEstacaoParaSalvar } from '@/src/domain/estacao-impressao/EstacaoImpressao'
import {
  parseModoImpressaoImpressora,
  type ModoImpressaoImpressora,
} from '@/src/domain/types/modoImpressaoImpressora'

/** Vínculo físico + via de produção desta estação. Sem destino físico, o item não entra. */
export function montarMapeamentosEstacaoParaSalvar(
  vinculos: Record<string, string>,
  modos: Record<string, ModoImpressaoImpressora | undefined>
): MapeamentoEstacaoParaSalvar[] {
  const result: MapeamentoEstacaoParaSalvar[] = []
  for (const [impressoraIdRaw, nomeRaw] of Object.entries(vinculos)) {
    const impressoraId = impressoraIdRaw.trim()
    const nomeImpressoraWindows = nomeRaw.trim()
    if (!impressoraId || !nomeImpressoraWindows) continue
    result.push({
      impressoraId,
      nomeImpressoraWindows,
      modoImpressao: parseModoImpressaoImpressora(modos[impressoraId]),
    })
  }
  return result
}
