'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { Input } from '@/src/presentation/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { Produto } from '@/src/domain/entities/Produto'
import { Cliente } from '@/src/domain/entities/Cliente'
import { useCreateVendaGestor } from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { MdAdd, MdDelete, MdSearch, MdArrowForward, MdArrowBack, MdCheckCircle } from 'react-icons/md'
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
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [seletorClienteOpen, setSeletorClienteOpen] = useState(false)
  const [tooltipGrupoId, setTooltipGrupoId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  
  // Estado para controlar valores em edição (índice do produto ou chave do complemento -> valor string)
  const [valoresEmEdicao, setValoresEmEdicao] = useState<Record<string | number, string>>({})
  
  // Estados para complementos
  const [produtoSelecionadoParaComplementos, setProdutoSelecionadoParaComplementos] = useState<Produto | null>(null)
  const [modalComplementosOpen, setModalComplementosOpen] = useState(false)
  // Estado para rastrear complementos selecionados por produto (produtoId -> complementoIds[])
  const [complementosSelecionados, setComplementosSelecionados] = useState<Record<string, string[]>>({})
  
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
    const valorFormatado = transformarParaReal(valor)
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

  // Calcular totais
  const totalProdutos = useMemo(() => {
    return produtos.reduce((sum, p) => {
      const valorProduto = p.valorUnitario * p.quantidade
      const valorComplementos = p.complementos.reduce((compSum, comp) => {
        const tipo = comp.tipoImpactoPreco || 'nenhum'
        const valorTotal = comp.valor * comp.quantidade
        
        if (tipo === 'aumenta') {
          return compSum + valorTotal
        } else if (tipo === 'diminui') {
          return compSum - valorTotal
        }
        // nenhum não afeta o total
        return compSum
      }, 0)
      return sum + valorProduto + valorComplementos
    }, 0)
  }, [produtos])

  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((sum, p) => sum + p.valor, 0)
  }, [pagamentos])

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

    const jaExiste = produtos.find(p => p.produtoId === produtoId)
    if (jaExiste) {
      showToast.error('Produto já adicionado')
      return
    }

    setProdutos([...produtos, {
      produtoId: produto.getId(),
      nome: produto.getNome(),
      quantidade: 1,
      valorUnitario: produto.getValor(),
      complementos: [],
    }])
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
      if (Math.abs(diferenca) > 0.01) {
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
        produtos: produtos.map(p => ({
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
          complementos: p.complementos.map(comp => ({
            complementoId: comp.id,
            grupoId: comp.grupoId,
            valor: comp.valor,
            quantidade: comp.quantidade,
          })),
        })),
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

      console.log('📤 Criando venda gestor:', vendaData)
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
    setOrigem('GESTOR')
    setStatus('FINALIZADA')
    setClienteId('')
    setClienteNome('')
    setProdutos([])
    setPagamentos([])
    setMeioPagamentoId('')
    setGrupoSelecionadoId(null)
    setCurrentStep(1)
    setComplementosSelecionados({})
    setProdutoSelecionadoParaComplementos(null)
    setModalComplementosOpen(false)
  }

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
      const diferenca = totalProdutos - totalPagamentos
      return Math.abs(diferenca) <= 0.01
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
          <h1 className="text-2xl font-bold">Novo Pedido</h1>
          
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
            <div className="py-2">
              {/* Origem */}
          <div className="space-y-2">
            <Label>Origem do Pedido</Label>
            <Select value={origem} onValueChange={(value) => setOrigem(value as OrigemVenda)}>
              <SelectTrigger>
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

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente (Opcional)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={clienteNome}
                placeholder="Nenhum cliente selecionado"
                inputProps={{ readOnly: true }}
                className="flex-1 cursor-pointer"
                onClick={() => setSeletorClienteOpen(true)}
              />
              {clienteNome && (
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={handleRemoveCliente}
                  className="flex-shrink-0"
                >
                  <MdDelete className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="outlined"
                onClick={() => setSeletorClienteOpen(true)}
                className="flex-shrink-0"
              >
                <MdSearch className="w-4 h-4" />
              </Button>
            </div>
          </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status do Pedido</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as StatusVenda)}>
                  <SelectTrigger>
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
                        <span className="text-xs font-semibold text-gray-700 text-right">Val Unit.</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <span className="text-xs font-semibold text-gray-700 text-right">Total</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <span className="text-xs font-semibold text-gray-700 mr-2">Remover</span>
                      </div>
                    </div>
                    {/* Linhas de produtos */}
                    <div className="space-y-1">
                      {produtos.map((produto, index) => {
                        const totalProduto = produto.valorUnitario * produto.quantidade
                        
                        return (
                          <div key={index} className="space-y-0">
                            {/* Linha do Produto Principal */}
                            <div 
                              className={`flex gap-1 items-center rounded ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              } hover:bg-gray-100`}
                            >
                              {/* Quantidade */}
                              <div className="w-[60px] flex-shrink-0">
                                <input
                                  type="number"
                                  min={1}
                                  value={produto.quantidade}
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
                                  R$ {formatarNumeroComMilhar(totalProduto)}
                                </span>
                              </div>
                              {/* Botão Remover */}
                              <div className="flex-1 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removerProduto(index)}
                                  type="button"
                                  className="h-7 w-7 p-0 flex items-center justify-center min-w-[28px] min-h-[28px] border-0"
                                >
                                  <MdDelete className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Linhas dos Complementos */}
                            {produto.complementos.map((complemento, compIndex) => {
                              const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                              const valorEmEdicao = valoresEmEdicao[compKey]
                              
                              return (
                                <div
                                  key={compKey}
                                  className={`flex gap-1 items-center rounded ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  } hover:bg-gray-100`}
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
                                      className="w-full h-7 text-right text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-primary px-2 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </div>
                                  {/* Nome do Complemento com indentação */}
                                  <div className="flex-[4] min-w-0 pl-4">
                                    <span className="text-xs text-gray-600 truncate block">
                                      {complemento.nome}
                                    </span>
                                  </div>
                                  {/* Valor Unitário do Complemento - Editável */}
                                  <div className="flex-1">
                                    {complemento.tipoImpactoPreco === 'nenhum' ? (
                                      <span className="text-xs text-gray-600 text-right block">
                                        -
                                      </span>
                                    ) : (
                                      <div className="flex items-center justify-end gap-1">
                                       
                                        <input
                                          type="text"
                                          value={valorEmEdicao !== undefined 
                                            ? valorEmEdicao
                                            : (complemento.valor > 0 ? formatarNumeroComMilhar(complemento.valor) : '')
                                          }
                                          onChange={(e) => {
                                            let valorStr = e.target.value
                                            
                                            if (valorStr === '') {
                                              setValoresEmEdicao(prev => ({ ...prev, [compKey]: '' }))
                                              atualizarComplemento(index, compIndex, 'valor', 0)
                                              return
                                            }
                                            
                                            valorStr = valorStr.replace(/\./g, '').replace(',', '').replace(/\D/g, '')
                                            
                                            if (valorStr === '') {
                                              setValoresEmEdicao(prev => ({ ...prev, [compKey]: '' }))
                                              atualizarComplemento(index, compIndex, 'valor', 0)
                                              return
                                            }
                                            
                                            const valorCentavos = parseInt(valorStr, 10)
                                            const valorReais = valorCentavos / 100
                                            const valorFormatado = formatarNumeroComMilhar(valorReais)
                                            
                                            setValoresEmEdicao(prev => ({ ...prev, [compKey]: valorFormatado }))
                                            atualizarComplemento(index, compIndex, 'valor', valorReais)
                                          }}
                                          onFocus={(e) => {
                                            const valorAtual = complemento.valor
                                            if (valorAtual > 0) {
                                              const valorFormatado = formatarNumeroComMilhar(valorAtual)
                                              setValoresEmEdicao(prev => ({ ...prev, [compKey]: valorFormatado }))
                                            } else {
                                              setValoresEmEdicao(prev => ({ ...prev, [compKey]: '' }))
                                            }
                                            setTimeout(() => e.target.select(), 0)
                                          }}
                                          onBlur={(e) => {
                                            const valor = complemento.valor
                                            if (valor > 0) {
                                              const valorFormatado = formatarNumeroComMilhar(valor)
                                              setValoresEmEdicao(prev => ({ ...prev, [compKey]: valorFormatado }))
                                              setTimeout(() => {
                                                setValoresEmEdicao(prev => {
                                                  const novo = { ...prev }
                                                  delete novo[compKey]
                                                  return novo
                                                })
                                              }, 100)
                                            } else {
                                              setValoresEmEdicao(prev => {
                                                const novo = { ...prev }
                                                delete novo[compKey]
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
                                    )}
                                  </div>
                                  {/* Total do Complemento */}
                                  <div className="flex-1">
                                    <span className="text-xs font-semibold text-gray-600 text-right block">
                                      {complemento.tipoImpactoPreco === 'nenhum' ? (
                                        <>-</>
                                      ) : complemento.tipoImpactoPreco === 'aumenta' ? (
                                        <>+ R$ {formatarNumeroComMilhar(obterTotalComplemento(complemento))}</>
                                      ) : complemento.tipoImpactoPreco === 'diminui' ? (
                                        <>- R$ {formatarNumeroComMilhar(obterTotalComplemento(complemento))}</>
                                      ) : (
                                        <>R$ {formatarNumeroComMilhar(obterTotalComplemento(complemento))}</>
                                      )}
                                    </span>
                                  </div>
                                  {/* Botão Remover Complemento */}
                                  <div className="flex-1 flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removerComplemento(index, compIndex)}
                                      type="button"
                                      className="h-7 w-7 p-0 flex items-center justify-center min-w-[28px] min-h-[28px] border-0"
                                    >
                                      <MdDelete className="w-4 h-4 text-red-500" />
                                    </Button>
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
                    const showTooltip = tooltipGrupoId === grupo.getId()
                    return (
                      <div key={grupo.getId()} className="relative">
                        <button
                          onClick={() => setGrupoSelecionadoId(grupo.getId())}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipGrupoId(grupo.getId())
                            setTooltipPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10,
                            })
                          }}
                          onMouseLeave={() => {
                            setTooltipGrupoId(null)
                            setTooltipPosition(null)
                          }}
                          className="aspect-square p-2 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center gap-2 hover:opacity-80 overflow-hidden w-full"
                          style={{
                            borderColor: corHex,
                            backgroundColor: `${corHex}15`,
                          }}
                        >
                        <div 
                          className="w-[40px] h-[40px] bg-info rounded-lg border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: corHex,
                          }}
                        >
                          <DinamicIcon iconName={iconName} color={corHex} size={24} />
                        </div>
                        <div className="font-medium text-[10px] text-gray-900 line-clamp-2 overflow-hidden text-ellipsis w-full px-1">
                          {grupo.getNome()}
                        </div>
                      </button>
                      {showTooltip && tooltipPosition && (
                        <div
                          className="absolute z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg pointer-events-none"
                          style={{
                            left: '50%',
                            top: '30px',
                            transform: 'translate(-50%, -100%)',
                            maxWidth: '120px',
                          }}
                        >
                          <span className="w-[105px] block text-[10px] text-center font-medium text-gray-900 break-words">{grupo.getNome()}</span>
                         
                          
                        </div>
                      )}
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
                    const showTooltip = tooltipGrupoId === grupo.getId()
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
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltipGrupoId(grupo.getId())
                            setTooltipPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10,
                            })
                          }}
                          onMouseLeave={() => {
                            setTooltipGrupoId(null)
                            setTooltipPosition(null)
                          }}
                          className="aspect-square p-2 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center gap-2 pointer-events-auto overflow-hidden w-full h-full"
                          style={{
                            borderColor: corHex,
                            backgroundColor: isSelected ? corHex : `${corHex}15`,
                            color: isSelected ? '#ffffff' : '#1f2937',
                          }}
                        >
                        <div 
                          className="w-[40px] h-[40px] rounded-lg border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected ? '#ffffff' : corHex,
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                          }}
                        >
                          <DinamicIcon iconName={iconName} color={isSelected ? '#ffffff' : corHex} size={24} />
                        </div>
                        <div className="font-medium text-[10px] line-clamp-2 overflow-hidden text-ellipsis w-full px-1">
                          {grupo.getNome()}
                        </div>
                      </button>
                      {showTooltip && tooltipPosition && (
                        <div
                          className="absolute z-50 p-1 bg-white bg-opacity-80 border border-gray-300 rounded-lg shadow-lg pointer-events-none"
                          style={{
                            left: '50%',
                            top: '0%',
                            marginTop: '2px',
                            transform: 'translateX(-50%)',
                            maxWidth: '120px',
                          }}
                        >
                          <span className="max-w-[120px] min-w-[100px] block text-[10px] text-center font-medium text-gray-900 break-words">{grupo.getNome()}</span>
                        </div>
                      )}
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
                      const jaAdicionado = produtos.find(p => p.produtoId === produto.getId())
                      const temComplementos = produtoTemComplementos(produto)
                      // Botão aparece se o produto está adicionado E tem complementos
                      const mostrarBotaoComplemento = !!jaAdicionado && temComplementos
                      
                      return (
                        <div
                          key={produto.getId()}
                          className="relative"
                        >
                          <button
                            onClick={() => !jaAdicionado && adicionarProduto(produto.getId())}
                            disabled={!!jaAdicionado}
                            onMouseEnter={(e) => {
                              if (!jaAdicionado) {
                                e.currentTarget.style.borderColor = corHexGrupo
                                e.currentTarget.style.backgroundColor = '#ffffff'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!jaAdicionado) {
                                e.currentTarget.style.borderColor = corHexGrupo
                                e.currentTarget.style.backgroundColor = '#ffffff'
                              }
                            }}
                            className={`aspect-square border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center relative w-full ${
                              jaAdicionado
                                ? 'cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                            style={{
                              borderColor: corHexGrupo,
                              backgroundColor: jaAdicionado ? `${corHexGrupo}15` : '#ffffff',
                            }}
                          >
                            <div className="font-medium text-[10px] text-gray-900 break-words mb-1">
                              {produto.getNome()}
                            </div>
                            <div className="text-[10px] font-semibold text-primary-text">
                              {transformarParaReal(produto.getValor())}
                            </div>
                            
                          </button>
                          {/* Botão Complemento - aparece quando o produto está adicionado e tem complementos */}
                          {mostrarBotaoComplemento && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setProdutoSelecionadoParaComplementos(produto)
                                // Inicializar complementos já selecionados
                                if (jaAdicionado) {
                                  const complementosChaves = jaAdicionado.complementos.map(comp => `${comp.grupoId}-${comp.id}`)
                                  setComplementosSelecionados(prev => ({
                                    ...prev,
                                    [produto.getId()]: complementosChaves
                                  }))
                                }
                                setModalComplementosOpen(true)
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation()
                              }}
                              className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-corHexGrupo text-white text-[8px] px-2 py-1 rounded hover:bg-primary-dark transition-colors z-20"
                              style={{ minWidth: '60px', pointerEvents: 'auto', backgroundColor: corHexGrupo }}
                            >
                              Complementos
                            </button>
                          )}
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
            <div className="space-y-4 py-4">
              {/* Resumo do Pedido */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-lg mb-3">Resumo do Pedido</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Origem:</span>
                    <span className="font-medium">{origem}</span>
                  </div>
                  {clienteNome && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-medium">{clienteNome}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{statusDisponiveis.find(s => s.value === status)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Produtos:</span>
                    <span className="font-medium">{produtos.length}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-900 font-semibold">Total:</span>
                    <span className="text-primary font-bold text-lg">{transformarParaReal(totalProdutos)}</span>
                  </div>
                </div>
              </div>

              {/* Lista de Produtos Selecionados */}
              {produtos.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  <Label className="text-base font-semibold">Produtos Selecionados</Label>
                  {produtos.map((produto, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{produto.nome}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-gray-600">Qtd: {produto.quantidade}</span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-600">Unit: {transformarParaReal(produto.valorUnitario)}</span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-sm font-semibold">
                            Total: {transformarParaReal(produto.valorUnitario * produto.quantidade)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagamentos (se status finalizada ou pendente emissão) */}
              {(status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') && (
                <div className="space-y-2">
              <Label>Formas de Pagamento</Label>
              <div className="flex gap-2">
                <Select value={meioPagamentoId} onValueChange={setMeioPagamentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um meio de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {meiosPagamento.map(meio => (
                      <SelectItem key={meio.getId()} value={meio.getId()}>
                        {meio.getNome()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={adicionarPagamento} type="button">
                  <MdAdd className="w-4 h-4" />
                </Button>
              </div>

              {/* Lista de Pagamentos */}
              {pagamentos.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  {pagamentos.map((pagamento, index) => {
                    const meio = meiosPagamento.find(m => m.getId() === pagamento.meioPagamentoId)
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium">{meio?.getNome() || 'Meio de pagamento'}</p>
                          <div className="flex gap-2 items-center mt-1">
                            <Label className="text-xs">Valor:</Label>
                            <Input
                              type="number"
                              inputProps={{ min: 0, step: 0.01 }}
                              value={pagamento.valor}
                              onChange={(e) => {
                                const valor = parseFloat(e.target.value) || 0
                                atualizarPagamento(index, Math.max(0, valor))
                              }}
                              className="w-32 h-8"
                            />
                          </div>
                        </div>
                        <Button
                          variant="outlined"
                          size="sm"
                          onClick={() => removerPagamento(index)}
                          type="button"
                        >
                          <MdDelete className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t">
                    <p className="text-right">
                      Total Pago: {transformarParaReal(totalPagamentos)}
                    </p>
                    <p className={`text-right ${Math.abs(totalProdutos - totalPagamentos) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      Restante: {transformarParaReal(totalProdutos - totalPagamentos)}
                    </p>
                  </div>
                </div>
                )}
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
            
            // Atualizar complementos no produto selecionado
            const produtoIndex = produtos.findIndex(p => p.produtoId === produtoId)
            if (produtoIndex !== -1) {
              const produto = produtosList.find(p => p.getId() === produtoId)
              if (produto) {
                const novosComplementos: ComplementoSelecionado[] = []
                produto.getGruposComplementos().forEach((grupo: { id: string; nome: string; complementos: Array<{ id: string; nome: string; valor?: number }> }) => {
                  grupo.complementos.forEach((comp: { id: string; nome: string; valor?: number; tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum' }) => {
                    const chaveComp = `${grupo.id}-${comp.id}`
                    if (novos.includes(chaveComp)) {
                      // Verificar se o complemento já existe para manter a quantidade
                      const produtoAtual = produtos[produtoIndex]
                      const complementoExistente = produtoAtual.complementos.find(c => c.grupoId === grupo.id && c.id === comp.id)
                      novosComplementos.push({
                        id: comp.id,
                        grupoId: grupo.id,
                        nome: comp.nome,
                        valor: comp.valor || 0,
                        quantidade: complementoExistente?.quantidade || 1,
                        tipoImpactoPreco: comp.tipoImpactoPreco || 'nenhum',
                      })
                    }
                  })
                })
                
                const novosProdutos = [...produtos]
                novosProdutos[produtoIndex] = {
                  ...novosProdutos[produtoIndex],
                  complementos: novosComplementos,
                }
                setProdutos(novosProdutos)
              }
            }
            
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
                <Button onClick={() => {
                  setModalComplementosOpen(false)
                  setProdutoSelecionadoParaComplementos(null)
                }}>
                  Fechar
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
