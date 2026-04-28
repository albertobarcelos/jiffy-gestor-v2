'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useRouter } from 'next/navigation'
import { MdAdd } from 'react-icons/md'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

/** Labels outlined em preto (MUI usa cinza por padrão) — igual NovoComplemento */
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

/** Padding interno reduzido — base TextField (igual NovoComplemento) */
const entradaCompactaInput = {
  padding: '10px',
  fontSize: '0.875rem',
} as const

const sxEntradaCompactaGrupo = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
} as const

export interface NovoGrupoComplementoBasicData {
  nome: string
  qtdMinima: string
  qtdMaxima: string
  ativo: boolean
}

interface NovoGrupoComplementoProps {
  grupoId?: string
  /** Dentro de modal com abas: layout full-height, título da seção fixo e callbacks no salvar/fechar */
  isEmbedded?: boolean
  /** `id` do `<form>` para o rodapé do painel usar `form="..."` no botão Salvar */
  embeddedFormId?: string
  /** Omite Cancelar/Salvar no formulário (ações no rodapé do `JiffySidePanelModal`) */
  hideEmbeddedFormActions?: boolean
  /** Sincroniza estado com o rodapé do modal (loading / pode submeter) */
  onEmbedFormStateChange?: (state: {
    isSubmitting: boolean
    canSubmit: boolean
  }) => void
  onClose?: () => void
  onSaved?: () => void
  /** Após salvar mantendo o painel aberto (rodapé na aba Complementos) — invalida listas. */
  onReload?: () => void
  /** IDs mantidos pelo modal pai durante a criação; edição persiste vínculos na aba Complementos. */
  complementosIdsDraft?: string[]
  /** Expõe os dados básicos para o fluxo do modal de abas (ex.: título na aba Complementos em criação). */
  onBasicDataChange?: (data: NovoGrupoComplementoBasicData) => void
  /** Atalho único para a aba Complementos, tanto em criação quanto em edição. */
  onGoToComplementosTab?: () => void
}

/** API imperativa para confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoGrupoComplementoHandle {
  isDirty: () => boolean
  /** Salva o grupo sem fechar o painel (aba Complementos). */
  saveGrupoComplemento: () => Promise<void>
  saveGrupoComplementoAndClose: () => Promise<void>
}

/**
 * Componente para criar/editar grupo de complementos
 * Replica o design e funcionalidades do Flutter
 */
export const NovoGrupoComplemento = forwardRef<
  NovoGrupoComplementoHandle,
  NovoGrupoComplementoProps
>(function NovoGrupoComplemento(
  {
    grupoId,
    isEmbedded = false,
    embeddedFormId,
    hideEmbeddedFormActions,
    onEmbedFormStateChange,
    onClose,
    onSaved,
    onReload,
    complementosIdsDraft = [],
    onBasicDataChange,
    onGoToComplementosTab,
  },
  ref
) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!grupoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [qtdMinima, setQtdMinima] = useState('0')
  const [qtdMaxima, setQtdMaxima] = useState('0')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGrupo, setIsLoadingGrupo] = useState(false)
  const hasLoadedGrupoRef = useRef(false)
  const baselineSerializedRef = useRef<string>('')

  const onEmbedFormStateChangeRef = useRef(onEmbedFormStateChange)
  onEmbedFormStateChangeRef.current = onEmbedFormStateChange
  const lastEmbedSyncRef = useRef<{ isSubmitting: boolean; canSubmit: boolean } | null>(null)
  const onBasicDataChangeRef = useRef(onBasicDataChange)
  onBasicDataChangeRef.current = onBasicDataChange
  const lastBasicDataSerializedRef = useRef<string>('')

  useEffect(() => {
    const next = {
      isSubmitting: isLoading,
      canSubmit: nome.trim().length > 0,
    }
    const prev = lastEmbedSyncRef.current
    if (
      prev &&
      prev.isSubmitting === next.isSubmitting &&
      prev.canSubmit === next.canSubmit
    ) {
      return
    }
    lastEmbedSyncRef.current = next
    onEmbedFormStateChangeRef.current?.(next)
  }, [isLoading, nome])

  useEffect(() => {
    const next: NovoGrupoComplementoBasicData = {
      nome,
      qtdMinima,
      qtdMaxima,
      ativo,
    }
    const serialized = JSON.stringify(next)
    if (serialized === lastBasicDataSerializedRef.current) return
    lastBasicDataSerializedRef.current = serialized
    onBasicDataChangeRef.current?.(next)
  }, [nome, qtdMinima, qtdMaxima, ativo])

  /** Snapshot dos campos persistidos — mesmo critério do PATCH/POST. */
  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      nome: nome.trim(),
      qtdMinima,
      qtdMaxima,
      ativo,
      complementosIds: isEditing
        ? []
        : [...complementosIdsDraft].map(String).sort(),
    })
  }, [nome, qtdMinima, qtdMaxima, ativo, isEditing, complementosIdsDraft])

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  useEffect(() => {
    hasLoadedGrupoRef.current = false
  }, [grupoId])

  // Baseline em modo criação (estado inicial)
  useEffect(() => {
    if (isLoadingGrupo) return
    if (isEditing) return
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [isLoadingGrupo, isEditing, grupoId])

  // Carregar dados do grupo se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedGrupoRef.current) return

    const loadGrupo = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingGrupo(true)
      hasLoadedGrupoRef.current = true

      try {
        const response = await fetch(`/api/grupos-complementos/${grupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          try {
            const grupo = GrupoComplemento.fromJSON(data)

            setNome(grupo.getNome())
            setQtdMinima(grupo.getQtdMinima().toString())
            setQtdMaxima(grupo.getQtdMaxima().toString())
            setAtivo(grupo.isAtivo())

            window.setTimeout(() => {
              commitBaselineLatestRef.current()
            }, 100)
          } catch (parseError) {
            console.error('Erro ao processar dados do grupo:', parseError)
            showToast.error('Erro ao carregar dados do grupo. Verifique se as quantidades estão corretas.')
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao carregar grupo de complementos')
        }
      } catch (error) {
        console.error('Erro ao carregar grupo de complementos:', error)
        const errorMessage = handleApiError(error)
        showToast.error(errorMessage)
      } finally {
        setIsLoadingGrupo(false)
      }
    }

    loadGrupo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, grupoId])

  const persistGrupo = useCallback(async (opts?: { keepModalOpen?: boolean }) => {
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const qtdMinimaNum = parseInt(qtdMinima, 10) || 0
    const qtdMaximaNum = parseInt(qtdMaxima, 10) || 0

    if (qtdMinimaNum > qtdMaximaNum) {
      showToast.error('Quantidade mínima não pode ser maior que máxima')
      return
    }

    if (!isEditing && complementosIdsDraft.length === 0) {
      showToast.error('Vincule pelo menos um complemento antes de salvar o grupo.')
      return
    }

    const toastId = showToast.loading(
      isEditing ? 'Salvando alterações...' : 'Criando grupo de complementos...'
    )

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        qtdMinima: qtdMinimaNum,
        qtdMaxima: qtdMaximaNum,
        ativo,
      }

      if (!isEditing) {
        body.complementosIds = complementosIdsDraft
      }

      const url = isEditing
        ? `/api/grupos-complementos/${grupoId}`
        : '/api/grupos-complementos'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar grupo de complementos')
      }

      showToast.successLoading(
        toastId,
        isEditing ? 'Grupo de complementos atualizado com sucesso!' : 'Grupo de complementos criado com sucesso!'
      )

      commitBaselineLatestRef.current()

      if (isEmbedded) {
        if (opts?.keepModalOpen) {
          onReload?.()
          return
        }
        onSaved?.()
        onClose?.()
      } else {
        setTimeout(() => {
          router.push('/cadastros/grupos-complementos')
        }, 500)
      }
    } catch (error) {
      console.error('Erro ao salvar grupo de complementos:', error)
      const errorMessage = handleApiError(error)
      showToast.errorLoading(toastId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    auth,
    isEditing,
    grupoId,
    nome,
    qtdMinima,
    qtdMaxima,
    ativo,
    complementosIdsDraft,
    isEmbedded,
    onReload,
    onSaved,
    onClose,
    router,
  ])

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingGrupo) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      saveGrupoComplemento: () => persistGrupo({ keepModalOpen: true }),
      saveGrupoComplementoAndClose: () => persistGrupo(),
    }),
    [getFormSnapshot, isLoadingGrupo, persistGrupo]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await persistGrupo()
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onClose?.()
    } else {
      router.push('/cadastros/grupos-complementos')
    }
  }

  if (isLoadingGrupo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col ${isEmbedded ? 'h-full min-h-0 flex-1' : 'h-full'}`}
    >
      {/* Formulário com scroll — título da tela fica no layout/página ou no modal pai */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto ${isEmbedded ? 'md:px-0 px-2 md:py-0 py-2 bg-info' : 'md:px-6 px-2 md:py-4 py-2 bg-info'}`}
      >
        <form
          id={embeddedFormId}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Informações */}
            <div className="bg-info rounded-[12px] md:p-5">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="shrink-0 text-primary md:text-xl text-sm font-semibold">
                  Dados Do Grupo De Complementos
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>
                <div className="flex my-6 justify-end">
            <JiffyIconSwitch
              checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
              label="Ativo"
              bordered={false}
              size="sm"
              className="mb-6 justify-end"
            />
            </div>
            <div className="space-y-8">
              <Input
                label="Nome do Grupo"
                value={nome}
                onChange={(e) => setNome(e.target.value.toLocaleUpperCase('pt-BR'))}
                required
                size="small"
                placeholder="Digite o nome do grupo de complementos"
                className="bg-info"
                sx={sxEntradaCompactaGrupo}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantidade Mínima"
                  type="number"
                  value={qtdMinima}
                  onChange={(e) => setQtdMinima(e.target.value)}
                  required
                  size="small"
                  min={0}
                  placeholder="0"
                  className="bg-info"
                  sx={sxEntradaCompactaGrupo}
                />
                <Input
                  label="Quantidade Máxima"
                  type="number"
                  value={qtdMaxima}
                  onChange={(e) => setQtdMaxima(e.target.value)}
                  required
                  size="small"
                  min={0}
                  placeholder="0"
                  className="bg-info"
                  sx={sxEntradaCompactaGrupo}
                />
              </div>

              {/* Complementos: a gestão de vínculos acontece exclusivamente na aba Complementos. */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complementos
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onGoToComplementosTab?.()
                  }}
                  disabled={!onGoToComplementosTab}
                  className="inline-flex items-center h-8 text-sm md:text-lg gap-2 px-5 py-2 rounded-lg bg-primary text-info font-medium shadow hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdAdd className="md:text-lg text-sm" />
                  Vincular Complementos
                </button>
              </div>

            </div>
          </div>

          {/* Botões de ação — omitidos no painel lateral (rodapé do modal) */}
          {hideEmbeddedFormActions ? null : (
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outlined"
                className="px-8 h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !nome.trim()}
                className="h-8"
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-info)',
                  '&:hover': {
                    backgroundColor: 'var(--color-primary)',
                    opacity: 0.9,
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'var(--color-primary)',
                    opacity: 0.4,
                    color: 'var(--color-info)',
                  },
                }}
              >
                {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          )}
        </form>
      </div>

    </div>
  )
})

NovoGrupoComplemento.displayName = 'NovoGrupoComplemento'
