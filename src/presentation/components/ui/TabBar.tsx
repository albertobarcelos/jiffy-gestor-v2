'use client'

import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { MdClose } from 'react-icons/md'
import { useEffect } from 'react'

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
          
          return (
            <div
              key={tab.id}
              className={`
                group relative flex items-center gap-2 px-2 py-1 min-w-fit mt-2
                border-t border-x bg-alternate/15 transition-all duration-200 cursor-pointer rounded-t-lg
                ${isActive 
                  ? 'border-secondary' 
                  : 'border-alternate/30 hover:bg-alternate/20'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <span
                className={`
                  text-sm font-medium transition-colors whitespace-nowrap
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

