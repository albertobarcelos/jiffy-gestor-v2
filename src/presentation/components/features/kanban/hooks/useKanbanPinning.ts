import { useCallback, useEffect, useState, type SetStateAction } from 'react'
import {
  gravarPrimeiroPorColunaNoStorage,
  lerPrimeiroPorColunaDoStorage,
} from '../rules/fiscalFlowKanban.storage'

export function useKanbanPinning() {
  const [primeiroPorColuna, setPrimeiroPorColunaState] = useState<Record<string, string>>({})

  useEffect(() => {
    setPrimeiroPorColunaState(lerPrimeiroPorColunaDoStorage())
  }, [])

  const setPrimeiroPorColuna = useCallback((action: SetStateAction<Record<string, string>>) => {
    setPrimeiroPorColunaState(prev => {
      const next = typeof action === 'function' ? action(prev) : action
      gravarPrimeiroPorColunaNoStorage(next)
      return next
    })
  }, [])

  return {
    primeiroPorColuna,
    setPrimeiroPorColuna,
  }
}
