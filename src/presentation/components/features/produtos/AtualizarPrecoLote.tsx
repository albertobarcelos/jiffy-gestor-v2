'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal, brToEUA } from '@/src/shared/utils/formatters'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/presentation/components/ui/table'

/**
 * Componente para atualizar preço de múltiplos produtos em lote
 * Replica a funcionalidade do Flutter update_price_produtos_widget.dart
 */
export function AtualizarPrecoLote() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [total, setTotal] = useState(0)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const { auth } = useAuthStore()

  // Buscar produtos
  const buscarProdutos = useCallback(async (reset: boolean = false) => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        name: searchText,
        limit: '10',
        offset: '0',
      })

      const response = await fetch(`/api/produtos?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      // A API retorna { success: true, items: [...], count: number }
      const produtosList = Array.isArray(data.items) ? data.items : (Array.isArray(data.produtos) ? data.produtos : (Array.isArray(data) ? data : []))

      const produtosParsed = produtosList
        .map((p: any) => {
          try {
            return Produto.fromJSON(p)
          } catch (error) {
            console.error('Erro ao parsear produto:', error, p)
            return null
          }
        })
        .filter((p: Produto | null): p is Produto => p !== null)

      setProdutos(produtosParsed)
      setTotal(data.count || produtosParsed.length)
    } catch (error: any) {
      handleApiError(error, 'Erro ao buscar produtos')
    } finally {
      setIsLoading(false)
    }
  }, [auth, searchText])

  // Debounce na busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      buscarProdutos(true)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, buscarProdutos])

  // Carregar produtos iniciais
  useEffect(() => {
    buscarProdutos(true)
  }, [])

  // Toggle seleção de produto
  const toggleSelecao = (produtoId: string) => {
    setProdutosSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(produtoId)) {
        novo.delete(produtoId)
      } else {
        novo.add(produtoId)
      }
      return novo
    })
  }

  // Atualizar preços
  const atualizarPrecos = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    const precoNum = brToEUA(novoPreco)
    if (isNaN(precoNum) || precoNum <= 0) {
      showToast.error('Digite um preço válido maior que zero')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    const toastId = showToast.loading('Atualizando preços...')

    try {
      const produtosIds = Array.from(produtosSelecionados)
      let sucesso = 0
      let erros = 0

      // Atualizar cada produto sequencialmente
      for (const produtoId of produtosIds) {
        try {
          const response = await fetch(`/api/produtos/${produtoId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ valor: precoNum }),
          })

          if (!response.ok) {
            throw new Error(`Erro ${response.status}`)
          }

          sucesso++
        } catch (error) {
          console.error(`Erro ao atualizar produto ${produtoId}:`, error)
          erros++
        }
      }

      showToast.dismiss(toastId)

      if (erros === 0) {
        showToast.success(`Preços atualizados com sucesso! (${sucesso} produtos)`)
        setProdutosSelecionados(new Set())
        setNovoPreco('')
        buscarProdutos(true) // Recarregar lista
      } else {
        showToast.warning(
          `Atualizados: ${sucesso} | Erros: ${erros}`
        )
      }
    } catch (error: any) {
      showToast.dismiss(toastId)
      handleApiError(error, 'Erro ao atualizar preços')
    } finally {
      setIsUpdating(false)
    }
  }

  const todosSelecionados = produtos.length > 0 && produtosSelecionados.size === produtos.length
  const algunsSelecionados = produtosSelecionados.size > 0 && produtosSelecionados.size < produtos.length

  return (
    <div className="flex flex-col h-full bg-info">
      {/* Header */}
      <div className="bg-primary-bg border-b border-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-text">Atualizar Preços em Lote</h1>
            <p className="text-sm text-secondary-text mt-1">
              Total de itens: {total} | Selecionados: {produtosSelecionados.size}
            </p>
          </div>
        </div>

        {/* Busca e Filtro */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-primary-text mb-2">
              Pesquisar Produto
            </label>
            <div className="relative">
              <Input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Pesquisar..."
                className="pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">
                🔍
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="bg-primary-bg rounded-lg border border-secondary overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={todosSelecionados}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProdutosSelecionados(new Set(produtos.map((p) => p.getId())))
                        } else {
                          setProdutosSelecionados(new Set())
                        }
                      }}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => {
                  const isSelected = produtosSelecionados.has(produto.getId())
                  return (
                    <TableRow
                      key={produto.getId()}
                      className={isSelected ? 'bg-primary/10' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked !== undefined) {
                              toggleSelecao(produto.getId())
                            }
                          }}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {produto.getCodigoProduto() || '-'}
                      </TableCell>
                      <TableCell className="font-semibold">{produto.getNome()}</TableCell>
                      <TableCell>{produto.getEstoque() ?? '-'}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            produto.getAtivo()
                              ? 'bg-success/20 text-success'
                              : 'bg-error/20 text-error'
                          }`}
                        >
                          {produto.getAtivo() ? 'Ativo' : 'Desativado'}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {transformarParaReal(produto.getValor())}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Footer com campo de preço e botão */}
      <div className="bg-primary-bg border-t border-secondary p-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-primary-text mb-2">
              Novo Preço
            </label>
            <Input
              type="text"
              value={novoPreco}
              onChange={(e) => {
                // Permite apenas números, vírgula e ponto
                const value = e.target.value.replace(/[^\d,.-]/g, '')
                setNovoPreco(value)
              }}
              placeholder="0,00"
              className="text-lg font-semibold"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={atualizarPrecos}
              disabled={isUpdating || produtosSelecionados.size === 0 || !novoPreco}
              className="min-w-[180px]"
            >
              {isUpdating
                ? `Atualizando... (${produtosSelecionados.size})`
                : `Atualizar Preços (${produtosSelecionados.size})`}
            </Button>
          </div>
        </div>
        {produtosSelecionados.size > 0 && (
          <p className="text-sm text-secondary-text mt-2">
            {produtosSelecionados.size} produto(s) selecionado(s)
          </p>
        )}
      </div>
    </div>
  )
}

