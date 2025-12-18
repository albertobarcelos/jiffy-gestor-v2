'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { MdClose, MdRestaurant, MdAttachMoney } from 'react-icons/md'
import { CircularProgress } from '@mui/material'
import { showToast } from '@/src/shared/utils/toast'

// Tipos
interface VendaDetalhes {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa'
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataCancelamento?: string
  dataFinalizacao?: string
  canceladoPorId?: string
  ultimoResponsavelId?: string
  clienteId?: string
  identificacao?: string
  troco?: number
  produtosLancados: ProdutoLancado[]
  pagamentos: Pagamento[]
}

interface ProdutoLancado {
  nomeProduto: string
  quantidade: number
  valorUnitario: number
  desconto?: string | number
  tipoDesconto?: 'porcentagem' | 'fixo'
  acrescimo?: string | number
  tipoAcrescimo?: 'porcentagem' | 'fixo'
  complementos: Complemento[]
  dataLancamento: string
  lancadoPorId: string
  vendaId: string
  removido: boolean
}

interface Complemento {
  nomeComplemento: string
  quantidade: number
  valorUnitario: number
  tipoImpactoPreco: 'aumenta' | 'diminui' | 'nenhum'
}

interface Pagamento {
  meioPagamentoId: string
  valor: number
  dataCriacao: string
  realizadoPorId: string
  canceladoPorId?: string
  cancelado: boolean
}

interface MeioPagamentoDetalhes {
  id: string
  nome: string
  formaPagamentoFiscal?: string
}

interface UsuarioPDVDetalhes {
  id: string
  nome: string
}

interface ClienteDetalhes {
  id: string
  nome: string
}

interface DetalhesVendasProps {
  vendaId: string
  open: boolean
  onClose: () => void
}

/**
 * Modal de detalhes da venda
 * Exibe informações completas da venda, produtos lançados e pagamentos
 */
export function DetalhesVendas({ vendaId, open, onClose }: DetalhesVendasProps) {
  const { auth } = useAuthStore()
  const [venda, setVenda] = useState<VendaDetalhes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({})
  const [nomesMeiosPagamento, setNomesMeiosPagamento] = useState<Record<string, MeioPagamentoDetalhes>>({})
  const [nomeCliente, setNomeCliente] = useState<string | null>(null)

  /**
   * Formata valor como moeda brasileira
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  /**
   * Formata data/hora para exibição
   */
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Busca nome de usuário PDV
   */
  const fetchUsuarioNome = useCallback(
    async (usuarioId: string): Promise<string> => {
      if (nomesUsuarios[usuarioId]) {
        return nomesUsuarios[usuarioId]
      }

      const token = auth?.getAccessToken()
      if (!token) return usuarioId

      try {
        const response = await fetch(`/api/usuarios/${usuarioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return usuarioId

        const data = await response.json()
        const nome = data.nome || data.name || usuarioId
        setNomesUsuarios((prev) => ({ ...prev, [usuarioId]: nome }))
        return nome
      } catch (error) {
        console.error('Erro ao buscar nome do usuário:', error)
        return usuarioId
      }
    },
    [auth, nomesUsuarios]
  )

  /**
   * Busca detalhes do meio de pagamento
   */
  const fetchMeioPagamento = useCallback(
    async (meioId: string): Promise<MeioPagamentoDetalhes | null> => {
      if (nomesMeiosPagamento[meioId]) {
        return nomesMeiosPagamento[meioId]
      }

      const token = auth?.getAccessToken()
      if (!token) return null

      try {
        const response = await fetch(`/api/meios-pagamentos/${meioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return null

        const data = await response.json()
        const meio: MeioPagamentoDetalhes = {
          id: meioId,
          nome: data.nome || data.name || 'Sem nome',
          formaPagamentoFiscal: data.formaPagamentoFiscal || data.formaPagamento || '',
        }
        setNomesMeiosPagamento((prev) => ({ ...prev, [meioId]: meio }))
        return meio
      } catch (error) {
        console.error('Erro ao buscar meio de pagamento:', error)
        return null
      }
    },
    [auth, nomesMeiosPagamento]
  )

  /**
   * Busca nome do cliente
   */
  const fetchClienteNome = useCallback(
    async (clienteId: string): Promise<string | null> => {
      const token = auth?.getAccessToken()
      if (!token) return null

      try {
        const response = await fetch(`/api/clientes/${clienteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return null

        const data = await response.json()
        return data.nome || data.name || null
      } catch (error) {
        console.error('Erro ao buscar nome do cliente:', error)
        return null
      }
    },
    [auth]
  )

  /**
   * Calcula valor total de um produto com descontos e acréscimos
   */
  const calcularValorProduto = (produto: ProdutoLancado): number => {
    let valor = produto.valorUnitario * produto.quantidade

    // Aplica desconto
    if (produto.desconto) {
      const descontoValue = typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto
      if (produto.tipoDesconto === 'porcentagem') {
        valor -= valor * (descontoValue / 100)
      } else {
        valor -= descontoValue
      }
    }

    // Aplica acréscimo
    if (produto.acrescimo) {
      const acrescimoValue = typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo
      if (produto.tipoAcrescimo === 'porcentagem') {
        valor += valor * (acrescimoValue / 100)
      } else {
        valor += acrescimoValue
      }
    }

    // Aplica complementos
    produto.complementos.forEach((complemento) => {
      const valorComplemento = complemento.valorUnitario * complemento.quantidade
      if (complemento.tipoImpactoPreco === 'aumenta') {
        valor += valorComplemento
      } else if (complemento.tipoImpactoPreco === 'diminui') {
        valor -= valorComplemento
      }
    })

    return valor
  }

  /**
   * Busca detalhes da venda
   */
  const fetchVendaDetalhes = useCallback(async () => {
    if (!vendaId || !open) return

    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/vendas/${vendaId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar detalhes da venda')
      }

      const data = await response.json()
      setVenda(data)

      // Busca nomes de usuários únicos
      const usuarioIds = new Set<string>()
      if (data.abertoPorId) usuarioIds.add(data.abertoPorId)
      if (data.canceladoPorId) usuarioIds.add(data.canceladoPorId)
      if (data.ultimoResponsavelId) usuarioIds.add(data.ultimoResponsavelId)
      data.produtosLancados?.forEach((p: ProdutoLancado) => {
        if (p.lancadoPorId) usuarioIds.add(p.lancadoPorId)
      })
      data.pagamentos?.forEach((p: Pagamento) => {
        if (p.realizadoPorId) usuarioIds.add(p.realizadoPorId)
      })

      // Busca nomes em paralelo
      await Promise.all(Array.from(usuarioIds).map((id) => fetchUsuarioNome(id)))

      // Busca meios de pagamento únicos
      const meioIds = new Set<string>()
      data.pagamentos?.forEach((p: Pagamento) => {
        if (p.meioPagamentoId) meioIds.add(p.meioPagamentoId)
      })

      await Promise.all(Array.from(meioIds).map((id) => fetchMeioPagamento(id)))

      // Busca nome do cliente se existir
      if (data.clienteId) {
        const clienteNome = await fetchClienteNome(data.clienteId)
        if (clienteNome) {
          setNomeCliente(clienteNome)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error)
      showToast.error('Erro ao buscar detalhes da venda')
    } finally {
      setIsLoading(false)
    }
  }, [vendaId, open, auth, fetchUsuarioNome, fetchMeioPagamento, fetchClienteNome])

  useEffect(() => {
    if (open && vendaId) {
      fetchVendaDetalhes()
    } else {
      setVenda(null)
      setNomeCliente(null)
    }
  }, [open, vendaId, fetchVendaDetalhes])

  if (!open) return null

  const statusVenda = venda?.canceladoPorId
    ? 'CANCELADA'
    : venda?.dataFinalizacao
      ? 'FINALIZADA'
      : 'EM ABERTO'

  const statusColor =
    statusVenda === 'CANCELADA'
      ? 'bg-error'
      : statusVenda === 'FINALIZADA'
        ? 'bg-success'
        : 'bg-warning'

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-container': {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '22px',
          maxWidth: '620px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* AppBar */}
        <div className="bg-primary rounded-t-[20px] px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            {venda?.tipoVenda === 'mesa' ? (
              <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{venda.numeroMesa}</span>
              </div>
            ) : (
              <span className="text-white text-xl">🍺</span>
            )}
            <div className="flex flex-col">
              <span className="text-white text-sm font-exo font-bold">
                Venda Nº. {venda?.numeroVenda}
              </span>
              <span className="text-white text-xs font-nunito">#{venda?.codigoVenda}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-info">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress />
            </div>
          ) : venda ? (
            <>
              {/* Card Informações da Venda */}
              <div className="mb-4">
                <h2 className="text-lg font-bold font-exo text-primary-text mb-2">
                  Informações da Venda
                </h2>
                <div className="border-t border-dashed border-gray-300 mb-3"></div>

                <div className="space-y-2">
                  {/* Status */}
                  <div className={`px-3 py-2 rounded-lg ${statusColor} text-white text-sm font-nunito`}>
                    Status: {statusVenda}
                  </div>

                  {/* Aberto por */}
                  <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                    <span className="text-sm text-primary-text font-nunito">
                      Aberto por: {nomesUsuarios[venda.abertoPorId] || venda.abertoPorId}
                    </span>
                  </div>

                  {/* Finalizado Por */}
                  {venda.ultimoResponsavelId && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm text-primary-text font-nunito">
                        Finalizado Por: {nomesUsuarios[venda.ultimoResponsavelId] || venda.ultimoResponsavelId}
                      </span>
                    </div>
                  )}

                  {/* Cancelado Por */}
                  {venda.canceladoPorId && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm text-primary-text font-nunito">
                        Cancelado Por: {nomesUsuarios[venda.canceladoPorId] || venda.canceladoPorId}
                      </span>
                    </div>
                  )}

                  {/* Código do Terminal */}
                  <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                    <span className="text-sm text-primary-text font-nunito">
                      Código do Terminal: #{venda.codigoTerminal}
                    </span>
                  </div>

                  {/* Data/Hora de Criação */}
                  <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                    <span className="text-sm text-primary-text font-nunito">
                      Data/Hora de Criação: {formatDateTime(venda.dataCriacao)}
                    </span>
                  </div>

                  {/* Data/Hora de Finalização */}
                  {venda.dataFinalizacao && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm text-primary-text font-nunito">
                        Data/Hora de Finalização: {formatDateTime(venda.dataFinalizacao)}
                      </span>
                    </div>
                  )}

                  {/* Cliente Vinculado */}
                  {venda.clienteId && nomeCliente && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm text-primary-text font-nunito">
                        Cliente Vinculado: {nomeCliente}
                      </span>
                    </div>
                  )}

                  {/* Identificação da Venda */}
                  {venda.identificacao && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm text-primary-text font-nunito">
                        Identificação da Venda: {venda.identificacao}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Produtos Lançados */}
              <div className="mb-4">
                <h2 className="text-lg font-bold font-exo text-primary-text mb-2">
                  Produtos Lançados
                </h2>
                <div className="border-t border-dashed border-gray-300 mb-3"></div>

                <div className="space-y-2">
                  {venda.produtosLancados?.map((produto, index) => {
                    const valorTotal = calcularValorProduto(produto)
                    const isRemovido = produto.removido

                    return (
                      <div
                        key={index}
                        className={`px-3 py-2 rounded-lg shadow-sm ${
                          isRemovido ? 'bg-error/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MdRestaurant className="text-primary mt-1 flex-shrink-0" size={20} />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <span className="text-sm font-semibold text-primary-text font-nunito">
                                  {produto.quantidade}x {produto.nomeProduto}
                                </span>
                                <div className="text-xs text-secondary-text mt-1">
                                  {formatCurrency(produto.valorUnitario)} cada
                                  {produto.desconto && (
                                    <span className="ml-2 text-error">
                                      - Desconto: {produto.tipoDesconto === 'porcentagem' ? `${produto.desconto}%` : formatCurrency(typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto)}
                                    </span>
                                  )}
                                  {produto.acrescimo && (
                                    <span className="ml-2 text-success">
                                      + Acréscimo: {produto.tipoAcrescimo === 'porcentagem' ? `${produto.acrescimo}%` : formatCurrency(typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo)}
                                    </span>
                                  )}
                                </div>
                                {produto.complementos && produto.complementos.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {produto.complementos.map((complemento, compIndex) => {
                                      const prefix =
                                        complemento.tipoImpactoPreco === 'aumenta'
                                          ? '+ '
                                          : complemento.tipoImpactoPreco === 'diminui'
                                            ? '- '
                                            : ''
                                      return (
                                        <div key={compIndex} className="text-xs text-secondary-text">
                                          {prefix}
                                          {complemento.quantidade}x {complemento.nomeComplemento} (
                                          {formatCurrency(complemento.valorUnitario)})
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                                <div className="text-xs text-secondary-text mt-1">
                                  Lançado: {formatDateTime(produto.dataLancamento)} | Usuário:{' '}
                                  {nomesUsuarios[produto.lancadoPorId] || produto.lancadoPorId}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-primary-text font-nunito">
                                {formatCurrency(valorTotal)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Total da Venda */}
                  <div className="px-3 py-2 rounded-lg bg-primary/10 border-2 border-primary">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-primary-text font-nunito">
                        Total da Venda:
                      </span>
                      <span className="text-base font-bold text-primary font-nunito">
                        {formatCurrency(venda.valorFinal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Pagamentos Realizados */}
              <div className="mb-4">
                <h2 className="text-lg font-bold font-exo text-primary-text mb-2">
                  Pagamentos Realizados
                </h2>
                <div className="border-t border-dashed border-gray-300 mb-3"></div>

                <div className="space-y-2">
                  {venda.pagamentos
                    ?.filter((p) => !p.cancelado)
                    .map((pagamento, index) => {
                      const meio = nomesMeiosPagamento[pagamento.meioPagamentoId]
                      const formaPagamento = meio?.formaPagamentoFiscal || ''

                      const getIcon = () => {
                        if (formaPagamento.toLowerCase().includes('dinheiro')) return '💵'
                        if (formaPagamento.toLowerCase().includes('credito') || formaPagamento.toLowerCase().includes('debito')) return '💳'
                        if (formaPagamento.toLowerCase().includes('pix')) return '📱'
                        return '💳'
                      }

                      return (
                        <div key={index} className="px-3 py-2 rounded-lg bg-[#4BD08A] flex items-center gap-3">
                          <div className="w-[68px] h-[62px] rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-2xl">{getIcon()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-primary-text font-nunito">
                              {meio?.nome || 'Meio de pagamento desconhecido'}
                            </div>
                            <div className="text-xs text-secondary-text font-nunito">
                              {formatDateTime(pagamento.dataCriacao)}
                            </div>
                            <div className="text-sm font-bold text-primary-text font-nunito">
                              {formatCurrency(pagamento.valor)}
                            </div>
                            <div className="text-xs text-secondary-text font-nunito">
                              PDV Resp.: {nomesUsuarios[pagamento.realizadoPorId] || pagamento.realizadoPorId}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                  {/* Troco */}
                  {venda.troco && venda.troco > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm font-semibold text-primary-text font-nunito">
                        Troco: {formatCurrency(venda.troco)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center py-12">
              <p className="text-secondary-text">Erro ao carregar detalhes da venda.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

