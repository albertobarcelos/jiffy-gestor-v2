'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Label } from '@/src/presentation/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/presentation/components/ui/select'
import { Input } from '@/src/presentation/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { useClientes } from '@/src/presentation/hooks/useClientes'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { Produto } from '@/src/domain/entities/Produto'
import { useCreateVenda } from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { MdAdd, MdDelete, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'

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

type TipoVenda = 'balcao' | 'mesa' | 'delivery'
type EtapaInicial = 
  | 'EM_ANALISE' 
  | 'EM_PRODUCAO' 
  | 'PRONTOS_ENTREGA' 
  | 'COM_ENTREGADOR' 
  | 'FINALIZADAS' 
  | 'PENDENTE_EMISSAO'

export function NovoPedidoModal({ open, onClose, onSuccess }: NovoPedidoModalProps) {
  const { auth } = useAuthStore()
  const createVenda = useCreateVenda()
  
  const [tipoVenda, setTipoVenda] = useState<TipoVenda>('balcao')
  const [clienteId, setClienteId] = useState<string>('')
  const [numeroMesa, setNumeroMesa] = useState<string>('')
  const [etapaInicial, setEtapaInicial] = useState<EtapaInicial>('FINALIZADAS')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoSelecionado[]>([])
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>('')
  const [buscaCliente, setBuscaCliente] = useState<string>('')
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)

  // Buscar clientes
  const { data: clientesData, isLoading: isLoadingClientes } = useClientes({
    q: buscaCliente,
    limit: 50,
    ativo: true,
  })

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

  const clientes = clientesData?.clientes || []
  
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

  // Obter etapas disponíveis baseado no tipo de venda
  const etapasDisponiveis = useMemo(() => {
    if (tipoVenda === 'delivery') {
      return [
        { value: 'EM_ANALISE', label: 'Em análise' },
        { value: 'EM_PRODUCAO', label: 'Em Produção' },
        { value: 'PRONTOS_ENTREGA', label: 'Prontos para Entrega' },
        { value: 'COM_ENTREGADOR', label: 'Com entregador' },
        { value: 'FINALIZADAS', label: 'Finalizadas' },
        { value: 'PENDENTE_EMISSAO', label: 'Pendente Emissão Fiscal' },
      ]
    } else {
      return [
        { value: 'FINALIZADAS', label: 'Finalizadas' },
        { value: 'PENDENTE_EMISSAO', label: 'Pendente Emissão Fiscal' },
      ]
    }
  }, [tipoVenda])

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

    if (tipoVenda === 'mesa' && !numeroMesa) {
      showToast.error('Informe o número da mesa')
      return
    }

    // Se etapa é FINALIZADAS ou PENDENTE_EMISSAO, precisa de pagamento
    if ((etapaInicial === 'FINALIZADAS' || etapaInicial === 'PENDENTE_EMISSAO') && pagamentos.length === 0) {
      showToast.error('Adicione pelo menos uma forma de pagamento')
      return
    }

    // Validar se pagamentos cobrem o total
    if (etapaInicial === 'FINALIZADAS' || etapaInicial === 'PENDENTE_EMISSAO') {
      const diferenca = totalProdutos - totalPagamentos
      if (Math.abs(diferenca) > 0.01) {
        showToast.error(`Valor dos pagamentos (${transformarParaReal(totalPagamentos)}) não corresponde ao total (${transformarParaReal(totalProdutos)})`)
        return
      }
    }

    try {
      // Obter empresaId do token
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      const tokenInfo = extractTokenInfo(token)
      if (!tokenInfo.empresaId) {
        showToast.error('Empresa não identificada')
        return
      }

      if (!tokenInfo.userId) {
        showToast.error('Usuário não identificado')
        return
      }

      const empresaId = tokenInfo.empresaId
      const userId = tokenInfo.userId
      
      console.log('🔍 Token Info:', { empresaId, userId })

      // Mapear etapa inicial para statusVenda e flags
      let statusVenda: string | undefined
      let dataFinalizacao: string | undefined
      let solicitarEmissaoFiscal = false

      if (tipoVenda === 'delivery') {
        const statusMap: Record<EtapaInicial, string> = {
          'EM_ANALISE': '1', // PENDENTE
          'EM_PRODUCAO': '2', // EM_PRODUCAO
          'PRONTOS_ENTREGA': '3', // PRONTO
          'COM_ENTREGADOR': '4', // FINALIZADO (sem dataFinalizacao)
          'FINALIZADAS': '4', // FINALIZADO (com dataFinalizacao)
          'PENDENTE_EMISSAO': '4', // FINALIZADO (com dataFinalizacao)
        }
        statusVenda = statusMap[etapaInicial]
        
        if (etapaInicial === 'FINALIZADAS' || etapaInicial === 'PENDENTE_EMISSAO') {
          dataFinalizacao = new Date().toISOString()
        }
      } else {
        // Para balcão e mesa, se estiver finalizada, statusVenda deve ser '4' (FINALIZADO)
        if (etapaInicial === 'FINALIZADAS' || etapaInicial === 'PENDENTE_EMISSAO') {
          statusVenda = '4' // FINALIZADO
          dataFinalizacao = new Date().toISOString()
        }
        // Se não estiver finalizada, não envia statusVenda (venda aberta)
      }

      if (etapaInicial === 'PENDENTE_EMISSAO') {
        solicitarEmissaoFiscal = true
      }

      // Construir payload apenas com campos definidos (remover undefined)
      // Nota: abertoPorId e ultimoResponsavelId são preenchidos automaticamente pelo backend
      // com base no usuário autenticado (req.user.id)
      const vendaData: any = {
        tipoVenda,
        terminalId: `GESTOR-${empresaId}`, // Terminal GESTOR
        origem: 'GESTOR',
        valorFinal: totalProdutos,
        totalDesconto: 0,
        totalAcrescimo: 0,
        produtos: produtos.map(p => ({
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
        })),
      }

      // Adicionar campos opcionais apenas se tiverem valor
      if (clienteId) vendaData.clientId = clienteId
      if (tipoVenda === 'mesa' && numeroMesa) vendaData.numeroMesa = numeroMesa
      if (statusVenda) vendaData.statusVenda = statusVenda
      if (dataFinalizacao) vendaData.dataFinalizacao = dataFinalizacao
      if (solicitarEmissaoFiscal) vendaData.solicitarEmissaoFiscal = solicitarEmissaoFiscal
      
      // Adicionar pagamentos apenas se necessário
      if (etapaInicial === 'FINALIZADAS' || etapaInicial === 'PENDENTE_EMISSAO') {
        vendaData.pagamentos = pagamentos.map(p => ({
          meioPagamentoId: p.meioPagamentoId,
          valor: p.valor,
        }))
      }

      console.log('📤 Dados sendo enviados:', vendaData)
      await createVenda.mutateAsync(vendaData)
      showToast.success('Pedido criado com sucesso!')
      onSuccess()
    } catch (error: any) {
      console.error('❌ Erro ao criar pedido:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao criar pedido'
      showToast.error(errorMessage)
    }
  }

  const resetForm = () => {
    setTipoVenda('balcao')
    setClienteId('')
    setNumeroMesa('')
    setEtapaInicial('FINALIZADAS')
    setProdutos([])
    setPagamentos([])
    setMeioPagamentoId('')
    setBuscaCliente('')
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
      maxWidth="lg"
      fullWidth
      sx={{
        '& .MuiDialog-container': { zIndex: 1300 },
        '& .MuiBackdrop-root': { zIndex: 1300, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        '& .MuiDialog-paper': { zIndex: 1300, backgroundColor: '#ffffff', opacity: 1, maxHeight: '90vh' },
      }}
    >
      <DialogContent 
        sx={{ 
          maxWidth: '56rem', 
          maxHeight: '90vh', 
          overflow: 'hidden', 
          backgroundColor: '#ffffff', 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <DialogHeader sx={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
          <DialogTitle>Novo Pedido</DialogTitle>
        </DialogHeader>

        <div 
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 24px', minHeight: 0 }}
          className="scrollbar-thin"
        >
          {/* Tipo de Venda */}
          <div className="space-y-2">
            <Label>Tipo de Venda</Label>
            <Select value={tipoVenda} onValueChange={(value) => {
              setTipoVenda(value as TipoVenda)
              // Resetar etapa inicial quando mudar tipo
              if (value === 'delivery') {
                setEtapaInicial('EM_ANALISE')
              } else {
                setEtapaInicial('FINALIZADAS')
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balcao">Balcão</SelectItem>
                <SelectItem value="mesa">Mesa</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Número da Mesa (se tipo = mesa) */}
          {tipoVenda === 'mesa' && (
            <div className="space-y-2">
              <Label>Número da Mesa</Label>
              <Input
                type="text"
                value={numeroMesa}
                onChange={(e) => setNumeroMesa(e.target.value)}
                placeholder="Ex: 1, 2, 3..."
              />
            </div>
          )}

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente (Opcional)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                placeholder="Buscar cliente..."
                className="flex-1"
              />
            </div>
            {buscaCliente && (
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClientes ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : clientes.length === 0 ? (
                    <SelectItem value="empty" disabled>Nenhum cliente encontrado</SelectItem>
                  ) : (
                    clientes.map(cliente => (
                      <SelectItem key={cliente.getId()} value={cliente.getId()}>
                        {cliente.getNome()} {(cliente.getCpf() || cliente.getCnpj()) ? `- ${cliente.getCpf() || cliente.getCnpj()}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Etapa Inicial */}
          <div className="space-y-2">
            <Label>Etapa Inicial</Label>
            <Select value={etapaInicial} onValueChange={(value) => setEtapaInicial(value as EtapaInicial)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {etapasDisponiveis.map(etapa => (
                  <SelectItem key={etapa.value} value={etapa.value}>
                    {etapa.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Produtos - Seleção por Grupos */}
          <div className="space-y-4">
            <Label>Produtos</Label>
            
            {/* Grid de Grupos */}
            {!grupoSelecionadoId && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Selecione um grupo:</Label>
                {isLoadingGrupos ? (
                  <div className="text-center py-4 text-gray-500">Carregando grupos...</div>
                ) : grupos.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">Nenhum grupo encontrado</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {grupos.map(grupo => (
                      <button
                        key={grupo.getId()}
                        onClick={() => setGrupoSelecionadoId(grupo.getId())}
                        className="aspect-square p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-center"
                      >
                        <div className="font-medium text-sm text-gray-900 break-words">
                          {grupo.getNome()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grid de Produtos do Grupo Selecionado */}
            {grupoSelecionadoId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-600">
                    Produtos do grupo: <span className="font-semibold">{grupos.find(g => g.getId() === grupoSelecionadoId)?.getNome()}</span>
                  </Label>
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => setGrupoSelecionadoId(null)}
                    type="button"
                  >
                    Voltar
                  </Button>
                </div>
                {isLoadingProdutos ? (
                  <div className="text-center py-4 text-gray-500">Carregando produtos...</div>
                ) : produtosError ? (
                  <div className="text-center py-4 text-red-500">
                    Erro ao carregar produtos: {produtosError instanceof Error ? produtosError.message : 'Erro desconhecido'}
                  </div>
                ) : produtosList.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">Nenhum produto encontrado neste grupo</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {produtosList.map(produto => {
                      const jaAdicionado = produtos.find(p => p.produtoId === produto.getId())
                      return (
                        <button
                          key={produto.getId()}
                          onClick={() => !jaAdicionado && adicionarProduto(produto.getId())}
                          disabled={jaAdicionado}
                          className={`aspect-square p-3 border-2 rounded-lg transition-all flex flex-col items-center justify-center text-center ${
                            jaAdicionado
                              ? 'border-green-500 bg-green-50 opacity-60 cursor-not-allowed'
                              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                          }`}
                        >
                          <div className="font-medium text-xs text-gray-900 break-words mb-1">
                            {produto.getNome()}
                          </div>
                          <div className="text-xs font-semibold text-blue-600">
                            {transformarParaReal(produto.getValor())}
                          </div>
                          {jaAdicionado && (
                            <div className="text-xs text-green-600 mt-1">✓ Adicionado</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

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
                          min="1"
                          value={produto.quantidade}
                          onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-20 h-8"
                        />
                        <Label className="text-xs">Valor Unit.:</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={produto.valorUnitario}
                          onChange={(e) => atualizarProduto(index, 'valorUnitario', parseFloat(e.target.value) || 0)}
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

          {/* Pagamentos (se etapa finalizada ou pendente emissão) */}
          {(etapaInicial === 'FINALIZADAS' || etapaInicial === 'PENDENTE_EMISSAO') && (
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
                              min="0"
                              step="0.01"
                              value={pagamento.valor}
                              onChange={(e) => atualizarPagamento(index, parseFloat(e.target.value) || 0)}
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
          <Button variant="outlined" onClick={handleClose} disabled={createVenda.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createVenda.isPending}>
            {createVenda.isPending ? 'Criando...' : 'Criar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
