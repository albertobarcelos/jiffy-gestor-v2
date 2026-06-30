'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { transformarParaReal, brToEUA } from '@/src/shared/utils/formatters'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import Link from 'next/link'
import {
  sxEntradaCompactaProduto,
  sxEntradaCompactaProdutoSelect,
} from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import {
  indicadoresProducao,
  origensMercadoria,
  tiposProduto,
} from '@/src/presentation/components/features/produtos/NovoProduto/fiscalSelectOptions'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { ProdutoActionIconsDisplay } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoActionIconsDisplay'
import { MdSearch, MdExpandMore, MdExpandLess, MdCheckCircle, MdError } from 'react-icons/md'
import {
  FILTRO_COLUNA_TODOS,
  LABEL_FILTRO_COLUNA,
  CAMPOS_PERMISSAO_PDV,
  sxCheckboxListaLote,
  FISCAL_LOTE_VAZIO,
} from './constants'
import type {
  PermissaoCampoChave,
  FiltroColunaVazia,
  TabPainelLote,
  FiscalLoteDraft,
} from './types'
import { produtoSemDadoNaColuna, filtrosDisponiveisPorAba } from './rules/produtosLoteFiltros'
import { montarBodyPermissoesParcial } from './rules/permissoesLote.rules'
import { montarBodyFiscalLote } from './rules/fiscalLote.rules'
import { textoOuNenhum } from './utils/produtosLoteUi'
import { useProdutosLoteInfinite } from './hooks/useProdutosLoteInfinite'
import { useImpressorasDisponiveis } from './hooks/useImpressorasDisponiveis'
import { useValidacaoFiscalLote } from './hooks/useValidacaoFiscalLote'

/**
 * Atualização de produtos em lote (preços, impressoras, grupos de complementos,
 * permissões PDV e dados fiscais), com seleção múltipla e paginação infinita.
 */
export function AtualizarProdutosLote() {
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [ativoLocalFilter, setAtivoLocalFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [ativoDeliveryFilter, setAtivoDeliveryFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [grupoProdutoFilter, setGrupoProdutoFilter] = useState('')
  /** Mostrar apenas produtos sem dado na coluna escolhida (filtro só no front). */
  const [filtroColunaVazia, setFiltroColunaVazia] = useState<FiltroColunaVazia>(FILTRO_COLUNA_TODOS)
  const [adjustMode, setAdjustMode] = useState<'valor' | 'percentual'>('valor')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase')
  const [produtosExpandidos, setProdutosExpandidos] = useState<Set<string>>(new Set())
  const [impressorasSelecionadas, setImpressorasSelecionadas] = useState<Set<string>>(new Set())
  const [gruposComplementosSelecionados, setGruposComplementosSelecionados] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabPainelLote>('precos')
  const [modoPermissao, setModoPermissao] = useState<'ativar' | 'desativar'>('ativar')
  const [permissoesCamposSelecionados, setPermissoesCamposSelecionados] = useState<
    Set<PermissaoCampoChave>
  >(new Set())
  const [isSalvandoPermissoes, setIsSalvandoPermissoes] = useState(false)
  const [salvandoPermissoesProgresso, setSalvandoPermissoesProgresso] = useState<{
    atual: number
    total: number
  } | null>(null)
  const [fiscalLoteDraft, setFiscalLoteDraft] = useState<FiscalLoteDraft>(FISCAL_LOTE_VAZIO)
  const [isSalvandoFiscal, setIsSalvandoFiscal] = useState(false)
  const [salvandoFiscalProgresso, setSalvandoFiscalProgresso] = useState<{
    atual: number
    total: number
  } | null>(null)
  const [modoImpressora, setModoImpressora] = useState<'adicionar' | 'remover'>('adicionar')
  const [modoGrupoComplemento, setModoGrupoComplemento] = useState<'adicionar' | 'remover'>('adicionar')
  /** Por aba: IDs alterados com sucesso naquela guia (persiste ao trocar de aba; zera só ao sair/recarregar a página). */
  const [produtosAlteradosPorAba, setProdutosAlteradosPorAba] = useState<
    Record<TabPainelLote, Set<string>>
  >(() => ({
    precos: new Set(),
    impressoras: new Set(),
    gruposComplementos: new Set(),
    permissoes: new Set(),
    fiscal: new Set(),
  }))
  const { auth } = useAuthStore()

  const produtosLoteFilters = useMemo(
    () => ({
      searchText,
      filterStatus,
      ativoLocalFilter,
      ativoDeliveryFilter,
      grupoProdutoFilter,
    }),
    [searchText, filterStatus, ativoLocalFilter, ativoDeliveryFilter, grupoProdutoFilter]
  )

  const {
    produtos,
    total,
    isLoading,
    isLoadingMore,
    hasMoreProdutos,
    buscarProdutos,
    listaAreaRef,
    loadMoreSentinelRef,
  } = useProdutosLoteInfinite(produtosLoteFilters)

  const { impressorasDisponiveis, isLoadingImpressoras } = useImpressorasDisponiveis(
    activeTab === 'impressoras'
  )

  const {
    ncmValidation,
    isValidatingNcm,
    cestsDisponiveis,
    isLoadingCests,
    cestValidation,
    isValidatingCest,
    isNcmInvalidFiscal,
    isCestInvalidFiscal,
    isNcmValidFiscal,
    hasCestsDisponiveisFiscal,
  } = useValidacaoFiscalLote({
    activeTab,
    fiscalLoteDraft,
    setFiscalLoteDraft,
  })

  useEffect(() => {
    setFiltroColunaVazia((prev) =>
      filtrosDisponiveisPorAba(activeTab).includes(prev) ? prev : FILTRO_COLUNA_TODOS,
    )
  }, [activeTab])

  useEffect(() => {
    setProdutosExpandidos(new Set())
  }, [activeTab])

  const marcarProdutosAlteradosNaSessao = useCallback((ids: string[], aba: TabPainelLote) => {
    if (ids.length === 0) return
    setProdutosAlteradosPorAba((prev) => {
      const novoSet = new Set(prev[aba])
      for (const id of ids) novoSet.add(id)
      return { ...prev, [aba]: novoSet }
    })
  }, [])
  const {
    data: gruposProdutos = [],
    isLoading: isLoadingGruposProdutos,
  } = useGruposProdutos({ limit: 100, ativo: null })
  const {
    data: gruposComplementos = [],
    isLoading: isLoadingGruposComplementos,
  } = useGruposComplementos({ limit: 100, ativo: null })

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

  const togglePermissaoCampo = (chave: PermissaoCampoChave) => {
    setPermissoesCamposSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(chave)) {
        novo.delete(chave)
      } else {
        novo.add(chave)
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

      marcarProdutosAlteradosNaSessao(payload.map((p) => p.produtoId), 'precos')

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

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'impressoras')

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

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'impressoras')

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

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'gruposComplementos')

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

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'gruposComplementos')

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

  /** PATCH sequencial por produto (sem bulk-update); mesmo contrato que NovoProduto em edição. */
  const vincularPermissoesEmLote = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    if (permissoesCamposSelecionados.size === 0) {
      showToast.error('Selecione ao menos uma permissão')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const ids = Array.from(produtosSelecionados)
    const total = ids.length
    const valorAlvo = modoPermissao === 'ativar'
    const body = montarBodyPermissoesParcial(permissoesCamposSelecionados, valorAlvo)

    setIsSalvandoPermissoes(true)
    setSalvandoPermissoesProgresso({ atual: 0, total })

    let sucesso = 0
    let falhas = 0
    const idsPermissaoComSucesso: string[] = []

    try {
      for (let i = 0; i < ids.length; i++) {
        const produtoId = ids[i]
        setSalvandoPermissoesProgresso({ atual: i + 1, total })

        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const msg =
            typeof error.message === 'string' && error.message.trim() !== ''
              ? error.message
              : `Erro ${response.status}`
          console.error(`Permissões produto ${produtoId}:`, msg)
          falhas += 1
        } else {
          sucesso += 1
          idsPermissaoComSucesso.push(produtoId)
        }
      }

      marcarProdutosAlteradosNaSessao(idsPermissaoComSucesso, 'permissoes')

      await buscarProdutos()
      setProdutosSelecionados(new Set())

      if (falhas === 0) {
        const acao = modoPermissao === 'ativar' ? 'ativadas' : 'desativadas'
        showToast.success(`Permissões ${acao} com sucesso! (${sucesso} produto(s))`)
      } else {
        showToast.warning(
          `${sucesso} atualizado(s) com sucesso. ${falhas} falhou(ram). Verifique o console para detalhes.`
        )
      }
    } catch (error: any) {
      console.error('Erro ao vincular permissões em lote', error)
      showToast.error(error.message || 'Erro ao vincular permissões')
    } finally {
      setIsSalvandoPermissoes(false)
      setSalvandoPermissoesProgresso(null)
    }
  }

  /** PATCH sequencial com objeto `fiscal` (sem bulk-update). */
  const aplicarFiscalEmLote = async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    const body = montarBodyFiscalLote(fiscalLoteDraft)
    if (!body) {
      showToast.error('Preencha ao menos um campo fiscal')
      return
    }

    const ncmTrimmed = fiscalLoteDraft.ncm.trim()
    if (ncmTrimmed !== '') {
      if (!/^\d{8}$/.test(ncmTrimmed)) {
        showToast.error('O código NCM deve conter exatamente 8 dígitos numéricos.')
        return
      }
      if (ncmValidation && !ncmValidation.valido) {
        showToast.error(ncmValidation.mensagem || 'O código NCM informado não é válido.')
        return
      }
      if (isValidatingNcm) {
        showToast.error('Aguarde a validação do NCM antes de salvar.')
        return
      }
    }

    const cestTrimmed = fiscalLoteDraft.cest.trim()
    if (cestTrimmed !== '') {
      if (!/^\d{7}$/.test(cestTrimmed)) {
        showToast.error('O código CEST deve conter exatamente 7 dígitos numéricos.')
        return
      }
      if (cestValidation && !cestValidation.valido) {
        showToast.error(cestValidation.mensagem || 'O código CEST informado não é válido.')
        return
      }
      if (isValidatingCest) {
        showToast.error('Aguarde a validação do CEST antes de salvar.')
        return
      }
    }

    const indTrimmed = fiscalLoteDraft.indicadorProducaoEscala.trim()
    if (indTrimmed !== '' && cestTrimmed === '') {
      showToast.error(
        'A informação sobre a "Produção em Escala Relevante" foi preenchida sem preencher o código CEST'
      )
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const ids = Array.from(produtosSelecionados)
    const totalIds = ids.length

    setIsSalvandoFiscal(true)
    setSalvandoFiscalProgresso({ atual: 0, total: totalIds })

    let sucesso = 0
    let falhas = 0
    const idsFiscalComSucesso: string[] = []

    try {
      for (let i = 0; i < ids.length; i++) {
        const produtoId = ids[i]
        setSalvandoFiscalProgresso({ atual: i + 1, total: totalIds })

        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const msg =
            typeof error.message === 'string' && error.message.trim() !== ''
              ? error.message
              : `Erro ${response.status}`
          console.error(`Fiscal produto ${produtoId}:`, msg)
          falhas += 1
        } else {
          sucesso += 1
          idsFiscalComSucesso.push(produtoId)
        }
      }

      marcarProdutosAlteradosNaSessao(idsFiscalComSucesso, 'fiscal')

      await buscarProdutos()
      setProdutosSelecionados(new Set())

      if (falhas === 0) {
        showToast.success(`Dados fiscais atualizados! (${sucesso} produto(s))`)
      } else {
        showToast.warning(
          `${sucesso} atualizado(s) com sucesso. ${falhas} falhou(ram). Verifique o console para detalhes.`
        )
      }
    } catch (error: any) {
      console.error('Erro ao aplicar fiscal em lote', error)
      showToast.error(error.message || 'Erro ao aplicar dados fiscais')
    } finally {
      setIsSalvandoFiscal(false)
      setSalvandoFiscalProgresso(null)
    }
  }

  const produtosExibicao = useMemo(() => {
    if (filtroColunaVazia === FILTRO_COLUNA_TODOS) return produtos
    return produtos.filter((p) => produtoSemDadoNaColuna(p, filtroColunaVazia))
  }, [produtos, filtroColunaVazia])

  const todosSelecionados =
    produtosExibicao.length > 0 &&
    produtosExibicao.every((p) => produtosSelecionados.has(p.getId()))
  const algunsSelecionadosLista =
    produtosExibicao.some((p) => produtosSelecionados.has(p.getId())) && !todosSelecionados
  const todasImpressorasSelecionadas = impressorasDisponiveis.length > 0 && impressorasSelecionadas.size === impressorasDisponiveis.length
  const algumasImpressorasSelecionadas = impressorasSelecionadas.size > 0 && impressorasSelecionadas.size < impressorasDisponiveis.length
  const todosGruposComplementosSelecionados = gruposComplementos.length > 0 && gruposComplementosSelecionados.size === gruposComplementos.length
  const algunsGruposComplementosSelecionados = gruposComplementosSelecionados.size > 0 && gruposComplementosSelecionados.size < gruposComplementos.length
  const todasPermissoesSelecionadas =
    CAMPOS_PERMISSAO_PDV.length > 0 &&
    permissoesCamposSelecionados.size === CAMPOS_PERMISSAO_PDV.length

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setFilterStatus('Ativo')
    setAtivoLocalFilter('Todos')
    setAtivoDeliveryFilter('Todos')
    setGrupoProdutoFilter('')
    setFiltroColunaVazia(FILTRO_COLUNA_TODOS)
  }, [])

  return (
    <div className="flex flex-col bg-info">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-primary-bg border-b border-primary/70 md:px-6 px-1 py-1 md:gap-4 gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="md:text-2xl text-sm font-semibold text-primary">
              {activeTab === 'precos'
                ? 'Atualizar Preços em Lote'
                : activeTab === 'impressoras'
                  ? 'Atualizar Impressoras em Lote'
                  : activeTab === 'gruposComplementos'
                    ? 'Atualizar Grupos de Complementos em Lote'
                    : activeTab === 'permissoes'
                      ? 'Atualizar Permissões em Lote'
                      : 'Atualizar Dados Fiscais em Lote'}
            </h1>
            <p className="md:text-sm text-xs text-secondary-text">
              Total de itens: {total} | Selecionados: {produtosSelecionados.size}
              {filtroColunaVazia !== FILTRO_COLUNA_TODOS ? (
                <>
                  {' '}
                  | {LABEL_FILTRO_COLUNA[filtroColunaVazia]}: exibindo {produtosExibicao.length} de{' '}
                  {produtos.length} 
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          {/* Tabs */}
          <div className="flex flex-row flex-wrap gap-1 bg-info rounded-lg p-1">
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
            <button
              type="button"
              onClick={() => {
                setAdjustAmount('')
                setImpressorasSelecionadas(new Set())
                setGruposComplementosSelecionados(new Set())
                if (activeTab !== 'permissoes') {
                  setPermissoesCamposSelecionados(new Set())
                  setModoPermissao('ativar')
                }
                setActiveTab('permissoes')
              }}
              className={`md:px-4 px-1 py-1 rounded text-sm font-semibold transition-colors ${
                activeTab === 'permissoes'
                  ? 'bg-primary text-info'
                  : 'text-secondary-text hover:bg-primary/10'
              }`}
            >
              Permissões
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustAmount('')
                setImpressorasSelecionadas(new Set())
                setGruposComplementosSelecionados(new Set())
                if (activeTab !== 'fiscal') {
                  setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
                }
                setActiveTab('fiscal')
              }}
              className={`md:px-4 px-1 py-1 rounded text-sm font-semibold transition-colors ${
                activeTab === 'fiscal'
                  ? 'bg-primary text-info'
                  : 'text-secondary-text hover:bg-primary/10'
              }`}
            >
              Fiscal
            </button>
          </div>
          <Link
            href="/produtos"
            className="h-8 px-8 rounded-lg bg-info text-primary justify-center font-semibold font-exo text-sm border border-primary shadow-sm hover:bg-primary/20 transition-colors flex items-center"
          >
            Fechar
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
                      isUpdating ||
                      isSalvandoPermissoes ||
                      isSalvandoFiscal ||
                      produtosSelecionados.size === 0 ||
                      !adjustAmount.trim()
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
                        isSalvandoPermissoes ||
                        isSalvandoFiscal ||
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
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                      {impressorasDisponiveis.map((impressora) => {
                        const isSelected = impressorasSelecionadas.has(impressora.getId())
                        return (
                          <label
                            key={impressora.getId()}
                            className={`flex min-h-0 items-center gap-0.5 rounded-lg border p-1 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Checkbox
                              size="small"
                              disableRipple
                              disableFocusRipple
                              checked={isSelected}
                              onChange={() => toggleImpressora(impressora.getId())}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                              sx={sxCheckboxListaLote}
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
        ) : activeTab === 'gruposComplementos' ? (
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
                        isSalvandoPermissoes ||
                        isSalvandoFiscal ||
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
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                      {gruposComplementos.map((grupo) => {
                        const isSelected = gruposComplementosSelecionados.has(grupo.getId())
                        return (
                          <label
                            key={grupo.getId()}
                            className={`flex min-h-0 items-center gap-0.5 rounded-lg border p-1 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border-primary'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Checkbox
                              size="small"
                              disableRipple
                              disableFocusRipple
                              checked={isSelected}
                              onChange={() => toggleGrupoComplemento(grupo.getId())}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                              sx={sxCheckboxListaLote}
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
        ) : activeTab === 'permissoes' ? (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-semibold text-secondary-text">
                  Modo de operação:
                </label>
                <div className="flex gap-1 bg-info rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModoPermissao('ativar')
                      setPermissoesCamposSelecionados(new Set())
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      modoPermissao === 'ativar'
                        ? 'bg-primary text-info'
                        : 'text-secondary-text hover:bg-primary/10'
                    }`}
                  >
                    Ativar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoPermissao('desativar')
                      setPermissoesCamposSelecionados(new Set())
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      modoPermissao === 'desativar'
                        ? 'bg-primary text-info'
                        : 'text-secondary-text hover:bg-primary/10'
                    }`}
                  >
                    Desativar
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-secondary-text">
                  {modoPermissao === 'ativar'
                    ? 'Selecionar Permissões'
                    : 'Selecionar Permissões para Desativar'}{' '}
                  ({permissoesCamposSelecionados.size} selecionada
                  {permissoesCamposSelecionados.size !== 1 ? 's' : ''})
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (todasPermissoesSelecionadas) {
                        setPermissoesCamposSelecionados(new Set())
                      } else {
                        setPermissoesCamposSelecionados(
                          new Set(CAMPOS_PERMISSAO_PDV.map((c) => c.chave))
                        )
                      }
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {todasPermissoesSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                  <div className="flex justify-end max-w-4xl">
                    <Button
                      type="button"
                      onClick={vincularPermissoesEmLote}
                      disabled={
                        isUpdating ||
                        isSalvandoPermissoes ||
                        isSalvandoFiscal ||
                        produtosSelecionados.size === 0 ||
                        permissoesCamposSelecionados.size === 0
                      }
                      className="md:min-w-[180px] h-8 hover:bg-primary/90"
                      sx={{
                        color: 'var(--color-info)',
                        backgroundColor: 'var(--color-primary)',
                      }}
                    >
                      {isSalvandoPermissoes
                        ? modoPermissao === 'ativar'
                          ? 'Ativando...'
                          : 'Desativando...'
                        : modoPermissao === 'ativar'
                          ? `Ativar em ${produtosSelecionados.size} produto(s)`
                          : `Desativar em ${produtosSelecionados.size} produto(s)`}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="w-full">
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white p-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                    {CAMPOS_PERMISSAO_PDV.map(({ chave, label }) => {
                      const isSelected = permissoesCamposSelecionados.has(chave)
                      return (
                        <label
                          key={chave}
                          className={`flex min-h-0 items-center gap-0.5 rounded-lg border px-1 py-1 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox
                            size="small"
                            disableRipple
                            disableFocusRipple
                            checked={isSelected}
                            onChange={() => togglePermissaoCampo(chave)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
                            sx={sxCheckboxListaLote}
                          />
                          <span className="md:text-sm text-xs font-medium text-primary-text truncate">
                            {label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-[10px] bg-info p-2 md:p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="font-exo text-base font-semibold text-primary md:text-lg">
                      Configuração Fiscal
                    </h2>
                    <div className="h-px min-w-[40px] flex-1 bg-primary/70" />
                  </div>
                  <p className="font-nunito text-xs text-secondary-text md:text-sm">
                    Preencha as informações fiscais. Serão aplicadas aos produtos selecionados na lista
                    abaixo (um PATCH por produto).
                  </p>
                </div>
                <div className="shrink-0">
                  <Button
                    type="button"
                    onClick={aplicarFiscalEmLote}
                    disabled={
                      isUpdating ||
                      isSalvandoPermissoes ||
                      isSalvandoFiscal ||
                      produtosSelecionados.size === 0 ||
                      isNcmInvalidFiscal ||
                      isCestInvalidFiscal ||
                      isValidatingNcm ||
                      isValidatingCest
                    }
                    className="md:min-w-[180px] h-8 hover:bg-primary/90"
                    sx={{
                      color: 'var(--color-info)',
                      backgroundColor: 'var(--color-primary)',
                    }}
                  >
                    {isSalvandoFiscal
                      ? 'Salvando...'
                      : `Alterar (${produtosSelecionados.size})`}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Input
                    label="NCM"
                    size="small"
                    type="text"
                    value={fiscalLoteDraft.ncm}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setFiscalLoteDraft((d) => ({ ...d, ncm: v }))
                    }}
                    placeholder="8 dígitos"
                    className="bg-white"
                    sx={sxEntradaCompactaProduto}
                    inputProps={{ maxLength: 8 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {isValidatingNcm && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          )}
                          {!isValidatingNcm && ncmValidation &&
                            (ncmValidation.valido ? (
                              <MdCheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <MdError className="h-5 w-5 text-red-500" />
                            ))}
                        </InputAdornment>
                      ),
                    }}
                  />
                  {isValidatingNcm && (
                    <p className="mt-1 font-nunito text-xs text-secondary-text">Validando NCM...</p>
                  )}
                  {!isValidatingNcm && ncmValidation && (
                    <p
                      className={`mt-1 font-nunito text-xs ${ncmValidation.valido ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {ncmValidation.valido && ncmValidation.descricao
                        ? ncmValidation.descricao
                        : ncmValidation.mensagem}
                    </p>
                  )}
                </div>
                <div>
                  {hasCestsDisponiveisFiscal ? (
                    <FormControl
                      fullWidth
                      size="small"
                      variant="outlined"
                      sx={sxEntradaCompactaProdutoSelect}
                      disabled={!isNcmValidFiscal}
                    >
                      <InputLabel id="lote-fiscal-cest-label">CEST</InputLabel>
                      <Select
                        labelId="lote-fiscal-cest-label"
                        label="CEST"
                        value={fiscalLoteDraft.cest}
                        onChange={(e: SelectChangeEvent<string>) =>
                          setFiscalLoteDraft((d) => ({ ...d, cest: e.target.value }))
                        }
                      >
                        <MenuItem value="">
                          <span className="text-secondary-text">Selecione o CEST</span>
                        </MenuItem>
                        {cestsDisponiveis.map((item) => (
                          <MenuItem key={item.codigo} value={item.codigo}>
                            {item.codigo} — {item.descricao}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Input
                      label="CEST"
                      size="small"
                      type="text"
                      value={fiscalLoteDraft.cest}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 7)
                        setFiscalLoteDraft((d) => ({ ...d, cest: v }))
                      }}
                      placeholder={
                        isLoadingCests
                          ? 'Carregando...'
                          : !isNcmValidFiscal
                            ? 'Informe um NCM válido primeiro'
                            : '7 dígitos'
                      }
                      disabled={isLoadingCests || !isNcmValidFiscal}
                      className="bg-white"
                      sx={sxEntradaCompactaProduto}
                      inputProps={{ maxLength: 7 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {(isValidatingCest || isLoadingCests) && (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            )}
                            {!isValidatingCest && !isLoadingCests && cestValidation &&
                              (cestValidation.valido ? (
                                <MdCheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <MdError className="h-5 w-5 text-red-500" />
                              ))}
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  {isLoadingCests && (
                    <p className="mt-1 font-nunito text-xs text-secondary-text">
                      Carregando CESTs compatíveis...
                    </p>
                  )}
                  {isValidatingCest && (
                    <p className="mt-1 font-nunito text-xs text-secondary-text">Validando CEST...</p>
                  )}
                  {!isValidatingCest && !isLoadingCests && cestValidation && (
                    <p
                      className={`mt-1 font-nunito text-xs ${cestValidation.valido ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {cestValidation.valido && cestValidation.descricao
                        ? cestValidation.descricao
                        : cestValidation.mensagem}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                  <InputLabel id="lote-fiscal-origem-label">Origem da Mercadoria</InputLabel>
                  <Select
                    labelId="lote-fiscal-origem-label"
                    label="Origem da Mercadoria"
                    value={fiscalLoteDraft.origemMercadoria}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFiscalLoteDraft((d) => ({ ...d, origemMercadoria: e.target.value }))
                    }
                  >
                    <MenuItem value="">
                      <span className="text-secondary-text">Selecione a origem</span>
                    </MenuItem>
                    {origensMercadoria.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                  <InputLabel id="lote-fiscal-tipo-label">Tipo do Produto</InputLabel>
                  <Select
                    labelId="lote-fiscal-tipo-label"
                    label="Tipo do Produto"
                    value={fiscalLoteDraft.tipoProduto}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFiscalLoteDraft((d) => ({ ...d, tipoProduto: e.target.value }))
                    }
                  >
                    <MenuItem value="">
                      <span className="text-secondary-text">Selecione o tipo</span>
                    </MenuItem>
                    {tiposProduto.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div>
                <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                  <InputLabel id="lote-fiscal-indicador-label">
                    Indicador de Produção em Escala Relevante
                  </InputLabel>
                  <Select
                    labelId="lote-fiscal-indicador-label"
                    label="Indicador de Produção em Escala Relevante"
                    value={fiscalLoteDraft.indicadorProducaoEscala}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFiscalLoteDraft((d) => ({ ...d, indicadorProducaoEscala: e.target.value }))
                    }
                  >
                    <MenuItem value="">
                      <span className="text-secondary-text">Selecione o indicador</span>
                    </MenuItem>
                    {indicadoresProducao.map((i) => (
                      <MenuItem key={i.value} value={i.value}>
                        {i.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <p className="mt-1 font-nunito text-xs text-secondary-text">
                  Obrigatório para produtos no Anexo XXVII (52/2017)
                </p>
              </div>
            </div>
          </>
        )}
      </div>


      <div className="h-[4px] border-t-2 border-primary/70"></div>
      <div className="bg-white md:px-[20px] py-2 border-b border-gray-100">
        <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-x-visible md:px-0">
          <div className="flex min-w-max flex-nowrap items-end gap-2 md:min-w-0 md:flex-wrap md:gap-3">
            <div className="w-[min(250px,48vw)] min-w-[152px] shrink-0">
              <Input
                id="precos-search"
                label="Pesquisar"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Nome ou código"
                className="bg-info"
                sx={{
                  ...sxEntradaCompactaProduto,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--color-info)',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdSearch size={18} className="text-secondary-text" aria-hidden />
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <div className="w-[118px] shrink-0 min-w-[108px]">
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                <InputLabel id="lote-filter-status-label">Status</InputLabel>
                <Select
                  labelId="lote-filter-status-label"
                  label="Status"
                  value={filterStatus}
                  onChange={(e: SelectChangeEvent<string>) =>
                    setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
                  }
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Ativo">Ativo</MenuItem>
                  <MenuItem value="Desativado">Desativado</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-[132px] shrink-0 min-w-[120px]">
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                <InputLabel id="lote-filter-local-label">Ativo no local</InputLabel>
                <Select
                  labelId="lote-filter-local-label"
                  label="Ativo no local"
                  value={ativoLocalFilter}
                  onChange={(e: SelectChangeEvent<string>) =>
                    setAtivoLocalFilter(e.target.value as 'Todos' | 'Sim' | 'Não')
                  }
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Sim">Sim</MenuItem>
                  <MenuItem value="Não">Não</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-[148px] shrink-0 min-w-[136px]">
              <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                <InputLabel id="lote-filter-delivery-label">Ativo no delivery</InputLabel>
                <Select
                  labelId="lote-filter-delivery-label"
                  label="Ativo no delivery"
                  value={ativoDeliveryFilter}
                  onChange={(e: SelectChangeEvent<string>) =>
                    setAtivoDeliveryFilter(e.target.value as 'Todos' | 'Sim' | 'Não')
                  }
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Sim">Sim</MenuItem>
                  <MenuItem value="Não">Não</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-[min(220px,38vw)] min-w-[160px] shrink-0 md:max-w-[260px] md:flex-1">
              <FormControl
                fullWidth
                size="small"
                variant="outlined"
                sx={sxEntradaCompactaProdutoSelect}
                disabled={isLoadingGruposProdutos}
              >
                <InputLabel id="lote-filter-grupo-label">Grupo de produtos</InputLabel>
                <Select
                  labelId="lote-filter-grupo-label"
                  label="Grupo de produtos"
                  value={grupoProdutoFilter}
                  onChange={(e: SelectChangeEvent<string>) => setGrupoProdutoFilter(e.target.value)}
                >
                  <MenuItem value="">
                    <span className="text-secondary-text">
                      {isLoadingGruposProdutos ? 'Carregando...' : 'Todos'}
                    </span>
                  </MenuItem>
                  {!isLoadingGruposProdutos &&
                    gruposProdutos.map((grupo) => (
                      <MenuItem key={grupo.getId()} value={grupo.getId()}>
                        {grupo.getNome()}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            {filtrosDisponiveisPorAba(activeTab).length > 1 ? (
              <div className="w-[min(280px,88vw)] min-w-[200px] shrink-0">
                <FormControl fullWidth size="small" variant="outlined" sx={sxEntradaCompactaProdutoSelect}>
                  <InputLabel id="lote-filter-coluna-vazia-label">Listar sem dado em</InputLabel>
                  <Select
                    labelId="lote-filter-coluna-vazia-label"
                    label="Listar sem dado em"
                    value={filtroColunaVazia}
                    onChange={(e: SelectChangeEvent<string>) =>
                      setFiltroColunaVazia(e.target.value as FiltroColunaVazia)
                    }
                    MenuProps={{
                      PaperProps: {
                        sx: { maxHeight: 320 },
                      },
                    }}
                    renderValue={(selected) =>
                      LABEL_FILTRO_COLUNA[selected as FiltroColunaVazia] ?? String(selected)
                    }
                  >
                    {(Object.entries(LABEL_FILTRO_COLUNA) as [FiltroColunaVazia, string][])
                      .filter(([key]) => filtrosDisponiveisPorAba(activeTab).includes(key))
                      .map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </div>
            ) : null}

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-primary-text hover:bg-gray-50"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div ref={listaAreaRef} className="py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <JiffyLoading />
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado</p>
          </div>
        ) : produtosExibicao.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-secondary-text">
              {filtroColunaVazia !== FILTRO_COLUNA_TODOS
                ? `Nenhum produto entre os já carregados atende a “${LABEL_FILTRO_COLUNA[filtroColunaVazia]}”. Continue rolando para carregar mais itens ou altere os filtros da busca (filtro só na tela).`
                : 'Nenhum produto para exibir com o filtro atual.'}
            </p>
          </div>
        ) : (
          <div className="bg-info rounded-lg overflow-hidden">
            <div className="flex items-center h-11 gap-2 md:px-4 px-2 text-xs font-semibold text-primary-text uppercase tracking-wide bg-custom-2">
              <div className="flex-none md:w-10 w-6 flex justify-center">
                <Checkbox
                  checked={todosSelecionados}
                  indeterminate={algunsSelecionadosLista}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setProdutosSelecionados(new Set(produtosExibicao.map((p) => p.getId())))
                    } else {
                      setProdutosSelecionados(new Set())
                    }
                  }}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              <div className="flex-1 md:w-14 text-xs">Código</div>
              <div className="flex-[1.5] text-xs">Nome</div>
              {activeTab === 'impressoras' ? (
                <div className="flex-[1.2] text-center hidden md:flex">Impressoras</div>
              ) : null}
              {activeTab === 'gruposComplementos' ? (
                <div className="flex-[1.2] text-center hidden md:flex">Grupos Complementos</div>
              ) : null}
              {activeTab === 'fiscal' ? (
                <div className="hidden md:flex w-[80px] shrink-0 text-center text-xs leading-tight">NCM</div>
              ) : null}
              {/* Colunas CEST / Origem / Tipo / Indic. produção — ocultas até o backend retornar esses campos na listagem (descomente junto com filtros e células abaixo).
              <div className="hidden lg:flex w-[64px] shrink-0 text-center text-xs leading-tight">CEST</div>
              <div className="hidden lg:flex w-[52px] shrink-0 text-center text-xs leading-tight">Origem</div>
              <div className="hidden lg:flex w-[40px] shrink-0 text-center text-xs leading-tight">Tipo</div>
              <div className="hidden lg:flex min-w-0 w-[120px] shrink-0 text-center text-[10px] leading-tight px-0.5">
                Indic. produção
              </div>
              */}
              <div className="md:flex-1 text-right text-xs">Valor atual</div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {produtosExibicao
                .slice()
                .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
                .map((produto, index) => {
                const isSelected = produtosSelecionados.has(produto.getId())
                const foiAlteradoNaSessao = produtosAlteradosPorAba[activeTab].has(produto.getId())
                // Usar diretamente as impressoras que vêm do produto (já têm id, nome e ativo)
                const impressorasDoProduto = produto.getImpressoras()
                // Usar diretamente os grupos de complementos que vêm do produto
                const gruposComplementosDoProduto = produto.getGruposComplementos()
                /* const fiscalOrigem = labelListaFiscal(produto.getOrigemMercadoria(), origensMercadoria)
                const fiscalTipo = labelListaFiscal(produto.getTipoProduto(), tiposProduto)
                const fiscalInd = celulaFiscalIndicador(produto.getIndicadorProducaoEscala()) */
                // Cor: selecionado > alterado nesta aba (mesmo tom do hover da lista) > zebra
                const bgColor = isSelected
                  ? foiAlteradoNaSessao
                    ? 'bg-primary/25'
                    : 'bg-primary/20'
                  : foiAlteradoNaSessao
                    ? 'bg-primary-bg'
                    : index % 2 === 0
                      ? 'bg-gray-50'
                      : 'bg-white'
                const hoverRow = 'hover:bg-primary-bg'
                const isExpanded = produtosExpandidos.has(produto.getId())
                return (
                  <div key={produto.getId()} className="flex flex-col">
                    {/* Linha principal do produto */}
                    <div
                      className={`flex rounded-lg items-center md:px-4 px-2 gap-2 ${bgColor} ${hoverRow} transition-colors cursor-default`}
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
                        {textoOuNenhum(String(produto.getCodigoProduto() ?? ''))}
                      </div>
                      <div className="md:flex-[1.5] flex-[2] min-w-0 md:pr-4">
                        <p className="break-words text-xs font-normal text-primary-text md:text-sm">
                          {produto.getNome()}
                        </p>
                        {activeTab === 'permissoes' ? (
                          <ProdutoActionIconsDisplay produto={produto} />
                        ) : null}
                      </div>
                      {activeTab === 'impressoras' ? (
                        <div className="flex-[1.2] justify-center hidden md:flex">
                          {impressorasDoProduto.length === 0 ? (
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
                                {impressorasDoProduto.length} impressora{impressorasDoProduto.length !== 1 ? 's' : ''}
                              </option>
                              {impressorasDoProduto.map((impressora) => (
                                <option key={impressora.id} value={impressora.id}>
                                  {impressora.nome}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : null}
                      {activeTab === 'gruposComplementos' ? (
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
                      ) : null}
                      {activeTab === 'fiscal' ? (
                        <div className="hidden md:flex w-[80px] shrink-0 justify-center font-mono text-[11px] text-primary-text px-0.5">
                          <span className="truncate" title={produto.getNcm() || undefined}>
                            {textoOuNenhum(produto.getNcm())}
                          </span>
                        </div>
                      ) : null}
                      {/* CEST / Origem / Tipo / Indic. — ver cabeçalho da grade
                      <div className="hidden lg:flex w-[64px] shrink-0 justify-center font-mono text-[11px] text-primary-text px-0.5">
                        <span className="truncate" title={produto.getCest() || undefined}>
                          {textoOuNenhum(produto.getCest())}
                        </span>
                      </div>
                      <div className="hidden lg:flex w-[52px] shrink-0 justify-center px-0.5">
                        <span
                          className="truncate text-center text-[11px] text-primary-text"
                          title={fiscalOrigem.title || undefined}
                        >
                          {fiscalOrigem.curto}
                        </span>
                      </div>
                      <div className="hidden lg:flex w-[40px] shrink-0 justify-center px-0.5">
                        <span
                          className="truncate text-center text-[11px] text-primary-text"
                          title={fiscalTipo.title || undefined}
                        >
                          {fiscalTipo.curto}
                        </span>
                      </div>
                      <div className="hidden lg:flex min-w-0 w-[120px] shrink-0 justify-center px-0.5">
                        <span
                          className="truncate text-center text-[11px] text-primary-text"
                          title={fiscalInd.title || undefined}
                        >
                          {fiscalInd.curto}
                        </span>
                      </div>
                      */}
                      <div className="flex-1 text-right font-normal md:text-sm text-xs text-primary-text">
                        {transformarParaReal(produto.getValor())}
                      </div>
                      {(activeTab === 'impressoras' ||
                        activeTab === 'gruposComplementos' ||
                        activeTab === 'fiscal') && (
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
                      )}
                    </div>
                    {isExpanded &&
                      activeTab === 'impressoras' && (
                        <div
                          className={`md:hidden px-2 pb-2 pt-1 border-b border-gray-200 ${
                            foiAlteradoNaSessao ? 'bg-primary-bg' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-secondary-text">Impressoras</label>
                            {impressorasDoProduto.length === 0 ? (
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
                                  {impressorasDoProduto.length} impressora{impressorasDoProduto.length !== 1 ? 's' : ''}
                                </option>
                                {impressorasDoProduto.map((impressora) => (
                                  <option key={impressora.id} value={impressora.id}>
                                    {impressora.nome}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    {isExpanded &&
                      activeTab === 'gruposComplementos' && (
                        <div
                          className={`md:hidden px-2 pb-2 pt-1 border-b border-gray-200 ${
                            foiAlteradoNaSessao ? 'bg-primary-bg' : 'bg-gray-50'
                          }`}
                        >
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
                      )}
                    {isExpanded &&
                      activeTab === 'fiscal' && (
                        <div
                          className={`md:hidden px-2 pb-2 pt-1 border-b border-gray-200 ${
                            foiAlteradoNaSessao ? 'bg-primary-bg' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-secondary-text">NCM</label>
                            <span className="font-mono text-xs text-primary-text">
                              {textoOuNenhum(produto.getNcm())}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                )
              })}
              {hasMoreProdutos ? (
                <div ref={loadMoreSentinelRef} className="h-2 w-full shrink-0" aria-hidden />
              ) : null}
              {isLoadingMore ? (
                <div className="flex justify-center py-3">
                  <JiffyLoading />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {isSalvandoPermissoes || isSalvandoFiscal ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/50 px-4"
          role="alert"
          aria-busy="true"
          aria-live="polite"
        >
          <JiffyLoading />
          <p className="text-center font-nunito text-sm font-medium text-white">
            {isSalvandoFiscal
              ? salvandoFiscalProgresso
                ? `Salvando dados fiscais (${salvandoFiscalProgresso.atual}/${salvandoFiscalProgresso.total})...`
                : 'Salvando dados fiscais...'
              : salvandoPermissoesProgresso
                ? `Salvando permissões (${salvandoPermissoesProgresso.atual}/${salvandoPermissoesProgresso.total})...`
                : 'Salvando permissões...'}
          </p>
        </div>
      ) : null}
    </div>
  )
}


