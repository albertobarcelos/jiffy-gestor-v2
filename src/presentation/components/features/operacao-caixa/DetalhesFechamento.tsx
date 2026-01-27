'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { MdClose } from 'react-icons/md'
import { CircularProgress } from '@mui/material'
import { showToast } from '@/src/shared/utils/toast'

// Tipos
interface OperacaoCaixaDetalhada {
  id: string
  status: 'aberto' | 'fechado'
  empresaId?: string
  abertoPorId?: string
  terminalId?: string
  codigoTerminal?: string
  nomeTerminal?: string
  dataAbertura: string
  fechadoPorId?: string
  nomeResponsavelFechamento?: string
  dataFechamento?: string
  nomeEmpresa?: string
  resumoFechamento?: {
    responsavelFechamento?: string
    dataFechamento?: string
    tempoOperacaoInSeconds?: number
    valorFornecido?: number
    diferencaValorFornecidoEValorCaixa?: number
  }
  resumoOperacao?: {
    totalProdutoBruto?: number
    totalDescontoProdutos?: number
    totalAcrescimoProdutos?: number
    totalComplementoAumenta?: number
    totalComplementoDiminui?: number
    totalLiquido?: number
  }
  resumoPagamentos?: {
    meiosPagamento?: Array<{
      nomeMeioPagamento?: string
      valorContabilizado?: number
    }>
    totalTroco?: number
    totalLiquido?: number
    totalDinheiro?: number
  }
  resumoCaixa?: {
    totalDinheiro?: number
    totalSangria?: number
    totalSuprimento?: number
    totalTroco?: number
    valorLiquidoDinheiroCaixa?: number
  }
  totalProdutosVendidos?: Array<{
    quantidade?: number
    nome?: string
    valorLiquidoFinal?: number
  }>
  totalAdicionaisVendidos?: Array<{
    quantidade?: number
    nome?: string
    valorLiquidoFinal?: number
  }>
}

interface DetalhesFechamentoProps {
  idOperacaoCaixa: string
  open: boolean
  onClose: () => void
}

/**
 * Modal de detalhes de fechamento de caixa
 * Exibe informações completas em formato de cupom fiscal
 */
export function DetalhesFechamento({ idOperacaoCaixa, open, onClose }: DetalhesFechamentoProps) {
  const { auth } = useAuthStore()
  const [operacaoCaixa, setOperacaoCaixa] = useState<OperacaoCaixaDetalhada | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Formata valor como moeda brasileira
   */
  const formatMoney = (value: number | null | undefined): string => {
    if (value == null || value === undefined) return '0,00'
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  /**
   * Formata duração em segundos para formato XXh XXm XXs
   */
  const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds == null || seconds === undefined) return 'N/A'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const pad = (n: number): string => n.toString().padStart(2, '0')

    return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`
  }

  /**
   * Formata diferença com sinal + ou -
   */
  const formatDifference = (difference: number | null | undefined): string => {
    if (difference == null || difference === undefined) return 'R$ 0,00'

    const absValue = Math.abs(difference)
    const formatted = formatMoney(absValue)

    if (difference > 0) {
      return `+ R$ ${formatted}`
    } else if (difference < 0) {
      return `- R$ ${formatted}`
    } else {
      return `R$ ${formatted}`
    }
  }

  /**
   * Formata data/hora para exibição
   */
  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'

    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')

      return `${day}/${month}/${year} ${hours}:${minutes}`
    } catch (e) {
      console.error('Erro ao formatar data:', dateString, e)
      return 'N/A'
    }
  }

  /**
   * Busca detalhes da operação de caixa
   */
  const fetchDetalhesOperacaoCaixa = async () => {
    if (!idOperacaoCaixa || !open) return

    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/caixa/operacao-caixa-terminal/${idOperacaoCaixa}?tipoRetorno=detalhado`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar detalhes da operação de caixa')
      }

      const data = await response.json()
      console.log('Detalhes operação caixa:', data)
      console.log('resumoFechamento:', data.resumoFechamento)
      console.log('resumoCaixa:', data.resumoCaixa)
      setOperacaoCaixa(data)
    } catch (error) {
      console.error('Erro ao buscar detalhes da operação de caixa:', error)
      showToast.error('Erro ao buscar detalhes da operação de caixa')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && idOperacaoCaixa) {
      fetchDetalhesOperacaoCaixa()
    } else {
      setOperacaoCaixa(null)
    }
  }, [open, idOperacaoCaixa])

  if (!open) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
      fullWidth
      maxWidth={false}
      sx={{
        '& .MuiDialog-container': {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
          display: 'flex',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          width: { xs: '95vw', sm: '88vw', md: '80vw' },
          maxWidth: { xs: '95vw', sm: '720px', md: '820px' },
          margin: { xs: 0, sm: '0 auto' },
          maxHeight: '90vh',
          backgroundColor: '#FFFFD9',
          fontFamily: "'Roboto Mono', 'Courier New', monospace",
          color: '#000000',
        },
      }}
    >
      <DialogContent sx={{ p: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="h-16 bg-[#FFFFD9] flex items-center justify-end px-4">
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-black hover:bg-black/10 rounded transition-colors"
          >
            <MdClose size={26} />
          </button>
        </div>

        {/* Conteúdo */}
        <div
          className="flex-1 overflow-y-auto px-4 pb-4 bg-[#FFFFD9] text-xs md:text-sm"
          style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <img
                src="/images/jiffy-loading.gif"
                alt="Carregando"
                className="w-20 object-contain"
              />
              <span className="text-sm font-medium font-nunito text-primary-text">Carregando...</span>
            </div>
          ) : operacaoCaixa ? (
            <>
              {/* Título Principal */}
              <h2 className="text-sm md:text-lg font-bold mb-2">
                FECHAMENTO TERMINAL - #{operacaoCaixa.codigoTerminal || operacaoCaixa.nomeTerminal || 'N/A'}
              </h2>

              {/* Divisor */}
              <div className="h-[1px] bg-primary-text/50 my-2"></div>

              {/* Informações Básicas */}
              <div className="space-y-1 text-sm mb-2">
                <div>Empresa: {operacaoCaixa.nomeEmpresa || 'N/A'}</div>
                <div>Responsável: {operacaoCaixa.nomeResponsavelFechamento || operacaoCaixa.resumoFechamento?.responsavelFechamento || 'N/A'}</div>
                <div>Data aber.: {formatDateTime(operacaoCaixa.dataAbertura)}</div>
                <div>Data fech.: {formatDateTime(operacaoCaixa.dataFechamento || operacaoCaixa.resumoFechamento?.dataFechamento)}</div>
                <div>Tempo op.: {formatDuration(operacaoCaixa.resumoFechamento?.tempoOperacaoInSeconds)}</div>
              </div>

              {/* Divisor */}
              <div className="h-[1px] bg-primary-text/50 my-2"></div>

              {/* RESUMO VENDAS */}
              {operacaoCaixa.resumoOperacao && (
                <>
                  <h3 className="text-sm md:text-lg font-bold mt-2 mb-1">RESUMO VENDAS</h3>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>Campo</th>
                        <th className="text-right py-1 text-sm font-bold" style={{ padding: '4px' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. VENDA PROD.</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoOperacao.totalProdutoBruto)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. DESC.</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoOperacao.totalDescontoProdutos)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. ACRES.</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoOperacao.totalAcrescimoProdutos)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. ADICIONAIS</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoOperacao.totalComplementoAumenta)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. REMOÇÕES</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoOperacao.totalComplementoDiminui)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                  <div className="text-right text-sm md:text-lg font-bold mb-2">
                    FAT. LIQUIDO: R$ {formatMoney(operacaoCaixa.resumoOperacao.totalLiquido)}
                  </div>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                </>
              )}

              {/* RESUMO PAGAMENTOS */}
              {operacaoCaixa.resumoPagamentos && (
                <>
                  <h3 className="text-sm md:text-lg font-bold mt-2 mb-1">RESUMO PAGAMENTOS</h3>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>Meio de Pagamento</th>
                        <th className="text-right py-1 text-sm font-bold" style={{ padding: '4px' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operacaoCaixa.resumoPagamentos.meiosPagamento?.map((meio, index) => (
                        <tr key={index}>
                          <td style={{ padding: '4px' }}>{meio.nomeMeioPagamento || 'N/A'}</td>
                          <td className="text-right" style={{ padding: '4px' }}>
                            R$ {formatMoney(meio.valorContabilizado)}
                          </td>
                        </tr>
                      ))}
                      {operacaoCaixa.resumoPagamentos.totalTroco != null &&
                        operacaoCaixa.resumoPagamentos.totalTroco > 0 && (
                          <tr>
                            <td style={{ padding: '4px' }}>TOT. TROCO</td>
                            <td className="text-right" style={{ padding: '4px' }}>
                              -R$ {formatMoney(operacaoCaixa.resumoPagamentos.totalTroco)}
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                  <div className="text-right text-sm md:text-lg font-bold mb-2">
                    TOT. LIQUIDO: R$ {formatMoney(operacaoCaixa.resumoPagamentos.totalLiquido)}
                  </div>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                </>
              )}

              {/* RESUMO CAIXA */}
              {operacaoCaixa.resumoCaixa && (
                <>
                  <h3 className="text-sm md:text-lg font-bold mt-2 mb-1">RESUMO CAIXA</h3>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>Campo</th>
                        <th className="text-right py-1 text-sm font-bold" style={{ padding: '4px' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px' }}>RECEBIMENTOS EM DIN.</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoPagamentos?.totalDinheiro || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. SANGRIAS</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          -R$ {formatMoney(operacaoCaixa.resumoCaixa.totalSangria)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. SUPRIMENTOS</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          +R$ {formatMoney(operacaoCaixa.resumoCaixa.totalSuprimento)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px' }}>TOT. TROCO</td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          -R$ {formatMoney(operacaoCaixa.resumoPagamentos?.totalTroco || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                  <div className="text-right text-sm md:text-lg font-bold mb-2">
                    TOT. CAIXA: R$ {formatMoney(operacaoCaixa.resumoCaixa.valorLiquidoDinheiroCaixa)}
                  </div>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                </>
              )}

              {/* CONFERÊNCIA CAIXA */}
              {(operacaoCaixa.resumoFechamento || operacaoCaixa.resumoCaixa) && (
                <>
                  <h3 className="text-sm md:text-lg font-bold mt-2 mb-1">CONFERÊNCIA CAIXA</h3>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>CONT.</th>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>FORN.</th>
                        <th className="text-right py-1 text-sm font-bold" style={{ padding: '4px' }}>DIF.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoCaixa?.valorLiquidoDinheiroCaixa)}
                        </td>
                        <td style={{ padding: '4px' }}>
                          R$ {formatMoney(operacaoCaixa.resumoFechamento?.valorFornecido)}
                        </td>
                        <td className="text-right" style={{ padding: '4px' }}>
                          {formatDifference(operacaoCaixa.resumoFechamento?.diferencaValorFornecidoEValorCaixa)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                </>
              )}

              {/* PRODUTOS VENDIDOS */}
              {operacaoCaixa.totalProdutosVendidos && operacaoCaixa.totalProdutosVendidos.length > 0 && (
                <>
                  <h3 className="text-sm md:text-lg font-bold mt-2 mb-1">PRODUTOS VENDIDOS</h3>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>Produtos</th>
                        <th className="text-right py-1 text-sm font-bold" style={{ padding: '4px' }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operacaoCaixa.totalProdutosVendidos.map((produto, index) => (
                        <tr key={index}>
                          <td style={{ padding: '4px' }}>
                            {produto.quantidade || 0}x {produto.nome || 'N/A'}
                          </td>
                          <td className="text-right" style={{ padding: '4px' }}>
                            R$ {formatMoney(produto.valorLiquidoFinal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="h-[0.5px] bg-black/54 my-2"></div>
                </>
              )}

              {/* ADICIONAIS VENDIDOS */}
              {operacaoCaixa.totalAdicionaisVendidos && operacaoCaixa.totalAdicionaisVendidos.length > 0 && (
                <>
                  <h3 className="text-sm md:text-lg font-bold mt-2 mb-1">ADICIONAIS VENDIDOS</h3>
                  <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left py-1 text-sm font-bold" style={{ padding: '4px' }}>Adicionais</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operacaoCaixa.totalAdicionaisVendidos.map((adicional, index) => (
                        <tr key={index}>
                          <td style={{ padding: '4px' }}>
                            {adicional.quantidade || 0}x {adicional.nome || 'N/A'}
                          </td>
                         
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="h-[1px] bg-primary-text/50 my-2"></div>
                </>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center py-12">
              <p className="text-black">Erro ao carregar detalhes da operação de caixa.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

