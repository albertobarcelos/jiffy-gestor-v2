import { useCallback, useEffect, useState } from 'react'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanId, KanbanColumn } from '../types'
import {
  gravarColunasOcultasNoStorage,
  lerColunasOcultasDoStorage,
} from '../rules/vendasKanban.storage'
import { alternarColunaOculta, podeOcultarColuna } from '../utils/kanbanColunasVisibilidade'

export function useKanbanColunasVisibilidade(modo: ModoKanbanVendas) {
  const [ocultas, setOcultas] = useState<ColunaKanbanId[]>(() =>
    lerColunasOcultasDoStorage(modo)
  )

  useEffect(() => {
    setOcultas(lerColunasOcultasDoStorage(modo))
  }, [modo])

  const definirOcultas = useCallback(
    (next: ColunaKanbanId[]) => {
      setOcultas(next)
      gravarColunasOcultasNoStorage(modo, next)
    },
    [modo]
  )

  const setColunaVisivel = useCallback(
    (id: ColunaKanbanId, visivel: boolean, colunasDoModo: readonly KanbanColumn[]) => {
      setOcultas(prev => {
        if (!visivel && !podeOcultarColuna(colunasDoModo, prev, id)) {
          return prev
        }
        const next = alternarColunaOculta(prev, id, visivel)
        gravarColunasOcultasNoStorage(modo, next)
        return next
      })
    },
    [modo]
  )

  return { ocultas, definirOcultas, setColunaVisivel }
}
