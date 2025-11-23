'use client'

import { useState, useEffect } from 'react'
import { Venda } from '@/src/domain/entities/Venda'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Componente de Últimas Vendas
 * Design clean inspirado no exemplo
 */
export function UltimasVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { auth } = useAuthStore()

  useEffect(() => {
    const loadVendas = async () => {
      setIsLoading(true)
      try {
        const token = auth?.getAccessToken()
        if (!token) {
          setIsLoading(false)
          return
        }

        // TODO: Implementar chamada real à API quando disponível
        // Por enquanto, dados mockados
        const mockVendas: Venda[] = [
          Venda.create(
            '1',
            new Date('2024-02-20T11:20:00'),
            1001,
            'João Silva',
            'Balcão',
            18324,
            0,
            0,
            0,
            18324,
            'Dinheiro',
            'Aprovada'
          ),
          Venda.create(
            '2',
            new Date('2024-02-16T08:42:00'),
            1002,
            'Maria Santos',
            'Delivery',
            12620,
            0,
            0,
            0,
            12620,
            'Cartão',
            'Aprovada'
          ),
          Venda.create(
            '3',
            new Date('2024-02-14T18:46:00'),
            1003,
            'Pedro Costa',
            'Mesa',
            36128,
            0,
            0,
            0,
            36128,
            'PIX',
            'Aprovada'
          ),
        ]

        setVendas(mockVendas)
      } catch (error) {
        console.error('Erro ao carregar vendas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVendas()
  }, [auth])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: Date) => {
    const day = date.getDate()
    const month = date.toLocaleDateString('pt-BR', { month: 'long' })
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const period = date.getHours() >= 12 ? 'PM' : 'AM'
    // Formato: "20 fevereiro, 11:20 AM"
    return `${day} ${month}, ${hours}:${minutes} ${period}`
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Últimas Vendas</h3>
        <span className="text-sm text-gray-500">Última semana</span>
      </div>

      <div className="space-y-4">
        {vendas.map((venda) => (
          <div
            key={venda.getId()}
            className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar/Logo placeholder */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {venda.getUsuario().charAt(0).toUpperCase()}
              </div>

              <div className="flex-1">
                <p className="font-semibold text-gray-900">{venda.getUsuario()}</p>
                <p className="text-sm text-gray-500">{formatDate(venda.getData())}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold text-green-600">
                +{formatCurrency(venda.getValorFaturado())}
              </p>
              <p className="text-xs text-gray-500">Venda #{venda.getNumeroVenda()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

