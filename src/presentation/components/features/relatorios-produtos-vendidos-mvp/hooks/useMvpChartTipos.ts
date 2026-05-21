'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MVP_CHART_TIPO_EVOLUCAO_DEFAULT,
  MVP_CHART_TIPO_GRUPOS_DEFAULT,
  MVP_CHART_TIPOS_STORAGE_KEY,
  MVP_CHART_TIPOS_STORAGE_KEY_V1,
  parseMvpChartTipoEvolucao,
  parseMvpChartTipoGrupos,
  type MvpChartTipoEvolucao,
  type MvpChartTipoGrupos,
} from '../mvpChartTipos'

interface MvpChartTiposPersistidos {
  grupos: MvpChartTipoGrupos
  evolucao: MvpChartTipoEvolucao
}

const TIPOS_PADRAO: MvpChartTiposPersistidos = {
  grupos: MVP_CHART_TIPO_GRUPOS_DEFAULT,
  evolucao: MVP_CHART_TIPO_EVOLUCAO_DEFAULT,
}

function normalizarTiposPersistidos(parsed: Record<string, unknown>): MvpChartTiposPersistidos {
  return {
    grupos: parseMvpChartTipoGrupos(parsed.grupos),
    evolucao: parseMvpChartTipoEvolucao(parsed.evolucao),
  }
}

function lerStorage(): MvpChartTiposPersistidos {
  if (typeof window === 'undefined') {
    return TIPOS_PADRAO
  }
  try {
    let raw = localStorage.getItem(MVP_CHART_TIPOS_STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(MVP_CHART_TIPOS_STORAGE_KEY_V1)
      if (!raw) return TIPOS_PADRAO
    }
    const tipos = normalizarTiposPersistidos(JSON.parse(raw) as Record<string, unknown>)
    gravarStorage(tipos)
    return tipos
  } catch {
    return TIPOS_PADRAO
  }
}

function gravarStorage(next: MvpChartTiposPersistidos) {
  try {
    localStorage.setItem(MVP_CHART_TIPOS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota / modo privado */
  }
}

export function useMvpChartTipos() {
  const [tipos, setTipos] = useState<MvpChartTiposPersistidos>(lerStorage)

  useEffect(() => {
    setTipos(lerStorage())
  }, [])

  const setTipoGrupos = useCallback((grupos: MvpChartTipoGrupos) => {
    setTipos(prev => {
      const next = { ...prev, grupos }
      gravarStorage(next)
      return next
    })
  }, [])

  const setTipoEvolucao = useCallback((evolucao: MvpChartTipoEvolucao) => {
    setTipos(prev => {
      const next = { ...prev, evolucao }
      gravarStorage(next)
      return next
    })
  }, [])

  return {
    tipoGrupos: tipos.grupos,
    tipoEvolucao: tipos.evolucao,
    setTipoGrupos,
    setTipoEvolucao,
  }
}
