'use client'

import { useCallback } from 'react'
import type { TabPainelLote } from '../types'

export interface LoteTabNavigationResets {
  limparFormularioPreco: () => void
  limparSelecaoImpressoras: () => void
  limparSelecaoGrupos: () => void
  resetImpressorasAoEntrarNaAba: () => void
  resetGruposAoEntrarNaAba: () => void
  resetPermissoesAoEntrarNaAba: () => void
  resetFiscalDraft: () => void
}

/**
 * Reseta formulários/seleções auxiliares ao trocar de aba (mesmo comportamento da UI legada).
 */
export function useLoteTabNavigation(
  activeTab: TabPainelLote,
  setActiveTab: (tab: TabPainelLote) => void,
  {
    limparFormularioPreco,
    limparSelecaoImpressoras,
    limparSelecaoGrupos,
    resetImpressorasAoEntrarNaAba,
    resetGruposAoEntrarNaAba,
    resetPermissoesAoEntrarNaAba,
    resetFiscalDraft,
  }: LoteTabNavigationResets
) {
  return useCallback(
    (tab: TabPainelLote) => {
      switch (tab) {
        case 'precos':
          limparSelecaoImpressoras()
          limparSelecaoGrupos()
          break
        case 'impressoras':
          limparFormularioPreco()
          resetImpressorasAoEntrarNaAba()
          break
        case 'gruposComplementos':
          limparFormularioPreco()
          resetGruposAoEntrarNaAba()
          break
        case 'permissoes':
          limparFormularioPreco()
          limparSelecaoImpressoras()
          limparSelecaoGrupos()
          if (activeTab !== 'permissoes') resetPermissoesAoEntrarNaAba()
          break
        case 'fiscal':
          limparFormularioPreco()
          limparSelecaoImpressoras()
          limparSelecaoGrupos()
          if (activeTab !== 'fiscal') resetFiscalDraft()
          break
      }
      setActiveTab(tab)
    },
    [
      activeTab,
      limparFormularioPreco,
      limparSelecaoGrupos,
      limparSelecaoImpressoras,
      resetFiscalDraft,
      resetGruposAoEntrarNaAba,
      resetImpressorasAoEntrarNaAba,
      resetPermissoesAoEntrarNaAba,
      setActiveTab,
    ]
  )
}
