'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { Impressora } from '@/src/domain/entities/Impressora'
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
  const [adjustMode, setAdjustMode] = useState<'valor' | 'percentual'>('valor')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [produtosExpandidos, setProdutosExpandidos] = useState<Set<string>>(new Set())
  const [impressorasSelecionadas, setImpressorasSelecionadas] = useState<Set<string>>(new Set())
  const [impressorasDisponiveis, setImpressorasDisponiveis] = useState<Impressora[]>([])
  const [isLoadingImpressoras, setIsLoadingImpressoras] = useState(false)
  const [gruposComplementosSelecionados, setGruposComplementosSelecionados] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'precos' | 'impressoras' | 'gruposComplementos'>('precos')
  const [modoImpressora, setModoImpressora] = useState<'adicionar' | 'remover'>('adicionar')
  const [modoGrupoComplemento, setModoGrupoComplemento] = useState<'adicionar' | 'remover'>('adicionar')
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

    const limit = 50
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
  ])

  // Debounce na busca e filtros
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
  }, [searchText, filterStatus, ativoLocalFilter, ativoDeliveryFilter, grupoProdutoFilter, buscarProdutos])

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

  // Toggle expansão mobile
  const toggleExpansao = (produtoId: string) => {
    setProdutosExpandidos((prev) => {
      const novo = new Set(prev)
      if (novo.has(produtoId)) {
        novo.delete(produtoId)
      } else {
        novo.add(produtoId)
      }
      return novo
    })
  }

  // Toggle seleção de impressora
  const toggleImpressora = (impressoraId: string) => {
    setImpressorasSelecionadas((prev) => {
      const novo = new Set(prev)
      if (novo.has(impressoraId)) {
        novo.delete(impressoraId)
      } else {
        novo.add(impressoraId)
      }
      return novo
    })
  }

  // Toggle seleção de grupo complemento
  const toggleGrupoComplemento = (grupoId: string) => {
    setGruposComplementosSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(grupoId)) {
        novo.delete(grupoId)
      } else {
        novo.add(grupoId)
      }
      return novo
    })
  }

  // Carregar todas as impressoras
  const loadAllImpressoras = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingImpressoras(true)
    try {
      let hasMorePages = true
      let currentOffset = 0
      const acumulado: Impressora[] = []
      const limit = 50

      while (hasMorePages) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/impressoras?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const impressorasList = Array.isArray(data.items) ? data.items : []

        const impressorasParsed = impressorasList
          .map((i: any) => {
            try {
              return Impressora.fromJSON(i)
            } catch (error) {
              console.error('Erro ao parsear impressora:', error, i)
              return null
            }
          })
          .filter((i: Impressora | null): i is Impressora => i !== null)

        acumulado.push(...impressorasParsed)
        currentOffset += impressorasParsed.length
        hasMorePages = impressorasParsed.length === limit
      }

      setImpressorasDisponiveis(acumulado)
    } catch (error: any) {
      console.error('Erro ao buscar impressoras', error)
      showToast.error('Erro ao carregar impressoras')
    } finally {
      setIsLoadingImpressoras(false)
    }
  }, [auth])

  // Carregar impressoras quando tab de impressoras estiver ativa
  useEffect(() => {
    if (activeTab === 'impressoras' && impressorasDisponiveis.length === 0) {
      loadAllImpressoras()
    }
  }, [activeTab, loadAllImpressoras, impressorasDisponiveis.length])

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
      // Calcula novos valores para cada produto
      const payload = produtosSelecionadosDados.map((produto) => {
        const valorAtual = produto.getValor()
        const directionSign = adjustDirection === 'increase' ? 1 : -1
        let novoValor =
          adjustMode === 'valor'
            ? valorAtual + directionSign * adjustValue
            : valorAtual * (1 + (directionSign * adjustValue) / 100)
        novoValor = Number(novoValor.toFixed(2))

        if (novoValor <= 0) {
          throw new Error(`Valor calculado inválido para produto ${produto.getNome()}`)
        }

        return {
          produtoId: produto.getId(),
          valor: novoValor,
        }
      })

      // Chama API de bulk-update
      const response = await fetch('/api/produtos/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      // Delay de 800ms após sucesso
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Recarrega lista
      await buscarProdutos()

      // Delay de 500ms
      await new Promise((resolve) => setTimeout(resolve, 500))

      showToast.success(`Preços atualizados com sucesso! (${payload.length} produtos)`)
      setProdutosSelecionados(new Set())
      setAdjustAmount('')
    } catch (error: any) {
      console.error('Erro ao atualizar preços', error)
      showToast.error(error.message || 'Erro ao atualizar preços')
    } finally {
      setIsUpdating(false)
    }
  }

  // Funções de impressoras
  const adicionarImpressoras = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    if (impressorasSelecionadas.size === 0) {
      showToast.error('Selecione pelo menos uma impressora')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Vinculando impressoras...')

    try {
      const impressorasIdsArray = Array.from(impressorasSelecionadas)
      const payload = Array.from(produtosSelecionados).map((produtoId) => {
        const produto = produtos.find((p) => p.getId() === produtoId)
        const impressorasExistentes = produto?.getImpressoras().map((i) => i.id) || []
        const impressorasCombinadas = [...new Set([...impressorasExistentes, ...impressorasIdsArray])]

        return {
          produtoId,
          impressorasIds: impressorasCombinadas,
        }
      })

      const response = await fetch('/api/produtos/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      await buscarProdutos()
      showToast.success(`Impressoras vinculadas com sucesso!`)
      setImpressorasSelecionadas(new Set())
      setProdutosSelecionados(new Set())
    } catch (error: any) {
      console.error('Erro ao vincular impressoras', error)
      showToast.error(error.message || 'Erro ao vincular impressoras')
    } finally {
      setIsUpdating(false)
    }
  }

  const removerImpressoras = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    if (impressorasSelecionadas.size === 0) {
      showToast.error('Selecione pelo menos uma impressora')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Desvinculando impressoras...')

    try {
      const impressorasIdsArray = Array.from(impressorasSelecionadas)
      const payload = Array.from(produtosSelecionados).map((produtoId) => ({
        produtoId,
        impressorasIdsToRemove: impressorasIdsArray,
      }))

      const response = await fetch('/api/produtos/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      await buscarProdutos()
      showToast.success(`Impressoras desvinculadas com sucesso!`)
      setImpressorasSelecionadas(new Set())
      setProdutosSelecionados(new Set())
    } catch (error: any) {
      console.error('Erro ao desvincular impressoras', error)
      showToast.error(error.message || 'Erro ao desvincular impressoras')
    } finally {
      setIsUpdating(false)
    }
  }

  const atualizarImpressoras = () => {
    if (modoImpressora === 'adicionar') {
      adicionarImpressoras()
    } else {
      removerImpressoras()
    }
  }

  // Funções de grupos complementos
  const vincularGruposComplementos = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    if (gruposComplementosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um grupo de complementos')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Vinculando grupos de complementos...')

    try {
      const gruposIdsArray = Array.from(gruposComplementosSelecionados)
      const payload = Array.from(produtosSelecionados).map((produtoId) => {
        const produto = produtos.find((p) => p.getId() === produtoId)
        const gruposExistentes = produto?.getGruposComplementos().map((g) => g.id) || []
        const gruposCombinados = [...new Set([...gruposExistentes, ...gruposIdsArray])]

        return {
          produtoId,
          gruposComplementosIds: gruposCombinados,
        }
      })

      const response = await fetch('/api/produtos/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      await buscarProdutos()
      showToast.success(`Grupos de complementos vinculados com sucesso!`)
      setGruposComplementosSelecionados(new Set())
      setProdutosSelecionados(new Set())
    } catch (error: any) {
      console.error('Erro ao vincular grupos de complementos', error)
      showToast.error(error.message || 'Erro ao vincular grupos de complementos')
    } finally {
      setIsUpdating(false)
    }
  }

  const desvincularGruposComplementos = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    if (gruposComplementosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um grupo de complementos')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Desvinculando grupos de complementos...')

    try {
      const gruposIdsArray = Array.from(gruposComplementosSelecionados)
      const payload = Array.from(produtosSelecionados).map((produtoId) => ({
        produtoId,
        gruposComplementosIdsToRemove: gruposIdsArray,
      }))

      const response = await fetch('/api/produtos/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      await buscarProdutos()
      showToast.success(`Grupos de complementos desvinculados com sucesso!`)
      setGruposComplementosSelecionados(new Set())
      setProdutosSelecionados(new Set())
    } catch (error: any) {
      console.error('Erro ao desvincular grupos de complementos', error)
      showToast.error(error.message || 'Erro ao desvincular grupos de complementos')
    } finally {
      setIsUpdating(false)
    }
  }

  const atualizarGruposComplementos = () => {
    if (modoGrupoComplemento === 'adicionar') {
      vincularGruposComplementos()
    } else {
      desvincularGruposComplementos()
    }
  }

  const todosSelecionados = produtos.length > 0 && produtosSelecionados.size === produtos.length
  const algunsSelecionados = produtosSelecionados.size > 0 && produtosSelecionados.size < produtos.length
  const todasImpressorasSelecionadas = impressorasDisponiveis.length > 0 && impressorasSelecionadas.size === impressorasDisponiveis.length
  const algumasImpressorasSelecionadas = impressorasSelecionadas.size > 0 && impressorasSelecionadas.size < impressorasDisponiveis.length
  const todosGruposComplementosSelecionados = gruposComplementos.length > 0 && gruposComplementosSelecionados.size === gruposComplementos.length
  const algunsGruposComplementosSelecionados = gruposComplementosSelecionados.size > 0 && gruposComplementosSelecionados.size < gruposComplementos.length

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setFilterStatus('Ativo')
    setAtivoLocalFilter('Todos')
    setAtivoDeliveryFilter('Todos')
    setGrupoProdutoFilter('')
  }, [])

  return (
    <div className="flex flex-col h-full bg-info">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-1 md:gap-4 gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="md:text-2xl text-sm font-bold text-primary">
              {activeTab === 'precos'
                ? 'Atualizar Preços em Lote'
                : activeTab === 'impressoras'
                  ? 'Atualizar Impressoras em Lote'
                  : 'Atualizar Grupos de Complementos em Lote'}
            </h1>
            <p className="md:text-sm text-xs text-secondary-text">
              Total de itens: {total} | Selecionados: {produtosSelecionados.size}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          {/* Tabs */}
          <div className="flex flex-row gap-1 bg-info rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('precos')
                setImpressorasSelecionadas(new Set())
                setGruposComplementosSelecionados(new Set())
              }}
              className={`md:px-4 px-3 py-1 rounded text-sm font-semibold transition-colors ${
                activeTab === 'precos'
                  ? 'bg-primary text-info'
                  : 'text-secondary-text hover:bg-primary/10'
              }`}
            >
              Preços
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('impressoras')
                setAdjustAmount('')
                setModoImpressora('adicionar')
                setImpressorasSelecionadas(new Set())
              }}
              className={`md:px-4 px-2 py-1 rounded text-sm font-semibold transition-colors ${
                activeTab === 'impressoras'
                  ? 'bg-primary text-info'
                  : 'text-secondary-text hover:bg-primary/10'
              }`}
            >
              Impressoras
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('gruposComplementos')
                setAdjustAmount('')
                setModoGrupoComplemento('adicionar')
                setGruposComplementosSelecionados(new Set())
              }}
              className={`md:px-4 px-1 py-1 rounded text-sm font-semibold transition-colors ${
                activeTab === 'gruposComplementos'
                  ? 'bg-primary text-info'
                  : 'text-secondary-text hover:bg-primary/10'
              }`}
            >
              Grupos Complementos
            </button>
          </div>
          <Link
            href="/produtos"
            className="h-8 px-8 rounded-lg bg-info text-primary justify-center font-semibold font-exo text-sm border border-primary shadow-sm hover:bg-primary/20 transition-colors flex items-center"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-2">
        {activeTab === 'precos' ? (
          <>
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
                  <Input
                    className="rounded-lg"
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
          </>
        ) : activeTab === 'impressoras' ? (
          <>
            <div className="flex flex-col gap-1">
              {/* Modo de operação: Adicionar ou Remover */}
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-secondary-text">
                  Modo de operação:
                </label>
                <div className="flex gap-1 bg-info rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModoImpressora('adicionar')
                      setImpressorasSelecionadas(new Set())
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      modoImpressora === 'adicionar'
                        ? 'bg-primary text-info'
                        : 'text-secondary-text hover:bg-primary/10'
                    }`}
                  >
                    Vincular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoImpressora('remover')
                      setImpressorasSelecionadas(new Set())
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      modoImpressora === 'remover'
                        ? 'bg-primary text-info'
                        : 'text-secondary-text hover:bg-primary/10'
                    }`}
                  >
                    Desvincular
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-secondary-text">
                  {modoImpressora === 'adicionar' ? 'Selecionar Impressoras' : 'Selecionar Impressoras para Remover'} ({impressorasSelecionadas.size} selecionada{impressorasSelecionadas.size !== 1 ? 's' : ''})
                </label>
                <div className="flex items-center gap-4">
                  {impressorasDisponiveis.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (todasImpressorasSelecionadas) {
                          setImpressorasSelecionadas(new Set())
                        } else {
                          setImpressorasSelecionadas(
                            new Set(impressorasDisponiveis.map((i) => i.getId()))
                          )
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {todasImpressorasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  )}
                  <div className="flex justify-end max-w-4xl">
                    <Button
                      onClick={atualizarImpressoras}
                      disabled={
                        isUpdating ||
                        produtosSelecionados.size === 0 ||
                        impressorasSelecionadas.size === 0
                      }
                      className="md:min-w-[180px] h-8 hover:bg-primary/90"
                      sx={{
                        color: 'var(--color-info)',
                        backgroundColor: 'var(--color-primary)',
                      }}
                    >
                      {isUpdating
                        ? modoImpressora === 'adicionar' ? 'Adicionando...' : 'Removendo...'
                        : modoImpressora === 'adicionar'
                          ? `Vincular a ${produtosSelecionados.size} produto(s)`
                          : `Desvincular de ${produtosSelecionados.size} produto(s)`}
                    </Button>
                  </div>
                </div>
              </div>
              {isLoadingImpressoras ? (
                <div className="flex items-center justify-start py-4">
                  <span className="text-sm text-secondary-text">Carregando impressoras...</span>
                </div>
              ) : impressorasDisponiveis.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-secondary-text">Nenhuma impressora disponível</span>
                </div>
              ) : (
                <div className="w-full">
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-1 bg-white ">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {impressorasDisponiveis.map((impressora) => {
                        const isSelected = impressorasSelecionadas.has(impressora.getId())
                        return (
                          <label
                            key={impressora.getId()}
                            className={`flex items-center rounded-lg border cursor-pointer transition-colors min-h-[40px] ${
                              isSelected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleImpressora(impressora.getId())}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                            />
                            <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                              {impressora.getNome()}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
              
            </div>
            
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {/* Modo de operação: Adicionar ou Remover */}
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-secondary-text">
                  Modo de operação:
                </label>
                <div className="flex gap-1 bg-info rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModoGrupoComplemento('adicionar')
                      setGruposComplementosSelecionados(new Set())
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      modoGrupoComplemento === 'adicionar'
                        ? 'bg-primary text-info'
                        : 'text-secondary-text hover:bg-primary/10'
                    }`}
                  >
                    Vincular
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoGrupoComplemento('remover')
                      setGruposComplementosSelecionados(new Set())
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      modoGrupoComplemento === 'remover'
                        ? 'bg-primary text-info'
                        : 'text-secondary-text hover:bg-primary/10'
                    }`}
                  >
                    Desvincular
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-secondary-text">
                  {modoGrupoComplemento === 'adicionar' ? 'Selecionar Grupos de Complementos' : 'Selecionar Grupos de Complementos para Remover'} ({gruposComplementosSelecionados.size} selecionado{gruposComplementosSelecionados.size !== 1 ? 's' : ''})
                </label>
                <div className="flex items-center gap-4">
                  {gruposComplementos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (todosGruposComplementosSelecionados) {
                          setGruposComplementosSelecionados(new Set())
                        } else {
                          setGruposComplementosSelecionados(
                            new Set(gruposComplementos.map((g) => g.getId()))
                          )
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {todosGruposComplementosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                  <div className="flex justify-end max-w-4xl">
                    <Button
                      onClick={atualizarGruposComplementos}
                      disabled={
                        isUpdating ||
                        produtosSelecionados.size === 0 ||
                        gruposComplementosSelecionados.size === 0
                      }
                      className="md:min-w-[180px] h-8 hover:bg-primary/90"
                      sx={{
                        color: 'var(--color-info)',
                        backgroundColor: 'var(--color-primary)',
                      }}
                    >
                      {isUpdating
                        ? modoGrupoComplemento === 'adicionar' ? 'Vinculando...' : 'Desvinculando...'
                        : modoGrupoComplemento === 'adicionar'
                          ? `Vincular a ${produtosSelecionados.size} produto(s)`
                          : `Desvincular de ${produtosSelecionados.size} produto(s)`}
                    </Button>
                  </div>
                </div>
              </div>
              {isLoadingGruposComplementos ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-secondary-text">Carregando grupos de complementos...</span>
                </div>
              ) : gruposComplementos.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-secondary-text">Nenhum grupo de complementos disponível</span>
                </div>
              ) : (
                <div className="w-full">
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-1 bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                      {gruposComplementos.map((grupo) => {
                        const isSelected = gruposComplementosSelecionados.has(grupo.getId())
                        return (
                          <label
                            key={grupo.getId()}
                            className={`flex items-center rounded-lg border cursor-pointer transition-colors min-h-[40px] ${
                              isSelected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleGrupoComplemento(grupo.getId())}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                            />
                            <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                              {grupo.getNome()}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
             
            </div>
            
          </>
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
            <div className="flex items-center h-11 gap-2 md:px-4 px-2 text-xs font-semibold text-primary-text uppercase tracking-wide bg-custom-2">
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
              <div className="flex-[1.2] text-center hidden md:flex">Impressoras</div>
              <div className="flex-[1.2] text-center hidden md:flex">Grupos Complementos</div>
              <div className="md:flex-1 text-right text-xs">Valor atual</div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {produtos
                .slice()
                .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
                .map((produto, index) => {
                const isSelected = produtosSelecionados.has(produto.getId())
                // Usar diretamente as impressoras que vêm do produto (já têm id, nome e ativo)
                const impressorasDoProduto = produto.getImpressoras()
                // Usar diretamente os grupos de complementos que vêm do produto
                const gruposComplementosDoProduto = produto.getGruposComplementos()
                // Cor de fundo alternada: se selecionado usa primary/20, senão alterna entre gray-50 e white
                const bgColor = isSelected 
                  ? 'bg-primary/20' 
                  : index % 2 === 0 
                    ? 'bg-gray-50' 
                    : 'bg-white'
                const isExpanded = produtosExpandidos.has(produto.getId())
                return (
                  <div key={produto.getId()} className="flex flex-col">
                    {/* Linha principal do produto */}
                    <div
                      className={`flex rounded-lg items-center md:px-4 px-2 gap-2 ${bgColor} hover:bg-primary-bg transition-colors cursor-default`}
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
                      {/* Colunas de impressoras e grupos (apenas desktop) */}
                      <div className="flex-[1.2] justify-center hidden md:flex">
                        {impressorasDoProduto.length === 0 ? (
                          <span className="text-xs text-secondary-text">Nenhuma</span>
                        ) : (
                          <select
                            className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
                            defaultValue=""
                            onChange={(event) => {
                              event.currentTarget.value = ''
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="" disabled>
                              {impressorasDoProduto.length} impressora{impressorasDoProduto.length !== 1 ? 's' : ''}
                            </option>
                            {impressorasDoProduto.map((impressora) => (
                              <option key={impressora.id} value={impressora.id}>
                                {impressora.nome}
                                {impressora.ativo === false ? ' (Inativa)' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex-[1.2] justify-center hidden md:flex">
                        {gruposComplementosDoProduto.length === 0 ? (
                          <span className="text-xs text-secondary-text">Nenhum</span>
                        ) : (
                          <select
                            className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
                            defaultValue=""
                            onChange={(event) => {
                              event.currentTarget.value = ''
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="" disabled>
                              {gruposComplementosDoProduto.length} grupo{gruposComplementosDoProduto.length !== 1 ? 's' : ''}
                            </option>
                            {gruposComplementosDoProduto.map((grupo) => (
                              <option key={grupo.id} value={grupo.id}>
                                {grupo.nome}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex-1 text-right font-semibold md:text-sm text-xs text-primary-text">
                        {transformarParaReal(produto.getValor())}
                      </div>
                      {/* Botão para expandir/ocultar (apenas mobile) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpansao(produto.getId())
                        }}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-primary/10 transition-colors"
                        aria-label={isExpanded ? 'Ocultar detalhes' : 'Expandir detalhes'}
                      >
                        {isExpanded ? (
                          <MdExpandLess size={20} className="text-primary-text" />
                        ) : (
                          <MdExpandMore size={20} className="text-primary-text" />
                        )}
                      </button>
                    </div>
                    {/* Área expansível com impressoras e grupos (apenas mobile) */}
                    {isExpanded && (
                      <div className="md:hidden px-2 pb-2 pt-1 bg-gray-50 border-b border-gray-200">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-secondary-text">Impressoras</label>
                            {impressorasDoProduto.length === 0 ? (
                              <span className="text-xs text-secondary-text">Nenhuma</span>
                            ) : (
                              <select
                                className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
                                defaultValue=""
                                onChange={(event) => {
                                  event.currentTarget.value = ''
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled>
                                  {impressorasDoProduto.length} impressora{impressorasDoProduto.length !== 1 ? 's' : ''}
                                </option>
                                {impressorasDoProduto.map((impressora) => (
                                  <option key={impressora.id} value={impressora.id}>
                                    {impressora.nome}
                                    {impressora.ativo === false ? ' (Inativa)' : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-secondary-text">Grupos de Complementos</label>
                            {gruposComplementosDoProduto.length === 0 ? (
                              <span className="text-xs text-secondary-text">Nenhum</span>
                            ) : (
                              <select
                                className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
                                defaultValue=""
                                onChange={(event) => {
                                  event.currentTarget.value = ''
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled>
                                  {gruposComplementosDoProduto.length} grupo{gruposComplementosDoProduto.length !== 1 ? 's' : ''}
                                </option>
                                {gruposComplementosDoProduto.map((grupo) => (
                                  <option key={grupo.id} value={grupo.id}>
                                    {grupo.nome}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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


