'use client'

import { useState } from 'react'

interface HeaderProps {
  pageName?: string
  nomePagina?: string
}

/**
 * Header simplificado para páginas específicas
 * Design minimalista e clean
 */
export function Header({ pageName, nomePagina }: HeaderProps) {
  const displayName = pageName || nomePagina || 'Dashboard'
  const [searchValue, setSearchValue] = useState('')

  return (
    <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      {/* Nome da página */}
      <h1 className="text-2xl font-semibold text-gray-900">
        {displayName}
      </h1>

      {/* Barra de pesquisa (opcional) */}
      <div className="hidden lg:flex items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-64 px-4 py-2 pl-10 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
