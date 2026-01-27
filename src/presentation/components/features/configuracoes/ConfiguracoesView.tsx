'use client'

import { useState } from 'react'
import { EmpresaTab } from './tabs/EmpresaTab'
import { TerminaisTab } from './tabs/TerminaisTab'
import { OutrasConfiguracoesTab } from './tabs/OutrasConfiguracoesTab'

/**
 * Componente principal de Configurações
 * Replica o design e funcionalidades do Flutter
 */
export function ConfiguracoesView() {
  const [activeTab, setActiveTab] = useState<'empresa' | 'terminais' | 'outras'>('empresa')

  return (
    <div className="flex flex-col h-full">
      <div className="py-2 flex-shrink-0">
        {/* Container principal com tabs */}
        <div className="bg-custom-2 rounded-lg">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('empresa')}
              className={`px-5 py-2 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'empresa'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Empresa
            </button>
            <button
              onClick={() => setActiveTab('terminais')}
              className={`px-5 py-2 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'terminais'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Terminais
            </button>
            {/*<button
              onClick={() => setActiveTab('outras')}
              className={`px-5 py-2 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'outras'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Outras Configurações
            </button>*/}
          </div>
        </div>
      </div>

      {/* Conteúdo das tabs - ocupa todo o espaço restante */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="bg-info rounded-b-[10px] flex-1 flex flex-col overflow-hidden">
          {activeTab === 'empresa' && <EmpresaTab />}
          {activeTab === 'terminais' && <TerminaisTab />}
          {activeTab === 'outras' && <OutrasConfiguracoesTab />}
        </div>
      </div>
    </div>
  )
}

