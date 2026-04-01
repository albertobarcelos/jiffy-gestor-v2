'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { MdClose, MdRestaurant, MdAttachMoney, MdCancel } from 'react-icons/md'
import {
  CircularProgress,
  TextField,
  Button,
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions,
} from '@mui/material'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { TipoVendaIcon } from './TipoVendaIcon'
import { useCancelarVendaGestor } from '@/src/presentation/hooks/useVendas'
import { StatusFiscalBadge } from '@/src/presentation/components/features/nfe/StatusFiscalBadge'

// Tipos
interface VendaDetalhes {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa' | 'gestor'
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataCancelamento?: string
  dataFinalizacao?: string
  canceladoPorId?: string
  ultimoResponsavelId?: string
  statusMesa?: string
  clienteId?: string
  identificacao?: string
  troco?: number
  produtosLancados: ProdutoLancado[]
  pagamentos: Pagamento[]
  // Campos fiscais
  statusVenda?: string | null
  origem?: string | null
  solicitarEmissaoFiscal?: boolean | null
  statusFiscal?: string | null
  documentoFiscalId?: string | null
  retornoSefaz?: string | null
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
  removidoPorId?: string
  dataRemocao?: string
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
  dataCancelamento?: string
  isTefUsed?: boolean // Adicionado
  isTefConfirmed?: boolean // Adicionado
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
  tabelaOrigem?: 'venda' | 'venda_gestor' // Indica de qual tabela buscar
}

/**
 * Modal de detalhes da venda
 * Exibe informações completas da venda, produtos lançados e pagamentos
 */
export function DetalhesVendas({
  vendaId,
  open,
  onClose,
  tabelaOrigem = 'venda',
}: DetalhesVendasProps) {
  const { auth } = useAuthStore()
  const [venda, setVenda] = useState<VendaDetalhes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({})
  const [nomesMeiosPagamento, setNomesMeiosPagamento] = useState<
    Record<string, MeioPagamentoDetalhes>
  >({})
  const [nomeCliente, setNomeCliente] = useState<string | null>(null)

  // Estados para modal de cancelamento
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const cancelarVenda = useCancelarVendaGestor()

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
        // Usa endpoint diferente dependendo da origem da venda
        const endpoint =
          tabelaOrigem === 'venda_gestor'
            ? `/api/pessoas/usuarios-gestor/${usuarioId}`
            : `/api/usuarios/${usuarioId}`

        const response = await fetch(endpoint, {
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
    [auth, tabelaOrigem]
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
  const calcularValorComplemento = useCallback((complemento: Complemento): number => {
    return complemento.valorUnitario * complemento.quantidade
  }, [])

  /**
   * Calcula valor total de um produto com descontos e acréscimos
   * NOTA: Não inclui complementos no cálculo - eles são exibidos separadamente
   * IMPORTANTE: O banco salva porcentagens como decimal (0.1 = 10%), não precisa dividir por 100
   */
  const calcularValorProduto = useCallback((produto: ProdutoLancado): number => {
    let valor = produto.valorUnitario * produto.quantidade

    // Aplica desconto
    if (produto.desconto) {
      const descontoValue =
        typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto
      if (produto.tipoDesconto === 'porcentagem') {
        // O banco salva porcentagem como decimal (0.1 = 10%), então usa diretamente
        valor -= valor * descontoValue
      } else {
        // Desconto fixo: subtrai o valor diretamente
        valor -= descontoValue
      }
    }

    // Aplica acréscimo
    if (produto.acrescimo) {
      const acrescimoValue =
        typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo
      if (produto.tipoAcrescimo === 'porcentagem') {
        // O banco salva porcentagem como decimal (0.1 = 10%), então usa diretamente
        valor += valor * acrescimoValue
      } else {
        // Acréscimo fixo: adiciona o valor diretamente
        valor += acrescimoValue
      }
    }

    // Complementos NÃO são incluídos aqui - são exibidos separadamente abaixo do valor do produto

    return valor
  }, [])

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
      // Determinar endpoint baseado na tabela de origem
      const endpoint =
        tabelaOrigem === 'venda_gestor' ? `/api/vendas/gestor/${vendaId}` : `/api/vendas/${vendaId}`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar detalhes da venda')
      }

      const dataRaw = await response.json()

      // Busca status fiscal atualizado para exibir motivo de rejeição no modal
      let statusFiscal = dataRaw.statusFiscal ?? null
      let documentoFiscalId = dataRaw.documentoFiscalId ?? null
      let retornoSefaz = dataRaw.retornoSefaz ?? null

      // Venda do gestor não possui terminal no modelo atual.
      // Evita warning falso-positivo e tentativa de lookup desnecessária.
      let codigoTerminal = ''
      if (tabelaOrigem === 'venda') {
        // Mapeia os dados da API para o formato esperado, garantindo que campos sejam capturados corretamente
        // Verifica diferentes possíveis estruturas do codigoTerminal na resposta da API
        codigoTerminal =
          dataRaw.codigoTerminal ||
          dataRaw.terminal?.codigo ||
          dataRaw.terminal?.codigoInterno ||
          dataRaw.terminal?.codigoTerminal ||
          dataRaw.terminal?.code ||
          dataRaw.terminalCodigo ||
          dataRaw.codigoInterno ||
          dataRaw.codigo ||
          dataRaw.code ||
          ''
      }

      // Se não encontrou o codigoTerminal e temos terminalId, busca os detalhes do terminal
      if (tabelaOrigem === 'venda' && !codigoTerminal && dataRaw.terminalId) {
        try {
          const terminalResponse = await fetch(`/api/terminais/${dataRaw.terminalId}/detalhes`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (terminalResponse.ok) {
            const terminalData = await terminalResponse.json()
            codigoTerminal =
              terminalData.codigo ||
              terminalData.codigoInterno ||
              terminalData.codigoTerminal ||
              terminalData.code ||
              String(dataRaw.terminalId) ||
              ''
          }
        } catch (error) {
          console.warn('Erro ao buscar código do terminal:', error)
          // Fallback: usa o terminalId como código se não conseguir buscar
          codigoTerminal = String(dataRaw.terminalId)
        }
      }

      // Se ainda não tem código, usa terminalId como fallback
      if (tabelaOrigem === 'venda' && !codigoTerminal && dataRaw.terminalId) {
        codigoTerminal = String(dataRaw.terminalId)
      }

      // Mapeia produtos lançados garantindo prioridade para os campos "valor*",
      // pois em algumas vendas abertas o backend envia desconto/acréscimo como 0
      // e o valor real em valorDesconto/valorAcrescimo.
      const parseNumberOrNull = (value: unknown): number | null => {
        if (value === null || value === undefined || value === '') return null
        const parsed = typeof value === 'number' ? value : Number(value)
        return Number.isNaN(parsed) ? null : parsed
      }

      const pickModifierValue = (
        preferredRaw: unknown,
        fallbackRaw: unknown
      ): number | undefined => {
        const preferred = parseNumberOrNull(preferredRaw)
        const fallback = parseNumberOrNull(fallbackRaw)

        // Regra: se preferred veio zerado e fallback tem valor > 0, usa fallback.
        if (preferred !== null && preferred > 0) return preferred
        if (fallback !== null && fallback > 0) return fallback
        if (preferred !== null) return preferred
        if (fallback !== null) return fallback
        return undefined
      }

      const produtosLancadosMapeados = (dataRaw.produtosLancados || dataRaw.produtos || []).map(
        (produto: any) => ({
          ...produto,
          desconto: pickModifierValue(
            produto.valorDesconto ?? produto.descontoValor ?? produto.valorDescontoProduto,
            produto.desconto
          ),
          tipoDesconto:
            produto.tipoDesconto ??
            produto.tipoDescontoValor ??
            produto.tipoDescontoProduto ??
            undefined,
          acrescimo: pickModifierValue(
            produto.valorAcrescimo ?? produto.acrescimoValor ?? produto.valorAcrescimoProduto,
            produto.acrescimo
          ),
          tipoAcrescimo:
            produto.tipoAcrescimo ??
            produto.tipoAcrescimoValor ??
            produto.tipoAcrescimoProduto ??
            undefined,
        })
      )

      const data: VendaDetalhes = {
        ...dataRaw,
        codigoTerminal: codigoTerminal,
        statusFiscal,
        documentoFiscalId,
        retornoSefaz,
        produtosLancados: produtosLancadosMapeados,
      }

      // Debug: log para verificar se o campo está sendo capturado
      if (typeof window !== 'undefined' && tabelaOrigem === 'venda' && !codigoTerminal) {
        if (!codigoTerminal) {
          console.warn('DetalhesVendas: codigoTerminal não encontrado na resposta da API', {
            vendaId,
            dataRaw,
            terminal: dataRaw.terminal,
            terminalId: dataRaw.terminalId,
          })
        }
        // Debug: verifica produtos com desconto/acréscimo
        const produtosComModificacao = produtosLancadosMapeados.filter(
          (p: any) => (p.desconto && p.desconto > 0) || (p.acrescimo && p.acrescimo > 0)
        )
        if (produtosComModificacao.length > 0) {
          console.log(
            'DetalhesVendas: Produtos com desconto/acréscimo encontrados:',
            produtosComModificacao
          )
        } else {
          console.log(
            'DetalhesVendas: Nenhum produto com desconto/acréscimo encontrado. Produtos:',
            produtosLancadosMapeados
          )
        }
      }

      setVenda(data)

      // Coleta todos os IDs de usuários únicos que precisam ser buscados
      const userIdsToFetch = new Set<string>()
      if (data.abertoPorId) userIdsToFetch.add(data.abertoPorId)
      if (data.canceladoPorId) userIdsToFetch.add(data.canceladoPorId)
      if (data.ultimoResponsavelId) userIdsToFetch.add(data.ultimoResponsavelId)
      data.produtosLancados?.forEach(p => {
        if (p.lancadoPorId) userIdsToFetch.add(p.lancadoPorId)
        if (p.removidoPorId) userIdsToFetch.add(p.removidoPorId)
      })
      data.pagamentos?.forEach(p => {
        if (p.realizadoPorId) userIdsToFetch.add(p.realizadoPorId)
        if (p.canceladoPorId) userIdsToFetch.add(p.canceladoPorId)
      })

      // Coleta todos os IDs de meios de pagamento únicos que precisam ser buscados
      const meioIdsToFetch = new Set<string>()
      data.pagamentos?.forEach(p => {
        if (p.meioPagamentoId) meioIdsToFetch.add(p.meioPagamentoId)
      })

      // Executa todas as buscas de dados auxiliares em paralelo
      const [userNamesResolved, meioPagamentoResolved, clienteNomeResult] = await Promise.all([
        Promise.all(Array.from(userIdsToFetch).map(id => fetchUsuarioNome(id))),
        Promise.all(Array.from(meioIdsToFetch).map(id => fetchMeioPagamento(id))),
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
  }, [
    vendaId,
    open,
    auth,
    fetchUsuarioNome,
    fetchMeioPagamento,
    fetchClienteNome,
    onClose,
    tabelaOrigem,
  ])

  /**
   * Confirma cancelamento da venda
   */
  const handleConfirmarCancelamento = async () => {
    if (!venda) return

    if (justificativa.trim().length < 15) {
      showToast.error('Justificativa deve ter no mínimo 15 caracteres')
      return
    }

    try {
      await cancelarVenda.mutateAsync({
        id: venda.id,
        motivo: justificativa.trim(),
      })

      setIsCancelarModalOpen(false)
      setJustificativa('')
      onClose() // Fecha o modal de detalhes após cancelamento bem-sucedido
    } catch (error) {
      // Erro já tratado pelo hook
      console.error('Erro ao cancelar venda:', error)
    }
  }

  useEffect(() => {
    if (open && vendaId) {
      fetchVendaDetalhes()
    } else {
      // Quando o modal é fechado ou vendaId é nulo, limpa os estados
      setVenda(null)
      setNomeCliente(null)
      setNomesUsuarios({}) // Limpa cache de usuários
      setNomesMeiosPagamento({}) // Limpa cache de meios de pagamento
      setIsCancelarModalOpen(false)
      setJustificativa('')
    }
  }, [open, vendaId, fetchVendaDetalhes])

  /**
   * Calcula o resumo financeiro dos itens lançados
   */
  const resumoFinanceiro = useMemo(() => {
    if (!venda || !venda.produtosLancados || venda.produtosLancados.length === 0) {
      return {
        totalItensLancados: 0,
        totalItensCancelados: 0,
        totalDosItens: 0,
        totalDescontosConta: 0,
        totalAcrescimosConta: 0,
        totalCupom: 0,
      }
    }

    const isVendaCancelada = !!venda.canceladoPorId

    let totalItensLancados = 0 // Soma TODOS os itens lançados (cancelados + não cancelados)
    let totalItensCancelados = 0
    let totalDescontosConta = 0 // Soma todos os descontos aplicados nos produtos
    let totalAcrescimosConta = 0 // Soma todos os acréscimos aplicados nos produtos

    venda.produtosLancados.forEach(produto => {
      // Valor base do produto (sem desconto/acréscimo)
      const valorBaseProduto = produto.valorUnitario * produto.quantidade

      // Calcula valor do desconto aplicado (se houver)
      let valorDesconto = 0
      if (produto.desconto) {
        const descontoValue =
          typeof produto.desconto === 'string' ? parseFloat(produto.desconto) : produto.desconto
        if (produto.tipoDesconto === 'porcentagem') {
          // Backend retorna 0.1 para 10%, então multiplica diretamente
          valorDesconto = valorBaseProduto * descontoValue
        } else {
          // Desconto fixo
          valorDesconto = descontoValue
        }
        totalDescontosConta += valorDesconto
      }

      // Calcula valor do acréscimo aplicado (se houver)
      let valorAcrescimo = 0
      if (produto.acrescimo) {
        const acrescimoValue =
          typeof produto.acrescimo === 'string' ? parseFloat(produto.acrescimo) : produto.acrescimo
        if (produto.tipoAcrescimo === 'porcentagem') {
          // Backend retorna 0.1 para 10%, então multiplica diretamente
          valorAcrescimo = valorBaseProduto * acrescimoValue
        } else {
          // Acréscimo fixo
          valorAcrescimo = acrescimoValue
        }
        totalAcrescimosConta += valorAcrescimo
      }

      // Calcula valor total do produto (com descontos/acréscimos)
      const valorTotalProduto = calcularValorProduto(produto)

      // Soma complementos que impactam preço
      let valorComplementos = 0
      if (produto.complementos && produto.complementos.length > 0) {
        produto.complementos.forEach(complemento => {
          if (complemento.tipoImpactoPreco === 'aumenta') {
            valorComplementos += calcularValorComplemento(complemento)
          } else if (complemento.tipoImpactoPreco === 'diminui') {
            valorComplementos -= calcularValorComplemento(complemento)
          }
        })
      }

      const valorTotalComComplementos = valorTotalProduto + valorComplementos

      // SEMPRE soma ao total lançado (independente se foi cancelado ou não)
      totalItensLancados += valorTotalComComplementos

      // Se a venda está cancelada, TODOS os produtos são considerados cancelados
      // Caso contrário, apenas produtos removidos individualmente
      if (isVendaCancelada || produto.removido) {
        totalItensCancelados += valorTotalComComplementos
      }
    })

    // Total dos itens (A - B)
    const totalDosItens = totalItensLancados - totalItensCancelados

    // Total do cupom: se cancelada, usa o total calculado (soma de todos os produtos)
    // Caso contrário, usa o valorFinal da venda
    const totalCupom = isVendaCancelada
      ? totalItensLancados // Quando cancelada, totalCupom = total de todos os produtos
      : venda.valorFinal

    return {
      totalItensLancados,
      totalItensCancelados,
      totalDosItens,
      totalDescontosConta,
      totalAcrescimosConta,
      totalCupom,
    }
  }, [venda, calcularValorProduto, calcularValorComplemento])

  /**
   * Calcula o troco baseado nos pagamentos válidos
   * Exclui pagamentos cancelados e pagamentos com isTefConfirmed: false
   * IMPORTANTE: Este hook deve ser chamado ANTES de qualquer return condicional
   */
  const trocoCalculado = useMemo(() => {
    if (!venda || !venda.pagamentos || venda.pagamentos.length === 0) {
      return 0
    }

    // Filtra pagamentos válidos (mesma lógica do filtro de exibição)
    const pagamentosValidos = venda.pagamentos.filter(p => {
      // Exclui pagamentos cancelados
      const isCancelado =
        p.cancelado === true || (p.dataCancelamento !== null && p.dataCancelamento !== undefined)

      // Verifica se o pagamento usa TEF e se está confirmado
      const usaTef = p.isTefUsed === true
      if (usaTef) {
        const tefConfirmado = p.isTefConfirmed === true
        if (!tefConfirmado) {
          return false // Exclui pagamentos TEF não confirmados
        }
      }

      return !isCancelado // Apenas pagamentos não cancelados e (não usa TEF ou TEF confirmado)
    })

    // Soma o total pago pelos pagamentos válidos
    const totalPago = pagamentosValidos.reduce((sum, pagamento) => sum + pagamento.valor, 0)

    // Calcula o troco: total pago - total da venda
    // Se der negativo, troco = 0 (não pode haver troco negativo)
    const troco = Math.max(0, totalPago - venda.valorFinal)

    return troco
  }, [venda])

  /**
   * Calcula o total da venda
   * Se a venda está cancelada, soma TODOS os produtos lançados (ignorando remoções anteriores)
   * Caso contrário, usa o valorFinal da venda
   */
  const totalVendaCalculado = useMemo(() => {
    if (!venda || !venda.produtosLancados || venda.produtosLancados.length === 0) {
      return venda?.valorFinal || 0
    }

    const isVendaCancelada = !!venda.canceladoPorId

    if (isVendaCancelada) {
      // Quando cancelada, soma TODOS os produtos lançados, mesmo que tenham sido removidos antes
      let total = 0
      venda.produtosLancados.forEach(produto => {
        const valorTotalProduto = calcularValorProduto(produto)

        // Soma complementos que impactam preço
        let valorComplementos = 0
        if (produto.complementos && produto.complementos.length > 0) {
          produto.complementos.forEach(complemento => {
            if (complemento.tipoImpactoPreco === 'aumenta') {
              valorComplementos += calcularValorComplemento(complemento)
            } else if (complemento.tipoImpactoPreco === 'diminui') {
              valorComplementos -= calcularValorComplemento(complemento)
            }
          })
        }

        total += valorTotalProduto + valorComplementos
      })
      return total
    }

    // Se não está cancelada, usa o valorFinal da venda
    return venda.valorFinal
  }, [venda, calcularValorProduto, calcularValorComplemento])

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
      onOpenChange={isOpen => {
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
          padding: {
            xs: 0, // Remove padding em telas muito pequenas
            sm: '16px', // Adiciona padding em telas maiores
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '22px',
          width: '100vw',
          maxWidth: {
            xs: '95vw', // Em telas muito pequenas, ocupa 100% da largura
            sm: '95vw', // Em telas pequenas, ocupa 95% da largura
            md: '620px', // Em telas médias e maiores, limita a 620px
          },
          maxHeight: '95vh',
          margin: {
            xs: 0, // Remove margem em telas muito pequenas
            sm: '16px', // Adiciona margem em telas maiores
          },
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* AppBar */}
        <div className="flex items-center gap-3 rounded-t-lg bg-primary py-3 md:px-4">
          <div className="flex flex-1 items-center justify-center gap-2">
            {venda && (
              <TipoVendaIcon
                tipoVenda={tabelaOrigem === 'venda_gestor' ? 'gestor' : venda.tipoVenda}
                numeroMesa={venda.numeroMesa}
                containerScale={0.9}
                className="flex-shrink-0"
                corPrincipal="#FFFFFF"
                corSecundaria="rgba(255, 255, 255, 0.3)"
                corTexto="var(--color-primary-text)"
                corBorda="rgba(255, 255, 255, 0.5)"
                corFundo="var(--color-primary-background)"
                corBalcao="var(--color-info)"
                corGestor="var(--color-info)"
              />
            )}
            <div className="flex flex-col">
              <span className="font-exo text-xl font-bold text-white">
                Venda Nº. {venda?.numeroVenda}
              </span>
              <span className="font-nunito text-lg text-white">#{venda?.codigoVenda}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto bg-info py-2 md:px-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <JiffyLoading />
            </div>
          ) : venda ? (
            <>
              {/* Card Informações da Venda */}
              <div className="mb-2 p-2">
                <h2 className="font-exo text-lg font-bold text-primary-text">
                  Informações da Venda
                </h2>
                <div className="mb-2 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2 md:px-2">
                  {/* Status */}
                  <div
                    className={`flex justify-between rounded-lg px-3 py-2 ${statusColor} font-nunito text-xs text-white md:text-sm`}
                  >
                    Status: <span className="font-semibold">{statusVenda}</span>
                  </div>

                  {/* Aberto por */}
                  <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                    <span>Aberto por:</span>
                    <span>{nomesUsuarios[venda.abertoPorId] || venda.abertoPorId}</span>
                  </div>

                  {/* Última Alteração por - Só exibe quando statusMesa estiver aberta */}
                  {venda.ultimoResponsavelId && venda.statusMesa === 'aberta' && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Última Alteração por:</span>
                      <span>
                        {nomesUsuarios[venda.ultimoResponsavelId] || venda.ultimoResponsavelId}
                      </span>
                    </div>
                  )}

                  {/* Finalizado Por - Só exibe se a venda não foi cancelada e statusMesa não estiver aberta */}
                  {venda.ultimoResponsavelId &&
                    !venda.canceladoPorId &&
                    venda.statusMesa !== 'aberta' && (
                      <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                        <span>Finalizado Por:</span>
                        <span>
                          {nomesUsuarios[venda.ultimoResponsavelId] || venda.ultimoResponsavelId}
                        </span>
                      </div>
                    )}

                  {/* Cancelado Por */}
                  {venda.canceladoPorId && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-error md:text-sm">
                      <span>Cancelado Por:</span>
                      <span className="font-semibold">
                        {nomesUsuarios[venda.canceladoPorId] || venda.canceladoPorId}
                      </span>
                    </div>
                  )}

                  {/* Data/Hora de Cancelamento */}
                  {venda.dataCancelamento && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-error md:text-sm">
                      <span>Cancelado em:</span>
                      <span className="font-semibold">
                        {formatDateTime(venda.dataCancelamento)}
                      </span>
                    </div>
                  )}

                  {/* Código do Terminal */}
                  {venda.codigoTerminal && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Código do Terminal:</span>
                      <span>#{venda.codigoTerminal}</span>
                    </div>
                  )}

                  {/* Data/Hora de Criação */}
                  <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                    <span>Data/Hora Abertura:</span>
                    <span>{formatDateTime(venda.dataCriacao)}</span>
                  </div>

                  {/* Data/Hora de Finalização */}
                  {venda.dataFinalizacao && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Data/Hora Finalização:</span>
                      <span>{formatDateTime(venda.dataFinalizacao)}</span>
                    </div>
                  )}

                  {/* Cliente Vinculado */}
                  {venda.clienteId && nomeCliente && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Cliente Vinculado:</span>
                      <span>{nomeCliente}</span>
                    </div>
                  )}

                  {/* Identificação da Venda */}
                  {venda.identificacao && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Identificação da Venda:</span>
                      <span>{venda.identificacao}</span>
                    </div>
                  )}

                  {/* Origem da Venda */}
                  {venda.origem && (
                    <div className="font-nunito flex justify-between rounded-lg bg-white px-3 text-sm text-primary-text">
                      <span>Origem:</span>
                      <span>{venda.origem}</span>
                    </div>
                  )}

                  {/* Status Fiscal */}
                  {venda.statusFiscal && (
                    <div className="font-nunito flex items-center justify-between rounded-lg bg-white px-3 text-sm text-primary-text">
                      <span>Status Fiscal:</span>
                      <StatusFiscalBadge status={venda.statusFiscal} />
                    </div>
                  )}

                  {/* Solicitar Emissão Fiscal */}
                  {venda.solicitarEmissaoFiscal && (
                    <div className="font-nunito flex justify-between rounded-lg bg-yellow-50 px-3 text-sm text-primary-text">
                      <span>Solicitar Emissão Fiscal:</span>
                      <span className="font-semibold text-yellow-600">Sim</span>
                    </div>
                  )}

                  {/* Documento Fiscal ID */}
                  {venda.documentoFiscalId && (
                    <div className="font-nunito flex justify-between rounded-lg bg-green-50 px-3 text-sm text-primary-text">
                      <span>Documento Fiscal ID:</span>
                      <span className="font-mono text-xs">{venda.documentoFiscalId}</span>
                    </div>
                  )}

                  {/* Retorno SEFAZ (motivo da rejeição/autorização) */}
                  {venda.retornoSefaz && (
                    <div
                      className={`font-nunito rounded-lg px-3 py-2 text-sm ${
                        venda.statusFiscal === 'REJEITADA'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-primary-text'
                      }`}
                    >
                      <span className="font-semibold">Retorno SEFAZ: </span>
                      <span>{venda.retornoSefaz}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Produtos Lançados */}
              <div className="mb-2 p-2">
                <h2 className="font-exo text-lg font-bold text-primary-text">Produtos Lançados</h2>
                <div className="mb-2 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2">
                  {venda.produtosLancados?.map((produto, index) => {
                    const valorTotal = calcularValorProduto(produto)
                    const isRemovido = produto.removido
                    const isVendaCancelada = statusVenda === 'CANCELADA'
                    // Se a venda está cancelada, todos os produtos são considerados cancelados
                    const isCancelado = isVendaCancelada || isRemovido
                    // Sempre exibe o valor total, mesmo quando removido (com risco)

                    // Debug: verifica se os campos de desconto/acréscimo estão presentes (apenas para produtos com modificações)
                    if (process.env.NODE_ENV === 'development') {
                      const descontoValue =
                        produto.desconto !== undefined && produto.desconto !== null
                          ? typeof produto.desconto === 'string'
                            ? parseFloat(produto.desconto)
                            : produto.desconto
                          : 0
                      const acrescimoValue =
                        produto.acrescimo !== undefined && produto.acrescimo !== null
                          ? typeof produto.acrescimo === 'string'
                            ? parseFloat(produto.acrescimo)
                            : produto.acrescimo
                          : 0

                      if (descontoValue > 0 || acrescimoValue > 0) {
                        console.log('Produto com desconto/acréscimo:', {
                          nome: produto.nomeProduto,
                          desconto: produto.desconto,
                          descontoValue,
                          tipoDesconto: produto.tipoDesconto,
                          acrescimo: produto.acrescimo,
                          acrescimoValue,
                          tipoAcrescimo: produto.tipoAcrescimo,
                          produtoCompleto: produto,
                        })
                      }
                    }

                    return (
                      <div
                        key={index}
                        className={`rounded-lg px-1 md:px-3 ${
                          isCancelado ? 'bg-error/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {/* Linha do produto principal */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-2 items-center gap-2">
                              <span className="font-nunito text-xs font-semibold text-primary-text md:text-sm">
                                {produto.quantidade}x {produto.nomeProduto} (
                                {formatNumber(produto.valorUnitario)})
                              </span>
                            </div>
                            {/* Exibe acréscimo e/ou desconto se existirem */}
                            <div className="font-nunito flex flex-1 flex-col justify-start gap-1 text-xs text-secondary-text md:flex-row md:text-sm">
                              {(() => {
                                // Tenta obter acréscimo de diferentes possíveis campos
                                const acrescimoRaw =
                                  (produto as any).acrescimo ??
                                  (produto as any).valorAcrescimo ??
                                  (produto as any).acrescimoValor ??
                                  null
                                const tipoAcrescimoRaw =
                                  produto.tipoAcrescimo ??
                                  (produto as any).tipoAcrescimoValor ??
                                  (produto as any).tipoAcrescimoProduto ??
                                  null

                                // Tenta obter desconto de diferentes possíveis campos
                                const descontoRaw =
                                  produto.desconto ??
                                  (produto as any).valorDesconto ??
                                  (produto as any).descontoValor ??
                                  null
                                const tipoDescontoRaw =
                                  produto.tipoDesconto ??
                                  (produto as any).tipoDescontoValor ??
                                  (produto as any).tipoDescontoProduto ??
                                  null

                                const acrescimoValue =
                                  acrescimoRaw !== undefined &&
                                  acrescimoRaw !== null &&
                                  acrescimoRaw !== ''
                                    ? typeof acrescimoRaw === 'string'
                                      ? parseFloat(acrescimoRaw)
                                      : acrescimoRaw
                                    : null
                                const descontoValue =
                                  descontoRaw !== undefined &&
                                  descontoRaw !== null &&
                                  descontoRaw !== ''
                                    ? typeof descontoRaw === 'string'
                                      ? parseFloat(descontoRaw)
                                      : descontoRaw
                                    : null

                                const elementos = []

                                // Exibe acréscimo se existir e for maior que 0
                                if (
                                  acrescimoValue !== null &&
                                  !isNaN(acrescimoValue) &&
                                  acrescimoValue > 0
                                ) {
                                  const tipoAcrescimo = tipoAcrescimoRaw || 'fixo' // Default para fixo se não especificado
                                  const valorExibir =
                                    tipoAcrescimo === 'porcentagem'
                                      ? `${Math.round(acrescimoValue * 100)}%`
                                      : formatNumber(acrescimoValue)
                                  elementos.push(
                                    <span key="acrescimo" className="text-success">
                                      Acresc. +{valorExibir}
                                    </span>
                                  )
                                }

                                // Exibe desconto se existir e for maior que 0
                                if (
                                  descontoValue !== null &&
                                  !isNaN(descontoValue) &&
                                  descontoValue > 0
                                ) {
                                  const tipoDesconto = tipoDescontoRaw || 'fixo' // Default para fixo se não especificado
                                  const valorExibir =
                                    tipoDesconto === 'porcentagem'
                                      ? `${Math.round(descontoValue * 100)}%`
                                      : formatNumber(descontoValue)
                                  elementos.push(
                                    <span key="desconto" className="text-error">
                                      Desc. -{valorExibir}
                                    </span>
                                  )
                                }

                                return elementos.length > 0 ? elementos : null
                              })()}
                            </div>
                            <div
                              className={`font-nunito flex flex-1 items-center justify-end text-sm font-semibold text-primary-text ${isCancelado ? 'line-through' : ''}`}
                            >
                              {formatCurrency(valorTotal)}
                            </div>
                          </div>

                          {/* Linhas dos complementos */}
                          {produto.complementos && produto.complementos.length > 0 ? (
                            <div className="ml-2 space-y-1 md:ml-7">
                              {produto.complementos.map((complemento, compIndex) => {
                                console.log(
                                  `  🎨 Renderizando complemento ${compIndex}:`,
                                  complemento
                                )

                                const valorTotalComplemento = calcularValorComplemento(complemento)
                                const temImpactoPreco = complemento.tipoImpactoPreco !== 'nenhum'

                                // Determina o prefixo baseado no tipo de impacto
                                let prefix = ''
                                if (temImpactoPreco) {
                                  prefix = complemento.tipoImpactoPreco === 'aumenta' ? '+ ' : '- '
                                }

                                return (
                                  <div
                                    key={compIndex}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="font-nunito text-xs text-secondary-text">
                                      {complemento.quantidade}x {complemento.nomeComplemento}
                                      {temImpactoPreco &&
                                        ` (${formatNumber(complemento.valorUnitario)})`}
                                    </span>
                                    <div
                                      className={`font-nunito text-xs font-semibold text-secondary-text ${isCancelado ? 'line-through' : ''}`}
                                    >
                                      {temImpactoPreco
                                        ? `${prefix}${formatCurrency(valorTotalComplemento)}`
                                        : '-'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}

                          {/* Informações de lançamento */}
                          <div className="mt-1 flex flex-col text-xs text-secondary-text md:ml-7 md:flex-row">
                            <span>Lançado: {formatDateTime(produto.dataLancamento)} |</span>{' '}
                            <span>
                              Usuário: {nomesUsuarios[produto.lancadoPorId] || produto.lancadoPorId}
                            </span>
                          </div>

                          {/* Informações de remoção (se produto foi removido) */}
                          {isRemovido && produto.removidoPorId && (
                            <div className="ml-7 mt-1 text-xs text-error">
                              Removido por:{' '}
                              {nomesUsuarios[produto.removidoPorId] || produto.removidoPorId}
                            </div>
                          )}
                          {isRemovido && produto.dataRemocao && (
                            <div className="ml-7 text-xs text-error">
                              Removido em: {formatDateTime(produto.dataRemocao)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Total da Venda */}
                  <div className="rounded-lg border-2 border-primary bg-primary/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-nunito text-base font-bold text-primary-text">
                        Total da Venda:
                      </span>
                      <span
                        className={`font-nunito text-base font-bold text-primary ${statusVenda === 'CANCELADA' ? 'line-through' : ''}`}
                      >
                        {formatCurrency(totalVendaCalculado)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Pagamentos Realizados */}
              <div className="mb-4 px-2">
                <h2 className="mb-2 font-exo text-lg font-bold text-primary-text">
                  Pagamentos Realizados
                </h2>
                <div className="mb-3 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2">
                  {venda.pagamentos
                    ?.filter(p => {
                      const isCancelado =
                        p.cancelado === true ||
                        (p.dataCancelamento !== null && p.dataCancelamento !== undefined)

                      const usaTef = p.isTefUsed === true
                      // Oculta só TEF pendente de confirmação em pagamento ainda ativo
                      // (cancelados permanecem visíveis no histórico mesmo com TEF não confirmado)
                      if (usaTef && !isCancelado) {
                        const tefConfirmado = p.isTefConfirmed === true
                        if (!tefConfirmado) {
                          return false
                        }
                      }

                      return true
                    })
                    .map((pagamento, index) => {
                      const meio = nomesMeiosPagamento[pagamento.meioPagamentoId]
                      const formaPagamento = meio?.formaPagamentoFiscal || ''
                      const isCancelado =
                        pagamento.cancelado === true ||
                        (pagamento.dataCancelamento !== null &&
                          pagamento.dataCancelamento !== undefined)

                      const getIcon = () => {
                        if (formaPagamento.toLowerCase().includes('dinheiro')) return '💵'
                        if (
                          formaPagamento.toLowerCase().includes('credito') ||
                          formaPagamento.toLowerCase().includes('debito')
                        )
                          return '💳'
                        if (formaPagamento.toLowerCase().includes('pix')) return '📱'
                        return '💳'
                      }

                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                            isCancelado ? 'bg-error/20' : 'bg-[#4BD08A]'
                          }`}
                        >
                          <div
                            className={`flex h-[62px] w-[68px] flex-shrink-0 items-center justify-center rounded-lg ${
                              isCancelado ? 'bg-error/30' : 'bg-primary'
                            }`}
                          >
                            <span className="text-2xl text-white">{getIcon()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-nunito text-sm font-bold text-primary-text">
                              {meio?.nome || 'Meio de pagamento desconhecido'}
                              {isCancelado && (
                                <span className="ml-2 text-xs font-semibold text-error">
                                  (CANCELADO)
                                </span>
                              )}
                            </div>
                            <div className="font-nunito text-xs text-secondary-text">
                              {formatDateTime(pagamento.dataCriacao)}
                            </div>
                            <div className="font-nunito text-sm font-bold text-primary-text">
                              {formatCurrency(pagamento.valor)}
                            </div>
                            <div className="font-nunito text-xs text-secondary-text">
                              PDV Resp.:{' '}
                              {nomesUsuarios[pagamento.realizadoPorId] || pagamento.realizadoPorId}
                            </div>
                            {isCancelado && pagamento.canceladoPorId && (
                              <div className="font-nunito mt-1 text-xs text-error">
                                Cancelado por:{' '}
                                {nomesUsuarios[pagamento.canceladoPorId] ||
                                  pagamento.canceladoPorId}
                              </div>
                            )}
                            {isCancelado && pagamento.dataCancelamento && (
                              <div className="font-nunito text-xs text-error">
                                Cancelado em: {formatDateTime(pagamento.dataCancelamento)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                  {/* Troco - Código original comentado (vem da API) */}
                  {/* {venda.troco != null && Number(venda.troco) > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm font-semibold text-primary-text font-nunito">
                        Troco: {formatCurrency(venda.troco)}
                      </span>
                    </div>
                  )} */}

                  {/* Troco calculado no frontend */}
                  {trocoCalculado > 0 && (
                    <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                      <span className="font-nunito text-sm font-semibold text-primary-text">
                        Troco: {formatCurrency(trocoCalculado)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Resumo Financeiro */}
              <div className="mb-4 px-2">
                <h2 className="mb-2 font-exo text-sm font-bold text-primary-text">
                  Resumo Financeiro
                </h2>
                <div className="border-t border-dashed border-gray-400"></div>

                <div className="space-y-1.5 rounded-lg px-4 py-2">
                  {/* A - Total de itens lançados */}
                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      A - Total de itens lançados (+)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalItensLancados)}
                    </span>
                  </div>

                  {/* B - Total de itens cancelados */}
                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      B - Total de itens cancelados (-)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800 line-through">
                      {formatNumber(resumoFinanceiro.totalItensCancelados)}
                    </span>
                  </div>

                  {/* D - Total dos itens (A - B) */}
                  <div className="mt-1 flex items-center justify-between border-t border-gray-400 pt-1.5">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      C - Total dos itens (A - B)
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalDosItens)}
                    </span>
                  </div>

                  {/* Total de descontos na conta */}
                  <div className="flex items-center justify-between pt-4">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      Total de descontos na conta
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalDescontosConta)}
                    </span>
                  </div>

                  {/* Total de acréscimos na conta */}
                  <div className="flex items-center justify-between">
                    <span className="font-nunito text-xs font-medium text-gray-800">
                      Total de acréscimos na conta
                    </span>
                    <span className="font-nunito text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalAcrescimosConta)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-secondary-text">Erro ao carregar detalhes da venda.</p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modal de Justificativa de Cancelamento */}
      <MuiDialog
        open={isCancelarModalOpen}
        onClose={() => setIsCancelarModalOpen(false)}
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: '500px',
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: 'var(--color-error)',
            color: 'white',
            fontFamily: 'Exo, sans-serif',
          }}
        >
          Cancelar Venda
        </DialogTitle>
        <MuiDialogContent sx={{ p: 3, backgroundColor: 'var(--color-info)' }}>
          <div className="space-y-4 pt-4">
            <p className="font-nunito text-sm text-secondary-text">
              Esta ação cancelará a venda e, se houver nota fiscal emitida, também a cancelará na
              SEFAZ.
            </p>
            <p className="font-nunito text-sm font-bold text-error">
              Esta ação não pode ser desfeita!
            </p>
            <TextField
              label="Justificativa do Cancelamento"
              multiline
              rows={4}
              fullWidth
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Digite o motivo do cancelamento (mínimo 15 caracteres)"
              helperText={`${justificativa.length}/15 caracteres mínimos`}
              error={justificativa.length > 0 && justificativa.length < 15}
            />
          </div>
        </MuiDialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: 'var(--color-info)' }}>
          <Button
            onClick={() => {
              setIsCancelarModalOpen(false)
              setJustificativa('')
            }}
            variant="outlined"
            disabled={cancelarVenda.isPending}
          >
            Voltar
          </Button>
          <Button
            onClick={handleConfirmarCancelamento}
            variant="contained"
            color="error"
            disabled={cancelarVenda.isPending || justificativa.trim().length < 15}
            startIcon={cancelarVenda.isPending ? <CircularProgress size={20} /> : <MdCancel />}
          >
            {cancelarVenda.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </MuiDialog>
    </Dialog>
  )
}
