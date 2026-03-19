'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { Input } from '@/src/presentation/components/ui/input'
import { Switch } from '@/src/presentation/components/ui/switch'
import { useQuery } from '@tanstack/react-query'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { Produto } from '@/src/domain/entities/Produto'
import { Cliente } from '@/src/domain/entities/Cliente'
import { useCreateVendaGestor } from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { MdLaunch, MdDelete, MdClear, MdSearch, MdArrowForward, MdArrowBack, MdCheckCircle, MdAttachMoney, MdCreditCard, MdQrCode, MdPerson, MdStore, MdPersonOutline, MdInfo, MdAdd, MdRemove, MdClose, MdEdit } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { SeletorClienteModal } from './SeletorClienteModal'

interface NovoPedidoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ComplementoSelecionado {
  id: string
  grupoId: string
  nome: string
  valor: number
  quantidade: number
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
}

interface ProdutoSelecionado {
  produtoId: string
  nome: string
  quantidade: number
  valorUnitario: number
  complementos: ComplementoSelecionado[]
  tipoDesconto?: 'fixo' | 'porcentagem' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'fixo' | 'porcentagem' | null
  valorAcrescimo?: number | null
}

interface PagamentoSelecionado {
  meioPagamentoId: string
  valor: number
}

type OrigemVenda = 'GESTOR' | 'IFOOD' | 'RAPPI' | 'OUTROS'
type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'PENDENTE_EMISSAO'

export function NovoPedidoModal({ open, onClose, onSuccess }: NovoPedidoModalProps) {
  const { auth } = useAuthStore()
  const createVendaGestor = useCreateVendaGestor()
  
  const [origem, setOrigem] = useState<OrigemVenda>('GESTOR')
  const [status, setStatus] = useState<StatusVenda>('FINALIZADA')
  const [clienteId, setClienteId] = useState<string>('')
  const [clienteNome, setClienteNome] = useState<string>('')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoSelecionado[]>([])
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>('')
  const [valorRecebido, setValorRecebido] = useState<string>('')
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [seletorClienteOpen, setSeletorClienteOpen] = useState(false)
  const [tooltipGrupoId, setTooltipGrupoId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [nomeUsuario, setNomeUsuario] = useState<string>('')
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)
  
  // Estado para controlar valores em edição (índice do produto ou chave do complemento -> valor string)
  const [valoresEmEdicao, setValoresEmEdicao] = useState<Record<string | number, string>>({})
  
  // Estados para complementos
  const [produtoSelecionadoParaComplementos, setProdutoSelecionadoParaComplementos] = useState<Produto | null>(null)
  const [modalComplementosOpen, setModalComplementosOpen] = useState(false)
  // Estado para rastrear complementos selecionados por produto (produtoId -> complementoIds[])
  const [complementosSelecionados, setComplementosSelecionados] = useState<Record<string, string[]>>({})
  // Estado para rastrear se estamos editando um produto existente (índice) ou adicionando um novo (null)
  const [produtoIndexEdicaoComplementos, setProdutoIndexEdicaoComplementos] = useState<number | null>(null)
  
  // Estados para modal de edição de produto
  const [modalEdicaoProdutoOpen, setModalEdicaoProdutoOpen] = useState(false)
  const [produtoIndexEdicao, setProdutoIndexEdicao] = useState<number | null>(null)
  const [quantidadeEdicao, setQuantidadeEdicao] = useState<number>(1)
  const [ehAcrescimo, setEhAcrescimo] = useState<boolean>(false) // false = desconto, true = acréscimo
  const [ehPorcentagem, setEhPorcentagem] = useState<boolean>(false) // false = valor fixo, true = porcentagem
  const [valorDescontoAcrescimo, setValorDescontoAcrescimo] = useState<string>('0')
  
  // Estado para modal de confirmação de saída
  const [modalConfirmacaoSaidaOpen, setModalConfirmacaoSaidaOpen] = useState(false)
  // Estado interno para controlar o Dialog (para impedir fechamento quando houver dados)
  const [internalDialogOpen, setInternalDialogOpen] = useState(open)
  
  // Estados para arrastar a lista horizontal
  const gruposScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false) // Rastreia se houve movimento significativo durante o arraste

  // Estados para arrastar a lista horizontal de formas de pagamento
  const meiosPagamentoScrollRef = useRef<HTMLDivElement>(null)
  const [isDraggingMeiosPagamento, setIsDraggingMeiosPagamento] = useState(false)
  const startXMeiosPagamentoRef = useRef(0)
  const scrollLeftMeiosPagamentoRef = useRef(0)
  
  // Refs para long press na linha do produto
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressIndexRef = useRef<number | null>(null)
  
  // Refs para long press na linha do complemento
  const longPressComplementoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressComplementoIndexRef = useRef<number | null>(null)
  const hasMovedMeiosPagamentoRef = useRef(false)

  // Buscar grupos de produtos
  const { data: gruposData, isLoading: isLoadingGrupos } = useGruposProdutos({
    ativo: true,
    limit: 100,
  })

  // Buscar produtos do grupo selecionado usando endpoint específico
  const { data: produtosPorGrupoData, isLoading: isLoadingProdutos, error: produtosError } = useQuery({
    queryKey: ['produtos-por-grupo', grupoSelecionadoId],
    queryFn: async () => {
      if (!grupoSelecionadoId || !auth?.getAccessToken()) {
        return { produtos: [], count: 0 }
      }

      const token = auth.getAccessToken()
      const response = await fetch(`/api/grupos-produtos/${grupoSelecionadoId}/produtos?limit=100&offset=0`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao carregar produtos do grupo')
      }

      const data = await response.json()
      
      // Verificar se data.items existe e é um array
      const items = Array.isArray(data.items) ? data.items : []
      const produtos = items.map((item: any) => Produto.fromJSON(item))
      
      return {
        produtos,
        count: data.count || produtos.length,
      }
    },
    enabled: !!grupoSelecionadoId && !!auth?.getAccessToken(),
    staleTime: 0,
    gcTime: 1000 * 60 * 1,
    retry: 1,
  })

  // Buscar meios de pagamento
  const { data: meiosPagamentoData } = useMeiosPagamentoInfinite({
    limit: 100,
    ativo: true,
  })

  // Handler para seleção de cliente
  const handleSelectCliente = (cliente: Cliente) => {
    setClienteId(cliente.getId())
    setClienteNome(cliente.getNome())
  }

  const handleRemoveCliente = () => {
    setClienteId('')
    setClienteNome('')
  }

  // Handlers para arrastar a lista horizontal de grupos
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gruposScrollRef.current) return
    hasMovedRef.current = false // Reset flag de movimento
    setIsDragging(true)
    
    const startXValue = e.pageX - gruposScrollRef.current.offsetLeft
    const scrollLeftValue = gruposScrollRef.current.scrollLeft
    startXRef.current = startXValue
    scrollLeftRef.current = scrollLeftValue
    
    gruposScrollRef.current.style.cursor = 'grabbing'
    gruposScrollRef.current.style.userSelect = 'none'
    
    // Adicionar listeners globais para capturar movimento mesmo fora do elemento
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!gruposScrollRef.current) return
      
      const x = e.pageX - gruposScrollRef.current.offsetLeft
      const walk = (x - startXRef.current) * 2 // Velocidade do scroll (ajustável)
      
      // Verificar se houve movimento significativo (mais de 5px)
      if (Math.abs(walk) > 5) {
        hasMovedRef.current = true
        e.preventDefault()
        e.stopPropagation()
      }
      
      if (hasMovedRef.current) {
        gruposScrollRef.current.scrollLeft = scrollLeftRef.current - walk
      }
    }
    
    const handleGlobalMouseUp = () => {
      if (!gruposScrollRef.current) return
      setIsDragging(false)
      gruposScrollRef.current.style.cursor = 'grab'
      gruposScrollRef.current.style.userSelect = 'auto'
      
      // Remover listeners globais
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      
      // Reset após um pequeno delay para permitir que o onClick do botão seja processado
      setTimeout(() => {
        hasMovedRef.current = false
      }, 100)
    }
    
    // Adicionar listeners globais
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Este handler não é mais necessário, mas mantemos para compatibilidade
    // O movimento real é tratado pelos listeners globais
  }, [])

  const handleMouseUp = useCallback(() => {
    // Este handler não é mais necessário, mas mantemos para compatibilidade
    // O mouseup real é tratado pelos listeners globais
  }, [])

  const handleMouseLeave = useCallback(() => {
    // Não resetar o dragging ao sair do elemento, pois o arraste pode continuar
    // O reset só acontece no mouseup global
  }, [])

  // Handlers para arrastar a lista horizontal de formas de pagamento
  const handleMouseDownMeiosPagamento = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!meiosPagamentoScrollRef.current) return
    hasMovedMeiosPagamentoRef.current = false
    setIsDraggingMeiosPagamento(true)
    
    const startXValue = e.pageX - meiosPagamentoScrollRef.current.offsetLeft
    const scrollLeftValue = meiosPagamentoScrollRef.current.scrollLeft
    startXMeiosPagamentoRef.current = startXValue
    scrollLeftMeiosPagamentoRef.current = scrollLeftValue
    
    meiosPagamentoScrollRef.current.style.cursor = 'grabbing'
    meiosPagamentoScrollRef.current.style.userSelect = 'none'
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!meiosPagamentoScrollRef.current) return
      
      const x = e.pageX - meiosPagamentoScrollRef.current.offsetLeft
      const walk = (x - startXMeiosPagamentoRef.current) * 2
      
      if (Math.abs(walk) > 5) {
        hasMovedMeiosPagamentoRef.current = true
        e.preventDefault()
        e.stopPropagation()
      }
      
      if (hasMovedMeiosPagamentoRef.current) {
        meiosPagamentoScrollRef.current.scrollLeft = scrollLeftMeiosPagamentoRef.current - walk
      }
    }
    
    const handleGlobalMouseUp = () => {
      if (!meiosPagamentoScrollRef.current) return
      setIsDraggingMeiosPagamento(false)
      meiosPagamentoScrollRef.current.style.cursor = 'grab'
      meiosPagamentoScrollRef.current.style.userSelect = 'auto'
      
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      
      setTimeout(() => {
        hasMovedMeiosPagamentoRef.current = false
      }, 100)
    }
    
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [])
  
  // Ordenar grupos por nome
  const grupos = useMemo(() => {
    if (!gruposData) return []
    return [...gruposData].sort((a, b) => a.getNome().localeCompare(b.getNome()))
  }, [gruposData])
  
  // Ordenar produtos por nome
  const produtosList = useMemo(() => {
    if (!produtosPorGrupoData?.produtos) return []
    return [...produtosPorGrupoData.produtos].sort((a, b) => a.getNome().localeCompare(b.getNome()))
  }, [produtosPorGrupoData])
  const meiosPagamento = useMemo(() => {
    if (!meiosPagamentoData?.pages) return []
    return meiosPagamentoData.pages.flatMap(page => page.meiosPagamento || [])
  }, [meiosPagamentoData])

  // Status disponíveis para vendas do gestor
  const statusDisponiveis = [
    { value: 'ABERTA', label: 'Aberta (Em Andamento)' },
    { value: 'FINALIZADA', label: 'Finalizada' },
    { value: 'PENDENTE_EMISSAO', label: 'Finalizada + Emitir NFe' },
  ]

  // Função para formatar número com separadores de milhar
  const formatarNumeroComMilhar = (valor: number): string => {
    if (valor === 0) return '0,00'
    const partes = valor.toFixed(2).split('.')
    const parteInteira = partes[0]
    const parteDecimal = partes[1]
    
    // Adiciona separadores de milhar
    const parteInteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    return `${parteInteiraFormatada},${parteDecimal}`
  }

  // Função para formatar valor do complemento conforme tipoImpactoPreco (para o modal)
  const formatarValorComplemento = (valor: number, tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'): string => {
    const valorFormatado = formatarNumeroComMilhar(valor)
    const tipo = tipoImpactoPreco || 'nenhum'
    
    switch (tipo) {
      case 'aumenta':
        return `+ ${valorFormatado}`
      case 'diminui':
        return `- ${valorFormatado}`
      case 'nenhum':
      default:
        return `( ${valorFormatado} )`
    }
  }

  // Função para obter total do complemento a exibir na lista (0,00 se nenhum)
  const obterTotalComplemento = (complemento: ComplementoSelecionado): number => {
    const tipo = complemento.tipoImpactoPreco || 'nenhum'
    if (tipo === 'nenhum') {
      return 0
    }
    return complemento.valor * complemento.quantidade
  }

  // Função para calcular o total de um produto (sem complementos) com desconto e acréscimo
  const calcularTotalProduto = (produto: ProdutoSelecionado): number => {
    const valorProduto = produto.valorUnitario * produto.quantidade
    
    // Calcular total dos complementos primeiro
    const valorComplementos = produto.complementos.reduce((sum, comp) => {
      const tipo = comp.tipoImpactoPreco || 'nenhum'
      const valorTotal = comp.valor * comp.quantidade * produto.quantidade
      if (tipo === 'aumenta') {
        return sum + valorTotal
      } else if (tipo === 'diminui') {
        return sum - valorTotal
      }
      return sum
    }, 0)
    
    // Subtotal = produto + complementos (igual ao modal)
    const subtotal = valorProduto + valorComplementos
    
    // Calcular desconto sobre o subtotal (produto + complementos)
    let valorDesconto = 0
    if (produto.tipoDesconto && produto.valorDesconto) {
      if (produto.tipoDesconto === 'porcentagem') {
        valorDesconto = subtotal * (produto.valorDesconto / 100)
      } else {
        valorDesconto = produto.valorDesconto
      }
    }
    
    // Calcular acréscimo sobre o subtotal (produto + complementos)
    let valorAcrescimo = 0
    if (produto.tipoAcrescimo && produto.valorAcrescimo) {
      if (produto.tipoAcrescimo === 'porcentagem') {
        valorAcrescimo = subtotal * (produto.valorAcrescimo / 100)
      } else {
        valorAcrescimo = produto.valorAcrescimo
      }
    }
    
    return subtotal - valorDesconto + valorAcrescimo
  }

  // Função para calcular o total dos complementos de um produto
  const calcularTotalComplementos = (produto: ProdutoSelecionado): number => {
    return produto.complementos.reduce((sum, comp) => {
      const tipo = comp.tipoImpactoPreco || 'nenhum'
      // Multiplicar o valor do complemento pela quantidade do complemento E pela quantidade do produto
      const valorTotal = comp.valor * comp.quantidade * produto.quantidade
      
      if (tipo === 'aumenta') {
        return sum + valorTotal
      } else if (tipo === 'diminui') {
        return sum - valorTotal
      }
      return sum
    }, 0)
  }

  // Função para formatar desconto/acréscimo para exibição
  const formatarDescontoAcrescimo = (produto: ProdutoSelecionado): string => {
    const valorProduto = produto.valorUnitario * produto.quantidade
    const valorComplementos = calcularTotalComplementos(produto)
    const subtotal = valorProduto + valorComplementos
    
    // Verificar desconto
    if (produto.tipoDesconto && produto.valorDesconto) {
      let valorDesconto = 0
      if (produto.tipoDesconto === 'porcentagem') {
        valorDesconto = subtotal * (produto.valorDesconto / 100)
      } else {
        valorDesconto = produto.valorDesconto
      }
      if (valorDesconto > 0) {
        return `Desc. -${formatarNumeroComMilhar(valorDesconto)}`
      }
    }
    
    // Verificar acréscimo
    if (produto.tipoAcrescimo && produto.valorAcrescimo) {
      let valorAcrescimo = 0
      if (produto.tipoAcrescimo === 'porcentagem') {
        valorAcrescimo = subtotal * (produto.valorAcrescimo / 100)
      } else {
        valorAcrescimo = produto.valorAcrescimo
      }
      if (valorAcrescimo > 0) {
        return `Acres. +${formatarNumeroComMilhar(valorAcrescimo)}`
      }
    }
    
    return ''
  }

  // Calcular totais do pedido (produtos com desconto/acréscimo já incluindo complementos)
  const totalProdutos = useMemo(() => {
    return produtos.reduce((sum, p) => {
      // calcularTotalProduto já inclui complementos e aplica desconto/acréscimo sobre o total
      const totalProduto = calcularTotalProduto(p)
      return sum + totalProduto
    }, 0)
  }, [produtos])

  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((sum, p) => sum + p.valor, 0)
  }, [pagamentos])

  // Calcular valor a pagar (restante)
  const valorAPagar = useMemo(() => {
    return Math.max(0, totalProdutos - totalPagamentos)
  }, [totalProdutos, totalPagamentos])

  // Calcular troco (apenas se o último pagamento foi em dinheiro e ultrapassou o valor a pagar)
  const troco = useMemo(() => {
    if (pagamentos.length === 0) return 0
    
    // Verificar o último pagamento
    const ultimoPagamento = pagamentos[pagamentos.length - 1]
    const meioUltimoPagamento = meiosPagamento.find(m => m.getId() === ultimoPagamento.meioPagamentoId)
    
    if (!meioUltimoPagamento) return 0
    
    const nomeMeio = meioUltimoPagamento.getNome().toLowerCase()
    const isDinheiro = nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
    
    // Se o último pagamento foi em dinheiro e ultrapassou o valor que faltava pagar
    if (isDinheiro) {
      // Calcular quanto faltava pagar antes deste último pagamento
      const totalAntesUltimoPagamento = pagamentos.slice(0, -1).reduce((sum, p) => sum + p.valor, 0)
      const valorFaltavaPagar = totalProdutos - totalAntesUltimoPagamento
      
      // Se o valor recebido em dinheiro foi maior que o que faltava, há troco
      if (ultimoPagamento.valor > valorFaltavaPagar) {
        return ultimoPagamento.valor - valorFaltavaPagar
      }
    }
    
    return 0
  }, [totalProdutos, pagamentos, meiosPagamento])

  // Função para obter ícone do meio de pagamento
  const obterIconeMeioPagamento = (nome: string) => {
    const nomeLower = nome.toLowerCase()
    if (nomeLower.includes('dinheiro') || nomeLower.includes('cash')) {
      return MdAttachMoney
    }
    if (nomeLower.includes('pix')) {
      return MdQrCode
    }
    if (nomeLower.includes('credito') || nomeLower.includes('debito') || nomeLower.includes('cartão') || nomeLower.includes('cartao')) {
      return MdCreditCard
    }
    return MdCreditCard // Ícone padrão
  }

  // Função para formatar valor recebido
  const formatarValorRecebido = (valor: string): string => {
    // Remove tudo exceto números
    const apenasNumeros = valor.replace(/\D/g, '')
    if (apenasNumeros === '') return ''
    
    // Converte para número (centavos) e divide por 100
    const valorCentavos = parseInt(apenasNumeros, 10)
    const valorReais = valorCentavos / 100
    
    return formatarNumeroComMilhar(valorReais)
  }

  // Função para verificar se é meio de pagamento em dinheiro
  const isMeioPagamentoDinheiro = (meioPagamentoId: string): boolean => {
    const meio = meiosPagamento.find(m => m.getId() === meioPagamentoId)
    if (!meio) return false
    const nomeMeio = meio.getNome().toLowerCase()
    return nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
  }

  // Função para adicionar pagamento ao clicar no card
  const adicionarPagamentoPorCard = (meioPagamentoIdSelecionado: string) => {
    // Se não houver valor digitado, usar o valor a pagar
    let valorParaUsar = 0
    
    if (valorRecebido && valorRecebido.trim() !== '') {
      // Converter valor formatado para número
      const valorLimpo = valorRecebido.replace(/\./g, '').replace(',', '.')
      valorParaUsar = parseFloat(valorLimpo) || 0
    } else {
      // Se não digitou valor, usar o valor a pagar
      valorParaUsar = valorAPagar
    }

    if (valorParaUsar <= 0) {
      showToast.error('Valor inválido')
      return
    }

    // Verificar se é dinheiro
    const isDinheiro = isMeioPagamentoDinheiro(meioPagamentoIdSelecionado)
    
    // Se não for dinheiro, limitar ao valor a pagar exato
    if (!isDinheiro && valorParaUsar > valorAPagar) {
      showToast.error(`Este meio de pagamento não pode ultrapassar o valor a pagar.`)
      return
    }

    // Se for dinheiro:
    // - Pode ser menor que o valor a pagar (pagamento parcial)
    // - Pode ser igual ao valor a pagar (pagamento exato)
    // - Pode ser maior que o valor a pagar (para calcular troco)
    // Não precisa de validação adicional para dinheiro

    // Permitir usar o mesmo meio de pagamento múltiplas vezes
    // A única restrição é que meios que não são dinheiro não podem ultrapassar o valor a pagar
    setPagamentos([...pagamentos, {
      meioPagamentoId: meioPagamentoIdSelecionado,
      valor: valorParaUsar,
    }])
    
    // Limpar valor recebido
    setValorRecebido('')
  }

  // Função para verificar se o produto tem complementos
  const produtoTemComplementos = (produto: Produto): boolean => {
    const gruposComplementos = produto.getGruposComplementos()
    if (!gruposComplementos || gruposComplementos.length === 0) return false
    
    // Verifica se pelo menos um grupo tem pelo menos um complemento
    return gruposComplementos.some(grupo => 
      grupo.complementos && grupo.complementos.length > 0
    )
  }

  const adicionarProduto = (produtoId: string) => {
    const produto = produtosList.find(p => p.getId() === produtoId)
    if (!produto) return

    const abreComplementos = produto.abreComplementosAtivo()
    const temComplementos = produtoTemComplementos(produto)

    // Se o produto tem complementos e abreComplementos é true, abrir modal antes de adicionar
    if (abreComplementos && temComplementos) {
      setProdutoSelecionadoParaComplementos(produto)
      setProdutoIndexEdicaoComplementos(null) // Novo produto, não está editando
      // Inicializar complementos vazios para novo produto
      setComplementosSelecionados(prev => ({
        ...prev,
        [produto.getId()]: []
      }))
      setModalComplementosOpen(true)
      return
    }

    // Se não tem complementos, adicionar diretamente
    setProdutos([...produtos, {
      produtoId: produto.getId(),
      nome: produto.getNome(),
      quantidade: 1,
      valorUnitario: produto.getValor(),
      complementos: [],
    }])
  }

  // Função para confirmar e adicionar/atualizar produto com complementos
  const confirmarProdutoComComplementos = () => {
    if (!produtoSelecionadoParaComplementos) return

    const produtoId = produtoSelecionadoParaComplementos.getId()
    const complementosAtuais = complementosSelecionados[produtoId] || []
    
    // Criar array de complementos selecionados
    const novosComplementos: ComplementoSelecionado[] = []
    produtoSelecionadoParaComplementos.getGruposComplementos().forEach((grupo: { id: string; nome: string; complementos: Array<{ id: string; nome: string; valor?: number; tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum' }> }) => {
      grupo.complementos.forEach((comp: { id: string; nome: string; valor?: number; tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum' }) => {
        const chaveComp = `${grupo.id}-${comp.id}`
        if (complementosAtuais.includes(chaveComp)) {
          // Se está editando um produto existente, manter a quantidade do complemento existente
          let quantidade = 1
          if (produtoIndexEdicaoComplementos !== null) {
            const produtoExistente = produtos[produtoIndexEdicaoComplementos]
            const complementoExistente = produtoExistente.complementos.find(c => c.grupoId === grupo.id && c.id === comp.id)
            quantidade = complementoExistente?.quantidade || 1
          }
          
          novosComplementos.push({
            id: comp.id,
            grupoId: grupo.id,
            nome: comp.nome,
            valor: comp.valor || 0,
            quantidade,
            tipoImpactoPreco: comp.tipoImpactoPreco || 'nenhum',
          })
        }
      })
    })

    // Se está editando um produto existente, atualizar
    if (produtoIndexEdicaoComplementos !== null) {
      const novosProdutos = [...produtos]
      novosProdutos[produtoIndexEdicaoComplementos] = {
        ...novosProdutos[produtoIndexEdicaoComplementos],
        complementos: novosComplementos,
        // Manter desconto e acréscimo existentes
        tipoDesconto: novosProdutos[produtoIndexEdicaoComplementos].tipoDesconto || null,
        valorDesconto: novosProdutos[produtoIndexEdicaoComplementos].valorDesconto || null,
        tipoAcrescimo: novosProdutos[produtoIndexEdicaoComplementos].tipoAcrescimo || null,
        valorAcrescimo: novosProdutos[produtoIndexEdicaoComplementos].valorAcrescimo || null,
      }
      setProdutos(novosProdutos)
    } else {
      // Adicionar novo produto com complementos à lista
      setProdutos([...produtos, {
        produtoId: produtoSelecionadoParaComplementos.getId(),
        nome: produtoSelecionadoParaComplementos.getNome(),
        quantidade: 1,
        valorUnitario: produtoSelecionadoParaComplementos.getValor(),
        complementos: novosComplementos,
        tipoDesconto: null,
        valorDesconto: null,
        tipoAcrescimo: null,
        valorAcrescimo: null,
      }])
    }

    // Fechar modal e limpar seleção
    setModalComplementosOpen(false)
    setProdutoSelecionadoParaComplementos(null)
    setProdutoIndexEdicaoComplementos(null)
  }

  // Função para abrir modal de complementos para editar produto existente
  const abrirModalComplementosProdutoExistente = (index: number) => {
    const produtoSelecionado = produtos[index]
    const produto = produtosList.find(p => p.getId() === produtoSelecionado.produtoId)
    
    if (!produto) return
    
    const abreComplementos = produto.abreComplementosAtivo()
    const temComplementos = produtoTemComplementos(produto)
    
    if (!abreComplementos || !temComplementos) return
    
    setProdutoSelecionadoParaComplementos(produto)
    setProdutoIndexEdicaoComplementos(index)
    
    // Inicializar complementos já selecionados do produto
    const complementosChaves = produtoSelecionado.complementos.map(comp => `${comp.grupoId}-${comp.id}`)
    setComplementosSelecionados(prev => ({
      ...prev,
      [produto.getId()]: complementosChaves
    }))
    
    setModalComplementosOpen(true)
  }

  // Função para abrir modal de edição de produto
  const abrirModalEdicaoProduto = (index: number) => {
    const produto = produtos[index]
    // Buscar o produto atualizado da lista de produtos para verificar permiteDesconto e permiteAcrescimo
    const produtoEntity = produtosList.find(p => p.getId() === produto.produtoId)
    const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
    const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false
    
    setProdutoIndexEdicao(index)
    setQuantidadeEdicao(Math.floor(produto.quantidade)) // Garantir que seja sempre inteiro
    
    // Verificar se o produto ainda permite desconto/acréscimo e definir valores iniciais
    if (produto.tipoDesconto && produto.valorDesconto) {
      // Se tem desconto, usar desconto
      setEhAcrescimo(false)
      setEhPorcentagem(produto.tipoDesconto === 'porcentagem')
      setValorDescontoAcrescimo(produto.tipoDesconto === 'porcentagem' 
        ? produto.valorDesconto.toString() 
        : formatarNumeroComMilhar(produto.valorDesconto))
    } else if (produto.tipoAcrescimo && produto.valorAcrescimo) {
      // Se tem acréscimo, usar acréscimo
      setEhAcrescimo(true)
      setEhPorcentagem(produto.tipoAcrescimo === 'porcentagem')
      setValorDescontoAcrescimo(produto.tipoAcrescimo === 'porcentagem' 
        ? produto.valorAcrescimo.toString() 
        : formatarNumeroComMilhar(produto.valorAcrescimo))
    } else {
      // Sem desconto nem acréscimo
      setEhAcrescimo(false)
      setEhPorcentagem(false)
      setValorDescontoAcrescimo('0')
    }
    
    setModalEdicaoProdutoOpen(true)
  }

  // Função para confirmar edição do produto
  const confirmarEdicaoProduto = () => {
    if (produtoIndexEdicao === null) return

    const novosProdutos = [...produtos]
    const produtoAtual = novosProdutos[produtoIndexEdicao]
    
    // Buscar o produto atualizado da lista para verificar permiteDesconto e permiteAcrescimo
    const produtoEntity = produtosList.find(p => p.getId() === produtoAtual.produtoId)
    const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
    const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false
    
    // Converter valor de desconto/acréscimo
    let valorNum: number | null = null
    
    // Só processar se houver valor e o produto permitir
    const valorDigitado = valorDescontoAcrescimo && valorDescontoAcrescimo !== '0'
    const podeAplicarDesconto = !ehAcrescimo && permiteDesconto && valorDigitado
    const podeAplicarAcrescimo = ehAcrescimo && permiteAcrescimo && valorDigitado
    
    if (podeAplicarDesconto || podeAplicarAcrescimo) {
      if (ehPorcentagem) {
        // Para porcentagem, o valor já está em porcentagem (0-100)
        valorNum = parseFloat(valorDescontoAcrescimo) || 0
      } else {
        // Para fixo, converter de formato brasileiro para número
        valorNum = parseFloat(valorDescontoAcrescimo.replace(/\./g, '').replace(',', '.')) || 0
      }
    }

    novosProdutos[produtoIndexEdicao] = {
      ...produtoAtual,
      quantidade: Math.floor(quantidadeEdicao), // Garantir que seja sempre inteiro
      tipoDesconto: podeAplicarDesconto ? (ehPorcentagem ? 'porcentagem' : 'fixo') : null,
      valorDesconto: podeAplicarDesconto ? valorNum : null,
      tipoAcrescimo: podeAplicarAcrescimo ? (ehPorcentagem ? 'porcentagem' : 'fixo') : null,
      valorAcrescimo: podeAplicarAcrescimo ? valorNum : null,
    }

    setProdutos(novosProdutos)
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
  }

  const removerProduto = (index: number) => {
    const produtoRemovido = produtos[index]
    setProdutos(produtos.filter((_, i) => i !== index))
    // Limpar complementos selecionados do produto removido
    if (produtoRemovido) {
      setComplementosSelecionados(prev => {
        const novo = { ...prev }
        delete novo[produtoRemovido.produtoId]
        return novo
      })
    }
  }

  const atualizarProduto = (index: number, campo: keyof ProdutoSelecionado, valor: any) => {
    const novosProdutos = [...produtos]
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor }
    setProdutos(novosProdutos)
  }

  const atualizarComplemento = (produtoIndex: number, complementoIndex: number, campo: keyof ComplementoSelecionado, valor: any) => {
    const novosProdutos = [...produtos]
    const novosComplementos = [...novosProdutos[produtoIndex].complementos]
    novosComplementos[complementoIndex] = { ...novosComplementos[complementoIndex], [campo]: valor }
    novosProdutos[produtoIndex] = { ...novosProdutos[produtoIndex], complementos: novosComplementos }
    setProdutos(novosProdutos)
  }

  const removerComplemento = (produtoIndex: number, complementoIndex: number) => {
    const novosProdutos = [...produtos]
    const novosComplementos = novosProdutos[produtoIndex].complementos.filter((_, i) => i !== complementoIndex)
    novosProdutos[produtoIndex] = { ...novosProdutos[produtoIndex], complementos: novosComplementos }
    setProdutos(novosProdutos)
    
    // Atualizar estado de complementos selecionados
    const produtoId = novosProdutos[produtoIndex].produtoId
    const complementoRemovido = produtos[produtoIndex].complementos[complementoIndex]
    const chaveUnicaRemovida = `${complementoRemovido.grupoId}-${complementoRemovido.id}`
    setComplementosSelecionados(prev => {
      const atuais = prev[produtoId] || []
      return {
        ...prev,
        [produtoId]: atuais.filter(chave => chave !== chaveUnicaRemovida)
      }
    })
  }

  const adicionarPagamento = () => {
    if (!meioPagamentoId) {
      showToast.error('Selecione um meio de pagamento')
      return
    }

    const valorRestante = totalProdutos - totalPagamentos
    if (valorRestante <= 0) {
      showToast.error('Valor já está totalmente pago')
      return
    }

    setPagamentos([...pagamentos, {
      meioPagamentoId,
      valor: valorRestante,
    }])
    setMeioPagamentoId('')
  }

  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index))
  }

  const atualizarPagamento = (index: number, valor: number) => {
    const novosPagamentos = [...pagamentos]
    novosPagamentos[index] = { ...novosPagamentos[index], valor }
    setPagamentos(novosPagamentos)
  }

  const handleSubmit = async () => {
    if (produtos.length === 0) {
      showToast.error('Adicione pelo menos um produto')
      return
    }

    // Se status é FINALIZADA ou PENDENTE_EMISSAO, precisa de pagamento
    if ((status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') && pagamentos.length === 0) {
      showToast.error('Adicione pelo menos uma forma de pagamento para vendas finalizadas')
      return
    }

    // Validar se pagamentos cobrem o total
    if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
      const diferenca = totalProdutos - totalPagamentos
      
      // Aceitar quando os pagamentos cobrem exatamente o total (diferença <= 0.01)
      // Ou quando há troco (pagamentos ultrapassam o total, o que é válido para dinheiro)
      const pagamentosCobremTotal = Math.abs(diferenca) <= 0.01
      const temTrocoValido = totalPagamentos > totalProdutos && troco > 0
      
      if (!pagamentosCobremTotal && !temTrocoValido) {
        showToast.error(`Valor dos pagamentos (${transformarParaReal(totalPagamentos)}) não corresponde ao total (${transformarParaReal(totalProdutos)})`)
        return
      }
    }

    try {
      // Construir payload para venda_gestor
      const vendaData: any = {
        origem,
        valorFinal: totalProdutos,
        totalDesconto: 0,
        totalAcrescimo: 0,
        produtos: produtos.map(p => {
          return {
            produtoId: p.produtoId,
            quantidade: p.quantidade,
            valorUnitario: p.valorUnitario,
            tipoDesconto: p.tipoDesconto || null,
            valorDesconto: p.valorDesconto || null,
            tipoAcrescimo: p.tipoAcrescimo || null,
            valorAcrescimo: p.valorAcrescimo || null,
            complementos: (p.complementos || []).map(comp => ({
              complementoId: comp.id,
              grupoComplementoId: comp.grupoId,
              valorUnitario: comp.valor,
              quantidade: comp.quantidade,
            })),
          };
        }),
      }

      // Adicionar clienteId se selecionado
      if (clienteId) {
        vendaData.clienteId = clienteId
      }

      // Se finalizada, adicionar dataFinalizacao e pagamentos
      if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
        vendaData.dataFinalizacao = new Date().toISOString()
        vendaData.pagamentos = pagamentos.map(p => ({
          meioPagamentoId: p.meioPagamentoId,
          valor: p.valor,
        }))
      } else {
        // Venda aberta não tem pagamentos
        vendaData.pagamentos = []
      }

      // Se PENDENTE_EMISSAO, marcar flag para criar resumo fiscal automaticamente
      if (status === 'PENDENTE_EMISSAO') {
        vendaData.solicitarEmissaoFiscal = true
      }

      const resultado = await createVendaGestor.mutateAsync(vendaData)
      console.log('✅ Venda criada com sucesso:', resultado)
      showToast.success('Pedido criado com sucesso!')
      resetForm()
      onSuccess()
    } catch (error: any) {
      console.error('❌ Erro ao criar pedido:', error)
      console.error('❌ Detalhes do erro:', {
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
        stack: error?.stack,
      })
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        error?.message || 
        'Erro ao criar pedido'
      showToast.error(errorMessage)
    }
  }

  const resetForm = () => {
    // Limpar timeouts de long press
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    longPressIndexRef.current = null
    
    // Limpar timeouts de long press de complementos
    if (longPressComplementoTimeoutRef.current) {
      clearTimeout(longPressComplementoTimeoutRef.current)
      longPressComplementoTimeoutRef.current = null
    }
    longPressComplementoIndexRef.current = null
    
    setOrigem('GESTOR')
    setStatus('FINALIZADA')
    setClienteId('')
    setClienteNome('')
    setProdutos([])
    setPagamentos([])
    setMeioPagamentoId('')
    setValorRecebido('')
    setGrupoSelecionadoId(null)
    setCurrentStep(1)
    setComplementosSelecionados({})
    setProdutoSelecionadoParaComplementos(null)
    setModalComplementosOpen(false)
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
    setQuantidadeEdicao(1)
    setEhAcrescimo(false)
    setEhPorcentagem(false)
    setValorDescontoAcrescimo('0')
    
    // Limpar timeouts de long press de complementos
    if (longPressComplementoTimeoutRef.current) {
      clearTimeout(longPressComplementoTimeoutRef.current)
      longPressComplementoTimeoutRef.current = null
    }
    longPressComplementoIndexRef.current = null
  }
  
  // Cleanup de timeouts quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
      if (longPressComplementoTimeoutRef.current) {
        clearTimeout(longPressComplementoTimeoutRef.current)
      }
    }
  }, [])

  // Verifica se há dados da venda que seriam perdidos
  const temDadosVenda = () => {
    return produtos.length > 0 || pagamentos.length > 0 || clienteId !== '' || currentStep > 1
  }

  const handleClose = () => {
    if (temDadosVenda()) {
      setModalConfirmacaoSaidaOpen(true)
    } else {
      resetForm()
      onClose()
    }
  }

  const handleConfirmarSaida = () => {
    resetForm()
    setModalConfirmacaoSaidaOpen(false)
    setInternalDialogOpen(false)
    onClose()
  }

  const handleCancelarSaida = () => {
    setModalConfirmacaoSaidaOpen(false)
  }

  // Sincroniza o estado interno com o prop open
  useEffect(() => {
    setInternalDialogOpen(open)
  }, [open])

  // Buscar nome do usuário gestor quando o modal abrir
  useEffect(() => {
    const fetchNomeUsuario = async () => {
      if (!open || !auth) {
        setNomeUsuario('')
        return
      }

      try {
        setIsLoadingUsuario(true)
        const token = auth.getAccessToken()
        if (!token) {
          setNomeUsuario('')
          return
        }

        // 1. Buscar dados do /api/auth/me para obter o userId
        const meResponse = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!meResponse.ok) {
          setNomeUsuario('')
          return
        }

        const meData = await meResponse.json()
        const userId = meData.sub || meData.userId

        if (!userId) {
          setNomeUsuario('')
          return
        }

        // 2. Buscar dados completos do usuário gestor
        const gestorResponse = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!gestorResponse.ok) {
          // Se não encontrar, tenta usar o nome do User do authStore como fallback
          const user = auth.getUser()
          setNomeUsuario(user?.getName() || '')
          return
        }

        const gestorData = await gestorResponse.json()
        setNomeUsuario(gestorData.nome || gestorData.username || '')
      } catch (error) {
        // Em caso de erro, tenta usar o nome do User do authStore como fallback
        const user = auth.getUser()
        setNomeUsuario(user?.getName() || '')
      } finally {
        setIsLoadingUsuario(false)
      }
    }

    fetchNomeUsuario()
  }, [open, auth])

  // Intercepta o fechamento do Dialog
  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Tentando fechar o modal
      if (temDadosVenda()) {
        // Impede o fechamento e mostra o modal de confirmação
        setInternalDialogOpen(true)
        setModalConfirmacaoSaidaOpen(true)
      } else {
        // Permite o fechamento se não houver dados
        setInternalDialogOpen(false)
        resetForm()
        onClose()
      }
    } else {
      setInternalDialogOpen(true)
    }
  }

  // Validação dos steps
  const canGoToStep2 = () => {
    // Step 1 sempre pode avançar (origem e status têm valores padrão)
    return true
  }

  const canGoToStep3 = () => {
    // Step 2 precisa ter pelo menos um produto
    return produtos.length > 0
  }

  const canSubmit = () => {
    // Step 3 precisa validar pagamentos se status for FINALIZADA ou PENDENTE_EMISSAO
    if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
      if (pagamentos.length === 0) return false
      
      // Aceitar quando os pagamentos cobrem o total (com tolerância de 0.01)
      // Ou quando há troco (pagamentos ultrapassam o total, o que é válido para dinheiro)
      const diferenca = totalProdutos - totalPagamentos
      
      // Se os pagamentos cobrem exatamente o total (diferença <= 0.01)
      if (Math.abs(diferenca) <= 0.01) return true
      
      // Se os pagamentos ultrapassam o total, verificar se há troco válido
      // (significa que foi um pagamento em dinheiro que gerou troco)
      if (totalPagamentos > totalProdutos && troco > 0) return true
      
      // Caso contrário, ainda falta pagar
      return false
    }
    return true
  }

  // Navegação entre steps
  const handleNextStep = () => {
    if (currentStep === 1 && canGoToStep2()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && canGoToStep3()) {
      setCurrentStep(3)
    } else if (currentStep === 2 && !canGoToStep3()) {
      showToast.error('Adicione pelo menos um produto antes de continuar')
    }
  }

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(2)
    }
  }

  return (
    <>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <Dialog 
        open={internalDialogOpen} 
        onOpenChange={handleDialogOpenChange}
        maxWidth={false}
        sx={{
        '& .MuiDialog-container': { 
          zIndex: 1300,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
        },
        '& .MuiBackdrop-root': { zIndex: 1300, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        '& .MuiDialog-paper': { 
          zIndex: 1300, 
          backgroundColor: '#ffffff', 
          opacity: 1, 
          height: '100vh',
          maxHeight: '100vh',
          margin: 0,
          marginLeft: 'auto',
          width: '53rem',
          maxWidth: '100%',
          borderRadius: 0,
        },
      }}
    >
      <DialogContent 
        sx={{ 
          width: '100%',
          height: '100%',
          maxHeight: '100vh', 
          overflow: 'hidden', 
          backgroundColor: '#ffffff', 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Novo Pedido</h1>
            {nomeUsuario && (
              <div className="flex items-center gap-2">
                <MdPerson className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-600 font-medium">Usuário Gestor: <span className="text-primary font-semibold">{nomeUsuario}</span></span>
              </div>
            )}
          </div>
          
          {/* Indicador de Steps */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= 1 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {currentStep > 1 ? (
                  <MdCheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">1</span>
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                Informações
              </span>
            </div>
            
            {/* Linha */}
            <div className={`h-0.5 w-12 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
            
            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= 2 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {currentStep > 2 ? (
                  <MdCheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">2</span>
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                Produtos
              </span>
            </div>
            
            {/* Linha */}
            <div className={`h-0.5 w-12 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />
            
            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= 3 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                <span className="text-sm font-semibold">3</span>
              </div>
              <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
                Pagamento
              </span>
            </div>
          </div>
        </div>

        <div 
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 24px', minHeight: 0 }}
          className="scrollbar-thin"
        >
          {/* STEP 1: Informações do Pedido */}
          {currentStep === 1 && (
            <div className="py-2 space-y-3">
              

              {/* Cliente */}
              <div className="bg-gray-50 rounded-lg p-2 border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MdPersonOutline className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg font-semibold text-primary">Cliente (Opcional)</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={clienteNome}
                    placeholder="Nenhum cliente selecionado"
                    inputProps={{ readOnly: true }}
                    className="flex-1 cursor-pointer bg-white border-primary/30"
                    onClick={() => setSeletorClienteOpen(true)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        padding: '4px 8px',
                        '& input': {
                          padding: '4px 8px',
                        },
                      },
                    }}
                  />
                  {clienteNome && (
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      onClick={handleRemoveCliente}
                      className="flex-shrink-0 border-primary/30 hover:bg-red-50 hover:border-red-300"
                    >
                      <MdDelete className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setSeletorClienteOpen(true)}
                    className="flex-shrink-0 border-primary/30 hover:bg-primary/10"
                  >
                    <MdSearch className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              </div>

              {/* Origem */}
              <div className="bg-gray-50 rounded-lg p-2 border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MdStore className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg font-semibold text-primary">Origem do Pedido</span>
                </div>
                <Select value={origem} onValueChange={(value) => setOrigem(value as OrigemVenda)}>
                  <SelectTrigger className="bg-white border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GESTOR">Gestor (Manual)</SelectItem>
                    <SelectItem value="IFOOD">iFood</SelectItem>
                    <SelectItem value="RAPPI">Rappi</SelectItem>
                    <SelectItem value="OUTROS">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-lg p-2 border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MdInfo className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg font-semibold text-primary">Status do Pedido</span>
                </div>
                <Select value={status} onValueChange={(value) => setStatus(value as StatusVenda)}>
                  <SelectTrigger className="bg-white border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusDisponiveis.map(st => (
                      <SelectItem key={st.value} value={st.value}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2: Seleção de Produtos */}
          {currentStep === 2 && (
            <div className="space-y-2 py-2">
              {/* Área de Edição de Produtos Selecionados */}
              <div 
                className="h-48 border rounded-lg bg-gray-50 overflow-y-auto scrollbar-thin"
              >
                {produtos.length > 0 ? (
                  <div className="p-2">
                    {/* Cabeçalho da tabela */}
                    <div className="flex gap-2 pb-2 border-b border-gray-300 mb-2">
                      <div className="w-[60px] flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs text-center font-semibold text-gray-700">Qtd</span>
                      </div>
                      <div className="flex-[4]">
                        <span className="text-xs font-semibold text-gray-700">Produto</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <span className="text-xs font-semibold text-gray-700 text-right">Desc./Acres.</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <span className="text-xs font-semibold text-gray-700 text-right">Val Unit.</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <span className="text-xs font-semibold text-gray-700 text-right">Total</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <span className="text-xs font-semibold text-gray-700 mr-2">Ações</span>
                      </div>
                    </div>
                    {/* Linhas de produtos */}
                    <div className="space-y-1">
                      {produtos.map((produto, index) => {
                        // calcularTotalProduto já inclui complementos e desconto/acréscimo
                        const totalProdutoComComplementos = calcularTotalProduto(produto)
                        
                        return (
                          <div key={index} className="space-y-0">
                            {/* Linha do Produto Principal */}
                            <div 
                              className={`flex gap-1 items-center rounded ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              } hover:bg-gray-100 cursor-pointer`}
                              onMouseDown={(e) => {
                                // Iniciar long press apenas se não for em um input ou button
                                const target = e.target as HTMLElement
                                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('input')) {
                                  return
                                }
                                
                                longPressIndexRef.current = index
                                longPressTimeoutRef.current = setTimeout(() => {
                                  if (longPressIndexRef.current === index) {
                                    abrirModalEdicaoProduto(index)
                                  }
                                }, 800) // 800ms para long press
                              }}
                              onMouseUp={() => {
                                // Limpar timeout se soltar antes do tempo
                                if (longPressTimeoutRef.current) {
                                  clearTimeout(longPressTimeoutRef.current)
                                  longPressTimeoutRef.current = null
                                }
                                longPressIndexRef.current = null
                              }}
                              onMouseLeave={() => {
                                // Limpar timeout se sair da área
                                if (longPressTimeoutRef.current) {
                                  clearTimeout(longPressTimeoutRef.current)
                                  longPressTimeoutRef.current = null
                                }
                                longPressIndexRef.current = null
                              }}
                            >
                              {/* Quantidade */}
                              <div className="w-[60px] flex-shrink-0">
                                <input
                                  type="number"
                                  min={1}
                                  value={Math.floor(produto.quantidade)}
                                  onChange={(e) => {
                                    const valor = parseInt(e.target.value) || 1
                                    atualizarProduto(index, 'quantidade', Math.max(1, valor))
                                  }}
                                  style={{
                                    MozAppearance: 'textfield',
                                    WebkitAppearance: 'none',
                                    appearance: 'none',
                                  }}
                                  className="w-full h-7 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-primary p-1 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              {/* Nome do Produto */}
                              <div className="flex-[4] min-w-0">
                                <span className="text-xs text-gray-900 truncate block">{produto.nome}</span>
                              </div>
                              {/* Desconto/Acréscimo */}
                              <div className="flex-1">
                                <span className="text-xs text-gray-600 text-right block">
                                  {formatarDescontoAcrescimo(produto)}
                                </span>
                              </div>
                              {/* Valor Unitário */}
                              <div className="flex-1">
                                <input
                                type="text"
                                value={valoresEmEdicao[index] !== undefined 
                                  ? valoresEmEdicao[index]
                                  : (produto.valorUnitario > 0 ? formatarNumeroComMilhar(produto.valorUnitario) : '')
                                }
                                onChange={(e) => {
                                  let valorStr = e.target.value
                                  
                                  // Se vazio, limpa o campo
                                  if (valorStr === '') {
                                    setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                                    atualizarProduto(index, 'valorUnitario', 0)
                                    return
                                  }
                                  
                                  // Remove pontos (separadores de milhar) e vírgula, mantém apenas números
                                  valorStr = valorStr.replace(/\./g, '').replace(',', '').replace(/\D/g, '')
                                  
                                  // Se vazio após limpeza, limpa o campo
                                  if (valorStr === '') {
                                    setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                                    atualizarProduto(index, 'valorUnitario', 0)
                                    return
                                  }
                                  
                                  // Converte para número (centavos) e divide por 100 para obter reais
                                  const valorCentavos = parseInt(valorStr, 10)
                                  const valorReais = valorCentavos / 100
                                  
                                  // Formata com separadores de milhar
                                  const valorFormatado = formatarNumeroComMilhar(valorReais)
                                  
                                  // Atualiza o estado de edição com o valor formatado
                                  setValoresEmEdicao(prev => ({ ...prev, [index]: valorFormatado }))
                                  
                                  // Atualiza o valor do produto
                                  atualizarProduto(index, 'valorUnitario', valorReais)
                                }}
                                onFocus={(e) => {
                                  // Ao focar, mantém o valor formatado (ex: "8,00" ou "1.000.000,00")
                                  const valorAtual = produto.valorUnitario
                                  if (valorAtual > 0) {
                                    const valorFormatado = formatarNumeroComMilhar(valorAtual)
                                    setValoresEmEdicao(prev => ({ ...prev, [index]: valorFormatado }))
                                  } else {
                                    setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                                  }
                                  // Seleciona todo o texto para facilitar substituição
                                  setTimeout(() => e.target.select(), 0)
                                }}
                                onBlur={(e) => {
                                  // Garante formatação correta ao perder o foco
                                  const valor = produto.valorUnitario
                                  if (valor > 0) {
                                    const valorFormatado = formatarNumeroComMilhar(valor)
                                    setValoresEmEdicao(prev => ({ ...prev, [index]: valorFormatado }))
                                    // Remove do estado após um pequeno delay para mostrar formato final
                                    setTimeout(() => {
                                      setValoresEmEdicao(prev => {
                                        const novo = { ...prev }
                                        delete novo[index]
                                        return novo
                                      })
                                    }, 100)
                                  } else {
                                    // Remove do estado se vazio
                                    setValoresEmEdicao(prev => {
                                      const novo = { ...prev }
                                      delete novo[index]
                                      return novo
                                    })
                                  }
                                }}
                                placeholder="0,00"
                                style={{
                                  MozAppearance: 'textfield',
                                  WebkitAppearance: 'none',
                                  appearance: 'none',
                                }}
                                className="w-full h-7 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-primary p-1 text-right"
                              />
                              </div>
                              {/* Total */}
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-gray-900 text-right block">
                                  R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                                </span>
                              </div>
                              {/* Ações (Editar, Complementos e Remover) */}
                              <div className="flex-1 flex justify-end gap-1">
                                <button
                                  onClick={() => abrirModalEdicaoProduto(index)}
                                  type="button"
                                  title="Editar produto"
                                  className="h-7 w-7 p-0 flex items-center justify-center min-w-[28px] min-h-[28px] border-0 hover:bg-gray-200 rounded transition-colors"
                                >
                                  <MdEdit className="w-4 h-4 text-primary" />
                                </button>
                                {(() => {
                                  const produtoEntity = produtosList.find(p => p.getId() === produto.produtoId)
                                  if (!produtoEntity) return null
                                  
                                  const abreComplementos = produtoEntity.abreComplementosAtivo()
                                  const temComplementos = produtoTemComplementos(produtoEntity)
                                  
                                  if (!abreComplementos || !temComplementos) return null
                                  
                                  return (
                                    <button
                                      onClick={() => abrirModalComplementosProdutoExistente(index)}
                                      type="button"
                                      className="h-7 w-7 p-0 flex items-center justify-center min-w-[28px] min-h-[28px] border-0 hover:bg-gray-200 rounded transition-colors"
                                      title="Editar complementos"
                                    >
                                      <MdLaunch className="w-4 h-4 text-primary" />
                                    </button>
                                  )
                                })()}
                                <button
                                  onClick={() => removerProduto(index)}
                                  type="button"
                                  title="Remover produto"
                                  className="h-7 w-7 p-0 flex items-center justify-center min-w-[28px] min-h-[28px] border-0 hover:bg-red-100 rounded transition-colors"
                                >
                                  <MdDelete className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Linhas dos Complementos */}
                            {produto.complementos.map((complemento, compIndex) => {
                              const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                              const valorEmEdicao = valoresEmEdicao[compKey]
                              
                              return (
                                <div
                                  key={compKey}
                                  className={`flex gap-1 items-center rounded -mt-0.5 ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  } hover:bg-gray-100 cursor-pointer`}
                                  style={{ minHeight: '24px' }}
                                  onMouseDown={(e) => {
                                    // Iniciar long press apenas se não for em um input ou button
                                    const target = e.target as HTMLElement
                                    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('input')) {
                                      return
                                    }
                                    
                                    // Verificar se o produto permite editar complementos
                                    const produtoEntity = produtosList.find(p => p.getId() === produto.produtoId)
                                    if (!produtoEntity) return
                                    
                                    const abreComplementos = produtoEntity.abreComplementosAtivo()
                                    const temComplementos = produtoTemComplementos(produtoEntity)
                                    
                                    if (!abreComplementos || !temComplementos) return
                                    
                                    longPressComplementoIndexRef.current = index
                                    longPressComplementoTimeoutRef.current = setTimeout(() => {
                                      if (longPressComplementoIndexRef.current === index) {
                                        abrirModalComplementosProdutoExistente(index)
                                      }
                                    }, 800) // 800ms para long press
                                  }}
                                  onMouseUp={() => {
                                    // Limpar timeout se soltar antes do tempo
                                    if (longPressComplementoTimeoutRef.current) {
                                      clearTimeout(longPressComplementoTimeoutRef.current)
                                      longPressComplementoTimeoutRef.current = null
                                    }
                                    longPressComplementoIndexRef.current = null
                                  }}
                                  onMouseLeave={() => {
                                    // Limpar timeout se sair da área
                                    if (longPressComplementoTimeoutRef.current) {
                                      clearTimeout(longPressComplementoTimeoutRef.current)
                                      longPressComplementoTimeoutRef.current = null
                                    }
                                    longPressComplementoIndexRef.current = null
                                  }}
                                >
                                  {/* Quantidade do Complemento */}
                                  <div className="w-[60px] flex-shrink-0 pl-4">
                                    <input
                                      type="number"
                                      min={1}
                                      value={complemento.quantidade}
                                      onChange={(e) => {
                                        const valor = parseInt(e.target.value) || 1
                                        atualizarComplemento(index, compIndex, 'quantidade', Math.max(1, valor))
                                      }}
                                      style={{
                                        MozAppearance: 'textfield',
                                        WebkitAppearance: 'none',
                                        appearance: 'none',
                                      }}
                                      className="w-full h-5 text-right text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-primary px-1 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  {/* Nome do Complemento com indentação */}
                                  <div className="flex-[4] min-w-0 pl-4">
                                    <span className="text-xs text-gray-600 truncate block leading-tight">
                                      {complemento.nome}
                                    </span>
                                  </div>
                                  {/* Espaço vazio para Desconto/Acréscimo (complementos não têm) */}
                                  <div className="flex-1"></div>
                                  {/* Valor Unitário do Complemento - Apenas exibição */}
                                  <div className="flex-1">
                                    <span className="text-xs text-gray-600 text-right block leading-tight">
                                      {formatarValorComplemento(complemento.valor, complemento.tipoImpactoPreco)}
                                    </span>
                                  </div>
                                  {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                                  <div className="flex-1"></div>
                                  {/* Botão Remover Complemento */}
                                  <div className="flex-1 flex justify-end">
                                    <button
                                      onClick={() => removerComplemento(index, compIndex)}
                                      type="button"
                                      title="Remover complemento"
                                      className="h-5 w-5 p-0 flex items-center justify-center min-w-[20px] min-h-[20px] border-0"
                                    >
                                      <MdClear className="w-3 h-3 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
                  </div>
                )}
              </div>

              {/* Total do Pedido */}
              <div className="flex justify-end items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
                <span className="text-lg font-bold text-primary">
                  {transformarParaReal(totalProdutos)}
                </span>
              </div>

              {/* Produtos - Seleção por Grupos */}
              <div className="space-y-2">
                {/* Grid ou Lista Horizontal de Grupos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2"> 
                  {!grupoSelecionadoId ? (
                    <Label className="text-sm text-gray-600">Selecione um grupo:</Label>
                  ) : (
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => setGrupoSelecionadoId(null)}
                      type="button"
                      className="h-7 p-0 flex items-center justify-center min-w-[28px] min-h-[28px]"
                    >
                      <MdArrowBack className="w-4 h-4" /> Voltar aos grupos
                    </Button>
                  )}
                </div>
              {isLoadingGrupos ? (
                <div className="text-center py-4 text-gray-500">Carregando grupos...</div>
              ) : grupos.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Nenhum grupo encontrado</div>
              ) : !grupoSelecionadoId ? (
                // Grid de Grupos (quando nenhum grupo está selecionado)
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {grupos.map(grupo => {
                    const corHex = grupo.getCorHex()
                    const iconName = grupo.getIconName()
                    return (
                      <div key={grupo.getId()} className="relative">
                        <button
                          onClick={() => setGrupoSelecionadoId(grupo.getId())}
                          className="aspect-square p-2 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center gap-2 hover:opacity-80 overflow-hidden w-full"
                          style={{
                            borderColor: corHex,
                            backgroundColor: `${corHex}15`,
                          }}
                        >
                        <div 
                          className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: corHex,
                          }}
                        >
                          <DinamicIcon iconName={iconName} color={corHex} size={34} />
                        </div>
                        <div className="font-medium text-[10px] text-gray-900 line-clamp-2 overflow-hidden text-ellipsis w-full px-1">
                          {grupo.getNome()}
                        </div>
                      </button>
                    </div>
                  )
                  })}
                </div>
              ) : (
                // Lista Horizontal de Grupos (quando um grupo está selecionado)
                <div 
                  ref={gruposScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin cursor-grab active:cursor-grabbing select-none" 
                  style={{ scrollbarWidth: 'thin' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  {grupos.map(grupo => {
                    const corHex = grupo.getCorHex()
                    const iconName = grupo.getIconName()
                    const isSelected = grupoSelecionadoId === grupo.getId()
                    return (
                      <div key={grupo.getId()} className="relative flex-shrink-0" style={{ width: '100px' }}>
                        <button
                          onClick={(e) => {
                            // Só executar o clique se não houve movimento significativo durante o arraste
                            if (!hasMovedRef.current && !isDragging) {
                              setGrupoSelecionadoId(grupo.getId())
                            }
                          }}
                          onMouseDown={(e) => {
                            // Permitir que o evento propague para o container para iniciar o arraste
                            // O onClick só será executado se não houver movimento
                          }}
                          className="aspect-square p-2 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center gap-2 pointer-events-auto overflow-hidden w-full h-full"
                          style={{
                            borderColor: corHex,
                            backgroundColor: isSelected ? corHex : `${corHex}15`,
                            color: isSelected ? '#ffffff' : '#1f2937',
                          }}
                        >
                        <div 
                          className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0"
                         
                        >
                          <DinamicIcon iconName={iconName} color={isSelected ? '#ffffff' : corHex} size={34} />
                        </div>
                        <div className="font-medium text-[10px] line-clamp-2 overflow-hidden text-ellipsis w-full px-1">
                          {grupo.getNome()}
                        </div>
                      </button>
                    </div>
                    )
                  })}
                </div>
                )}
                </div>

                {/* Grid de Produtos do Grupo Selecionado */}
                {grupoSelecionadoId && (() => {
              const grupoSelecionado = grupos.find(g => g.getId() === grupoSelecionadoId)
              const corHexGrupo = grupoSelecionado?.getCorHex() || '#6b7280'
              return (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    Produtos do grupo: <span className="font-semibold">{grupoSelecionado?.getNome()}</span>
                  </Label>
                  {isLoadingProdutos ? (
                    <div className="text-center py-4 text-gray-500">Carregando produtos...</div>
                  ) : produtosError ? (
                    <div className="text-center py-4 text-red-500">
                      Erro ao carregar produtos: {produtosError instanceof Error ? produtosError.message : 'Erro desconhecido'}
                    </div>
                  ) : produtosList.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">Nenhum produto encontrado neste grupo</div>
                  ) : (
                    <div 
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2"
                      style={{
                        backgroundColor: `${corHexGrupo}15`,
                      }}
                    >
                    {produtosList.map(produto => {
                      return (
                        <div
                          key={produto.getId()}
                          className="relative"
                        >
                          <button
                            onClick={() => adicionarProduto(produto.getId())}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = corHexGrupo
                              e.currentTarget.style.backgroundColor = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = corHexGrupo
                              e.currentTarget.style.backgroundColor = '#ffffff'
                            }}
                            className="aspect-square border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center relative w-full cursor-pointer"
                            style={{
                              borderColor: corHexGrupo,
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <div className="font-medium text-[10px] text-gray-900 break-words mb-1">
                              {produto.getNome()}
                            </div>
                            <div className="text-[10px] font-semibold text-primary-text">
                              {transformarParaReal(produto.getValor())}
                            </div>
                            
                          </button>
                        </div>
                      )
                    })}
                    </div>
                  )}
                </div>
              )
                })()}
              </div>
            </div>
          )}

          {/* STEP 3: Pagamento */}
          {currentStep === 3 && (
            <div className="space-y-2">
              {/* Informações do Pedido */}
              <div className="border rounded-lg px-4 bg-gray-50">
                <h3 className="font-semibold text-lg">Informações do Pedido</h3>
                <div className="text-sm">
                  <div className="flex justify-between bg-white rounded-lg px-1">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">{new Date().toLocaleString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</span>
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-gray-600">Origem:</span>
                    <span className="font-medium">{origem}</span>
                  </div>
                  <div className="flex justify-between bg-white rounded-lg px-1">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{statusDisponiveis.find(s => s.value === status)?.label}</span>
                  </div>
                  {clienteNome && (
                    <div className="flex justify-between px-1">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-medium">{clienteNome}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between bg-white rounded-lg px-1">
                    <span className="text-gray-600">Total de Itens:</span>
                    <span className="font-medium">{produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}</span>
                  </div>
                </div>
              </div>

              {/* Pagamento (se status finalizada ou pendente emissão) */}
              {(status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') && (
                <div className="space-y-4">
                  <div className="border rounded-lg px-4 bg-white">
                    <h3 className="font-semibold text-lg">Pagamento</h3>
                    
                    {/* Total do Pedido e A pagar */}
                    <div className="space-y-2 mb-2 text-sm">
                      <div className="flex justify-between items-center bg-gray-100 rounded-lg p-1">
                        <span className="text-gray-700 font-medium">Total do Pedido:</span>
                        <span className="text-base font-bold text-primary">
                          {transformarParaReal(totalProdutos)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-100 rounded-lg p-1">
                        <span className="text-gray-700 font-medium">A pagar:</span>
                        <span className={`text-base font-bold ${
                          valorAPagar > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transformarParaReal(valorAPagar)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary-text font-medium">Valor Recebido:</span>
                        <input
                          type="text"
                          value={valorRecebido}
                          onChange={(e) => {
                            const valorFormatado = formatarValorRecebido(e.target.value)
                            setValorRecebido(valorFormatado)
                          }}
                          placeholder="0,00"
                          className=" text-right font-semibold border-2 rounded-lg p-1 hover:border-primary-text transition-colors"
                        />
                      </div>
                    </div>

                    {/* Formas de Pagamento - Cards */}
                    <div className="mb-2">
                      <Label className="text-base font-semibold mb-2 block">Forma de Pagamento</Label>
                      <div 
                        ref={meiosPagamentoScrollRef}
                        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin cursor-grab active:cursor-grabbing select-none"
                        style={{ scrollbarWidth: 'thin' }}
                        onMouseDown={handleMouseDownMeiosPagamento}
                      >
                        {meiosPagamento.map(meio => {
                          const Icone = obterIconeMeioPagamento(meio.getNome())
                          
                          return (
                            <button
                              key={meio.getId()}
                              type="button"
                              onClick={(e) => {
                                // Só executar o clique se não houve movimento significativo durante o arraste
                                if (!hasMovedMeiosPagamentoRef.current && !isDraggingMeiosPagamento) {
                                  adicionarPagamentoPorCard(meio.getId())
                                }
                              }}
                              onMouseDown={(e) => {
                                // Permitir que o evento propague para o container para iniciar o arraste
                              }}
                              disabled={valorAPagar <= 0}
                              className={`
                                flex flex-col items-center justify-center gap-1 p-2 border-2 rounded-lg transition-all flex-shrink-0 min-w-[100px]
                                bg-white border-primary hover:bg-primary hover:text-white cursor-pointer
                                ${valorAPagar <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                            >
                              <Icone className="w-8 h-8" />
                              <span className="text-xs font-medium text-center">
                                {meio.getNome()}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Total Pago e Troco */}
                    <div className="border-t pt-2 text-sm">
                      <div className="flex justify-between items-center bg-gray-100 rounded-lg p-1">
                        <span className="text-gray-700 font-semibold">Total Pago:</span>
                        <span className="text-base font-bold text-gray-900">
                          {transformarParaReal(totalPagamentos)}
                        </span>
                      </div>
                      {troco > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-semibold">Troco:</span>
                          <span className="text-base font-bold text-green-600">
                            {transformarParaReal(troco)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detalhes dos Pagamentos Aplicados */}
                    {pagamentos.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <Label className="text-sm font-semibold mb-2 block">Detalhes:</Label>
                        <div className="flex flex-wrap gap-2">
                          {pagamentos.map((pagamento, index) => {
                            const meio = meiosPagamento.find(m => m.getId() === pagamento.meioPagamentoId)
                            const Icone = meio ? obterIconeMeioPagamento(meio.getNome()) : MdCreditCard
                            
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-green-100 rounded-lg border border-green-300"
                              >
                                <Icone className="w-6 h-6 text-green-700" />
                                <div className="flex flex-col">
                                <span className="text-xs font-medium text-green-900">
                                  {meio?.getNome() || 'Meio de pagamento'}
                                </span>
                                <span className="text-xs font-bold text-green-900">
                                  {transformarParaReal(pagamento.valor)}
                                </span>
                                </div>
                                <button
                                  onClick={() => removerPagamento(index)}
                                  type="button"
                                  className="flex-shrink-0 w-8 h-8 p-0 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center"
                                >
                                  <MdDelete className="w-4 h-4 text-green-700" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter sx={{ padding: '16px 24px 24px 24px', flexShrink: 0, borderTop: '1px solid #e5e7eb', marginTop: 0 }}>
          <Button variant="outlined" onClick={handleClose} disabled={createVendaGestor.isPending}>
            Cancelar
          </Button>
          
          {currentStep > 1 && (
            <Button 
              variant="outlined" 
              onClick={handlePreviousStep} 
              disabled={createVendaGestor.isPending}
              className="flex items-center gap-2"
            >
              <MdArrowBack className="w-4 h-4" />
              Anterior
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button 
              onClick={handleNextStep} 
              disabled={
                createVendaGestor.isPending || 
                (currentStep === 2 && !canGoToStep3())
              }
              className="flex items-center gap-2"
            >
              Próximo
              <MdArrowForward className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={createVendaGestor.isPending || !canSubmit()}
              className="flex items-center gap-2"
            >
              {createVendaGestor.isPending ? 'Criando...' : 'Criar Pedido'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <SeletorClienteModal
        open={seletorClienteOpen}
        onClose={() => setSeletorClienteOpen(false)}
        onSelect={handleSelectCliente}
      />

      {/* Modal de Complementos */}
      {modalComplementosOpen && produtoSelecionadoParaComplementos && (() => {
        const produtoId = produtoSelecionadoParaComplementos.getId()
        const complementosAtuais = complementosSelecionados[produtoId] || []
        
        const toggleComplemento = (grupoId: string, complementoId: string) => {
          const chaveUnica = `${grupoId}-${complementoId}`
          
          setComplementosSelecionados(prev => {
            const atuais = prev[produtoId] || []
            const novos = atuais.includes(chaveUnica)
              ? atuais.filter(chave => chave !== chaveUnica)
              : [...atuais, chaveUnica]
            
            return { ...prev, [produtoId]: novos }
          })
        }
        
        return (
          <Dialog 
            open={modalComplementosOpen} 
            onOpenChange={(open) => {
              setModalComplementosOpen(open)
              if (!open) {
                setProdutoSelecionadoParaComplementos(null)
                setProdutoIndexEdicaoComplementos(null)
              }
            }}
            maxWidth={false}
            sx={{
              '& .MuiDialog-paper': {
                width: '500px',
                maxWidth: '500px',
              },
            }}
          >
            <DialogContent>
              <DialogTitle>
                Complementos - {produtoSelecionadoParaComplementos.getNome()}
              </DialogTitle>
              <div className="max-h-96 overflow-y-auto">
                {produtoSelecionadoParaComplementos.getGruposComplementos().length > 0 ? (
                  <div className="space-y-4">
                    {produtoSelecionadoParaComplementos.getGruposComplementos().map((grupo) => (
                      <div key={grupo.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-2">{grupo.nome}</h3>
                        {grupo.complementos && grupo.complementos.length > 0 ? (
                          <div className="space-y-2">
                            {grupo.complementos.map((complemento) => {
                              const chaveUnica = `${grupo.id}-${complemento.id}`
                              const isSelecionado = complementosAtuais.includes(chaveUnica)
                              const valor = complemento.valor || 0
                              const tipoImpactoPreco = complemento.tipoImpactoPreco || 'nenhum'
                              return (
                                <div 
                                  key={chaveUnica} 
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                                  onClick={() => toggleComplemento(grupo.id, complemento.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelecionado}
                                      onChange={() => toggleComplemento(grupo.id, complemento.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm">{complemento.nome}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-primary">
                                    {formatarValorComplemento(valor, tipoImpactoPreco)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum complemento disponível neste grupo</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nenhum complemento disponível para este produto</p>
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outlined"
                  onClick={() => {
                    setModalComplementosOpen(false)
                    setProdutoSelecionadoParaComplementos(null)
                    setProdutoIndexEdicaoComplementos(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmarProdutoComComplementos}>
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Modal de Edição de Produto */}
      {modalEdicaoProdutoOpen && produtoIndexEdicao !== null && (() => {
        const produto = produtos[produtoIndexEdicao]
        const produtoEntity = produtosList.find(p => p.getId() === produto.produtoId)
        const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
        const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false
        
        return (
          <Dialog
            open={modalEdicaoProdutoOpen}
            onOpenChange={(open) => {
              setModalEdicaoProdutoOpen(open)
              if (!open) {
                setProdutoIndexEdicao(null)
              }
            }}
            maxWidth={false}
            sx={{
              '& .MuiDialog-paper': {
                width: '500px',
                maxWidth: '500px',
                backgroundColor: '#f0fdf4', // Light green background
              },
            }}
          >
            <DialogContent sx={{ p: 3 }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 'bold', mb: 1, p: 0 }}>
                    {produto.nome}
                  </DialogTitle>
                  <div className="text-lg font-semibold text-gray-700">
                    {(() => {
                      const valorProduto = produto.valorUnitario * quantidadeEdicao
                      // Calcular complementos com a quantidade em edição
                      const valorComplementos = produto.complementos.reduce((sum, comp) => {
                        const tipo = comp.tipoImpactoPreco || 'nenhum'
                        const valorTotal = comp.valor * comp.quantidade * quantidadeEdicao
                        if (tipo === 'aumenta') {
                          return sum + valorTotal
                        } else if (tipo === 'diminui') {
                          return sum - valorTotal
                        }
                        return sum
                      }, 0)
                      return transformarParaReal(valorProduto + valorComplementos)
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalEdicaoProdutoOpen(false)
                    setProdutoIndexEdicao(null)
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <MdClose className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Quantidade */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-primary mb-3">Quantidade</div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setQuantidadeEdicao(Math.max(1, quantidadeEdicao - 1))}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <MdRemove className="w-5 h-5" />
                  </button>
                  <div className="text-2xl font-semibold text-gray-900 min-w-[60px] text-center">
                    {quantidadeEdicao.toFixed(0)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantidadeEdicao(quantidadeEdicao + 1)}
                    className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                  >
                    <MdAdd className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Desconto/Acréscimo */}
              <div className="bg-white  rounded-lg p-4">
                  
                <div className="text-sm text-center font-semibold text-primary mb-3">Desconto/Acréscimo</div>
                <div className="flex flex-col min-h-24 items-center gap-1">
                <div className="flex w-full items-center justify-between gap-4">
                  {/* Switch Esquerdo: Desconto/Acréscimo */}
                  <div className="flex min-w-[100px] flex-col items-center gap-1">
                    <span className="text-xs text-gray-600">{ehAcrescimo ? 'Acréscimo' : 'Desconto'}</span>
                    <Switch
                      checked={ehAcrescimo}
                      onChange={(e) => {
                        setEhAcrescimo(e.target.checked)
                        // Resetar valor ao mudar tipo
                        setValorDescontoAcrescimo('0')
                      }}
                      color={ehAcrescimo ? "success" : "error"}
                      sx={
                        !ehAcrescimo
                          ? {
                              // Quando for desconto (não marcado), forçar cor vermelha
                              '& .MuiSwitch-switchBase': {
                                color: '#d32f2f',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#d32f2f',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#d32f2f',
                              },
                              '& .MuiSwitch-track': {
                                backgroundColor: '#d32f2f',
                              },
                            }
                          : undefined
                      }
                    />
                  </div>

                  {/* Input Central */}
                  <div className="flex-1 max-w-[100px]">
                    <Input
                      type="text"
                      value={valorDescontoAcrescimo}
                      onChange={(e) => {
                        let valorStr = e.target.value.replace(/\./g, '').replace(',', '').replace(/\D/g, '')
                        if (valorStr === '') {
                          setValorDescontoAcrescimo('0')
                          return
                        }
                        if (ehPorcentagem) {
                          // Para porcentagem, valor de 0 a 100
                          const valorNum = parseInt(valorStr, 10)
                          const valorLimitado = Math.min(100, valorNum)
                          setValorDescontoAcrescimo(valorLimitado.toString())
                        } else {
                          // Para fixo, valor em centavos
                          const valorCentavos = parseInt(valorStr, 10)
                          const valorReais = valorCentavos / 100
                          setValorDescontoAcrescimo(formatarNumeroComMilhar(valorReais))
                        }
                      }}
                      disabled={(ehAcrescimo && !permiteAcrescimo) || (!ehAcrescimo && !permiteDesconto)}
                      className="w-full text-center"
                      placeholder={ehPorcentagem ? '0' : '0,00'}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          padding: '4px 8px',
                          '& input': {
                            padding: '4px 8px',
                            textAlign: 'center',
                          },
                        },
                      }}
                    />
                  </div>

                  {/* Switch Direito: Porcentagem/Valor */}
                  <div className="flex min-w-[100px] flex-col items-center gap-1">
                    <span className="text-xs text-gray-600">{ehPorcentagem ? 'Porcentagem' : 'Valor Fixo'}</span>
                    <Switch
                      checked={ehPorcentagem}
                      onChange={(e) => {
                        setEhPorcentagem(e.target.checked)
                        // Resetar valor ao mudar tipo
                        setValorDescontoAcrescimo('0')
                      }}
                      color="default"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#000000',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#000000',
                        },
                        '& .MuiSwitch-track': {
                          backgroundColor: '#9ca3af',
                        },
                      }}
                    />
                  </div>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                  {((!ehAcrescimo && !permiteDesconto) || (ehAcrescimo && !permiteAcrescimo)) && (
                      <div className="text-xs text-red-600 text-center mt-1">
                        {!ehAcrescimo 
                          ? 'Permitir desconto está desativado para este produto'
                          : 'Permitir acréscimo está desativado para este produto'}
                      </div>
                    )}
                    </div>
                </div>

                {/* Exibir total calculado */}
                {(() => {
                  const valorUnitario = produto.valorUnitario
                  const valorProduto = valorUnitario * quantidadeEdicao
                  // Calcular complementos com a quantidade em edição
                  const valorComplementos = produto.complementos.reduce((sum, comp) => {
                    const tipo = comp.tipoImpactoPreco || 'nenhum'
                    const valorTotal = comp.valor * comp.quantidade * quantidadeEdicao
                    if (tipo === 'aumenta') {
                      return sum + valorTotal
                    } else if (tipo === 'diminui') {
                      return sum - valorTotal
                    }
                    return sum
                  }, 0)
                  const subtotal = valorProduto + valorComplementos // Incluir complementos no subtotal
                  let valorCalculado = 0
                  
                  if (valorDescontoAcrescimo && valorDescontoAcrescimo !== '0') {
                    if (ehPorcentagem) {
                      const percentual = parseFloat(valorDescontoAcrescimo) || 0
                      valorCalculado = subtotal * (percentual / 100) // Aplicar sobre produto + complementos
                    } else {
                      valorCalculado = parseFloat(valorDescontoAcrescimo.replace(/\./g, '').replace(',', '.')) || 0
                    }
                  }
                  
                  const total = ehAcrescimo ? subtotal + valorCalculado : subtotal - valorCalculado
                  
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {transformarParaReal(Math.max(0, total))}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <DialogFooter sx={{ mt: 3, gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setModalEdicaoProdutoOpen(false)
                    setProdutoIndexEdicao(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmarEdicaoProduto}>
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Modal de Confirmação de Saída */}
      <Dialog
        open={modalConfirmacaoSaidaOpen}
        onOpenChange={setModalConfirmacaoSaidaOpen}
        maxWidth="sm"
        sx={{
          '& .MuiDialog-container': {
            zIndex: 1400,
          },
        }}
      >
        <DialogContent sx={{ p: 3 }}>
          <DialogTitle sx={{ mb: 2 }}>
            Confirmar Saída
          </DialogTitle>
          <div style={{ marginBottom: '24px' }}>
            <DialogDescription>
              Você tem certeza que deseja sair? Todos os dados da venda serão perdidos.
            </DialogDescription>
          </div>
          <DialogFooter sx={{ gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleCancelarSaida}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmarSaida}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
    </>
  )
}
