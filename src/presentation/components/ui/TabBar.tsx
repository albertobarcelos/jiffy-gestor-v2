'use client'

import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import {
  MdAssessment,
  MdBusiness,
  MdClose,
  MdDashboard,
  MdNumbers,
  MdPercent,
  MdReceipt,
  MdSettings,
  MdTableChart,
} from 'react-icons/md'
import type { IconType } from 'react-icons'
import { useEffect } from 'react'

/** Ícones alinhados aos botões do Portal do Contador (PainelContadorView) */
const TAB_ICON_BY_ID: Partial<Record<string, IconType>> = {
  'painel-contador': MdDashboard,
  'etapa-1-dados-fiscais': MdBusiness,
  'etapa-2-emissor-fiscal': MdReceipt,
  'etapa-3-cenario-fiscal': MdAssessment,
  'etapa-4-numeracoes-fiscais': MdNumbers,
  'etapa-5-tabela-ibpt': MdTableChart,
  'config-ncm-cest': MdAssessment,
  impostos: MdPercent,
  'config-empresa-completa': MdSettings,
}

/**
 * Barra de abas minimalista e clean
 * Inspirado no design do Omie
 */
export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabsStore()

  // Adiciona estilos para esconder scrollbar
  useEffect(() => {
    const styleId = 'tabbar-scrollbar-hide'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm ">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-2">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id
          const TabIcon = TAB_ICON_BY_ID[tab.id]
          const ocultarTextoNoMobile = Boolean(TabIcon)

          return (
            <div
              key={tab.id}
              className={`
                group relative flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 min-w-fit mt-2
                border-t border-x bg-alternate/15 transition-all duration-200 cursor-pointer rounded-t-lg
                ${isActive 
                  ? 'border-secondary' 
                  : 'border-alternate/30 hover:bg-alternate/20'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
            >
              {TabIcon ? (
                <TabIcon
                  className={`h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4 ${
                    isActive ? 'text-secondary' : 'text-alternate group-hover:text-secondary'
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`
                  text-sm font-medium transition-colors whitespace-nowrap
                  ${ocultarTextoNoMobile ? 'hidden sm:inline' : 'inline'}
                  ${isActive ? 'text-secondary' : 'text-alternate hover:text-secondary'}
                `}
              >
                {tab.label}
              </span>
              
              {!tab.isFixed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTab(tab.id)
                  }}
                  className={`hover:bg-alternate/20 rounded-full p-0.5
                    ${isActive 
                      ? 'text-secondary' 
                      : 'text-alternate'
                    }
                  `}
                  title="Fechar aba"
                >
                  <MdClose className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

