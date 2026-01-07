'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Venda } from '@/src/domain/entities/Venda'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdPerson, MdVisibility } from 'react-icons/md'
import { DetalhesVendas } from '@/src/presentation/components/features/vendas/DetalhesVendas'

interface UserNamesMap {
  [key: string]: string;
}

interface UserPdvApiResponse {
  id: string;
  nome: string;
  // Adicione outras propriedades relevantes se necessário
}

const LAST_SALES_DISPLAY_LIMIT = 10; // Definir o limite de últimas vendas a serem exibidas

/**
 * Componente de Últimas Vendas
 * Design clean inspirado no exemplo
 */
export function UltimasVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [userNames, setUserNames] = useState<UserNamesMap>({})
  const [isLoading, setIsLoading] = useState(true)
    const { auth } = useAuthStore()

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null);

    const formatCurrency = useCallback((value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    }, [])

    const formatDate = useCallback((date: Date) => {
      const day = date.getDate()
      const month = date.toLocaleDateString('pt-BR', { month: 'long' })
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const period = date.getHours() >= 12 ? 'PM' : 'AM'
      // Formato: "20 fevereiro, 11:20 AM"
      return `${day} ${month}, ${hours}:${minutes} ${period}`
    }, [])

    const handleOpenModal = useCallback((vendaId: string) => {
      setSelectedVendaId(vendaId);
      setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
      setSelectedVendaId(null);
      setIsModalOpen(false);
    }, []);

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
          limit: '100', // Aumentado para buscar mais vendas no período
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

        // Mapear dados da API para entidade Venda, extraindo userId
        const vendasMapeadas: Venda[] = (data.items || []).map((item: any) => {
          const userId = item.abertoPor?.id || item.usuarioPdv?.id || item.usuario?.id || item.abertoPorId || item.usuarioId || ''
          
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
            userId,
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

        // Ordenar as vendas pela data mais recente e limitar ao número desejado
        const ultimasVendas = vendasMapeadas
          .sort((a, b) => b.getData().getTime() - a.getData().getTime())
          .slice(0, LAST_SALES_DISPLAY_LIMIT);

        setVendas(ultimasVendas)

        // Coletar IDs de usuários únicos
        const uniqueUserIds = [...new Set(ultimasVendas.map(v => v.getUserId()).filter(id => id !== ''))]

        // Buscar nomes dos usuários PDV
        if (uniqueUserIds.length > 0) {
          try {
            const userNamesResponses: UserPdvApiResponse[] = await Promise.all(
              uniqueUserIds.map(id => {
                const userPdvUrl = `${baseUrl}/api/v1/pessoas/usuarios-pdv/${id}`;
                return fetch(userPdvUrl, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }).then((res: Response) => {
                  if (!res.ok) {
                    console.error(`Erro ao buscar usuário PDV ${id}: ${res.status} ${res.statusText}`);
                    return { id: '', nome: '' }; // Retorna objeto com estrutura mínima (direto)
                  }
                  return res.json() as Promise<UserPdvApiResponse>;
                });
              })
            )

            const newUserNamesMap: UserNamesMap = {}
            userNamesResponses.forEach((user: UserPdvApiResponse) => {
              if (user && user.id && user.nome) {
                newUserNamesMap[user.id] = user.nome
              }
            })
            setUserNames(newUserNamesMap)
          } catch (userError) {
            console.error('Erro ao buscar nomes dos usuários PDV:', userError)
          }
        }
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
    <>
      <div className="bg-white h-[390px] rounded-lg shadow-sm shadow-primary/70 border border-gray-200 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">Últimas Vendas</h3>
          <span className="text-sm text-primary/70">Última semana</span>
        </div>

        <div className="space-y-4">
          {vendas.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Nenhuma venda encontrada</p>
            </div>
          ) : (
            vendas.map((venda) => {
              const displayUserId = venda.getUserId();
              const displayedName = userNames[displayUserId] || 'Usuário Desconhecido';

              return (
                <div
                  key={venda.getId()}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-primary/10 transition-colors border border-primary/50 group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar/Logo placeholder */}
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      <MdPerson size={28} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{displayedName}</p>
                      <p className="text-sm text-gray-500">{formatDate(venda.getData())}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ">
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(venda.getValorFaturado())}
                      </p>
                      <p className="text-xs text-gray-500">Venda #{venda.getNumeroVenda()}</p>
                    </div>

                    {/* Ícone de olho para ver detalhes */}
                    <button
                      onClick={() => handleOpenModal(venda.getId())}
                      className="p-2 text-primary/70 hover:text-primary rounded-lg transition-colors flex-shrink-0"
                      title="Ver detalhes da venda"
                    >
                      <MdVisibility className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {isModalOpen && (
        <DetalhesVendas
          vendaId={selectedVendaId!}
          open={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}