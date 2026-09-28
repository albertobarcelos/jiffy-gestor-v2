'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  estacaoDestePcStore,
  lembrarNomeEstacaoDestePcUseCase,
  vincularEstacaoDestePcUseCase,
} from '@/src/presentation/hooks/estacao-impressao/criarEstacaoDestePcUseCases'

export function useEstacaoDestePc() {
  const store = estacaoDestePcStore()
  const [estacaoId, setEstacaoId] = useState<string | null>(() => store.obterId())
  const [estacaoNome, setEstacaoNome] = useState<string | null>(() => store.obterNome())

  const sincronizar = useCallback(() => {
    setEstacaoId(store.obterId())
    setEstacaoNome(store.obterNome())
  }, [store])

  useEffect(() => {
    sincronizar()
    window.addEventListener('jiffy:estacao-impressao-changed', sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener('jiffy:estacao-impressao-changed', sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [sincronizar])

  const vincular = useCallback(
    (id: string, nome?: string) => {
      vincularEstacaoDestePcUseCase().execute(id, nome)
      sincronizar()
    },
    [sincronizar]
  )

  const lembrarNome = useCallback(
    (nome: string) => {
      lembrarNomeEstacaoDestePcUseCase().execute(nome)
      sincronizar()
    },
    [sincronizar]
  )

  return { estacaoId, estacaoNome, vincular, lembrarNome, sincronizar }
}
