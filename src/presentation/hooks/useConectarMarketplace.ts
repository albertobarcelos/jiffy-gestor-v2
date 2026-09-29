import { useState } from 'react'
import type { MarketplaceCodigo } from '@/src/domain/integracoes/Marketplace'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'

function lerErroApi(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const error = (payload as { error?: unknown }).error
  return typeof error === 'string' && error.trim() ? error : fallback
}

export function useConectarMarketplace() {
  const [enviando, setEnviando] = useState(false)

  const conectar = async (input: {
    marketplace: MarketplaceCodigo
    merchantIdOd: string
  }) => {
    if (enviando) return
    const merchantIdOd = input.merchantIdOd.trim()
    if (!merchantIdOd) {
      showToast.error('Informe o ID da loja no marketplace.')
      return
    }

    const aba = window.open('about:blank', '_blank')
    if (!aba) {
      showToast.error('O navegador bloqueou a nova aba. Permita pop-ups para conectar.')
      return
    }

    setEnviando(true)
    try {
      const response = await fetchGestorApi('/api/integracoes/conectar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          marketplace: input.marketplace,
          merchantIdOd,
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) {
        aba.close()
        showToast.error(lerErroApi(payload, 'Não foi possível conectar a integração.'))
        return
      }
      const authorizationUrl =
        payload && typeof payload === 'object'
          ? (payload as { authorizationUrl?: unknown }).authorizationUrl
          : null
      if (typeof authorizationUrl !== 'string' || !authorizationUrl.trim()) {
        aba.close()
        showToast.error('Não foi possível abrir o login da integração.')
        return
      }
      aba.location.replace(authorizationUrl)
    } catch {
      aba.close()
      showToast.error('Não foi possível conectar a integração.')
    } finally {
      setEnviando(false)
    }
  }

  return { conectar, enviando }
}
