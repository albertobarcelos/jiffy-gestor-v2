'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Produto } from '@/src/domain/entities/Produto'
import { ProdutoMovimento } from '@/src/domain/entities/MovimentoEstoque'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { transformarParaReal, brToEUA } from '@/src/shared/utils/formatters'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/presentation/components/ui/table'

interface MovimentoEstoqueFormProps {
  tipo: 'ENTRADA' | 'SAIDA' | 'INVENTARIO'
  titulo: string
  icone: string
}

/**
 * Componente base para formulários de movimentação de estoque
 * Replica completamente o design e funcionalidades do Flutter
 */
export function MovimentoEstoqueForm({ tipo, titulo, icone }: MovimentoEstoqueFormProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  
  // Estados do formulário
  const [dataLancamento, setDataLancamento] = useState(
    new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  )
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [classificacaoMovimento, setClassificacaoMovimento] = useState<string>('')
  const [fornecedorClienteNome, setFornecedorClienteNome] = useState<string>('')
  const [observacoes, setObservacoes] = useState('')
  
  // Estados de produtos
  const [produtos, setProdutos] = useState<ProdutoMovimento[]>([])
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([])
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>('')
  const [quantidadeProduto, setQuantidadeProduto] = useState('')
  const [valorTotalProduto, setValorTotalProduto] = useState('')
  
  // Estados de valores
  const [desconto, setDesconto] = useState('')
  const [acrescimo, setAcrescimo] = useState('')
  const [valorFinal, setValorFinal] = useState('')
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(false)
  const [mostrarModalConfirmacao, setMostrarModalConfirmacao] = useState(false)
  const [produtoEditandoIndex, setProdutoEditandoIndex] = useState<number | null>(null)
  
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Opções de classificação de movimento
  const opcoesClassificacao = [
    { value: 'ENTRADA_NORMAL', label: 'Entrada Normal' },
    { value: 'ENTRADA_BONIFICADA', label: 'Entrada Bonificada' },
    { value: 'AJUSTE', label: 'Ajuste' },
    { value: 'DEVOLUCAO_CLIENTE', label: 'Devolução Cliente' },
  ]

  // Buscar produtos disponíveis com debounce
  const buscarProdutos = useCallback(async (searchText: string = '') => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingProdutos(true)

    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        ativo: 'true',
      })

      if (searchText) {
        params.append('name', searchText)
      }

      const response = await fetch(`/api/produtos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const produtosList = (data.items || [])
        .map((item: any) => {
          try {
            return Produto.fromJSON(item)
          } catch (error) {
            console.error('Erro ao parsear produto:', error, item)
            return null
          }
        })
        .filter((p: Produto | null): p is Produto => p !== null)

      setProdutosDisponiveis(produtosList)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      showToast.error('Erro ao buscar produtos')
    } finally {
      setIsLoadingProdutos(false)
    }
  }, [auth])

  // Carregar produtos iniciais
  useEffect(() => {
    buscarProdutos()
  }, [buscarProdutos])

  // Quando produto é selecionado, preencher valor unitário
  useEffect(() => {
    if (produtoSelecionadoId) {
      const produto = produtosDisponiveis.find((p) => p.getId() === produtoSelecionadoId)
      if (produto) {
        setValorTotalProduto(produto.getValor().toString())
      }
    }
  }, [produtoSelecionadoId, produtosDisponiveis])

  // Calcular valor final quando desconto/acréscimo mudam
  useEffect(() => {
    const totalProdutos = produtos.reduce((sum, p) => sum + p.valorTotal, 0)
    const descontoNum = parseFloat(desconto.replace(',', '.')) || 0
    const acrescimoNum = parseFloat(acrescimo.replace(',', '.')) || 0
    const valorFinalCalc = totalProdutos - descontoNum + acrescimoNum
    setValorFinal(valorFinalCalc.toFixed(2).replace('.', ','))
  }, [produtos, desconto, acrescimo])

  // Adicionar produto à lista
  const adicionarProduto = () => {
    if (!produtoSelecionadoId || !quantidadeProduto || !valorTotalProduto) {
      showToast.error('Selecione o produto e preencha quantidade e valor')
      return
    }

    const produto = produtosDisponiveis.find((p) => p.getId() === produtoSelecionadoId)
    if (!produto) {
      showToast.error('Produto não encontrado')
      return
    }

    const quantidade = parseFloat(quantidadeProduto.replace(',', '.')) || 0
    const valorTotal = brToEUA(valorTotalProduto)

    if (quantidade <= 0) {
      showToast.error('Quantidade deve ser maior que zero')
      return
    }

    if (valorTotal <= 0) {
      showToast.error('Valor deve ser maior que zero')
      return
    }

    // Verificar se é saída e se há estoque suficiente
    if (tipo === 'SAIDA') {
      const estoqueAtual = typeof produto.getEstoque() === 'number' ? produto.getEstoque() : 0
      if (quantidade > estoqueAtual) {
        showToast.error(`Estoque insuficiente. Disponível: ${estoqueAtual}`)
        return
      }
    }

    const estoqueAnterior = typeof produto.getEstoque() === 'number' ? produto.getEstoque() : 0
    // Para inventário, a quantidade é o estoque contado (novo estoque)
    const estoqueNovo =
      tipo === 'ENTRADA'
        ? estoqueAnterior + quantidade
        : tipo === 'SAIDA'
        ? Math.max(0, estoqueAnterior - quantidade)
        : quantidade // Inventário: quantidade = estoque contado

    const novoProduto: ProdutoMovimento = {
      produtoId: produto.getId(),
      produtoNome: produto.getNome(),
      quantidade,
      valorUnitario: valorTotal / quantidade,
      valorTotal,
      estoqueAnterior,
      estoqueNovo,
    }

    setProdutos([...produtos, novoProduto])
    setProdutoSelecionadoId('')
    setQuantidadeProduto('')
    setValorTotalProduto('')
    showToast.success('Produto adicionado à lista')
  }

  // Remover produto da lista
  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index))
    showToast.success('Produto removido')
  }

  // Editar produto na lista
  const editarProduto = (index: number) => {
    const produto = produtos[index]
    setProdutoEditandoIndex(index)
    setProdutoSelecionadoId(produto.produtoId)
    setQuantidadeProduto(produto.quantidade.toString())
    setValorTotalProduto(produto.valorTotal.toString())
  }

  // Salvar edição de produto
  const salvarEdicaoProduto = () => {
    if (produtoEditandoIndex === null) return

    if (!quantidadeProduto || !valorTotalProduto) {
      showToast.error('Preencha quantidade e valor')
      return
    }

    const quantidade = parseFloat(quantidadeProduto.replace(',', '.')) || 0
    const valorTotal = brToEUA(valorTotalProduto)

    if (quantidade <= 0 || valorTotal <= 0) {
      showToast.error('Quantidade e valor devem ser maiores que zero')
      return
    }

    const produto = produtosDisponiveis.find((p) => p.getId() === produtoSelecionadoId)
    if (!produto) {
      showToast.error('Produto não encontrado')
      return
    }

    const estoqueAnterior = typeof produto.getEstoque() === 'number' ? produto.getEstoque() : 0
    // Para inventário, a quantidade é o estoque contado (novo estoque)
    const estoqueNovo =
      tipo === 'ENTRADA'
        ? estoqueAnterior + quantidade
        : tipo === 'SAIDA'
        ? Math.max(0, estoqueAnterior - quantidade)
        : quantidade // Inventário: quantidade = estoque contado

    const produtosAtualizados = [...produtos]
    produtosAtualizados[produtoEditandoIndex] = {
      ...produtosAtualizados[produtoEditandoIndex],
      quantidade,
      valorUnitario: valorTotal / quantidade,
      valorTotal,
      estoqueAnterior,
      estoqueNovo,
    }

    setProdutos(produtosAtualizados)
    setProdutoEditandoIndex(null)
    setProdutoSelecionadoId('')
    setQuantidadeProduto('')
    setValorTotalProduto('')
    showToast.success('Produto atualizado')
  }

  // Cancelar edição
  const cancelarEdicao = () => {
    setProdutoEditandoIndex(null)
    setProdutoSelecionadoId('')
    setQuantidadeProduto('')
    setValorTotalProduto('')
  }

  // Confirmar movimentação
  const handleConfirmar = async () => {
    if (!numeroDocumento || produtos.length === 0) {
      showToast.error('Preencha o número do documento e adicione pelo menos um produto')
      return
    }

    setMostrarModalConfirmacao(true)
  }

  // Salvar movimentação após confirmação
  const salvarMovimentacao = async () => {
    setIsLoading(true)
    const toastId = showToast.loading('Salvando movimentação...')

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.errorLoading(toastId, 'Token não encontrado')
        return
      }

      // TODO: Implementar chamada à API quando disponível
      // Por enquanto, apenas simula o salvamento
      await new Promise((resolve) => setTimeout(resolve, 1000))

      showToast.successLoading(toastId, 'Movimentação registrada com sucesso!')
      setMostrarModalConfirmacao(false)
      
      // Redirecionar após 1 segundo
      setTimeout(() => {
        router.push('/estoque')
      }, 1000)
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
      const errorMessage = handleApiError(error)
      showToast.errorLoading(toastId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const calcularTotalProdutos = () => {
    return produtos.reduce((total, produto) => total + produto.valorTotal, 0)
  }

  const totalProdutos = calcularTotalProdutos()
  const descontoNum = parseFloat(desconto.replace(',', '.')) || 0
  const acrescimoNum = parseFloat(acrescimo.replace(',', '.')) || 0
  const valorFinalNum = totalProdutos - descontoNum + acrescimoNum

  return (
    <div className="flex flex-col h-full bg-info">
      {/* Header */}
      <div className="px-[35px] pt-0 pb-0">
        <div className="h-[90px] flex items-center justify-between">
          <h1 className="text-primary text-2xl font-semibold font-exo">Estoque</h1>
          <div className="flex items-center gap-[10px]">
            <div className="w-[300px]">
              <div className="h-[48px] relative">
                <Input
                  type="text"
                  placeholder="Pesquisar..."
                  onChange={(e) => {
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current)
                    }
                    debounceTimerRef.current = setTimeout(() => {
                      buscarProdutos(e.target.value)
                    }, 500)
                  }}
                  className="w-full h-full pl-12 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-secondary font-nunito text-sm"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                  🔍
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto bg-primary-bg rounded-tl-[30px]">
        {/* Header fixo */}
        <div className="sticky top-0 z-10 bg-primary-bg shadow-md rounded-tl-[30px]">
          <div className="h-[80px] flex items-center px-[30px]">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icone}</span>
                <h2 className="text-primary text-lg font-semibold font-exo">{titulo}</h2>
              </div>
              <Button
                onClick={() => router.push('/estoque')}
                variant="outline"
                className="h-9 px-[26px] bg-primary/10 text-primary rounded-[30px] font-medium font-exo text-sm hover:bg-primary/20"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="px-[30px] py-[30px]">
          {/* Seção Dados */}
          <div className="bg-info rounded-[10px] p-5 mb-6">
            <div className="flex items-center gap-5 mb-5">
              <h3 className="text-secondary text-xl font-semibold font-exo">Dados</h3>
              <div className="flex-1 h-[1px] bg-alternate"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Data de Lançamento
                </label>
                <Input
                  type="text"
                  value={dataLancamento}
                  onChange={(e) => setDataLancamento(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Número do Documento Interno
                </label>
                <Input
                  type="text"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  placeholder="Digite o número do documento"
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Classificação do Movimento
                </label>
                <Select value={classificacaoMovimento} onValueChange={setClassificacaoMovimento}>
                  <SelectTrigger className="w-full h-12 rounded-lg border border-secondary bg-primary-bg">
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesClassificacao.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  {tipo === 'ENTRADA' ? 'Fornecedor' : tipo === 'SAIDA' ? 'Cliente' : 'Fornecedor/Cliente'}
                </label>
                <Input
                  type="text"
                  value={fornecedorClienteNome}
                  onChange={(e) => setFornecedorClienteNome(e.target.value)}
                  placeholder={`Digite o nome do ${tipo === 'ENTRADA' ? 'fornecedor' : tipo === 'SAIDA' ? 'cliente' : 'fornecedor/cliente'}`}
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Observações
                </label>
                <Input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Digite observações (opcional)"
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                />
              </div>
            </div>
          </div>

          {/* Seção Produtos */}
          <div className="bg-info rounded-[10px] p-5 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-5">
                <h3 className="text-secondary text-xl font-semibold font-exo">Produtos</h3>
                <div className="flex-1 h-[1px] bg-alternate"></div>
              </div>
            </div>

            {/* Formulário de adicionar produto */}
            <div className="bg-primary-bg rounded-lg p-4 mb-4">
              <div className="grid grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-primary-text mb-2">
                    Selecione o Produto
                  </label>
                  <Select
                    value={produtoSelecionadoId}
                    onValueChange={setProdutoSelecionadoId}
                    disabled={isLoadingProdutos}
                  >
                    <SelectTrigger className="w-full h-12 rounded-lg border border-secondary bg-primary-bg">
                      <SelectValue placeholder="Selecione o Produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtosDisponiveis.map((produto) => (
                        <SelectItem key={produto.getId()} value={produto.getId()}>
                          {produto.getNome()} - Estoque: {typeof produto.getEstoque() === 'number' ? produto.getEstoque() : 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-text mb-2">
                    Quantidade
                  </label>
                  <Input
                    type="text"
                    value={quantidadeProduto}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,.-]/g, '')
                      setQuantidadeProduto(value)
                    }}
                    placeholder="0,00"
                    className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-text mb-2">
                    Valor Total
                  </label>
                  <Input
                    type="text"
                    value={valorTotalProduto}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,.-]/g, '')
                      setValorTotalProduto(value)
                    }}
                    placeholder="0,00"
                    className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                  />
                </div>

                <div>
                  {produtoEditandoIndex !== null ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={salvarEdicaoProduto}
                        className="flex-1 h-12 bg-primary text-info rounded-lg font-medium hover:bg-primary/90"
                      >
                        Salvar
                      </Button>
                      <Button
                        onClick={cancelarEdicao}
                        variant="outline"
                        className="h-12 px-4 bg-secondary-bg text-primary-text rounded-lg font-medium hover:bg-secondary-bg/80"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={adicionarProduto}
                      className="w-full h-12 bg-secondary text-info rounded-lg font-medium hover:bg-secondary/90"
                    >
                      + Adicionar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de produtos */}
            {produtos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-secondary-text">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="bg-primary-bg rounded-lg border border-secondary overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor Unitário</TableHead>
                      <TableHead>Valor Total</TableHead>
                      {tipo === 'INVENTARIO' ? (
                        <>
                          <TableHead>Estoque Atual</TableHead>
                          <TableHead>Estoque Contado</TableHead>
                        </>
                      ) : (
                        <TableHead>Estoque {tipo === 'ENTRADA' ? 'Novo' : 'Restante'}</TableHead>
                      )}
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto, index) => {
                      const produtoInfo = produtosDisponiveis.find((p) => p.getId() === produto.produtoId)
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {produtoInfo?.getCodigoProduto() || '-'}
                          </TableCell>
                          <TableCell className="font-semibold">{produto.produtoNome}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{produto.quantidade}</TableCell>
                          <TableCell>{transformarParaReal(produto.valorUnitario)}</TableCell>
                          <TableCell className="font-semibold">
                            {transformarParaReal(produto.valorTotal)}
                          </TableCell>
                          {tipo === 'INVENTARIO' ? (
                            <>
                              <TableCell>{produto.estoqueAnterior ?? '-'}</TableCell>
                              <TableCell className="font-semibold">{produto.estoqueNovo ?? '-'}</TableCell>
                            </>
                          ) : (
                            <TableCell>{produto.estoqueNovo ?? '-'}</TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                onClick={() => editarProduto(index)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                ✏️
                              </Button>
                              <Button
                                onClick={() => removerProduto(index)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-error hover:text-error"
                              >
                                🗑️
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Seção Valores */}
          <div className="bg-info rounded-[10px] p-5 mb-6">
            <div className="flex items-center gap-5 mb-5">
              <h3 className="text-secondary text-xl font-semibold font-exo">Valores</h3>
              <div className="flex-1 h-[1px] bg-alternate"></div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Total
                </label>
                <Input
                  type="text"
                  value={transformarParaReal(totalProdutos)}
                  disabled
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text font-nunito"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Desconto
                </label>
                <Input
                  type="text"
                  value={desconto}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,.-]/g, '')
                    setDesconto(value)
                  }}
                  placeholder="0,00"
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Acréscimo
                </label>
                <Input
                  type="text"
                  value={acrescimo}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,.-]/g, '')
                    setAcrescimo(value)
                  }}
                  placeholder="0,00"
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary font-nunito"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-text mb-2">
                  Valor Final
                </label>
                <Input
                  type="text"
                  value={transformarParaReal(valorFinalNum)}
                  disabled
                  className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text font-semibold font-nunito"
                />
              </div>
            </div>
          </div>

          {/* Botão confirmar */}
          <div className="flex justify-end">
            <Button
              onClick={handleConfirmar}
              disabled={isLoading || produtos.length === 0 || !numeroDocumento}
              className="h-12 px-8 bg-primary text-info rounded-[30px] font-medium font-exo text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Confirmando...' : 'Confirmar Movimentação'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={mostrarModalConfirmacao} onOpenChange={setMostrarModalConfirmacao}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Movimentação</DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar a movimentação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-primary-text mb-2">Dados do Movimento</h4>
              <div className="bg-primary-bg rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Data:</span> {dataLancamento}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Documento:</span> {numeroDocumento}
                </p>
                {classificacaoMovimento && (
                  <p className="text-sm">
                    <span className="font-medium">Classificação:</span>{' '}
                    {opcoesClassificacao.find((o) => o.value === classificacaoMovimento)?.label}
                  </p>
                )}
                {fornecedorClienteNome && (
                  <p className="text-sm">
                    <span className="font-medium">
                      {tipo === 'ENTRADA' ? 'Fornecedor' : 'Cliente'}:
                    </span>{' '}
                    {fornecedorClienteNome}
                  </p>
                )}
                {observacoes && (
                  <p className="text-sm">
                    <span className="font-medium">Observações:</span> {observacoes}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-primary-text mb-2">Produtos ({produtos.length})</h4>
              <div className="bg-primary-bg rounded-lg border border-secondary overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor Unitário</TableHead>
                      <TableHead>Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-semibold">{produto.produtoNome}</TableCell>
                        <TableCell>{produto.quantidade}</TableCell>
                        <TableCell>{transformarParaReal(produto.valorUnitario)}</TableCell>
                        <TableCell className="font-semibold">
                          {transformarParaReal(produto.valorTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-primary-text mb-2">Resumo Financeiro</h4>
              <div className="bg-primary-bg rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Produtos:</span>
                  <span className="text-sm font-semibold">{transformarParaReal(totalProdutos)}</span>
                </div>
                {descontoNum > 0 && (
                  <div className="flex justify-between text-error">
                    <span className="text-sm">Desconto:</span>
                    <span className="text-sm font-semibold">- {transformarParaReal(descontoNum)}</span>
                  </div>
                )}
                {acrescimoNum > 0 && (
                  <div className="flex justify-between text-success">
                    <span className="text-sm">Acréscimo:</span>
                    <span className="text-sm font-semibold">+ {transformarParaReal(acrescimoNum)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-lg font-semibold">Valor Final:</span>
                  <span className="text-lg font-bold text-primary">
                    {transformarParaReal(valorFinalNum)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMostrarModalConfirmacao(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={salvarMovimentacao} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar e Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
