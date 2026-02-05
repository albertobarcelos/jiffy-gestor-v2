'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal, brToEUA } from '@/src/shared/utils/formatters'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import Link from 'next/link'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { MdSearch, MdExpandMore, MdExpandLess } from 'react-icons/md'
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
  const [total, setTotal] = useState(0)
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [ativoLocalFilter, setAtivoLocalFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [ativoDeliveryFilter, setAtivoDeliveryFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [grupoProdutoFilter, setGrupoProdutoFilter] = useState('')
  const [grupoComplementoFilter, setGrupoComplementoFilter] = useState('')
  const [adjustMode, setAdjustMode] = useState<'valor' | 'percentual'>('valor')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const { auth } = useAuthStore()
  const {
    data: gruposProdutos = [],
    isLoading: isLoadingGruposProdutos,
  } = useGruposProdutos({ limit: 100, ativo: null })
  const {
    data: gruposComplementos = [],
    isLoading: isLoadingGruposComplementos,
  } = useGruposComplementos({ limit: 100, ativo: null })

  // Buscar produtos
  const buscarProdutos = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    const limit = 10
    setIsLoading(true)
    setProdutos([])
    setProdutosSelecionados(new Set())

    try {
      let hasMorePages = true
      let currentOffset = 0
      const acumulado: Produto[] = []
      let totalFromApi: number | null = null

      const ativoFilter =
        filterStatus === 'Ativo' ? true : filterStatus === 'Desativado' ? false : null
      const ativoLocalBoolean =
        ativoLocalFilter === 'Sim' ? true : ativoLocalFilter === 'Não' ? false : null
      const ativoDeliveryBoolean =
        ativoDeliveryFilter === 'Sim' ? true : ativoDeliveryFilter === 'Não' ? false : null

      while (hasMorePages) {
        const params = new URLSearchParams({
          name: searchText,
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })
        if (ativoFilter !== null) {
          params.append('ativo', ativoFilter.toString())
        }
        if (ativoLocalBoolean !== null) {
          params.append('ativoLocal', ativoLocalBoolean.toString())
        }
        if (ativoDeliveryBoolean !== null) {
          params.append('ativoDelivery', ativoDeliveryBoolean.toString())
        }
        if (grupoProdutoFilter) {
          params.append('grupoProdutoId', grupoProdutoFilter)
        }
        if (grupoComplementoFilter) {
          params.append('grupoComplementosId', grupoComplementoFilter)
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
        // A API retorna { success: true, items: [...], count: number }
        const produtosList = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.produtos)
            ? data.produtos
            : Array.isArray(data)
              ? data
              : []

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

        acumulado.push(...produtosParsed)
        if (typeof data.count === 'number') {
          totalFromApi = data.count
        }

        currentOffset += produtosParsed.length
        hasMorePages = produtosParsed.length === limit && (totalFromApi ? currentOffset < totalFromApi : true)

        if (produtosParsed.length === 0) {
          hasMorePages = false
        }
      }

      setProdutos(acumulado)
      setTotal(totalFromApi ?? acumulado.length)
    } catch (error: any) {
      console.error('Erro ao buscar produtos', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    auth,
    searchText,
    filterStatus,
    ativoLocalFilter,
    ativoDeliveryFilter,
    grupoProdutoFilter,
    grupoComplementoFilter,
  ])

  // Debounce na busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      buscarProdutos()
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, buscarProdutos])

  useEffect(() => {
    buscarProdutos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, ativoLocalFilter, ativoDeliveryFilter, grupoProdutoFilter, grupoComplementoFilter])

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

    const parsedAdjust = brToEUA(adjustAmount)
    if (isNaN(parsedAdjust) || parsedAdjust === 0) {
      showToast.error('Informe um valor de ajuste válido')
      return
    }
    const adjustValue = parsedAdjust
    if (adjustValue < 0) {
      showToast.error('Informe apenas valores positivos')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const produtosSelecionadosDados = produtos.filter((produto) =>
      produtosSelecionados.has(produto.getId())
    )
    if (!produtosSelecionadosDados.length) {
      showToast.error('Não foi possível identificar os produtos selecionados.')
      return
    }
    if (adjustDirection === 'decrease') {
      if (adjustMode === 'valor') {
        const menorValor = Math.min(...produtosSelecionadosDados.map((p) => p.getValor()))
        if (adjustValue >= menorValor) {
          showToast.error(
            'O valor para diminuir não pode ser maior ou igual ao menor preço selecionado'
          )
          return
        }
      } else if (adjustMode === 'percentual' && adjustValue >= 100) {
        showToast.error('A porcentagem para diminuir deve ser menor que 100%')
        return
      }
    }

    setIsUpdating(true)
    showToast.loading('Atualizando preços...')

    try {
      const produtosIds = Array.from(produtosSelecionados)
      let sucesso = 0
      let erros = 0

      // Atualizar cada produto sequencialmente
      for (const produtoId of produtosIds) {
        const produtoBase = produtos.find((produto) => produto.getId() === produtoId)
        if (!produtoBase) {
          erros++
          continue
        }

        const valorAtual = produtoBase.getValor()
        const directionSign = adjustDirection === 'increase' ? 1 : -1
        let novoValor =
          adjustMode === 'valor'
            ? valorAtual + directionSign * adjustValue
            : valorAtual * (1 + (directionSign * adjustValue) / 100)
        novoValor = Number(novoValor.toFixed(2))

        if (novoValor <= 0) {
          erros++
          continue
        }

        try {
          const response = await fetch(`/api/produtos/${produtoId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ valor: novoValor }),
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

      // showToast.dismiss(toastId)

      if (erros === 0) {
        showToast.success(`Preços atualizados com sucesso! (${sucesso} produtos)`)
        setProdutosSelecionados(new Set())
        setAdjustAmount('')
        buscarProdutos() // Recarregar lista
      } else {
        showToast.warning(
          `Atualizados: ${sucesso} | Erros: ${erros}`
        )
      }
    } catch (error: any) {
      // showToast.dismiss(toastId)
      console.error('Erro ao atualizar preços', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const todosSelecionados = produtos.length > 0 && produtosSelecionados.size === produtos.length
  const algunsSelecionados = produtosSelecionados.size > 0 && produtosSelecionados.size < produtos.length

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setFilterStatus('Ativo')
    setAtivoLocalFilter('Todos')
    setAtivoDeliveryFilter('Todos')
    setGrupoProdutoFilter('')
    setGrupoComplementoFilter('')
  }, [])

  return (
    <div className="flex flex-col h-full bg-info">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-2 md:gap-4 gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="md:text-2xl text-sm font-bold text-primary">Atualizar Preços em Lote</h1>
            <p className="md:text-sm text-xs text-secondary-text">
              Total de itens: {total} | Selecionados: {produtosSelecionados.size}
            </p>
          </div>
        </div>
        <Link
          href="/produtos"
          className="h-8 px-8 rounded-lg bg-info text-primary font-semibold font-exo text-sm border border-primary shadow-sm hover:bg-primary/20 transition-colors flex items-center"
        >
          Cancelar
        </Link>
      </div>

      <div className="bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-2">
        <div className="flex flex-wrap md:gap-4 gap-1 items-end">
          <div className="w-full sm:w-[150px]">
            <label className="block text-xs font-semibold text-secondary-text mb-1">
              Tipo de ajuste
            </label>
            <select
              value={adjustMode}
              onChange={(e) => setAdjustMode(e.target.value as 'valor' | 'percentual')}
              className="w-full h-8 px-4 rounded-lg border border-primary/70 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
            >
              <option value="valor">Valor (R$)</option>
              <option value="percentual">Porcent. (%)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="flex items-center gap-1 text-sm font-semibold text-primary-text">
              <Checkbox
                checked={adjustDirection === 'increase'}
                onChange={() => setAdjustDirection('increase')}
                sx={{
                  color: 'var(--color-primary)',
                  '&.Mui-checked': {
                    color: 'var(--color-primary)',
                  },
                }}
              />
              ( + )
            </label>
            <label className="flex items-center gap-1 text-sm font-semibold text-primary-text">
              <Checkbox
                checked={adjustDirection === 'decrease'}
                onChange={() => setAdjustDirection('decrease')}
                sx={{
                  color: 'var(--color-primary)',
                  '&.Mui-checked': {
                    color: 'var(--color-primary)',
                  },
                }}
              />
              ( - )
            </label>
          </div>

          <div className="flex-1 flex flex-row justify-between items-end gap-2 w-full md:max-w-[350px]">
            <div className="flex flex-col gap-1 w-full">
            <label className="block text-xs font-semibold text-secondary-text">
              {adjustDirection === 'increase' ? 'Aumentar' : 'Diminuir'} (
              {adjustMode === 'valor' ? 'R$' : '%'})
            </label>
            <Input className="rounded-lg"
              type="text"
              value={adjustAmount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d,.-]/g, '')
                setAdjustAmount(value)
              }}
              placeholder={adjustMode === 'valor' ? '0,00' : '0'}
              InputProps={{
                sx: {
                  border: '1px solid',
                  borderColor: 'var(--color-primary)',
                  backgroundColor: 'var(--color-info)',
                  height: 32,
                  '&.Mui-focused': {
                    borderColor: 'var(--color-primary)',
                    borderWidth: '1px',
                  },
                  '&:hover': {
                    borderColor: 'var(--color-primary)',
                  },
                  '& input': {
                    padding: '6px 10px',
                    fontSize: '0.875rem',
                  },
                  '& fieldset': {
                    border: 'none',
                  },
                },
              }}
            />
          </div>

          <div className="w-full h-8 rounded-lg flex gap-2 items-end">
            <Button
              onClick={atualizarPrecos}
              disabled={
                isUpdating || produtosSelecionados.size === 0 || !adjustAmount.trim()
              }
              className="md:min-w-[180px] h-8 hover:bg-primary/90"
              sx={{
                color: 'var(--color-info)',
                backgroundColor: 'var(--color-primary)',
              }}
            >
              {isUpdating
                ? 'Aplicando ajuste...'
                : `Aplicar ajuste (${produtosSelecionados.size})`}
            </Button>
          </div>
        </div>

        </div>
        {produtosSelecionados.size > 0 && (
          <p className="text-xs text-secondary-text mt-2">
            O ajuste será aplicado aos {produtosSelecionados.size} produto(s) selecionado(s).
          </p>
        )}
      </div>

      <div className="h-[4px] border-t-2 border-primary/70"></div>
      <div className="bg-white md:px-[20px] py-2 border-b border-gray-100">
        <div className="flex flex-col gap-2">
          {/* Primeira linha: Busca e botão de expandir (mobile) */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <label htmlFor="precos-search" className="text-xs font-semibold text-secondary-text mb-1 block">
                Buscar produto...
              </label>
              <div className="relative h-8">
                <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
                <input
                  id="precos-search"
                  type="text"
                  placeholder="Pesquisar produto..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
                />
              </div>
            </div>
            {/* Botão para expandir/ocultar filtros (apenas mobile) */}
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="md:hidden h-8 px-3 rounded-lg border border-gray-300 text-sm font-semibold text-primary-text bg-white hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              {filtersExpanded ? (
                <>
                  <span className="text-xs">Ocultar</span>
                  <MdExpandLess size={20} />
                </>
              ) : (
                <>
                  <span className="text-xs">Filtros</span>
                  <MdExpandMore size={20} />
                </>
              )}
            </button>
          </div>

          {/* Filtros - ocultos em mobile por padrão, visíveis quando expandidos */}
          <div className={`flex flex-wrap items-end gap-2 ${filtersExpanded ? 'block' : 'hidden'} md:flex`}>
            <div className="w-full sm:w-[160px]">
              <label className="text-xs font-semibold text-secondary-text mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')}
                className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>

            <div className="w-full sm:w-[160px]">
              <label className="text-xs font-semibold text-secondary-text mb-1 block">Ativo no local</label>
              <select
                value={ativoLocalFilter}
                onChange={(e) => setAtivoLocalFilter(e.target.value as 'Todos' | 'Sim' | 'Não')}
                className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
              >
                <option value="Todos">Todos</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div className="w-full sm:w-[160px]">
              <label className="text-xs font-semibold text-secondary-text mb-1 block">Ativo no delivery</label>
              <select
                value={ativoDeliveryFilter}
                onChange={(e) => setAtivoDeliveryFilter(e.target.value as 'Todos' | 'Sim' | 'Não')}
                className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
              >
                <option value="Todos">Todos</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            <div className="w-full sm:w-[220px]">
              <label className="text-xs font-semibold text-secondary-text mb-1 block">Grupo de produtos</label>
              <select
                value={grupoProdutoFilter}
                onChange={(e) => setGrupoProdutoFilter(e.target.value)}
                disabled={isLoadingGruposProdutos}
                className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">{isLoadingGruposProdutos ? 'Carregando...' : 'Todos'}</option>
                {!isLoadingGruposProdutos &&
                  gruposProdutos.map((grupo) => (
                    <option key={grupo.getId()} value={grupo.getId()}>
                      {grupo.getNome()}
                    </option>
                  ))}
              </select>
            </div>

            <div className="w-full sm:w-[220px]">
              <label className="text-xs font-semibold text-secondary-text mb-1 block">Grupo de complementos</label>
              <select
                value={grupoComplementoFilter}
                onChange={(e) => setGrupoComplementoFilter(e.target.value)}
                disabled={isLoadingGruposComplementos}
                className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">{isLoadingGruposComplementos ? 'Carregando...' : 'Todos'}</option>
                {!isLoadingGruposComplementos &&
                  gruposComplementos.map((grupo) => (
                    <option key={grupo.getId()} value={grupo.getId()}>
                      {grupo.getNome()}
                    </option>
                  ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-8 px-5 rounded-lg border border-gray-300 text-sm font-semibold text-primary-text bg-white hover:bg-gray-50 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <img
              src="/images/jiffy-loading.gif"
              alt="Carregando..."
              className="w-20 h-20"
            />
            <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="bg-info rounded-lg overflow-hidden">
            <div className="flex items-center h-11 gap-2 md:px-4 text-xs font-semibold text-primary-text uppercase tracking-wide bg-custom-2">
              <div className="flex-none md:w-10 w-6 flex justify-center">
                <Checkbox
                  checked={todosSelecionados}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProdutosSelecionados(new Set(produtos.map((p) => p.getId())))
                    } else {
                      setProdutosSelecionados(new Set())
                    }
                  }}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              <div className="flex-1 md:w-14 text-xs">Código</div>
              <div className="flex-[1.5] text-xs">Nome</div>
              <div className="flex-[1.4] text-center hidden md:flex">Grupo de produtos</div>
              <div className="flex-[1.2] text-center hidden md:flex">Grupo de complementos</div>
              <div className="flex-1 text-center hidden md:flex">Status</div>
              <div className="flex-1 text-right text-xs">Valor atual</div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {produtos
                .slice()
                .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
                .map((produto, index) => {
                const isSelected = produtosSelecionados.has(produto.getId())
                const gruposComplementos = produto.getGruposComplementos()
                const gruposLabels = gruposComplementos.map((grupo) => {
                  const nomeGrupo = grupo.nome || 'Grupo sem nome'
                  const qtdComplementos = grupo.complementos?.length ?? 0
                  return `${nomeGrupo} (${qtdComplementos} complemento${qtdComplementos === 1 ? '' : 's'})`
                })
                // Cor de fundo alternada: se selecionado usa primary/20, senão alterna entre gray-50 e white
                const bgColor = isSelected 
                  ? 'bg-primary/20' 
                  : index % 2 === 0 
                    ? 'bg-gray-50' 
                    : 'bg-white'
                return (
                  <div
                    key={produto.getId()}
                    className={`flex rounded-lg items-center md:px-4 gap-2 ${bgColor} hover:bg-primary-bg transition-colors cursor-default`}
                    style={{ minHeight: '36px' }}
                  >
                    <div className="flex-none md:w-10 w-6 flex justify-center">
                      <Checkbox
                        checked={isSelected}
                        onChange={(checked) => {
                          if (checked !== undefined) {
                            toggleSelecao(produto.getId())
                          }
                        }}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>
                    <div className="flex-1 md:w-24 font-mono text-xs text-secondary-text">
                      {produto.getCodigoProduto() || '-'}
                    </div>
                    <div className="md:flex-[1.5] flex-[2] md:text-sm text-xs font-semibold text-primary-text break-words md:pr-4">
                      {produto.getNome()}
                    </div>
                    <div className="flex-[1.4] text-center text-xs text-primary-text hidden md:flex">
                      {produto.getNomeGrupo() || 'Sem grupo'}
                    </div>
                    <div className="flex-[1.2] justify-center hidden md:flex">
                      {gruposLabels.length === 0 ? (
                        <span className="text-xs text-secondary-text">Nenhum</span>
                      ) : (
                        <select
                          className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-primary-text focus:outline-none focus:border-primary"
                          defaultValue=""
                          onChange={(event) => {
                            event.currentTarget.value = ''
                          }}
                        >
                          <option value="" disabled>
                            {gruposLabels.length} grupo(s)
                          </option>
                          {gruposLabels.map((label, index) => (
                            <option key={`${produto.getId()}-grupo-${index}`} value={label}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex-1 justify-center hidden md:flex">
                      <span
                        className={`px-4 py-1 rounded-lg text-[11px] font-medium border ${
                          produto.isAtivo() ? 'border-primary/50 text-success' : ' border-error text-error'
                        }`}
                      >
                        {produto.isAtivo() ? 'Ativo' : 'Desativado'}
                      </span>
                    </div>
                    <div className="flex-1 text-right font-semibold md:text-sm text-xs text-primary-text">
                      {transformarParaReal(produto.getValor())}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      
    </div>
  )
}


