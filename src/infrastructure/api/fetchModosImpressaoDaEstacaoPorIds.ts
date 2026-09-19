import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { Impressora } from '@/src/domain/entities/Impressora'
import type { ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'
import { erroImpressao } from '@/src/shared/utils/logImpressaoDelivery'

/**
 * Modo de cada impressora lógica nesta estação (`terminaisConfig` da estação atual).
 * Sem o par estação+impressora → `normal`. Falha individual não bloqueia a impressão.
 */
export async function fetchModosImpressaoDaEstacaoPorIds(
  impressoraIds: string[],
  accessToken: string | undefined,
  estacaoId?: string | null
): Promise<Record<string, ModoImpressaoImpressora>> {
  const token = accessToken?.trim()
  const unique = [...new Set(impressoraIds.map(id => id.trim()).filter(Boolean))]
  const result: Record<string, ModoImpressaoImpressora> = {}
  const estacao = String(estacaoId ?? '').trim()

  if (!token || unique.length === 0 || !estacao) {
    for (const id of unique) result[id] = 'normal'
    return result
  }

  await Promise.all(
    unique.map(async id => {
      try {
        const res = await fetchGestorApi(`/api/impressoras/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        })
        if (!res.ok) {
          result[id] = 'normal'
          return
        }
        const data = await res.json()
        result[id] = Impressora.fromJSON(data).getModoImpressaoDaEstacao(estacao)
      } catch (error) {
        erroImpressao('fetchModosImpressaoDaEstacao.falhou', {
          impressoraId: id,
          estacaoId: estacao,
          mensagem: error instanceof Error ? error.message : String(error),
        })
        result[id] = 'normal'
      }
    })
  )

  return result
}
