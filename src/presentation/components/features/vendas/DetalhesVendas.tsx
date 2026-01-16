'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { MdClose, MdRestaurant, MdAttachMoney } from 'react-icons/md'
import { CircularProgress } from '@mui/material'
import { showToast } from '@/src/shared/utils/toast'
import { TipoVendaIcon } from './TipoVendaIcon'

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
  isTefUsed?: boolean; // Adicionado
  isTefConfirmed?: boolean; // Adicionado
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
   * Formata valor numérico sem símbolo de moeda (para uso entre parênteses)
   */
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
    async (usuarioId: string): Promise<string | null> => {
      const token = auth?.getAccessToken()
      if (!token) return null

      try {
        const response = await fetch(`/api/usuarios/${usuarioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) return null

        const data = await response.json()
        return data.nome || data.name || null
      } catch (error) {
        console.error('Erro ao buscar nome do usuário:', error)
        return null
      }
    },
    [auth]
  )

  /**
   * Busca detalhes do meio de pagamento
   */
  const fetchMeioPagamento = useCallback(
    async (meioId: string): Promise<MeioPagamentoDetalhes | null> => {
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
        return meio
      } catch (error) {
        console.error('Erro ao buscar meio de pagamento:', error)
        return null
      }
    },
    [auth]
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
   * Calcula valor total de um complemento
   */
  const calcularValorComplemento = (complemento: Complemento): number => {
    return complemento.valorUnitario * complemento.quantidade
  }

  /**
   * Calcula valor total de um produto com descontos e acréscimos
   * NOTA: Não inclui complementos no cálculo - eles são exibidos separadamente
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

    // Complementos NÃO são incluídos aqui - são exibidos separadamente abaixo do valor do produto

    return valor
  }

  /**
   * Busca detalhes da venda
   */
  const fetchVendaDetalhes = useCallback(async () => {
    if (!vendaId || !open) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Usuário não autenticado.')
      onClose() // Fecha o modal se não houver token
      return
    }

    setIsLoading(true)
    setVenda(null) // Limpa venda anterior para evitar exibição de dados antigos durante o carregamento
    setNomeCliente(null) // Limpa cliente anterior
    setNomesUsuarios({}) // Limpa usuários anteriores
    setNomesMeiosPagamento({}) // Limpa meios de pagamento anteriores

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

      const data: VendaDetalhes = await response.json()
      setVenda(data)

      // Coleta todos os IDs de usuários únicos que precisam ser buscados
      const userIdsToFetch = new Set<string>()
      if (data.abertoPorId) userIdsToFetch.add(data.abertoPorId)
      if (data.canceladoPorId) userIdsToFetch.add(data.canceladoPorId)
      if (data.ultimoResponsavelId) userIdsToFetch.add(data.ultimoResponsavelId)
      data.produtosLancados?.forEach((p) => {
        if (p.lancadoPorId) userIdsToFetch.add(p.lancadoPorId)
      })
      data.pagamentos?.forEach((p) => {
        if (p.realizadoPorId) userIdsToFetch.add(p.realizadoPorId)
      })

      // Coleta todos os IDs de meios de pagamento únicos que precisam ser buscados
      const meioIdsToFetch = new Set<string>()
      data.pagamentos?.forEach((p) => {
        if (p.meioPagamentoId) meioIdsToFetch.add(p.meioPagamentoId)
      })

      // Executa todas as buscas de dados auxiliares em paralelo
      const [userNamesResolved, meioPagamentoResolved, clienteNomeResult] = await Promise.all([
        Promise.all(Array.from(userIdsToFetch).map((id) => fetchUsuarioNome(id))),
        Promise.all(Array.from(meioIdsToFetch).map((id) => fetchMeioPagamento(id))),
        data.clienteId ? fetchClienteNome(data.clienteId) : Promise.resolve(null),
      ])

      // Constrói e atualiza o estado de nomes de usuários
      const finalNomesUsuarios: Record<string, string> = {}
      Array.from(userIdsToFetch).forEach((id, index) => {
        const nome = userNamesResolved[index]
        if (nome) {
          finalNomesUsuarios[id] = nome
        }
      })
      setNomesUsuarios(finalNomesUsuarios)

      // Constrói e atualiza o estado de meios de pagamento
      const finalNomesMeiosPagamento: Record<string, MeioPagamentoDetalhes> = {}
      Array.from(meioIdsToFetch).forEach((id, index) => {
        const meio = meioPagamentoResolved[index]
        if (meio) {
          finalNomesMeiosPagamento[id] = meio
        }
      })
      setNomesMeiosPagamento(finalNomesMeiosPagamento)

      if (clienteNomeResult) {
        setNomeCliente(clienteNomeResult)
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error)
      showToast.error('Erro ao buscar detalhes da venda')
      setVenda(null) // Garante que a venda é limpa em caso de erro
      onClose() // Fecha o modal em caso de erro grave para evitar loop infinito
    } finally {
      setIsLoading(false)
    }
  }, [vendaId, open, auth, fetchUsuarioNome, fetchMeioPagamento, fetchClienteNome, onClose])

  useEffect(() => {
    if (open && vendaId) {
      fetchVendaDetalhes()
    } else {
      // Quando o modal é fechado ou vendaId é nulo, limpa os estados
      setVenda(null)
      setNomeCliente(null)
      setNomesUsuarios({}) // Limpa cache de usuários
      setNomesMeiosPagamento({}) // Limpa cache de meios de pagamento
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
        <div className="bg-primary rounded-t-lg px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 justify-center">
            {venda && (
              <TipoVendaIcon
                tipoVenda={venda.tipoVenda}
                numeroMesa={venda.numeroMesa}
                className="flex-shrink-0"
                corPrincipal="#FFFFFF"
                corSecundaria="rgba(255, 255, 255, 0.3)"
                corTexto="var(--color-primary-text)"
                corBorda="rgba(255, 255, 255, 0.5)"
                corFundo="var(--color-primary-background)"
                corBalcao="var(--color-info)"
              />
            )}
            <div className="flex flex-col">
              <span className="text-white text-xl font-exo font-bold">
                Venda Nº. {venda?.numeroVenda}
              </span>
              <span className="text-white text-lg font-nunito">#{venda?.codigoVenda}</span>
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
        <div className="flex-1 overflow-y-auto px-4 py-2 bg-info">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress />
            </div>
          ) : venda ? (
            <>
              {/* Card Informações da Venda */}
              <div className="mb-2 p-2">
                <h2 className="text-lg font-bold font-exo text-primary-text">
                  Informações da Venda
                </h2>
                <div className="border-t border-dashed border-gray-400 mb-2"></div>

                <div className="space-y-2">
                  {/* Status */}
                  <div className={`flex justify-between px-3 py-2 rounded-lg ${statusColor} text-white text-sm font-nunito`}>
                    Status: <span className="font-semibold">{statusVenda}</span>
                  </div>

                  {/* Aberto por */}
                  <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                    <span>
                      Aberto por: 
                    </span>
                    <span>{nomesUsuarios[venda.abertoPorId] || venda.abertoPorId}</span>
                  </div>

                  {/* Finalizado Por */}
                  {venda.ultimoResponsavelId && (
                    <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                      <span>
                        Finalizado Por: 
                      </span>
                      <span>{nomesUsuarios[venda.ultimoResponsavelId] || venda.ultimoResponsavelId}</span>
                    </div>
                  )}

                  {/* Cancelado Por */}
                  {venda.canceladoPorId && (
                    <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                      <span>
                        Cancelado Por: 
                      </span>
                      <span>{nomesUsuarios[venda.canceladoPorId] || venda.canceladoPorId}</span>
                    </div>
                  )}

                  {/* Código do Terminal */}
                  <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                    <span>
                      Código do Terminal: 
                    </span>
                    <span>#{venda.codigoTerminal}</span>
                  </div>

                  {/* Data/Hora de Criação */}
                  <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                    <span>
                      Data/Hora de Criação: 
                    </span>
                    <span>{formatDateTime(venda.dataCriacao)}</span>
                  </div>

                  {/* Data/Hora de Finalização */}
                  {venda.dataFinalizacao && (
                    <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                      <span>
                        Data/Hora de Finalização: 
                      </span>
                      <span>{formatDateTime(venda.dataFinalizacao)}</span>
                    </div>
                  )}

                  {/* Cliente Vinculado */}
                  {venda.clienteId && nomeCliente && (
                    <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                      <span>
                        Cliente Vinculado: 
                      </span>
                      <span>{nomeCliente}</span>
                    </div>
                  )}

                  {/* Identificação da Venda */}
                  {venda.identificacao && (
                    <div className="flex justify-between text-sm text-primary-text font-nunito px-3 rounded-lg bg-white">
                      <span>
                        Identificação da Venda: 
                      </span>
                      <span>{venda.identificacao}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Produtos Lançados */}
              <div className="mb-2 p-2">
                <h2 className="text-lg font-bold font-exo text-primary-text">
                  Produtos Lançados
                </h2>
                <div className="border-t border-dashed border-gray-400 mb-2"></div>

                <div className="space-y-2">
                  {venda.produtosLancados?.map((produto, index) => {
                    const valorTotal = calcularValorProduto(produto)
                    const isRemovido = produto.removido

                    return (
                      <div
                        key={index}
                        className={`px-3 rounded-lg ${
                          isRemovido ? 'bg-error/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {/* Linha do produto principal */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-2 items-center gap-2">
                              <span className="text-sm font-semibold text-primary-text font-nunito">
                                {produto.quantidade}x {produto.nomeProduto} ({formatNumber(produto.valorUnitario)})
                              </span>
                            </div>
                            {/* Se tem acréscimo ou desconto maior que 0, mostra na mesma linha */}
                            {(() => {
                              const acrescimoValue = produto.acrescimo 
                                ? (typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo)
                                : 0
                              const descontoValue = produto.desconto
                                ? (typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto)
                                : 0
                              
                              if (acrescimoValue > 0) {
                                const valorExibir = produto.tipoAcrescimo === 'porcentagem' 
                                  ? `${Math.round(acrescimoValue * 100)}%` 
                                  : formatNumber(acrescimoValue)
                                return (
                                  <div className="flex-1 flex justify-start text-xs text-secondary-text font-nunito">
                                    <span className="text-success">
                                      Acresc. +{valorExibir}
                                    </span>
                                  </div>
                                )
                              }
                              
                              if (descontoValue > 0) {
                                const valorExibir = produto.tipoDesconto === 'porcentagem' 
                                  ? `${Math.round(descontoValue * 100)}%` 
                                  : formatNumber(descontoValue)
                                return (
                                  <div className="flex-1 flex justify-start text-xs text-secondary-text font-nunito">
                                    <span className="text-error">
                                      Desc. -{valorExibir}
                                    </span>
                                  </div>
                                )
                              }
                              
                              return null
                            })()}
                            <div className="flex-1 flex items-center justify-end text-sm font-semibold text-primary-text font-nunito">
                              {formatCurrency(valorTotal)}
                            </div>
                          </div>

                          {/* Linhas dos complementos */}
                          {produto.complementos && produto.complementos.length > 0 && (
                            <div className="space-y-1 ml-7">
                              {produto.complementos.map((complemento, compIndex) => {
                                const valorTotalComplemento = calcularValorComplemento(complemento)
                                const temImpactoPreco = complemento.tipoImpactoPreco !== 'nenhum'
                                const prefix = temImpactoPreco
                                  ? (complemento.tipoImpactoPreco === 'aumenta' ? '+ ' : '- ')
                                  : ''
                                
                                return (
                                  <div key={compIndex} className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-secondary-text font-nunito">
                                      {complemento.quantidade}x {complemento.nomeComplemento}
                                      {temImpactoPreco && ` (${formatNumber(complemento.valorUnitario)})`}
                                    </span>
                                    <div className="text-xs font-semibold text-secondary-text font-nunito">
                                      {temImpactoPreco ? `${prefix}${formatCurrency(valorTotalComplemento)}` : '-'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Informações de lançamento */}
                          <div className="text-xs text-secondary-text mt-1 ml-7">
                            Lançado: {formatDateTime(produto.dataLancamento)} | Usuário:{' '}
                            {nomesUsuarios[produto.lancadoPorId] || produto.lancadoPorId}
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
                <div className="border-t border-dashed border-gray-400 mb-3"></div>

                <div className="space-y-2">
                  {venda.pagamentos
                    ?.filter((p) => {
                      // Regra 1: Se `canceled` for `true`, NÃO exibir o meio de pagamento.
                      if (p.cancelado === true) {
                        return false;
                      }

                      // Regra 2: Se `isTefUsed` for `true` E `isTefConfirmed` for `false`, NÃO exibir.
                      // Tratamos `isTefUsed` e `isTefConfirmed` como false se forem undefined/null para a comparação.
                      const isUsed = p.isTefUsed === true;
                      const isConfirmed = p.isTefConfirmed === true;
                      if (isUsed && !isConfirmed) {
                        return false;
                      }

                      // Regra 3: Em todos os outros casos, EXIBIR o meio de pagamento.
                      // O campo 'tf' (representado por `isTefUsed`) não impede a exibição por si só quando falso,
                      // desde que não caia nas regras de não exibição acima.
                      return true;
                    })
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
                  {venda.troco != null && Number(venda.troco) > 0 && (
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

