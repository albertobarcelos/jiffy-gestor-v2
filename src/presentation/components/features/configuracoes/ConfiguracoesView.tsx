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
      <div className="px-[30px] py-[30px]">
        {/* Container principal com tabs */}
        <div className="bg-info rounded-[10px]">
          {/* Tabs */}
          <div className="flex border-b border-alternate">
            <button
              onClick={() => setActiveTab('empresa')}
              className={`px-5 py-3 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'empresa'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Empresa
            </button>
            <button
              onClick={() => setActiveTab('terminais')}
              className={`px-5 py-3 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'terminais'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Terminais
            </button>
            <button
              onClick={() => setActiveTab('outras')}
              className={`px-5 py-3 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'outras'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Outras Configurações
            </button>
          </div>

          {/* Conteúdo das tabs */}
          <div className="bg-[#EEEEF5] rounded-b-[10px]">
            {activeTab === 'empresa' && <EmpresaTab />}
            {activeTab === 'terminais' && <TerminaisTab />}
            {activeTab === 'outras' && <OutrasConfiguracoesTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

