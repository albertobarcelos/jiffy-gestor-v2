'use client'

import { useState, useEffect, useCallback } from 'react'
import { Venda } from '@/src/domain/entities/Venda'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdPerson, MdVisibility } from 'react-icons/md'
import { DetalhesVendas } from '@/src/presentation/components/features/vendas/DetalhesVendas'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo

interface UserNamesMap {
  [key: string]: string;
}

interface UserPdvApiResponse {
  id: string;
  nome: string;
  // Adicione outras propriedades relevantes se necessário
}

interface UltimasVendasProps {
  periodo: string;
  periodoInicial?: Date | null;
  periodoFinal?: Date | null;
}

// Removido limite de exibição - agora exibe todas as vendas retornadas (até 100)

/**
 * Componente de Últimas Vendas
 * Design clean inspirado no exemplo
 */
export function UltimasVendas({ periodo, periodoInicial, periodoFinal }: UltimasVendasProps) {
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

  // Função para mapear o período do frontend para o formato esperado pela função calculatePeriodo
  const mapPeriodoToCalculateFormat = (frontendPeriodo: string): string => {
    switch (frontendPeriodo) {
      case 'Hoje': return 'Hoje';
      case 'Últimos 7 Dias': return 'Últimos 7 Dias';
      case 'Mês Atual': return 'Mês Atual';
      case 'Últimos 30 Dias': return 'Últimos 30 Dias';
      case 'Últimos 60 Dias': return 'Últimos 60 Dias';
      case 'Últimos 90 Dias': return 'Últimos 90 Dias';
      case 'Todos': return 'Todos'; 
      default: return 'Todos'; 
    }
  };

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

        // Buscar vendas finalizadas, ordenadas por data (mais recentes primeiro)
        const params = new URLSearchParams({
          limit: '100', // Aumentado para buscar mais vendas no período
          offset: '0',
        })
        
        // Se período for "Datas Personalizadas" e datas foram fornecidas, usa elas
        if (periodo === 'Datas Personalizadas' && periodoInicial && periodoFinal) {
          params.append('periodoInicial', periodoInicial.toISOString());
          params.append('periodoFinal', periodoFinal.toISOString());
        } else {
          // Caso contrário, calcula com base no período
          const mappedPeriodo = mapPeriodoToCalculateFormat(periodo);
          const { inicio, fim } = calculatePeriodo(mappedPeriodo);
          
          // Só adiciona parâmetros de data se não for "Todos"
          if (mappedPeriodo !== 'Todos' && inicio && fim) {
            params.append('periodoInicial', inicio.toISOString());
            params.append('periodoFinal', fim.toISOString());
          }
        }
        
        params.append('status', 'FINALIZADA');
        params.append('status', 'CANCELADA');

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
          const dataUltimoProdutoLancado = item.dataUltimoProdutoLancado ? new Date(item.dataUltimoProdutoLancado) : null
          const dataUltimaMovimentacao = item.dataUltimaMovimentacao ? new Date(item.dataUltimaMovimentacao) : null
          const dataCancelamento = item.dataCancelamento ? new Date(item.dataCancelamento) : null

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
            status as 'Aprovada' | 'Cancelada',
            dataUltimoProdutoLancado,
            dataUltimaMovimentacao,
            dataCancelamento
          )
        })

        // Ordenar as vendas pela data mais recente (exibe todas as vendas retornadas, até 100)
        const ultimasVendas = vendasMapeadas
          .sort((a, b) => b.getData().getTime() - a.getData().getTime())

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
  }, [auth, periodo, periodoInicial, periodoFinal])


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
      <div className="bg-white h-[440px] rounded-lg shadow-sm shadow-primary/70 border border-gray-200 p-6 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-center md:justify-between mb-2 md:mb-6">
          <h3 className="text-lg font-semibold text-primary">Vendas do Período</h3>
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
              // Verifica se a venda foi cancelada através da data de cancelamento ou do status
              const isCancelada = !!venda.getDataCancelamento() || venda.getStatus() === 'Cancelada';

              return (
                <div
                  key={venda.getId()}
                  className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-lg transition-colors border border-primary/50 group cursor-pointer ${
                    isCancelada 
                      ? 'bg-red-100 hover:bg-red-200' 
                      : 'bg-white hover:bg-primary/10'
                  }`}
                  onClick={() => handleOpenModal(venda.getId())}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar/Logo placeholder */}
                    <div className="w-10 h-10 hidden md:flex bg-primary rounded-lg items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      <MdPerson size={28} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{displayedName}</p>
                      <p className="text-sm text-gray-500">{formatDate(venda.getData())}</p>
                    </div>
                  </div>

                  <div className="flex  items-center gap-3 ">
                    <div className="flex md:flex-col flex-row items-center justify-between md:justify-end gap-2 text-right">
                      <p className={`font-semibold text-sm md:text-base ${isCancelada ? 'text-red-600' : 'text-green-600'}`}>
                        {isCancelada ? '-' : '+'}{formatCurrency(venda.getValorFaturado())}
                      </p>
                      <p className="text-xs text-gray-500">Venda #{venda.getNumeroVenda()}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <DetalhesVendas
        vendaId={selectedVendaId || ''}
        open={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}