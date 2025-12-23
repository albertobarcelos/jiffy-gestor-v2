'use client'

import { useState, useCallback } from 'react'
import { Faturamento } from '@/src/domain/entities/Faturamento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { VendasList } from '@/src/presentation/components/features/vendas/VendasList'

/**
 * Componente principal de Relatórios
 * Replica o design e funcionalidades do Flutter
 */
export function RelatoriosView() {
  const { auth } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'vendas' | 'faturamento'>('vendas')
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([])

  const loadFaturamentos = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      try {
        // TODO: Implementar chamada à API quando disponível
        // Por enquanto, dados mockados
        const mockFaturamentos: Faturamento[] = []
        setFaturamentos(mockFaturamentos)
      } catch (error) {
        console.error('Erro ao carregar faturamentos:', error)
      }
    },
    [auth]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 py-2">
        {/* Tabs */}
        <div className="bg-info rounded-lg">
          <div className="flex border-b-2 border-primary/70">
            <button
              onClick={() => setActiveTab('vendas')}
              className={`px-5 py-2 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'vendas'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setActiveTab('faturamento')}
              className={`px-5 py-2 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'faturamento'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Faturamento
            </button>
          </div>

          {/* Conteúdo das tabs */}
          <div className="">
            {activeTab === 'vendas' ? (
              <VendasList />
            ) : (
              <div className="space-y-4">
                <h3 className="text-primary text-base font-semibold font-exo">
                  Relatório de Faturamento
                </h3>
                <div className="text-center py-12">
                  <p className="text-secondary-text">Funcionalidade de faturamento será implementada aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

