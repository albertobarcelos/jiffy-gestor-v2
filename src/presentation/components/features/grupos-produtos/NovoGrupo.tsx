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
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { IconPickerModal } from './IconPickerModal'
import { ColorPickerModal } from './ColorPickerModal'
import { ProdutosPorGrupoList } from './ProdutosPorGrupoList'
import { useQueryClient } from '@tanstack/react-query'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { Input } from '@/src/presentation/components/ui/input'
import { cn } from '@/src/shared/utils/cn'
import { showToast } from '@/src/shared/utils/toast'

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
  initialTab?: number // 0 = Detalhes do Grupo, 1 = Produtos Vinculados
}

/** API imperativa para confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoGrupoHandle {
  /** Há alterações em relação ao último baseline (carregamento ou salvamento). */
  isDirty: () => boolean
  /** Persiste o grupo sem depender do `<form>` (rodapé na aba Produtos vinculados). */
  saveGrupo: () => Promise<void>
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

/**
 * Componente para criar/editar grupo de produtos
 * Replica o design e lógica do Flutter NovoGrupoTabbedWidget
 */
export const NovoGrupo = forwardRef<NovoGrupoHandle, NovoGrupoProps>(function NovoGrupo(
  {
    grupoId,
    isEmbedded = false,
    embeddedFormId,
    hideEmbeddedFormActions,
    onGrupoNomeChange,
    onEmbedFormStateChange,
    onEmbeddedTabChange,
    onClose,
    onSaved,
    onReload,
    initialTab = 0,
  },
  ref
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth } = useAuthStore()
  const queryClient = useQueryClient() // Obter a instância do queryClient

  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [corHex, setCorHex] = useState('#530CA3')
  const [iconName, setIconName] = useState('')
  const [ativoDelivery, setAtivoDelivery] = useState(false)
  const [ativoLocal, setAtivoLocal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  const hasLoadedGrupoRef = useRef(false)
  const loadedGrupoIdRef = useRef<string | null>(null)

  useEffect(() => {
    onGrupoNomeChange?.(nome)
  }, [nome, onGrupoNomeChange])

  // Determina se está editando ou criando
  const effectiveGrupoId = grupoId || searchParams.get('id') || null
  const isEditMode = !!effectiveGrupoId

  /** Cabeçalho próprio só fora do painel padronizado (ou embed sem delegar ao modal) */
  const showPageHeader = !(isEmbedded && hideEmbeddedFormActions)

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

  // Carrega dados do grupo para edição
  useEffect(() => {
    if (!isEditMode || !effectiveGrupoId) return

    const token = auth?.getAccessToken()
    if (!token) return

    // Evita carregar múltiplas vezes o mesmo grupo
    if (
      hasLoadedGrupoRef.current &&
      loadedGrupoIdRef.current === effectiveGrupoId
    ) {
      return
    }

    const loadGrupo = async () => {
      setIsLoadingData(true)
      try {
        const response = await fetch(`/api/grupos-produtos/${effectiveGrupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar grupo')
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
        alert('Erro ao carregar dados do grupo')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadGrupo()
  }, [isEditMode, effectiveGrupoId, auth, normalizeColor])

  const handleSave = useCallback(
    async (opts?: { keepModalOpen?: boolean }) => {
      if (!nome.trim()) {
        alert('Nome do grupo é obrigatório')
        return
      }

      const token = auth?.getAccessToken()
      if (!token) {
        alert('Token não encontrado')
        return
      }

      setIsLoading(true)

      try {
        const url = isEditMode
          ? `/api/grupos-produtos/${effectiveGrupoId}`
          : '/api/grupos-produtos'
        const method = isEditMode ? 'PATCH' : 'POST'

        const body = isEditMode
          ? {
              nome,
              ativo,
              corHex,
              iconName,
              ativoDelivery,
              ativoLocal,
            }
          : {
              nome,
              ativo,
              corHex,
              iconName,
              ativoDelivery,
              ativoLocal,
            }

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Erro ao salvar grupo')
        }

        // Sucesso — mesmo cache que na página avulsa (lista de produtos depende dos dois)
        if (isEmbedded) {
          void queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false })
          void queryClient.invalidateQueries({
            queryKey: ['produtos', 'infinite'],
            exact: false,
            refetchType: 'active',
          })
          commitBaselineLatestRef.current()
          if (opts?.keepModalOpen) {
            onReload?.()
            showToast.success('Grupo salvo com sucesso.')
            return
          }
          onSaved?.()
          onClose?.()
        } else {
          router.push('/cadastros/grupos-produtos')
          router.refresh() // Força a revalidação dos dados da rota para recarregar a lista
          queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false }) // Invalida todas as queries de grupos de produtos
          queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'] }) // Invalida o cache do React Query para produtos
        }
      } catch (error: any) {
        console.error('Erro ao salvar grupo:', error)
        alert(error.message || 'Erro ao salvar grupo')
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
      auth,
      isEmbedded,
      queryClient,
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
      saveGrupo: () => handleSave({ keepModalOpen: true }),
      saveGrupoAndClose: () => handleSave(),
    }),
    [getFormSnapshot, isLoadingData, handleSave]
  )

  const handleCancel = () => {
    if (isEmbedded) {
      onClose?.()
    } else {
      router.push('/cadastros/grupos-produtos')
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
        <div className="shrink-0 w-full border-b border-gray-200 bg-info px-6">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className={cn(
                'rounded-t-lg px-4 py-2 font-nunito text-xs font-semibold transition-colors md:text-sm',
                activeTab === 0
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              )}
            >
              Detalhes do Grupo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={cn(
                'rounded-t-lg px-4 py-2 font-nunito text-xs font-semibold transition-colors md:text-sm',
                activeTab === 1
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              )}
            >
              Produtos Vinculados
            </button>
          </div>
        </div>

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
                  Dados do Grupo de Produtos
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
                        <h2 className="text-primary-text md:text-lg text-sm font-nunito font-semibold">
                          {nome.trim() ? nome : 'Nome do Grupo'}
                        </h2>
                        <p className="text-secondary-text md:text-sm text-xs font-nunito">
                          {iconName ? `Ícone selecionado: ${iconName}` : 'Definição do Ícone do Grupo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <JiffyIconSwitch
                        checked={ativo}
                        onChange={e => setAtivo(e.target.checked)}
                        label={ativo ? 'Grupo ativo' : 'Grupo inativo'}
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
                    <Input
                      label="Nome do Grupo"
                      value={nome}
                      onChange={e => setNome(e.target.value.toLocaleUpperCase('pt-BR'))}
                      required
                      size="small"
                      placeholder="Digite o nome do grupo"
                      className="bg-info"
                      sx={sxEntradaNomeGrupoProduto}
                    />

                    {/* Cor e Ícone */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Cor */}
                      <div>
                        <label className="block text-primary-text md:text-sm text-xs font-nunito font-semibold mb-2">
                          Cor do Grupo
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(true)}
                              className="md:w-12 md:h-12 w-10 h-10 rounded-lg border border-primary/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              style={{ backgroundColor: corHex || '#530CA3' }}
                              aria-label="Selecionar cor do grupo"
                            />
                            
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(true)}
                              className="px-2 py-3 bg-primary text-info rounded-lg font-nunito md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                            >
                              Escolher cor
                            </button>
                          </div>
                          
                        </div>
                      </div>

                      {/* Ícone */}
                      <div>
                        <label className="block text-primary-text md:text-sm text-xs font-nunito font-semibold mb-2">
                          Ícone do Grupo
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
                            className="px-2 py-3 bg-primary text-info rounded-lg font-nunito md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Escolher Ícone
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview do ícone */}
                    <div>
                      <label className="block text-primary-text md:text-sm text-xs font-nunito font-semibold mb-2">
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
                          <span className="text-primary-text md:text-sm text-xs font-nunito">
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
                          <span className="text-primary-text md:text-sm text-xs font-nunito">
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

          {activeTab === 1 && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-6">
              {isEditMode && effectiveGrupoId ? (
                <ProdutosPorGrupoList grupoProdutoId={effectiveGrupoId} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-text font-nunito">
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
      />
      <ColorPickerModal
        open={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        onSelect={handleColorSelect}
      />
    </div>
  )
})

NovoGrupo.displayName = 'NovoGrupo'
