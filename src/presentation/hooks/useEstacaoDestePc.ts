'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getEstacaoImpressaoId,
  getEstacaoImpressaoNome,
  salvarEstacaoImpressaoId,
  salvarEstacaoImpressaoNome,
} from '@/src/infrastructure/printing/estacaoImpressaoStorage'

export function useEstacaoDestePc() {
  const [estacaoId, setEstacaoId] = useState<string | null>(() => getEstacaoImpressaoId())
  const [estacaoNome, setEstacaoNome] = useState<string | null>(() => getEstacaoImpressaoNome())

  const sincronizar = useCallback(() => {
    setEstacaoId(getEstacaoImpressaoId())
    setEstacaoNome(getEstacaoImpressaoNome())
  }, [])

  useEffect(() => {
    sincronizar()
    window.addEventListener('jiffy:estacao-impressao-changed', sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener('jiffy:estacao-impressao-changed', sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [sincronizar])

  const vincular = useCallback((id: string, nome?: string) => {
    salvarEstacaoImpressaoId(id, nome)
    setEstacaoId(id.trim() || null)
    if (nome?.trim()) setEstacaoNome(nome.trim())
  }, [])

  const lembrarNome = useCallback((nome: string) => {
    const value = nome.trim()
    if (!value || value === estacaoNome) return
    salvarEstacaoImpressaoNome(value)
    setEstacaoNome(value)
  }, [estacaoNome])

  return { estacaoId, estacaoNome, vincular, lembrarNome, sincronizar }
}
