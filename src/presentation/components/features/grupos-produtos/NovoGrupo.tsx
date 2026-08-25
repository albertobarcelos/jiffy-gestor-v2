'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { IconPickerModal } from './IconPickerModal'
import { ColorPickerModal } from './ColorPickerModal'
import { ProdutosPorGrupoList } from './ProdutosPorGrupoList'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { Input } from '@/src/presentation/components/ui/input'
import { UppercaseLocaleInput } from '@/src/presentation/components/ui/UppercaseLocaleInput'
import { cn } from '@/src/shared/utils/cn'
import { showToast } from '@/src/shared/utils/toast'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'

/** Labels outlined em preto — igual NovoGrupoComplemento */
const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiFormLabel-asterisk': {
    color: 'var(--color-error)',
  },
} as const

const entradaCompactaInput = {
  padding: '10px',
  fontSize: '0.875rem',
} as const

const sxEntradaNomeGrupoProduto = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
} as const

interface NovoGrupoProps {
  grupoId?: string
  /**
   * Dados já conhecidos (ex.: lista de produtos) para hidratar o form sem spinner.
   * O fetch ainda confirma/atualiza delivery/local etc. em background.
   */
  initialGrupo?: GrupoProduto
  isEmbedded?: boolean
  /** `id` do `<form>` para o rodapé do `JiffySidePanelModal` usar `form="..."` no Salvar */
  embeddedFormId?: string
  /** Omite o cabeçalho Cancelar/Salvar (ações no rodapé do painel) */
  hideEmbeddedFormActions?: boolean
  /** Permite o modal compor o título com o nome atual do grupo */
  onGrupoNomeChange?: (nome: string) => void
  /** Sincroniza estado com o rodapé do modal (loading / pode submeter) */
  onEmbedFormStateChange?: (state: {
    isSubmitting: boolean
    canSubmit: boolean
  }) => void
  /** Aba interna 0 = Detalhes, 1 = Produtos — para o rodapé (Salvar vs Fechar) */
  onEmbeddedTabChange?: (tabIndex: number) => void
  onClose?: () => void
  onSaved?: () => void
  /** Após salvar mantendo o painel aberto (ex.: aba Produtos vinculados) — invalida listas sem fechar. */
  onReload?: () => void
  /** Só a ficha da categoria (esconde a aba Produtos vinculados). */
  detalhesOnly?: boolean
  /** Empilha os pickers de ícone/cor acima de outro painel. */
  nestedPickerZIndex?: number
  initialTab?: number // 0 = Detalhes do Grupo, 1 = Produtos Vinculados
}

/** API imperativa para confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoGrupoHandle {
  /** Há alterações em relação ao último baseline (carregamento ou salvamento). */
  isDirty: () => boolean
  /** Persiste o grupo sem depender do `<form>` (rodapé na aba Produtos vinculados). */
  saveGrupo: (opts?: { silent?: boolean }) => Promise<string | null>
  /** Salva e fecha o painel (mesmo fluxo do submit do formulário em modo embed). */
  saveGrupoAndClose: () => Promise<void>
}

/** Envolve o card de detalhes em `<form>` apenas quando há `embeddedFormId` (submit pelo rodapé do painel) */
function GrupoDetalhesFormShell({
  formId,
  onSubmit,
  children,
}: {
  formId?: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  if (formId) {
    return (
      <form id={formId} onSubmit={onSubmit}>
        {children}
      </form>
    )
  }
  return <>{children}</>
}

function extrairIdGrupoDaResposta(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const root = payload as Record<string, unknown>
  const nested =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const candidates = [root.id, nested?.id]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim()
  }
  return undefined
}

/**
 * Componente para criar/editar grupo de produtos
 * Replica o design e lógica do Flutter NovoGrupoTabbedWidget
 */
export const NovoGrupo = forwardRef<NovoGrupoHandle, NovoGrupoProps>(function NovoGrupo(
  {
    grupoId,
    initialGrupo,
    isEmbedded = false,
    embeddedFormId,
    onGrupoNomeChange,
    onEmbedFormStateChange,
    onEmbeddedTabChange,
    onClose,
    onSaved,
    onReload,
    detalhesOnly = false,
    nestedPickerZIndex = 1300,
    initialTab = 0,
  },
  ref
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invalidate = useInvalidateTenantQueries()

  const effectiveGrupoId = isEmbedded
    ? grupoId ?? null
    : grupoId || searchParams.get('id') || null
  const seedMatches =
    !!initialGrupo && !!effectiveGrupoId && initialGrupo.getId() === effectiveGrupoId

  const [nome, setNome] = useState(() => (seedMatches ? initialGrupo!.getNome() : ''))
  const [ativo, setAtivo] = useState(() => (seedMatches ? initialGrupo!.isAtivo() : true))
  const [corHex, setCorHex] = useState(() =>
    seedMatches ? initialGrupo!.getCorHex() : '#530CA3'
  )
  const [iconName, setIconName] = useState(() =>
    seedMatches ? initialGrupo!.getIconName() : ''
  )
  const [ativoDelivery, setAtivoDelivery] = useState(() =>
    seedMatches ? initialGrupo!.isAtivoDelivery() : false
  )
  const [ativoLocal, setAtivoLocal] = useState(() =>
    seedMatches ? initialGrupo!.isAtivoLocal() : false
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState(detalhesOnly ? 0 : initialTab)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  const hasLoadedGrupoRef = useRef(false)
  const loadedGrupoIdRef = useRef<string | null>(null)

  useEffect(() => {
    onGrupoNomeChange?.(nome)
  }, [nome, onGrupoNomeChange])

  const isEditMode = !!effectiveGrupoId

  const emitEmbedFormState = useCallback(() => {
    onEmbedFormStateChange?.({
      isSubmitting: isLoading,
      canSubmit: nome.trim().length > 0,
    })
  }, [isLoading, nome, onEmbedFormStateChange])

  useEffect(() => {
    emitEmbedFormState()
  }, [emitEmbedFormState])

  useEffect(() => {
    onEmbeddedTabChange?.(activeTab)
  }, [activeTab, onEmbeddedTabChange])

  useEffect(() => {
    if (detalhesOnly) setActiveTab(0)
  }, [detalhesOnly])

  const normalizeColor = useCallback((value: string) => {
    if (!value) return '#CCCCCC'
    let hex = value.trim().replace('#', '')

    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('')
    }

    if (hex.length === 8) {
      hex = hex.slice(2)
    }

    if (hex.length !== 6) {
      return '#CCCCCC'
    }

    return `#${hex.toUpperCase()}`
  }, [])

  const handleColorSelect = useCallback(
    (color: string) => {
      setCorHex(normalizeColor(color))
    },
    [normalizeColor]
  )

  /** Snapshot só dos campos persistidos — aba interna não entra (PADRAO_MODAL_SAIR_SEM_SALVAR). */
  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      nome,
      ativo,
      corHex: normalizeColor(corHex),
      iconName,
      ativoDelivery,
      ativoLocal,
    })
  }, [nome, ativo, corHex, iconName, ativoDelivery, ativoLocal, normalizeColor])

  const baselineSerializedRef = useRef<string>('')

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  // Atualiza a aba ativa quando initialTab mudar
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Baseline inicial em modo criação (estado padrão aplicado)
  useEffect(() => {
    if (isLoadingData) return
    if (isEditMode) return
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [isLoadingData, isEditMode, effectiveGrupoId])

  // Carrega dados do grupo para edição (em embed com seed: sem spinner — SPA)
  useEffect(() => {
    if (!isEditMode || !effectiveGrupoId) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    // Evita carregar múltiplas vezes o mesmo grupo
    if (
      hasLoadedGrupoRef.current &&
      loadedGrupoIdRef.current === effectiveGrupoId
    ) {
      return
    }

    const hasSeed =
      !!initialGrupo && initialGrupo.getId() === effectiveGrupoId
    /** Em painel embutido (ou com seed da lista) não bloqueia a UI com spinner full-screen. */
    const blockUi = !isEmbedded && !hasSeed

    const loadGrupo = async () => {
      if (blockUi) setIsLoadingData(true)
      try {
        const response = await fetchGestorApi(`/api/grupos-produtos/${effectiveGrupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar categoria')
        }

        const data = await response.json()
        const grupo = GrupoProduto.fromJSON(data)

        setNome(grupo.getNome())
        setAtivo(grupo.isAtivo())
        setCorHex(normalizeColor(grupo.getCorHex()))
        setIconName(grupo.getIconName())
        setAtivoDelivery(grupo.isAtivoDelivery())
        setAtivoLocal(grupo.isAtivoLocal())

        hasLoadedGrupoRef.current = true
        loadedGrupoIdRef.current = effectiveGrupoId

        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 100)
      } catch (error) {
        console.error('Erro ao carregar grupo:', error)
        if (!hasSeed) {
          alert('Erro ao carregar dados da categoria')
        }
      } finally {
        if (blockUi) setIsLoadingData(false)
      }
    }

    // Seed imediato (lista já tinha o grupo) + baseline provisório até o fetch confirmar
    if (hasSeed && !hasLoadedGrupoRef.current) {
      setNome(initialGrupo!.getNome())
      setAtivo(initialGrupo!.isAtivo())
      setCorHex(normalizeColor(initialGrupo!.getCorHex()))
      setIconName(initialGrupo!.getIconName())
      setAtivoDelivery(initialGrupo!.isAtivoDelivery())
      setAtivoLocal(initialGrupo!.isAtivoLocal())
      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 50)
    }

    void loadGrupo()
  }, [isEditMode, effectiveGrupoId, normalizeColor, isEmbedded, initialGrupo])

  const handleSave = useCallback(
    async (opts?: { keepModalOpen?: boolean; silent?: boolean }): Promise<string | null> => {
      if (!nome.trim()) {
        if (opts?.silent) {
          showToast.error('Nome da categoria é obrigatório')
        } else {
          alert('Nome da categoria é obrigatório')
        }
        return null
      }

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        if (opts?.silent) {
          showToast.error('Token não encontrado')
        } else {
          alert('Token não encontrado')
        }
        return null
      }

      setIsLoading(true)

      try {
        const url = isEditMode
          ? `/api/grupos-produtos/${effectiveGrupoId}`
          : '/api/grupos-produtos'
        const method = isEditMode ? 'PATCH' : 'POST'

        const body = {
          nome,
          ativo,
          corHex,
          iconName,
          ativoDelivery,
          ativoLocal,
        }

        const response = await fetchGestorApi(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Erro ao salvar categoria')
        }

        const payload = await response.json().catch(() => ({}))
        const idSalvo = isEditMode
          ? effectiveGrupoId
          : extrairIdGrupoDaResposta(payload) ?? null

        const invalidateListas = async () => {
          await invalidate(['grupos-produtos'])
          await invalidate(['produtos', 'infinite'])
        }

        if (isEmbedded) {
          await invalidateListas()
          commitBaselineLatestRef.current()
          if (opts?.keepModalOpen) {
            onReload?.()
            if (!opts.silent) {
              showToast.success('Categoria salva com sucesso.')
            }
            return idSalvo
          }
          onSaved?.()
          onClose?.()
          return idSalvo
        } else {
          await invalidateListas()
          router.push('/grupos-produtos')
          router.refresh()
          return idSalvo
        }
      } catch (error: any) {
        console.error('Erro ao salvar grupo:', error)
        const message = error.message || 'Erro ao salvar categoria'
        if (opts?.silent) {
          showToast.error(message)
        } else {
          alert(message)
        }
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [
      nome,
      isEditMode,
      effectiveGrupoId,
      ativo,
      corHex,
      iconName,
      ativoDelivery,
      ativoLocal,
      isEmbedded,
      invalidate,
      router,
      onReload,
      onSaved,
      onClose,
    ]
  )

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingData) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      saveGrupo: (opts?: { silent?: boolean }) =>
        handleSave({ keepModalOpen: true, silent: opts?.silent }),
      saveGrupoAndClose: async () => {
        await handleSave()
      },
    }),
    [getFormSnapshot, isLoadingData, handleSave]
  )

  const handleCancel = () => {
    if (isEmbedded) {
      onClose?.()
    } else {
      router.push('/grupos-produtos')
    }
  }

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await handleSave()
  }

  if (isLoadingData) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-info',
          isEmbedded ? 'h-full min-h-[200px]' : 'h-screen'
        )}
      >
        <div className="text-center flex flex-col items-center gap-2">
          <JiffyLoading />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-info',
        isEmbedded ? 'h-full min-h-0 flex-1' : 'h-screen'
      )}
    >

      {/* Conteúdo principal */}
      <div
        className={cn(
          'flex flex-col bg-info rounded-tl-lg overflow-hidden',
          isEmbedded && 'min-h-0'
        )}
      >
        {/* Abas — mesmo modelo do `GruposComplementosTabsModal` (faixa cinza + pílulas) */}
        {!detalhesOnly ? (
        <div className="shrink-0 w-full border-b border-gray-200 bg-info px-6">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className={cn(
                'rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm',
                activeTab === 0
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              )}
            >
              Detalhes da Categoria
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={cn(
                'rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm',
                activeTab === 1
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              )}
            >
              Produtos Vinculados
            </button>
          </div>
        </div>
        ) : null}

        {/* Conteúdo das tabs */}
        <div className="flex min-h-0 flex-1 flex-col px-6 overflow-hidden">
          {activeTab === 0 && (
            <div className="min-h-0 flex-1 overflow-y-auto max-w-4xl mx-5 py-6">
              <GrupoDetalhesFormShell
                formId={embeddedFormId}
                onSubmit={handleFormSubmit}
              >
                <div className="mb-2 flex items-center gap-5">
                <h2 className="shrink-0 text-primary md:text-xl text-sm font-semibold">
                  Dados da Categoria
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>

                {/* Card de informações */}
                <div className="bg-info rounded-t-lg rounded-b-lg mt-2">
                {/* Header do card */}
                <div className="py-4 border-b border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="md:w-12 md:h-12 w-10 h-10 rounded-lg bg-white border-2 flex items-center justify-center"
                        style={{ borderColor: corHex || '#000000' }}
                      >
                        {iconName ? (
                          <DinamicIcon iconName={iconName} color={corHex || '#000000'} size={28} />
                        ) : (
                          <span className="text-tertiary text-2xl"></span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-primary-text md:text-lg text-sm font-semibold">
                          {nome.trim() ? nome : 'Nome da Categoria'}
                        </h2>
                        {!iconName ? (
                          <p className="text-secondary-text md:text-sm text-xs">
                            Definição do Ícone da Categoria
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <JiffyIconSwitch
                        checked={ativo}
                        onChange={e => setAtivo(e.target.checked)}
                        label={ativo ? 'Categoria ativa' : 'Categoria inativa'}
                        labelPosition="end"
                        bordered={false}
                        size="sm"
                        className="justify-end"
                      />
                    </div>
                  </div>
                </div>

                {/* Formulário */}
                <div className="md:py-5 py-2">
                  <div className="md:space-y-6 space-y-4">
                    {/* Nome — label na borda superior (outlined), igual cadastro de grupo de complementos */}
                    <UppercaseLocaleInput
                      label="Nome da Categoria"
                      value={nome}
                      onValueChange={setNome}
                      required
                      size="small"
                      placeholder="Digite o nome da categoria"
                      className="bg-info"
                      sx={sxEntradaNomeGrupoProduto}
                    />

                    {/* Cor e Ícone */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Cor */}
                      <div>
                        <label className="block text-primary-text md:text-sm text-xs font-semibold mb-2">
                          Cor da Categoria
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(true)}
                              className="md:w-12 md:h-12 w-10 h-10 rounded-lg border border-primary/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              style={{ backgroundColor: corHex || '#530CA3' }}
                              aria-label="Selecionar cor da categoria"
                            />
                            
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(true)}
                              className="px-2 py-3 bg-primary text-info rounded-lg md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                            >
                              Escolher cor
                            </button>
                          </div>
                          
                        </div>
                      </div>

                      {/* Ícone */}
                      <div>
                        <label className="block text-primary-text md:text-sm text-xs font-semibold mb-2">
                          Ícone da Categoria
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            className="md:w-12 md:h-12 w-10 h-10 rounded-lg border border-primary/30 bg-white flex items-center justify-center hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label="Selecionar ícone"
                          >
                            {iconName ? (
                              <DinamicIcon iconName={iconName} color="#000000" size={28} />
                            ) : (
                              <span className="text-xs text-secondary-text">Sem ícone</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            className="px-2 py-3 bg-primary text-info rounded-lg md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Escolher Ícone
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview do ícone */}
                    <div>
                      <label className="block text-primary-text md:text-sm text-xs font-semibold mb-2">
                        Preview do Ícone
                      </label>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          
                          className="group cursor-default"
                        >
                          <div
                            className="w-[45px] h-[45px] rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg cursor-default"
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderColor: corHex,
                            }}
                          >
                            {iconName ? (
                              <DinamicIcon iconName={iconName} color={corHex} size={24} />
                            ) : (
                              <span className="text-lg"></span>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          
                          className="group cursor-default"
                        >
                          <div
                            className="w-[45px] h-[45px] rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg cursor-default"
                            style={{
                              backgroundColor: corHex || '#000000',
                              borderColor: corHex,
                            }}
                          >
                            {iconName ? (
                              <DinamicIcon iconName={iconName} color="#FFFFFF" size={24} />
                            ) : (
                              <span className="text-lg text-white"></span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Ativo Delivery e Local */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ativoDelivery}
                            onChange={(e) => setAtivoDelivery(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/60 text-primary focus:ring-primary"
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <span className="text-primary-text md:text-sm text-xs ">
                            Ativo para Delivery
                          </span>
                        </label>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ativoLocal}
                            onChange={(e) => setAtivoLocal(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/60 text-primary focus:ring-primary"
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <span className="text-primary-text md:text-sm text-xs ">
                            Ativo para Local
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </GrupoDetalhesFormShell>
            </div>
          )}

          {activeTab === 1 && !detalhesOnly && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-6">
              {isEditMode && effectiveGrupoId ? (
                <ProdutosPorGrupoList grupoProdutoId={effectiveGrupoId} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-text ">
                    A lista de produtos vinculados aparece no modo de edição.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de seleção de ícones */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(iconName) => {
          setIconName(iconName)
          setIsIconPickerOpen(false)
        }}
        selectedColor={corHex}
        zIndex={nestedPickerZIndex}
      />
      <ColorPickerModal
        open={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        onSelect={handleColorSelect}
        zIndex={nestedPickerZIndex}
      />
    </div>
  )
})

NovoGrupo.displayName = 'NovoGrupo'
