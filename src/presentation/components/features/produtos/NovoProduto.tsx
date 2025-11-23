'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { InformacoesProdutoStep } from './NovoProduto/InformacoesProdutoStep'
import { ConfiguracoesGeraisStep } from './NovoProduto/ConfiguracoesGeraisStep'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'

interface NovoProdutoProps {
  produtoId?: string
  isCopyMode?: boolean
}

/**
 * Componente interno que usa useSearchParams
 */
function NovoProdutoContent({ produtoId, isCopyMode = false }: NovoProdutoProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth } = useAuthStore()

  // Estado do step atual (0 = Informações, 1 = Configurações)
  const [selectedPage, setSelectedPage] = useState(0)
  const pageViewRef = useRef<HTMLDivElement>(null)

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
  const [isLoadingGrupos, setIsLoadingGrupos] = useState(false)
  const [grupos, setGrupos] = useState<any[]>([])

  // Verificar se é modo cópia via query param
  // Extrair o valor uma vez e usar como string estável
  const copyFromIdValue = searchParams.get('copyFrom')
  const copyFromId = useMemo(() => copyFromIdValue, [copyFromIdValue])
  const effectiveProdutoId = useMemo(() => produtoId || copyFromId, [produtoId, copyFromId])
  const effectiveIsCopyMode = useMemo(() => isCopyMode || !!copyFromId, [isCopyMode, copyFromId])

  // Refs para evitar loops infinitos
  const hasLoadedGruposRef = useRef(false)
  const hasLoadedProdutoRef = useRef(false)
  const loadedProdutoIdRef = useRef<string | null>(null)
  const lastProdutoIdRef = useRef<string | null | undefined>(null)
  const lastIsCopyModeRef = useRef<boolean>(false)

  // Carregar grupos de produtos (apenas uma vez)
  useEffect(() => {
    if (hasLoadedGruposRef.current) return

    const loadGrupos = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingGrupos(true)
      try {
        const response = await fetch(
          `/api/grupos-produtos?ativo=true&limit=100&offset=0`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setGrupos(data.items || [])
          hasLoadedGruposRef.current = true
        }
      } catch (error) {
        console.error('Erro ao carregar grupos:', error)
      } finally {
        setIsLoadingGrupos(false)
      }
    }

    loadGrupos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executa apenas uma vez na montagem

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
          setPrecoVenda(produto.valor?.toString() || '')
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

          // Se for modo cópia, limpa nome e descrição; senão, preenche
          if (currentEffectiveIsCopyMode) {
            setNomeProduto('')
            setDescricaoProduto('')
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
    if (pageViewRef.current) {
      pageViewRef.current.scrollLeft = pageViewRef.current.clientWidth
    }
  }

  const handleBack = () => {
    setSelectedPage(0)
    if (pageViewRef.current) {
      pageViewRef.current.scrollLeft = 0
    }
  }

  const handleCancel = () => {
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
        gruposComplementosIds,
        impressorasIds,
        ...(effectiveProdutoId && !effectiveIsCopyMode ? { ativo } : {}),
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
        setTimeout(() => {
          router.push('/produtos')
        }, 500)
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

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo com título e botões */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md">
        <div className="px-[30px] py-[10px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-primary text-xl">👤</span>
              <h2 className="text-primary text-base font-semibold font-exo">
                {getPageTitle()}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="h-9 px-[26px] bg-primary/14 text-primary rounded-[30px] font-semibold font-exo text-sm hover:bg-primary/20 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de steps */}
      <div className="px-5 py-2">
        <div className="flex items-center justify-center gap-3">
          <div
            className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-lg font-bold font-exo ${
              selectedPage === 0 ? 'bg-accent1 text-info' : 'bg-secondary-bg text-info'
            }`}
          >
            1
          </div>
          <div
            className={`h-[2px] w-[12%] ${
              selectedPage === 1 ? 'bg-accent1' : 'bg-secondary-bg'
            }`}
          />
          <div
            className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-lg font-bold font-exo ${
              selectedPage === 1 ? 'bg-accent1 text-info' : 'bg-secondary-bg text-info'
            }`}
          >
            2
          </div>
        </div>
      </div>

      {/* PageView com steps */}
      <div
        ref={pageViewRef}
        className="flex-1 overflow-hidden"
        style={{
          display: 'flex',
          transition: 'transform 0.3s ease',
          transform: `translateX(-${selectedPage * 100}%)`,
        }}
      >
        <div className="min-w-full flex-shrink-0 overflow-y-auto px-5 pb-5">
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
        </div>
        <div className="min-w-full flex-shrink-0 overflow-y-auto px-5 pb-5">
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
            onBack={handleBack}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Componente principal para criação/edição de produtos
 * Replica exatamente o design e lógica do Flutter NovoProdutoWidget
 */
export function NovoProduto({ produtoId, isCopyMode = false }: NovoProdutoProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Carregando...</div>}>
      <NovoProdutoContent produtoId={produtoId} isCopyMode={isCopyMode} />
    </Suspense>
  )
}

