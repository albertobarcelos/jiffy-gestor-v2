'use client'

import { useEffect, useState } from 'react'
import { lerTempoPreparoKanbanMinutos } from '@/src/infrastructure/delivery/tempoPreparoKanbanStorage'
import { EVENTO_TEMPO_PREPARO_ATUALIZADO } from '@/src/shared/constants/tempoPreparoKanban'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

export function useTempoPreparoKanbanMinutos(): number {
  const empresaId = useTenantEmpresaId()
  const [minutos, setMinutos] = useState(() => lerTempoPreparoKanbanMinutos(empresaId))

  useEffect(() => {
    setMinutos(lerTempoPreparoKanbanMinutos(empresaId))
  }, [empresaId])

  useEffect(() => {
    const sincronizar = () => setMinutos(lerTempoPreparoKanbanMinutos(empresaId))
    window.addEventListener(EVENTO_TEMPO_PREPARO_ATUALIZADO, sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener(EVENTO_TEMPO_PREPARO_ATUALIZADO, sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [empresaId])

  return minutos
}
