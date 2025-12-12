'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Venda } from '@/src/domain/entities/Venda'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { MdVisibility, MdClose, MdCancel } from 'react-icons/md'

/**
 * Componente de Últimas Vendas
 * Design clean inspirado no exemplo
 */
export function UltimasVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [vendaCanceladaSelecionada, setVendaCanceladaSelecionada] = useState<Venda | null>(null)
  const [dialogAberto, setDialogAberto] = useState(false)
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
        
        // Buscar vendas (incluindo canceladas, mas filtrar apenas FINALIZADAS no frontend)
        // A API deve retornar ordenadas por data (mais recentes primeiro)
        const params = new URLSearchParams({
          limit: '30', // Buscar mais para garantir que temos 10 finalizadas após filtro
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
        
        // A API retorna apenas abertoPorId (ID), não o nome do usuário
        // Precisamos buscar os nomes dos usuários usando os IDs
        const vendas = data.items || []
        
        // Coletar todos os IDs únicos de usuários
        const usuariosIds = Array.from(
          new Set(
            vendas
              .map((venda: any) => venda.abertoPorId)
              .filter((id: any): id is string => Boolean(id)) // Remove undefined/null e garante tipo string
          )
        ) as string[]
        
        // Buscar nomes dos usuários em paralelo
        const usuariosMap = new Map<string, string>()
        
        if (usuariosIds.length > 0) {
          const usuariosPromises = usuariosIds.map(async (usuarioId: string) => {
            try {
              const usuarioResponse = await fetch(
                `${baseUrl}/api/v1/pessoas/usuarios-pdv/${usuarioId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              )
              
              if (usuarioResponse.ok) {
                const usuarioData = await usuarioResponse.json()
                return { id: usuarioId, nome: usuarioData.nome || 'Usuário Desconhecido' }
              }
              return { id: usuarioId, nome: 'Usuário Desconhecido' }
            } catch (error) {
              console.error(`Erro ao buscar usuário ${usuarioId}:`, error)
              return { id: usuarioId, nome: 'Usuário Desconhecido' }
            }
          })
          
          const usuarios = await Promise.all(usuariosPromises)
          usuarios.forEach(({ id, nome }) => {
            usuariosMap.set(id, nome)
          })
        }
        
        // Mapear dados da API para entidade Venda
        const vendasMapeadas: Venda[] = vendas
          .filter((item: any) => {
            // Verificar se está cancelada
            const isCancelada = item.cancelado === true || 
                               item.status === 'CANCELADA' || 
                               item.status === 'CANCELADO' ||
                               item.statusCancelado === true
            
            // Verificar se está FINALIZADA (não em aberto)
            // Critérios rigorosos para garantir que está finalizada:
            // 1. Status explícito como FINALIZADA/FINALIZADO
            // 2. OU tem dataFinalizacao preenchida (não nula)
            // 3. E NÃO está em status PENDENTE, ABERTA, EM_ABERTO, etc.
            const statusFinalizado = item.status === 'FINALIZADA' || 
                                    item.status === 'FINALIZADO' ||
                                    item.status === 'FINALIZAR'
            
            const temDataFinalizacao = item.dataFinalizacao !== null && 
                                      item.dataFinalizacao !== undefined &&
                                      item.dataFinalizacao !== ''
            
            const statusAberto = item.status === 'PENDENTE' || 
                                item.status === 'ABERTA' || 
                                item.status === 'ABERTO' ||
                                item.status === 'EM_ABERTO' ||
                                item.status === 'EM_ABERTA' ||
                                item.status === 'INICIADA' ||
                                item.status === 'INICIADO'
            
            // Venda está finalizada se:
            // - Tem status FINALIZADA OU tem dataFinalizacao
            // - E não está em status aberto
            const isFinalizada = (statusFinalizado || temDataFinalizacao) && !statusAberto
            
            // Retornar vendas que:
            // 1. Estão FINALIZADAS (não em aberto) - pode incluir canceladas que foram finalizadas antes de cancelar
            // 2. OU estão CANCELADAS (mesmo que não tenham dataFinalizacao, se está cancelada, deve aparecer)
            return isFinalizada || isCancelada
          })
          .map((item: any) => {
            // Buscar nome do usuário usando o mapa
            const usuario = item.abertoPorId 
              ? usuariosMap.get(item.abertoPorId) || 'Usuário Desconhecido'
              : 'Usuário Desconhecido'
            
            // Mapear data da venda (priorizar dataFinalizacao, depois dataCriacao)
            const dataVenda = item.dataFinalizacao ? new Date(item.dataFinalizacao) :
                             item.dataCriacao ? new Date(item.dataCriacao) : 
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
            
            // Determinar status corretamente
            const isCancelada = item.cancelado === true || 
                               item.status === 'CANCELADA' || 
                               item.status === 'CANCELADO' ||
                               item.statusCancelado === true
            
            const status = isCancelada ? 'Cancelada' : 'Aprovada'

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

        // Ordenar vendas por data (mais recentes primeiro) caso a API não retorne ordenado
        vendasMapeadas.sort((a, b) => {
          const dataA = a.getData().getTime()
          const dataB = b.getData().getTime()
          return dataB - dataA // Ordem decrescente (mais recente primeiro)
        })

        // Limitar a 10 vendas mais recentes
        setVendas(vendasMapeadas.slice(0, 10))
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

  // Handler para abrir dialog quando venda cancelada for clicada
  const handleVendaCanceladaClick = (venda: Venda, e: React.MouseEvent) => {
    e.preventDefault()
    setVendaCanceladaSelecionada(venda)
    setDialogAberto(true)
  }

  const fecharDialog = () => {
    setDialogAberto(false)
    setVendaCanceladaSelecionada(null)
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
        <span className="text-sm text-gray-500">Mais recentes</span>
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
                  {venda.isCancelada() ? (
                    <>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(venda.getValorFaturado())}
                      </p>
                      <p className="text-xs text-red-500 flex items-center justify-end gap-1">
                        <MdCancel className="w-3 h-3" />
                        Cancelada
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(venda.getValorFaturado())}
                      </p>
                      <p className="text-xs text-gray-500">Venda #{venda.getNumeroVenda()}</p>
                    </>
                  )}
                </div>
                
                {/* Ícone de olho para ver detalhes */}
                {venda.isCancelada() ? (
                  <button
                    onClick={(e) => handleVendaCanceladaClick(venda, e)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Ver detalhes da venda cancelada"
                  >
                    <MdVisibility className="w-5 h-5" />
                  </button>
                ) : (
                  <Link
                    href={`/relatorios?vendaId=${venda.getId()}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    title="Ver detalhes da venda"
                  >
                    <MdVisibility className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog para detalhes de venda cancelada */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MdCancel className="w-6 h-6 text-red-600" />
            <span>Detalhes da Venda Cancelada</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {vendaCanceladaSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <MdCancel className="w-5 h-5 text-red-600" />
                  <p className="font-semibold text-red-900">Venda Cancelada</p>
                </div>
                <p className="text-sm text-red-700">
                  Esta venda foi cancelada e não pode ser editada.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Número da Venda</p>
                  <p className="text-sm font-semibold text-gray-900">
                    #{vendaCanceladaSelecionada.getNumeroVenda()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Data</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(vendaCanceladaSelecionada.getData())}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Usuário</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {vendaCanceladaSelecionada.getUsuario()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Tipo de Venda</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {vendaCanceladaSelecionada.getTipoVenda()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Método de Pagamento</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {vendaCanceladaSelecionada.getMetodoPagamento()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Valor</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(vendaCanceladaSelecionada.getValorFaturado())}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">ID da Venda</p>
                <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                  {vendaCanceladaSelecionada.getId()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button
            onClick={fecharDialog}
            variant="outlined"
            className="flex items-center gap-2"
          >
            <MdClose className="w-4 h-4" />
            Fechar
          </Button>
          <Button
            onClick={() => {
              fecharDialog()
              window.open(`/relatorios?vendaId=${vendaCanceladaSelecionada?.getId()}`, '_blank')
            }}
            variant="contained"
            className="flex items-center gap-2"
          >
            <MdVisibility className="w-4 h-4" />
            Ver em Relatórios
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

