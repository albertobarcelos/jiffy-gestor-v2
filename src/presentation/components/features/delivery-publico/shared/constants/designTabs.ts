import type { DesignTabId } from '../types/deliveryPublicoDesignConfig'

export type DesignTabDefinition = {
  id: DesignTabId
  label: string
}

export const DESIGN_TABS: DesignTabDefinition[] = [
  { id: 'cabecalho', label: 'Cabeçalho' },
  { id: 'modelos', label: 'Modelos' },
  { id: 'cores', label: 'Cores' },
  { id: 'tipografias', label: 'Tipografias' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'elementos-destaque', label: 'Elementos em destaque' },
]
