'use client'

import Link from 'next/link'
import { FILTRO_COLUNA_TODOS, LABEL_FILTRO_COLUNA, TITULO_ABA_LOTE } from '../constants'
import type { FiltroColunaVazia, TabPainelLote } from '../types'

export interface LoteHeaderTabsProps {
  activeTab: TabPainelLote
  total: number
  produtosSelecionadosCount: number
  produtosExibicaoCount: number
  produtosCarregadosCount: number
  filtroColunaVazia: FiltroColunaVazia
  onTabChange: (tab: TabPainelLote) => void
}

const TAB_CLASS_ACTIVE = 'bg-primary text-info'
const TAB_CLASS_INACTIVE = 'text-secondary-text hover:bg-primary/10'

export function LoteHeaderTabs({
  activeTab,
  total,
  produtosSelecionadosCount,
  produtosExibicaoCount,
  produtosCarregadosCount,
  filtroColunaVazia,
  onTabChange,
}: LoteHeaderTabsProps) {
  const tabClass = (tab: TabPainelLote) =>
    `md:px-4 px-3 py-1 rounded text-sm font-semibold transition-colors ${
      activeTab === tab ? TAB_CLASS_ACTIVE : TAB_CLASS_INACTIVE
    }`

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-1 md:gap-4 gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="md:text-2xl text-sm font-semibold text-primary">
            {TITULO_ABA_LOTE[activeTab]}
          </h1>
          <p className="md:text-sm text-xs text-secondary-text">
            Total de itens: {total} | Selecionados: {produtosSelecionadosCount}
            {filtroColunaVazia !== FILTRO_COLUNA_TODOS ? (
              <>
                {' '}
                | {LABEL_FILTRO_COLUNA[filtroColunaVazia]}: exibindo {produtosExibicaoCount} de{' '}
                {produtosCarregadosCount}
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="flex flex-row flex-wrap gap-1 bg-info rounded-lg p-1">
          <button type="button" onClick={() => onTabChange('precos')} className={tabClass('precos')}>
            Preços
          </button>
          <button
            type="button"
            onClick={() => onTabChange('impressoras')}
            className={`${tabClass('impressoras')} md:px-2`}
          >
            Impressoras
          </button>
          <button
            type="button"
            onClick={() => onTabChange('gruposComplementos')}
            className={`${tabClass('gruposComplementos')} md:px-1`}
          >
            Grupos Complementos
          </button>
          <button
            type="button"
            onClick={() => onTabChange('permissoes')}
            className={`${tabClass('permissoes')} md:px-1`}
          >
            Permissões
          </button>
          <button
            type="button"
            onClick={() => onTabChange('fiscal')}
            className={`${tabClass('fiscal')} md:px-1`}
          >
            Fiscal
          </button>
        </div>
        <Link
          href="/produtos"
          className="h-8 px-8 rounded-lg bg-info text-primary justify-center font-semibold font-exo text-sm border border-primary shadow-sm hover:bg-primary/20 transition-colors flex items-center"
        >
          Fechar
        </Link>
      </div>
    </div>
  )
}
