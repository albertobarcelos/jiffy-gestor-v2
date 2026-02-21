'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/src/presentation/components/ui/dialog'
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
import { MdAdd, MdDelete, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { SeletorClienteModal } from './SeletorClienteModal'

interface NovoPedidoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ProdutoSelecionado {
  produtoId: string
  nome: string
  quantidade: number
  valorUnitario: number
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
  
  // Estados para arrastar a lista horizontal
  const gruposScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
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
    setStartX(e.pageX - gruposScrollRef.current.offsetLeft)
    setScrollLeft(gruposScrollRef.current.scrollLeft)
    gruposScrollRef.current.style.cursor = 'grabbing'
    gruposScrollRef.current.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !gruposScrollRef.current) return
    
    const x = e.pageX - gruposScrollRef.current.offsetLeft
    const walk = (x - startX) * 2 // Velocidade do scroll (ajustável)
    
    // Verificar se houve movimento significativo (mais de 5px)
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (hasMovedRef.current) {
      gruposScrollRef.current.scrollLeft = scrollLeft - walk
    }
  }, [isDragging, startX, scrollLeft])

  const handleMouseUp = useCallback(() => {
    if (!gruposScrollRef.current) return
    setIsDragging(false)
    gruposScrollRef.current.style.cursor = 'grab'
    gruposScrollRef.current.style.userSelect = 'auto'
    // Reset após um pequeno delay para permitir que o onClick do botão seja processado
    setTimeout(() => {
      hasMovedRef.current = false
    }, 100)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (!gruposScrollRef.current) return
    setIsDragging(false)
    gruposScrollRef.current.style.cursor = 'grab'
    gruposScrollRef.current.style.userSelect = 'auto'
    hasMovedRef.current = false
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

  // Calcular totais
  const totalProdutos = useMemo(() => {
    return produtos.reduce((sum, p) => sum + (p.valorUnitario * p.quantidade), 0)
  }, [produtos])

  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((sum, p) => sum + p.valor, 0)
  }, [pagamentos])

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
    }])
  }

  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index))
  }

  const atualizarProduto = (index: number, campo: keyof ProdutoSelecionado, valor: any) => {
    const novosProdutos = [...produtos]
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor }
    setProdutos(novosProdutos)
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
          complementos: [], // Pode ser expandido futuramente
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
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleClose}
      maxWidth={false}
      sx={{
        '& .MuiDialog-container': { 
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '& .MuiBackdrop-root': { zIndex: 1300, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        '& .MuiDialog-paper': { 
          zIndex: 1300, 
          backgroundColor: '#ffffff', 
          opacity: 1, 
          maxHeight: '90vh',
          margin: '32px',
          width: 'auto',
          maxWidth: 'calc(100% - 64px)',
        },
      }}
    >
      <DialogContent 
        sx={{ 
          width: '48rem',
          maxWidth: '100%',
          maxHeight: '90vh', 
          overflow: 'hidden', 
          backgroundColor: '#ffffff', 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
          <DialogTitle>Novo Pedido</DialogTitle>
        </div>

        <div 
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 24px', minHeight: 0 }}
          className="scrollbar-thin"
        >
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

          {/* Produtos - Seleção por Grupos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Produtos</Label>
              {grupoSelecionadoId && (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setGrupoSelecionadoId(null)}
                  type="button"
                >
                  Voltar
                </Button>
              )}
            </div>
            
            {/* Grid ou Lista Horizontal de Grupos */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Selecione um grupo:</Label>
              {isLoadingGrupos ? (
                <div className="text-center py-4 text-gray-500">Carregando grupos...</div>
              ) : grupos.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Nenhum grupo encontrado</div>
              ) : !grupoSelecionadoId ? (
                // Grid de Grupos (quando nenhum grupo está selecionado)
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {grupos.map(grupo => {
                    const corHex = grupo.getCorHex()
                    const iconName = grupo.getIconName()
                    return (
                      <button
                        key={grupo.getId()}
                        onClick={() => setGrupoSelecionadoId(grupo.getId())}
                        className="aspect-square p-4 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center gap-2 hover:opacity-80"
                        style={{
                          borderColor: corHex,
                          backgroundColor: `${corHex}15`,
                        }}
                      >
                        <div 
                          className="w-[45px] h-[45px] bg-info rounded-lg border-2 flex items-center justify-center"
                          style={{
                            borderColor: corHex,
                          }}
                        >
                          <DinamicIcon iconName={iconName} color={corHex} size={24} />
                        </div>
                        <div className="font-medium text-sm text-gray-900 break-words">
                          {grupo.getNome()}
                        </div>
                      </button>
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
                      <button
                        key={grupo.getId()}
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
                        className="flex-shrink-0 aspect-square p-4 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center gap-2 min-w-[120px] pointer-events-auto"
                        style={{
                          borderColor: corHex,
                          backgroundColor: isSelected ? corHex : `${corHex}15`,
                          color: isSelected ? '#ffffff' : '#1f2937',
                        }}
                      >
                        <div 
                          className="w-[45px] h-[45px] rounded-lg border-2 flex items-center justify-center"
                          style={{
                            borderColor: isSelected ? '#ffffff' : corHex,
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                          }}
                        >
                          <DinamicIcon iconName={iconName} color={isSelected ? '#ffffff' : corHex} size={24} />
                        </div>
                        <div className="font-medium text-sm break-words">
                          {grupo.getNome()}
                        </div>
                      </button>
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
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3"
                      style={{
                        backgroundColor: `${corHexGrupo}15`,
                      }}
                    >
                    {produtosList.map(produto => {
                      const jaAdicionado = produtos.find(p => p.produtoId === produto.getId())
                      const isDisabled = !!jaAdicionado
                      return (
                        <button
                          key={produto.getId()}
                          onClick={() => !jaAdicionado && adicionarProduto(produto.getId())}
                          disabled={isDisabled}
                          className={`aspect-square p-3 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center ${
                            jaAdicionado
                              ? 'cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                          style={{
                            borderColor: corHexGrupo,
                            backgroundColor: jaAdicionado ? `${corHexGrupo}15` : '#ffffff',
                          }}
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
                        >
                          <div className="font-medium text-xs text-gray-900 break-words mb-1">
                            {produto.getNome()}
                          </div>
                          <div className="text-xs font-semibold text-primary-text">
                            {transformarParaReal(produto.getValor())}
                          </div>
                          {jaAdicionado && (
                            <div className="text-xs mt-1" style={{ color: corHexGrupo }}>✓ Adicionado</div>
                          )}
                        </button>
                      )
                    })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Lista de Produtos */}
            {produtos.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3">
                {produtos.map((produto, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{produto.nome}</p>
                      <div className="flex gap-2 items-center mt-1">
                        <Label className="text-xs">Qtd:</Label>
                        <Input
                          type="number"
                          inputProps={{ min: 1 }}
                          value={produto.quantidade}
                          onChange={(e) => {
                            const valor = parseInt(e.target.value) || 1
                            atualizarProduto(index, 'quantidade', Math.max(1, valor))
                          }}
                          className="w-20 h-8"
                        />
                        <Label className="text-xs">Valor Unit.:</Label>
                        <Input
                          type="number"
                          inputProps={{ min: 0, step: 0.01 }}
                          value={produto.valorUnitario}
                          onChange={(e) => {
                            const valor = parseFloat(e.target.value) || 0
                            atualizarProduto(index, 'valorUnitario', Math.max(0, valor))
                          }}
                          className="w-32 h-8"
                        />
                        <span className="text-sm font-semibold">
                          Total: {transformarParaReal(produto.valorUnitario * produto.quantidade)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => removerProduto(index)}
                      type="button"
                    >
                      <MdDelete className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <p className="text-right font-semibold">
                    Total: {transformarParaReal(totalProdutos)}
                  </p>
                </div>
              </div>
            )}
          </div>

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

        <DialogFooter sx={{ padding: '16px 24px 24px 24px', flexShrink: 0, borderTop: '1px solid #e5e7eb', marginTop: 0 }}>
          <Button variant="outlined" onClick={handleClose} disabled={createVendaGestor.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createVendaGestor.isPending}>
            {createVendaGestor.isPending ? 'Criando...' : 'Criar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <SeletorClienteModal
        open={seletorClienteOpen}
        onClose={() => setSeletorClienteOpen(false)}
        onSelect={handleSelectCliente}
      />
    </Dialog>
  )
}
