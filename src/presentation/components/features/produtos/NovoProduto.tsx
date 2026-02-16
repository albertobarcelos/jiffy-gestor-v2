'use client'

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InformacoesProdutoStep } from './NovoProduto/InformacoesProdutoStep'
import { ConfiguracoesGeraisStep } from './NovoProduto/ConfiguracoesGeraisStep'
import { ConfiguracaoFiscalStep } from './NovoProduto/ConfiguracaoFiscalStep'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { MdImage } from 'react-icons/md'

interface NovoProdutoProps {
  produtoId?: string
  isCopyMode?: boolean
  defaultGrupoProdutoId?: string
  onClose?: () => void
  onSuccess?: (produtoData?: { produtoId: string; produtoData: any }) => void
}

/**
 * Componente interno que usa useSearchParams
 */
function NovoProdutoContent({
  produtoId,
  isCopyMode = false,
  defaultGrupoProdutoId,
  onClose,
  onSuccess,
}: NovoProdutoProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth } = useAuthStore()

  // Estado do step atual (0 = Informações, 1 = Configurações, 2 = Configuração Fiscal)
  const [selectedPage, setSelectedPage] = useState(0)

  // Estados do formulário
  const [nomeProduto, setNomeProduto] = useState('')
  const [descricaoProduto, setDescricaoProduto] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [unidadeProduto, setUnidadeProduto] = useState<string | null>(null)
  const [grupoProduto, setGrupoProduto] = useState<string | null>(null)
  const [favorito, setFavorito] = useState(false)
  const [permiteDesconto, setPermiteDesconto] = useState(false)
  const [permiteAcrescimo, setPermiteAcrescimo] = useState(false)
  const [abreComplementos, setAbreComplementos] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [grupoComplementosIds, setGrupoComplementosIds] = useState<string[]>([])
  const [impressorasIds, setImpressorasIds] = useState<string[]>([])
  // Guardar os grupos originais para comparar na remoção
  const [originalGrupoComplementosIds, setOriginalGrupoComplementosIds] = useState<string[]>([])

  // Estados fiscais
  const [ncm, setNcm] = useState('')
  const [cest, setCest] = useState('')
  const [origemMercadoria, setOrigemMercadoria] = useState<string | null>('0') // Padrão: 0 - Nacional
  const [tipoProduto, setTipoProduto] = useState<string | null>('00') // Padrão: 00 - Mercadoria para Revenda
  const [indicadorProducaoEscala, setIndicadorProducaoEscala] = useState<string | null>(null)
  // Status de disponibilidade do microsserviço fiscal (retornado pelo backend)
  const [fiscalStatus, setFiscalStatus] = useState<'available' | 'unavailable' | undefined>(undefined)

  // Estado de validação do NCM via API do backend
  const [ncmValidation, setNcmValidation] = useState<{
    codigo: string
    valido: boolean
    descricao?: string
    mensagem: string
  } | null>(null)
  const [isValidatingNcm, setIsValidatingNcm] = useState(false)
  const ncmValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Armazena o último NCM validado para evitar chamadas duplicadas
  const lastValidatedNcmRef = useRef<string>('')

  // Estado de validação do CEST e lista de CESTs compatíveis com o NCM
  const [cestsDisponiveis, setCestsDisponiveis] = useState<
    { codigo: string; descricao: string; segmento: string; numeroAnexo?: string }[]
  >([])
  const [isLoadingCests, setIsLoadingCests] = useState(false)
  const [cestValidation, setCestValidation] = useState<{
    codigo: string
    valido: boolean
    descricao?: string
    segmento?: string
    mensagem: string
  } | null>(null)
  const [isValidatingCest, setIsValidatingCest] = useState(false)
  const lastFetchedNcmForCestsRef = useRef<string>('')

  // Estados de loading
  const [isLoadingProduto, setIsLoadingProduto] = useState(false)

  // Verificar se é modo cópia via query param
  // Extrair o valor uma vez e usar como string estável
  const copyFromIdValue = searchParams.get('copyFrom')
  const copyFromId = useMemo(() => copyFromIdValue, [copyFromIdValue])
  const effectiveProdutoId = useMemo(() => produtoId || copyFromId, [produtoId, copyFromId])
  const effectiveIsCopyMode = useMemo(() => isCopyMode || !!copyFromId, [isCopyMode, copyFromId])

  useEffect(() => {
    if (effectiveProdutoId || effectiveIsCopyMode) {
      return
    }
    if (defaultGrupoProdutoId && defaultGrupoProdutoId !== grupoProduto) {
      setGrupoProduto(defaultGrupoProdutoId)
    }
    // Resetar campos fiscais para valores padrão na criação
    setNcm('')
    setCest('')
    setOrigemMercadoria('0') // Padrão na criação
    setTipoProduto('00') // Padrão na criação
    setIndicadorProducaoEscala(null)
  }, [defaultGrupoProdutoId, effectiveProdutoId, effectiveIsCopyMode, grupoProduto])

  // Refs para evitar loops infinitos
  const hasLoadedProdutoRef = useRef(false)
  const loadedProdutoIdRef = useRef<string | null>(null)
  const lastProdutoIdRef = useRef<string | null | undefined>(null)
  const lastIsCopyModeRef = useRef<boolean>(false)

  // Carregar grupos de produtos usando React Query (com cache)
  const formatCurrency = useCallback((value: number | string) => {
    const numericValue =
      typeof value === 'number'
        ? value
        : Number(value.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) || 0

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numericValue)
  }, [])

  const {
    data: grupos = [],
    isLoading: isLoadingGrupos,
  } = useGruposProdutos({
    limit: 100,
  })

  // Carregar dados do produto se estiver editando ou copiando (apenas uma vez por produtoId)
  useEffect(() => {
    // Calcular valores dentro do useEffect para evitar dependências instáveis
    const currentCopyFromId = searchParams.get('copyFrom')
    const currentEffectiveProdutoId = produtoId || currentCopyFromId
    const currentEffectiveIsCopyMode = isCopyMode || !!currentCopyFromId
    
    // Se não tem produtoId, não carrega
    if (!currentEffectiveProdutoId) {
      // Resetar flags se não há produtoId
      if (lastProdutoIdRef.current !== null) {
        hasLoadedProdutoRef.current = false
        loadedProdutoIdRef.current = null
        lastProdutoIdRef.current = null
        lastIsCopyModeRef.current = false
      }
      return
    }

    // Verificar se o produtoId ou modo cópia realmente mudaram
    const produtoIdChanged = lastProdutoIdRef.current !== currentEffectiveProdutoId
    const copyModeChanged = lastIsCopyModeRef.current !== currentEffectiveIsCopyMode
    
    // Se não mudou nada, não recarrega
    if (!produtoIdChanged && !copyModeChanged && hasLoadedProdutoRef.current) {
      return
    }

    // Se mudou, resetar flags e atualizar refs
    if (produtoIdChanged || copyModeChanged) {
      hasLoadedProdutoRef.current = false
      loadedProdutoIdRef.current = null
      lastProdutoIdRef.current = currentEffectiveProdutoId
      lastIsCopyModeRef.current = currentEffectiveIsCopyMode
    }

    // Se já está carregando ou já carregou este produto no mesmo modo, não carrega novamente
    const cacheKey = `${currentEffectiveProdutoId}-${currentEffectiveIsCopyMode}`
    if (hasLoadedProdutoRef.current && loadedProdutoIdRef.current === cacheKey) {
      return
    }

    // Marcar como carregando antes de fazer a requisição para evitar múltiplas chamadas
    hasLoadedProdutoRef.current = true
    loadedProdutoIdRef.current = cacheKey

    const loadProduto = async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        // Se não tem token, reseta as flags
        hasLoadedProdutoRef.current = false
        loadedProdutoIdRef.current = null
        return
      }

      setIsLoadingProduto(true)
      try {
        const response = await fetch(`/api/produtos/${currentEffectiveProdutoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const produto = await response.json()
          
          // Preenche os campos com os dados do produto
          setPrecoVenda(produto.valor ? formatCurrency(produto.valor) : '')
          setUnidadeProduto(produto.unidadeMedida || null)
          setGrupoProduto(produto.grupoId || null)
          setFavorito(produto.favorito || false)
          setPermiteDesconto(produto.permiteDesconto || false)
          setPermiteAcrescimo(produto.permiteAcrescimo || false)
          setAbreComplementos(produto.abreComplementos || false)
          setAtivo(produto.ativo ?? true)
          const gruposIds = produto.gruposComplementos?.map((g: any) => g.id) || []
          setGrupoComplementosIds(gruposIds)
          setOriginalGrupoComplementosIds(gruposIds) // Guardar os grupos originais
          setImpressorasIds(produto.impressoras?.map((i: any) => i.id) || [])
          
          // Preenche os campos fiscais (busca primeiro em produto.fiscal, depois em produto para compatibilidade)
          const dadosFiscais = produto.fiscal || {}
          setNcm(dadosFiscais.ncm || produto.ncm || '')
          setCest(dadosFiscais.cest || '')
          // Na edição, não aplica valores padrão - mantém vazio se não houver valor
          setOrigemMercadoria(
            dadosFiscais.origemMercadoria?.toString() || 
            produto.origemMercadoria?.toString() || 
            ''
          )
          setTipoProduto(
            dadosFiscais.tipoProduto || 
            produto.tipoProduto || 
            ''
          )
          setIndicadorProducaoEscala(
            dadosFiscais.indicadorProducaoEscala || 
            produto.indicadorProducaoEscala || 
            null
          )

          // Capturar status de disponibilidade do microsserviço fiscal
          setFiscalStatus(produto.fiscalStatus || undefined)

          if (currentEffectiveIsCopyMode) {
            const nomeOriginal = produto.nome || ''
            setNomeProduto(nomeOriginal ? `${nomeOriginal} - Cópia` : 'Cópia ')
            setDescricaoProduto(produto.descricao || '')
          } else {
            setNomeProduto(produto.nome || '')
            setDescricaoProduto(produto.descricao || '')
          }
        } else {
          // Se a requisição falhou, reseta as flags para permitir nova tentativa
          hasLoadedProdutoRef.current = false
          loadedProdutoIdRef.current = null
        }
      } catch (error) {
        console.error('Erro ao carregar produto:', error)
        // Se houve erro, reseta as flags para permitir nova tentativa
        hasLoadedProdutoRef.current = false
        loadedProdutoIdRef.current = null
      } finally {
        setIsLoadingProduto(false)
      }
    }

    loadProduto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId, isCopyMode]) // Apenas quando produtoId ou isCopyMode mudarem (valores estáveis das props)

  // Validação do NCM via API do backend (com debounce de 600ms)
  // Fluxo: Frontend → Backend → Microserviço Fiscal (frontend nunca se comunica diretamente com o fiscal)
  useEffect(() => {
    // Limpar timer anterior
    if (ncmValidationTimerRef.current) {
      clearTimeout(ncmValidationTimerRef.current)
    }

    const ncmTrimmed = ncm.trim()

    // Se vazio, limpar validação sem chamar API
    if (!ncmTrimmed) {
      setNcmValidation(null)
      setIsValidatingNcm(false)
      lastValidatedNcmRef.current = ''
      return
    }

    // Se não tem 8 dígitos numéricos, mostrar erro local (sem chamar API)
    if (!/^\d{8}$/.test(ncmTrimmed)) {
      setNcmValidation(null)
      setIsValidatingNcm(false)
      lastValidatedNcmRef.current = ''
      return
    }

    // Se já validamos esse mesmo NCM, não chamar API de novo
    if (lastValidatedNcmRef.current === ncmTrimmed) {
      return
    }

    // Debounce: aguardar 600ms após parar de digitar
    setIsValidatingNcm(true)
    ncmValidationTimerRef.current = setTimeout(async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        setIsValidatingNcm(false)
        return
      }

      try {
        const response = await fetch(
          `/api/v1/fiscal/configuracoes/ncms/validar/${ncmTrimmed}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const result = await response.json()
          setNcmValidation(result)
          lastValidatedNcmRef.current = ncmTrimmed
        } else {
          // Se erro de comunicação com fiscal, não bloquear o usuário
          setNcmValidation(null)
          lastValidatedNcmRef.current = ''
        }
      } catch {
        // Erro de rede — não bloquear o usuário
        setNcmValidation(null)
        lastValidatedNcmRef.current = ''
      } finally {
        setIsValidatingNcm(false)
      }
    }, 600)

    // Cleanup do timer ao desmontar ou re-executar
    return () => {
      if (ncmValidationTimerRef.current) {
        clearTimeout(ncmValidationTimerRef.current)
      }
    }
  }, [ncm, auth])

  // Buscar CESTs compatíveis quando o NCM é validado com sucesso
  // Fluxo: Frontend → Backend → Microserviço Fiscal (frontend nunca se comunica diretamente com o fiscal)
  useEffect(() => {
    const ncmTrimmed = ncm.trim()

    // Se NCM não está validado como válido, limpar lista de CESTs
    if (!ncmValidation || !ncmValidation.valido || ncmTrimmed.length !== 8) {
      setCestsDisponiveis([])
      setCestValidation(null)
      lastFetchedNcmForCestsRef.current = ''
      return
    }

    // Se já buscamos CESTs para este NCM, não buscar novamente
    if (lastFetchedNcmForCestsRef.current === ncmTrimmed) {
      return
    }

    const fetchCests = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingCests(true)
      try {
        const response = await fetch(
          `/api/v1/fiscal/configuracoes/cests/por-ncm/${ncmTrimmed}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const result = await response.json()
          setCestsDisponiveis(Array.isArray(result) ? result : [])
          lastFetchedNcmForCestsRef.current = ncmTrimmed
        } else {
          // Se erro de comunicação com fiscal, não bloquear o usuário
          setCestsDisponiveis([])
          lastFetchedNcmForCestsRef.current = ''
        }
      } catch {
        // Erro de rede — não bloquear o usuário
        setCestsDisponiveis([])
        lastFetchedNcmForCestsRef.current = ''
      } finally {
        setIsLoadingCests(false)
      }
    }

    fetchCests()
  }, [ncmValidation, ncm, auth])

  // Validar CEST selecionado via API do backend (com debounce de 400ms)
  // Inclui validação de compatibilidade CEST x NCM quando o NCM está disponível.
  // Usa AbortController para cancelar requisições pendentes se o CEST/NCM mudar.
  useEffect(() => {
    const cestTrimmed = cest.trim()
    const ncmTrimmed = ncm.trim()

    // Se CEST vazio, limpar validação
    if (!cestTrimmed) {
      setCestValidation(null)
      setIsValidatingCest(false)
      return
    }

    // Se não tem 7 dígitos numéricos, não chamar API
    if (!/^\d{7}$/.test(cestTrimmed)) {
      setCestValidation(null)
      setIsValidatingCest(false)
      return
    }

    // Se o CEST está na lista de disponíveis para o NCM atual, já sabemos que é compatível
    const cestDisponivel = cestsDisponiveis.find(c => c.codigo === cestTrimmed)
    if (cestDisponivel) {
      setCestValidation({
        codigo: cestTrimmed,
        valido: true,
        descricao: cestDisponivel.descricao,
        segmento: cestDisponivel.segmento,
        mensagem: 'CEST válido (compatível com o NCM informado)',
      })
      setIsValidatingCest(false)
      return
    }

    // Se não está na lista, validar via API (com verificação de compatibilidade NCM)
    const abortController = new AbortController()
    setIsValidatingCest(true)

    const timer = setTimeout(async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        setIsValidatingCest(false)
        return
      }

      try {
        // Se temos um NCM válido, validar compatibilidade CEST x NCM diretamente
        const hasValidNcm = /^\d{8}$/.test(ncmTrimmed) && ncmValidation?.valido
        const url = hasValidNcm
          ? `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}/ncm/${ncmTrimmed}`
          : `/api/v1/fiscal/configuracoes/cests/validar/${cestTrimmed}`

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        })

        if (abortController.signal.aborted) return

        if (response.ok) {
          const result = await response.json()

          // Normalizar a resposta (endpoints retornam campos diferentes)
          if (hasValidNcm) {
            // Resposta de compatibilidade: { cestCodigo, ncmCodigo, compativel, descricaoCest, mensagem }
            setCestValidation({
              codigo: result.cestCodigo || cestTrimmed,
              valido: result.compativel ?? false,
              descricao: result.descricaoCest,
              mensagem: result.mensagem || (result.compativel
                ? 'CEST compatível com o NCM informado'
                : 'CEST não é compatível com o NCM informado'),
            })
          } else {
            // Resposta de validação simples: { codigo, valido, descricao, segmento, mensagem }
            setCestValidation(result)
          }
        } else {
          // Erro de comunicação: não bloquear o usuário
          setCestValidation(null)
        }
      } catch (error) {
        // Ignorar erros de abort (cancelamento intencional)
        if (error instanceof DOMException && error.name === 'AbortError') return
        setCestValidation(null)
      } finally {
        if (!abortController.signal.aborted) {
          setIsValidatingCest(false)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      abortController.abort()
    }
  }, [cest, ncm, ncmValidation, cestsDisponiveis, auth])

  // Preencher automaticamente o Indicador de Produção em Escala Relevante quando CEST for preenchido
  useEffect(() => {
    if (cest && cest.trim() !== '') {
      // Se CEST foi preenchido e o indicador está vazio, preenche automaticamente com "Produzido em Escala Relevante"
      if (!indicadorProducaoEscala) {
        setIndicadorProducaoEscala('1')
      }
    }
    // Não limpa o indicador quando CEST é removido - o usuário pode querer manter
  }, [cest]) // Apenas monitora o CEST, não o indicador

  // Função de retry: recarrega os dados do produto (resetando cache para forçar nova busca fiscal)
  const handleRetryFiscal = useCallback(() => {
    hasLoadedProdutoRef.current = false
    loadedProdutoIdRef.current = null
    // Forçar re-execução do useEffect mudando a ref interna
    const currentCopyFromId = searchParams.get('copyFrom')
    const currentEffectiveProdutoId = produtoId || currentCopyFromId
    const currentEffectiveIsCopyMode = isCopyMode || !!currentCopyFromId

    if (!currentEffectiveProdutoId) return

    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingProduto(true)
    fetch(`/api/produtos/${currentEffectiveProdutoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        if (response.ok) {
          const produto = await response.json()
          const dadosFiscais = produto.fiscal || {}
          setNcm(dadosFiscais.ncm || produto.ncm || '')
          setCest(dadosFiscais.cest || '')
          setOrigemMercadoria(
            dadosFiscais.origemMercadoria?.toString() ||
            produto.origemMercadoria?.toString() ||
            ''
          )
          setTipoProduto(
            dadosFiscais.tipoProduto ||
            produto.tipoProduto ||
            ''
          )
          setIndicadorProducaoEscala(
            dadosFiscais.indicadorProducaoEscala ||
            produto.indicadorProducaoEscala ||
            null
          )
          setFiscalStatus(produto.fiscalStatus || undefined)

          // Marcar como carregado para não duplicar
          hasLoadedProdutoRef.current = true
          loadedProdutoIdRef.current = `${currentEffectiveProdutoId}-${currentEffectiveIsCopyMode}`
        }
      })
      .catch((error) => {
        console.error('Erro ao recarregar dados fiscais:', error)
      })
      .finally(() => {
        setIsLoadingProduto(false)
      })
  }, [produtoId, isCopyMode, searchParams, auth])

  const handleNext = () => {
    if (selectedPage < 2) {
      setSelectedPage(selectedPage + 1)
    }
  }

  const handleBack = () => {
    if (selectedPage > 0) {
      setSelectedPage(selectedPage - 1)
    }
  }

  const handleBackFromFiscal = () => {
    setSelectedPage(1)
  }

  const handleNextFromFiscal = () => {
    handleSave()
  }

  const handleCancel = () => {
    if (onClose) {
      onClose()
      return
    }
    router.push('/produtos')
  }

  const handleSave = async () => {
    // Validação do Preço de Venda
    const precoVendaNum = parseFloat(precoVenda.replace(/[^\d,]/g, '').replace(',', '.'))
    if (!precoVenda || precoVendaNum === 0) {
      showToast.error('O campo "Preço de Venda" não pode ser vazio ou zero.')
      return
    }

    // Validação do NCM: deve ter exatamente 8 dígitos numéricos quando preenchido
    if (ncm && ncm.trim() !== '') {
      const ncmTrimmed = ncm.trim()
      if (!/^\d{8}$/.test(ncmTrimmed)) {
        showToast.error('O código NCM deve conter exatamente 8 dígitos numéricos.')
        return
      }
      // Bloquear se a validação da API indicou NCM inválido
      if (ncmValidation && !ncmValidation.valido) {
        showToast.error(ncmValidation.mensagem || 'O código NCM informado não é válido.')
        return
      }
      // Bloquear se ainda está validando
      if (isValidatingNcm) {
        showToast.error('Aguarde a validação do NCM antes de salvar.')
        return
      }
    }

    // Validação do CEST: deve ter exatamente 7 dígitos numéricos quando preenchido
    if (cest && cest.trim() !== '') {
      const cestTrimmed = cest.trim()
      if (!/^\d{7}$/.test(cestTrimmed)) {
        showToast.error('O código CEST deve conter exatamente 7 dígitos numéricos.')
        return
      }
      // Bloquear se a validação da API indicou CEST inválido
      if (cestValidation && !cestValidation.valido) {
        showToast.error(cestValidation.mensagem || 'O código CEST informado não é válido.')
        return
      }
      // Bloquear se ainda está validando
      if (isValidatingCest) {
        showToast.error('Aguarde a validação do CEST antes de salvar.')
        return
      }
    }

    // Validação: Se o Indicador de Produção em Escala Relevante estiver preenchido, o CEST deve estar preenchido
    if (indicadorProducaoEscala && (!cest || cest.trim() === '')) {
      showToast.error('A informação sobre a "Produção em Escala Relevante" foi preenchida sem preencher o código CEST')
      return
    }

    const toastId = showToast.loading(
      effectiveProdutoId && !effectiveIsCopyMode
        ? 'Salvando alterações...'
        : 'Cadastrando produto...'
    )

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.errorLoading(toastId, 'Token não encontrado')
        return
      }

      // Montar objeto de dados fiscais (só inclui se houver pelo menos um campo preenchido)
      const fiscalData: any = {}
      if (ncm && ncm.trim() !== '') fiscalData.ncm = ncm.trim()
      if (cest && cest.trim() !== '') fiscalData.cest = cest.trim()
      if (origemMercadoria) fiscalData.origemMercadoria = parseInt(origemMercadoria)
      if (tipoProduto) fiscalData.tipoProduto = tipoProduto
      if (indicadorProducaoEscala) fiscalData.indicadorProducaoEscala = indicadorProducaoEscala

      const body: any = {
        nome: nomeProduto,
        descricao: descricaoProduto,
        valor: precoVendaNum,
        grupoId: grupoProduto,
        unidadeMedida: unidadeProduto,
        favorito,
        abreComplementos,
        permiteAcrescimo,
        permiteDesconto,
        gruposComplementosIds: grupoComplementosIds,
        impressorasIds,
        // Manter ncm no body para compatibilidade (backend ainda aceita)
        ncm: ncm || undefined,
        ...(effectiveProdutoId ? { ativo } : {}),
      }

      // Adicionar objeto fiscal apenas se houver dados fiscais
      if (Object.keys(fiscalData).length > 0) {
        body.fiscal = fiscalData
      }

      const url = effectiveProdutoId && !effectiveIsCopyMode
        ? `/api/produtos/${effectiveProdutoId}`
        : '/api/produtos'

      const method = effectiveProdutoId && !effectiveIsCopyMode ? 'PATCH' : 'POST'

      const isEditMode = effectiveProdutoId && !effectiveIsCopyMode
      
      // Se for edição e gruposComplementosIds estiver vazio, precisamos remover
      // os grupos individualmente usando DELETE, pois a API externa não processa array vazio
      const shouldRemoveGruposIndividually = isEditMode && 
        Array.isArray(grupoComplementosIds) && 
        grupoComplementosIds.length === 0 &&
        originalGrupoComplementosIds.length > 0

      // Primeiro, salvar o produto (sem gruposComplementosIds se for remoção individual)
      const bodyToSend = shouldRemoveGruposIndividually
        ? { ...body, gruposComplementosIds: undefined }
        : body

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyToSend),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const errorMessage = error.message || 'Erro ao salvar produto'
        showToast.errorLoading(toastId, errorMessage)
        return
      }

      // Se precisar remover grupos individualmente (quando array está vazio)
      if (shouldRemoveGruposIndividually) {
        try {
          // Remover cada grupo individualmente usando DELETE
          const deletePromises = originalGrupoComplementosIds.map((grupoId) =>
            fetch(`/api/produtos/${effectiveProdutoId}/grupos-complementos/${grupoId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          )

          const deleteResults = await Promise.allSettled(deletePromises)
          
          // Verificar se alguma remoção falhou
          const failedDeletes = deleteResults.filter(
            (result) => result.status === 'rejected' || 
            (result.status === 'fulfilled' && !result.value.ok)
          )

          if (failedDeletes.length > 0) {
            console.error('Alguns grupos não puderam ser removidos:', failedDeletes)
            // Não falha o salvamento, apenas loga o erro
          }
        } catch (error) {
          console.error('Erro ao remover grupos de complementos:', error)
          // Não falha o salvamento, apenas loga o erro
        }
      }

      // Buscar o produto atualizado para atualizar o cache
      let produtoAtualizado = null
      if (isEditMode) {
        try {
          const produtoResponse = await fetch(`/api/produtos/${effectiveProdutoId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (produtoResponse.ok) {
            produtoAtualizado = await produtoResponse.json()
          }
        } catch (error) {
          console.error('Erro ao buscar produto atualizado:', error)
          // Continua mesmo se falhar ao buscar
        }
      }

      showToast.successLoading(
        toastId,
        effectiveProdutoId && !effectiveIsCopyMode
          ? 'Produto atualizado com sucesso!'
          : 'Produto cadastrado com sucesso!'
      )
      if (onSuccess) {
        // Passar dados do produto para atualização otimista do cache
        onSuccess(isEditMode && produtoAtualizado ? { produtoId: effectiveProdutoId, produtoData: produtoAtualizado } : undefined)
      } else {
        setTimeout(() => {
          router.push('/produtos')
        }, 500)
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      const errorMessage = handleApiError(error)
      showToast.errorLoading(toastId, errorMessage)
    }
  }

  const getPageTitle = () => {
    if (effectiveIsCopyMode) {
      return 'Copiando Produto'
    }
    if (effectiveProdutoId) {
      return 'Editar Produto'
    }
    return 'Cadastrar Novo Produto'
  }

  const displayNome = nomeProduto?.trim() || 'Nome do Produto'
  const displayDescricao = descricaoProduto?.trim() || 'Descrição do Produto'
  const canToggleAtivo = Boolean(effectiveProdutoId)
  const canManageAtivo = Boolean(effectiveProdutoId)

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo com título e botões */}
      <div className="sticky top-0 z-10 bg-primary-bg/90 backdrop-blur-sm rounded-tl-lg shadow-md">
        <div className="md:px-[30px] px-1 py-[4px]">
          <div className="rounded-lg border border-[#E0E4F3] bg-gradient-to-br from-[#F6F7FF] to-[#EEF1FB] px-6 py-3 shadow-[0_15px_45px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                {/*<div className="h-14 w-14 rounded-lg bg-white flex items-center justify-center shadow-inner text-primary">
                  <MdImage className="text-2xl" />
                </div>*/}
                <div>
                  <p className="text-sm font-semibold text-primary font-exo uppercase tracking-wide">
                    {getPageTitle()}
                  </p>
                  <h2 className="md:text-xl text-lg font-bold text-primary font-exo leading-tight">
                    {displayNome}
                  </h2>
                  <p className="md:text-sm text-xs text-secondary-text font-nunito">
                    {displayDescricao}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {canToggleAtivo && (
                  <button
                    type="button"
                    onClick={() => setAtivo((prev) => !prev)}
                    className="flex h-8 items-center gap-1 rounded-lg border border-[#D4D8EB] bg-info md:px-3 px-1.5 py-1 shadow-sm hover:border-primary/40 transition-colors"
                  >
                    <span className="md:text-sm text-xs font-semibold text-secondary-text">
                      Visível no PDV
                    </span>
                    <span
                      className={`relative inline-flex h-5 w-12 items-center rounded-full transition-colors ${
                        ativo ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          ativo ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </span>
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="h-8 md:px-8 px-4 rounded-lg bg-white text-primary font-semibold font-exo md:text-sm text-xs border border-[#D7DBEC] shadow-sm hover:bg-[#f4f6ff] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de steps */}
      <div className="px-5 py-1">
        <div className="flex items-center justify-center gap-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold font-exo transition-colors ${
              selectedPage >= 0 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-primary'
            }`}
          >
            1
          </div>
          <div
            className={`h-[2px] w-28 transition-colors ${
              selectedPage >= 1 ? 'bg-[#B7E246]' : 'bg-[#CEDCF8]'
            }`}
          />
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold font-exo transition-colors ${
              selectedPage >= 1 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-[#1D3B53]'
            }`}
          >
            2
          </div>
          <div
            className={`h-[2px] w-28 transition-colors ${
              selectedPage >= 2 ? 'bg-[#B7E246]' : 'bg-[#CEDCF8]'
            }`}
          />
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold font-exo transition-colors ${
              selectedPage >= 2 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-[#1D3B53]'
            }`}
          >
            3
          </div>
        </div>
      </div>

      {/* Conteúdo das etapas */}
      <div className="flex-1 overflow-y-auto md:px-5 px-1 pb-5">
        {selectedPage === 0 ? (
          <InformacoesProdutoStep
            nomeProduto={nomeProduto}
            onNomeProdutoChange={setNomeProduto}
            descricaoProduto={descricaoProduto}
            onDescricaoProdutoChange={setDescricaoProduto}
            precoVenda={precoVenda}
            onPrecoVendaChange={setPrecoVenda}
            unidadeProduto={unidadeProduto}
            onUnidadeProdutoChange={setUnidadeProduto}
            grupoProduto={grupoProduto}
            onGrupoProdutoChange={setGrupoProduto}
            grupos={grupos}
            isLoadingGrupos={isLoadingGrupos}
            onNext={handleNext}
          />
        ) : selectedPage === 1 ? (
          <ConfiguracoesGeraisStep
            favorito={favorito}
            onFavoritoChange={setFavorito}
            permiteDesconto={permiteDesconto}
            onPermiteDescontoChange={setPermiteDesconto}
            permiteAcrescimo={permiteAcrescimo}
            onPermiteAcrescimoChange={setPermiteAcrescimo}
            abreComplementos={abreComplementos}
            onAbreComplementosChange={setAbreComplementos}
            grupoComplementosIds={grupoComplementosIds}
            onGrupoComplementosIdsChange={setGrupoComplementosIds}
            impressorasIds={impressorasIds}
            onImpressorasIdsChange={setImpressorasIds}
            ativo={ativo}
            onAtivoChange={setAtivo}
            isEditMode={!!effectiveProdutoId && !effectiveIsCopyMode}
            canManageAtivo={canManageAtivo}
            onBack={handleBack}
            onSave={handleNext}
            saveButtonText="Próximo"
          />
        ) : (
          <ConfiguracaoFiscalStep
            fiscalStatus={fiscalStatus}
            onRetryFiscal={handleRetryFiscal}
            isLoadingFiscal={isLoadingProduto}
            ncm={ncm}
            onNcmChange={setNcm}
            ncmValidation={ncmValidation}
            isValidatingNcm={isValidatingNcm}
            cest={cest}
            onCestChange={setCest}
            cestsDisponiveis={cestsDisponiveis}
            isLoadingCests={isLoadingCests}
            cestValidation={cestValidation}
            isValidatingCest={isValidatingCest}
            origemMercadoria={origemMercadoria}
            onOrigemMercadoriaChange={setOrigemMercadoria}
            tipoProduto={tipoProduto}
            onTipoProdutoChange={setTipoProduto}
            indicadorProducaoEscala={indicadorProducaoEscala}
            onIndicadorProducaoEscalaChange={setIndicadorProducaoEscala}
            onBack={handleBackFromFiscal}
            onNext={handleNextFromFiscal}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Componente principal para criação/edição de produtos
 * Replica exatamente o design e lógica do Flutter NovoProdutoWidget
 */
export function NovoProduto({
  produtoId,
  isCopyMode = false,
  defaultGrupoProdutoId,
  onClose,
  onSuccess,
}: NovoProdutoProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Carregando...</div>}>
      <NovoProdutoContent
        produtoId={produtoId}
        isCopyMode={isCopyMode}
        defaultGrupoProdutoId={defaultGrupoProdutoId}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Suspense>
  )
}

