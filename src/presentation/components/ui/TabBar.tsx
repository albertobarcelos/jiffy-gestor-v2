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
    <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide px-2">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id
          
          return (
            <div
              key={tab.id}
              className={`
                group relative flex items-center gap-2 px-4 py-2.5 min-w-fit
                border-b-2 transition-all duration-200 cursor-pointer
                ${isActive 
                  ? 'border-blue-600 bg-blue-50/50' 
                  : 'border-transparent hover:border-gray-300 hover:bg-gray-50/50'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <span
                className={`
                  text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'}
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
                  className={`
                    ml-1 p-0.5 rounded transition-all duration-200
                    opacity-0 group-hover:opacity-100
                    ${isActive 
                      ? 'text-blue-600 hover:bg-blue-100' 
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
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

