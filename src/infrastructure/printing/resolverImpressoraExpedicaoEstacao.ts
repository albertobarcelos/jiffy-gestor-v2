import type { EstacaoImpressaoMapeamento } from '@/src/shared/types/estacaoImpressao'

/** Nome Windows ou tcp:// vinculado à impressora lógica de expedição nesta estação. */
export function resolverNomeImpressoraExpedicaoEstacao(
  impressoraExpedicaoId: string | null | undefined,
  mapeamentos: EstacaoImpressaoMapeamento[]
): string | null {
  const id = impressoraExpedicaoId?.trim()
  if (!id) return null
  const nome = mapeamentos.find(m => m.impressoraId === id)?.nomeImpressoraWindows?.trim()
  return nome || null
}
