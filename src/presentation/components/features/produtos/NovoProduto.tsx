'use client'

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InformacoesProdutoStep } from './NovoProduto/InformacoesProdutoStep'
import { ConfiguracoesGeraisStep } from './NovoProduto/ConfiguracoesGeraisStep'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { MdImage } from 'react-icons/md'

interface NovoProdutoProps {
  produtoId?: string
  isCopyMode?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

/**
 * Componente interno que usa useSearchParams
 */
function NovoProdutoContent({
  produtoId,
  isCopyMode = false,
  onClose,
  onSuccess,
}: NovoProdutoProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth } = useAuthStore()

  // Estado do step atual (0 = Informações, 1 = Configurações)
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

  // Estados de loading
  const [isLoadingProduto, setIsLoadingProduto] = useState(false)

  // Verificar se é modo cópia via query param
  // Extrair o valor uma vez e usar como string estável
  const copyFromIdValue = searchParams.get('copyFrom')
  const copyFromId = useMemo(() => copyFromIdValue, [copyFromIdValue])
  const effectiveProdutoId = useMemo(() => produtoId || copyFromId, [produtoId, copyFromId])
  const effectiveIsCopyMode = useMemo(() => isCopyMode || !!copyFromId, [isCopyMode, copyFromId])

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
          setGrupoComplementosIds(
            produto.gruposComplementos?.map((g: any) => g.id) || []
          )
          setImpressorasIds(produto.impressoras?.map((i: any) => i.id) || [])

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

  const handleNext = () => {
    setSelectedPage(1)
  }

  const handleBack = () => {
    setSelectedPage(0)
  }

  const handleCancel = () => {
    if (onClose) {
      onClose()
      return
    }
    router.push('/produtos')
  }

  const handleSave = async () => {
    // Validação
    const precoVendaNum = parseFloat(precoVenda.replace(/[^\d,]/g, '').replace(',', '.'))
    if (!precoVenda || precoVendaNum === 0) {
      showToast.error('O campo "Preço de Venda" não pode ser vazio ou zero.')
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

      const body = {
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
        ...(effectiveProdutoId ? { ativo } : {}),
      }

      const url = effectiveProdutoId && !effectiveIsCopyMode
        ? `/api/produtos/${effectiveProdutoId}`
        : '/api/produtos'

      const method = effectiveProdutoId && !effectiveIsCopyMode ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        showToast.successLoading(
          toastId,
          effectiveProdutoId && !effectiveIsCopyMode
            ? 'Produto atualizado com sucesso!'
            : 'Produto cadastrado com sucesso!'
        )
        if (onSuccess) {
          onSuccess()
        } else {
          setTimeout(() => {
            router.push('/produtos')
          }, 500)
        }
      } else {
        const error = await response.json().catch(() => ({}))
        const errorMessage = error.message || 'Erro ao salvar produto'
        showToast.errorLoading(toastId, errorMessage)
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
      <div className="sticky top-0 z-10 bg-primary-bg/90 backdrop-blur-sm rounded-tl-[30px] shadow-md">
        <div className="px-[30px] py-[4px]">
          <div className="rounded-[32px] border border-[#E0E4F3] bg-gradient-to-br from-[#F6F7FF] to-[#EEF1FB] px-6 py-3 shadow-[0_15px_45px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-inner text-primary">
                  <MdImage className="text-2xl" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-alternate font-exo uppercase tracking-wide">
                    {getPageTitle()}
                  </p>
                  <h2 className="text-xl font-bold text-primary font-exo leading-tight">
                    {displayNome}
                  </h2>
                  <p className="text-sm text-secondary-text font-nunito">
                    {displayDescricao}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {canToggleAtivo && (
                  <button
                    type="button"
                    onClick={() => setAtivo((prev) => !prev)}
                    className="flex items-center gap-2 rounded-[24px] border border-[#D4D8EB] bg-white px-3 py-2 shadow-sm hover:border-primary/40 transition-colors"
                  >
                    <span className="text-sm font-semibold text-secondary-text">
                      Visível no PDV
                    </span>
                    <span
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                        ativo ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          ativo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </span>
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="h-11 px-8 rounded-[30px] bg-white text-primary font-semibold font-exo text-sm border border-[#D7DBEC] shadow-sm hover:bg-[#f4f6ff] transition-colors"
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
              selectedPage === 0 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-primary'
            }`}
          >
            1
          </div>
          <div
            className={`h-[2px] w-28 transition-colors ${
              selectedPage === 1 ? 'bg-[#B7E246]' : 'bg-[#CEDCF8]'
            }`}
          />
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold font-exo transition-colors ${
              selectedPage === 1 ? 'bg-[#B7E246] text-primary' : 'bg-[#CEDCF8] text-[#1D3B53]'
            }`}
          >
            2
          </div>
        </div>
      </div>

      {/* Conteúdo das etapas */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
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
        ) : (
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
            onSave={handleSave}
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
export function NovoProduto({ produtoId, isCopyMode = false, onClose, onSuccess }: NovoProdutoProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Carregando...</div>}>
      <NovoProdutoContent
        produtoId={produtoId}
        isCopyMode={isCopyMode}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Suspense>
  )
}

