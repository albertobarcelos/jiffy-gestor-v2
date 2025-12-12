'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Venda } from '@/src/domain/entities/Venda'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdVisibility } from 'react-icons/md'

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

        // Buscar últimas vendas da API
        const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || ''
        
        // Calcular data de 7 dias atrás para buscar últimas vendas
        const hoje = new Date()
        const seteDiasAtras = new Date(hoje)
        seteDiasAtras.setDate(hoje.getDate() - 7)
        
        // Formatar datas no formato ISO (YYYY-MM-DD)
        const periodoInicial = seteDiasAtras.toISOString().split('T')[0]
        const periodoFinal = hoje.toISOString().split('T')[0]

        // Buscar vendas finalizadas dos últimos 7 dias, ordenadas por data (mais recentes primeiro)
        const params = new URLSearchParams({
          status: 'FINALIZADA',
          periodoInicial,
          periodoFinal,
          limit: '10',
          offset: '0',
        })

        const response = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Erro ao buscar vendas: ${response.status}`)
        }

        const data = await response.json()
        
        // Mapear dados da API para entidade Venda
        const vendasMapeadas: Venda[] = (data.items || []).map((item: any) => {
          // Debug: Log apenas da primeira venda para verificar estrutura
          if (data.items.indexOf(item) === 0) {
            console.log('🔍 Estrutura da primeira venda da API:', {
              id: item.id,
              numeroVenda: item.numeroVenda,
              abertoPor: item.abertoPor,
              usuarioPdv: item.usuarioPdv,
              usuario: item.usuario,
              todasAsChaves: Object.keys(item)
            })
          }
          
          // Mapear campos da API para a entidade Venda
          // Tentar diferentes caminhos possíveis para o nome do usuário
          let usuario = 'Usuário'
          
          // Tentar diferentes estruturas possíveis
          if (item.abertoPor?.nome) {
            usuario = item.abertoPor.nome
          } else if (item.usuarioPdv?.nome) {
            usuario = item.usuarioPdv.nome
          } else if (item.usuario?.nome) {
            usuario = item.usuario.nome
          } else if (item.abertoPorNome) {
            usuario = item.abertoPorNome
          } else if (item.usuarioNome) {
            usuario = item.usuarioNome
          } else if (item.nomeUsuario) {
            usuario = item.nomeUsuario
          } else if (typeof item.abertoPor === 'string') {
            usuario = item.abertoPor
          } else if (typeof item.usuario === 'string') {
            usuario = item.usuario
          } else if (item.abertoPor?.usuario?.nome) {
            usuario = item.abertoPor.usuario.nome
          }
          
          const dataVenda = item.dataCriacao ? new Date(item.dataCriacao) : 
                           item.data ? new Date(item.data) : 
                           item.createdAt ? new Date(item.createdAt) : 
                           item.dataAbertura ? new Date(item.dataAbertura) :
                           new Date()
          const valorFaturado = item.valorFinal || item.valorTotal || item.valor || 0
          const numeroVenda = item.numeroVenda || item.numero || item.id || ''
          const tipoVenda = item.tipoVenda || item.tipo || 'Balcão'
          const metodoPagamento = item.meioPagamento?.nome || 
                                 item.meioPagamentoNome || 
                                 item.metodoPagamento || 
                                 item.formaPagamento ||
                                 'Não informado'
          const status = item.cancelado ? 'Cancelada' : 
                        item.status === 'CANCELADA' ? 'Cancelada' : 
                        'Aprovada'

          return Venda.create(
            item.id?.toString() || '',
            dataVenda,
            typeof numeroVenda === 'number' ? numeroVenda : parseInt(numeroVenda) || 0,
            usuario,
            tipoVenda,
            valorFaturado, // valorInicial
            0, // acrescimo
            0, // descontoConta
            0, // descontoItem
            valorFaturado,
            metodoPagamento,
            status as 'Aprovada' | 'Cancelada'
          )
        })

        setVendas(vendasMapeadas)
      } catch (error) {
        console.error('Erro ao carregar vendas:', error)
        // Em caso de erro, manter array vazio ao invés de dados mockados
        setVendas([])
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
        {vendas.length === 0 && !isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Nenhuma venda encontrada</p>
          </div>
        ) : (
          vendas.map((venda) => (
            <div
              key={venda.getId()}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 group"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Avatar/Logo placeholder */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {venda.getUsuario().charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{venda.getUsuario()}</p>
                  <p className="text-sm text-gray-500">{formatDate(venda.getData())}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    +{formatCurrency(venda.getValorFaturado())}
                  </p>
                  <p className="text-xs text-gray-500">Venda #{venda.getNumeroVenda()}</p>
                </div>
                
                {/* Ícone de olho para ver detalhes */}
                <Link
                  href={`/relatorios?vendaId=${venda.getId()}`}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  title="Ver detalhes da venda"
                >
                  <MdVisibility className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

