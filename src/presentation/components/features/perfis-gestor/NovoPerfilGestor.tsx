'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { PerfilGestor } from '@/src/domain/entities/PerfilGestor'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { showToast } from '@/src/shared/utils/toast'
import { MdPerson } from 'react-icons/md'

interface NovoPerfilGestorProps {
  perfilId?: string
  isEmbedded?: boolean
  hideEmbeddedHeader?: boolean
  embeddedFormId?: string
  hideEmbeddedFormActions?: boolean
  onEmbedFormStateChange?: (s: {
    isSubmitting: boolean
    canSubmit: boolean
  }) => void
  /** Embutido: após POST devolve o id para o modal ativar a aba Usuário sem fechar */
  onSaved?: (payload?: { perfilIdCriado?: string }) => void
  /** Embutido: alterações em relação ao baseline (bloquear aba Usuário no modal). */
  onEmbedDirtyChange?: (dirty: boolean) => void
  /** Embutido: fechar o painel após "Salvar e fechar" com sucesso (chamar `onClose` do modal). */
  onClosePanelAfterSave?: () => void
  onCancel?: () => void
}

/** API imperativa — confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoPerfilGestorHandle {
  isDirty: () => boolean
  savePerfilAndClose: () => void
}

/**
 * Componente para criar/editar perfil gestor
 * Replica o design e funcionalidades do Flutter
 */
export const NovoPerfilGestor = forwardRef<NovoPerfilGestorHandle, NovoPerfilGestorProps>(
  function NovoPerfilGestor(
    {
      perfilId,
      isEmbedded = false,
      hideEmbeddedHeader = false,
      embeddedFormId,
      onEmbedFormStateChange,
      onSaved,
      onEmbedDirtyChange,
      onClosePanelAfterSave,
      onCancel,
    },
    ref
  ) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!perfilId

  // Estados do formulário
  const [role, setRole] = useState('')
  const [acessoFinanceiro, setAcessoFinanceiro] = useState(false)
  const [acessoEstoque, setAcessoEstoque] = useState(false)
  const [acessoFiscal, setAcessoFiscal] = useState(false)
  const [acessoDashboard, setAcessoDashboard] = useState(false)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false)
  const hasLoadedPerfilRef = useRef(false)

  const formId = embeddedFormId ?? 'novo-perfil-gestor-form'
  const canSubmit = Boolean(role && role.trim())

  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      role: (role || '').trim(),
      acessoFinanceiro,
      acessoEstoque,
      acessoFiscal,
      acessoDashboard,
    })
  }, [role, acessoFinanceiro, acessoEstoque, acessoFiscal, acessoDashboard])

  const baselineSerializedRef = useRef('')
  const [baselineTick, setBaselineTick] = useState(0)
  const closeAfterEmbeddedSaveRef = useRef(false)

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
    setBaselineTick(t => t + 1)
  }, [getFormSnapshot])

  const embedDirtyComputed = useMemo(() => {
    if (isLoadingPerfil) return false
    return getFormSnapshot() !== baselineSerializedRef.current
  }, [getFormSnapshot, isLoadingPerfil, baselineTick])

  useEffect(() => {
    if (!isEmbedded || !onEmbedDirtyChange) return
    onEmbedDirtyChange(embedDirtyComputed)
  }, [isEmbedded, onEmbedDirtyChange, embedDirtyComputed])

  useEffect(() => {
    return () => {
      if (isEmbedded) {
        onEmbedDirtyChange?.(false)
      }
    }
  }, [isEmbedded, onEmbedDirtyChange])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  useEffect(() => {
    onEmbedFormStateChange?.({
      isSubmitting: isLoading,
      canSubmit,
    })
  }, [isLoading, canSubmit, onEmbedFormStateChange])

  useEffect(() => {
    hasLoadedPerfilRef.current = false
  }, [perfilId])

  // Baseline inicial em modo criação (embed)
  useEffect(() => {
    if (isLoadingPerfil) return
    if (isEditing) return
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [isLoadingPerfil, isEditing, perfilId])

  // Carregar dados do perfil se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedPerfilRef.current) return

    const loadPerfil = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingPerfil(true)
      hasLoadedPerfilRef.current = true

      try {
        const response = await fetch(`/api/pessoas/perfis-gestor/${perfilId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const perfil = PerfilGestor.fromJSON(data)

          setRole(perfil.getRole().toUpperCase())
          setAcessoFinanceiro(perfil.hasAcessoFinanceiro())
          setAcessoEstoque(perfil.hasAcessoEstoque())
          setAcessoFiscal(perfil.hasAcessoFiscal())
          setAcessoDashboard(perfil.hasAcessoDashboard())
        }
      } catch (error) {
        // Erro ao carregar perfil gestor
      } finally {
        setIsLoadingPerfil(false)
        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 120)
      }
    }

    loadPerfil()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, perfilId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const forceClosePanel = closeAfterEmbeddedSaveRef.current
    closeAfterEmbeddedSaveRef.current = false

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    const roleTrim = role.trim()
    if (!roleTrim) {
      showToast.error('Nome do perfil é obrigatório')
      return
    }

    setIsLoading(true)

    try {
      const body = {
        role: roleTrim,
        acessoFinanceiro,
        acessoEstoque,
        acessoFiscal,
        acessoDashboard,
      }

      const url = isEditing
        ? `/api/pessoas/perfis-gestor/${perfilId}`
        : '/api/pessoas/perfis-gestor'
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
        throw new Error(errorData.error || 'Erro ao salvar perfil gestor')
      }

      const responseData = await response.json().catch(() => ({}))

      if (isEmbedded) {
        showToast.success(
          isEditing
            ? 'Perfil gestor atualizado com sucesso!'
            : 'Perfil gestor criado com sucesso!'
        )
        if (!isEditing) {
          const criado = PerfilGestor.fromJSON(responseData)
          const novoId = criado.getId()
          if (!novoId) {
            showToast.error(
              'Perfil salvo, mas não foi possível obter o ID. Recarregue a página.'
            )
            return
          }
          onSaved?.({ perfilIdCriado: novoId })
          commitBaselineLatestRef.current()
          if (forceClosePanel) {
            onClosePanelAfterSave?.()
          }
        } else {
          onSaved?.()
          commitBaselineLatestRef.current()
          if (forceClosePanel) {
            onClosePanelAfterSave?.()
          }
        }
      } else {
        showToast.success(
          isEditing
            ? 'Perfil gestor atualizado com sucesso!'
            : 'Perfil gestor criado com sucesso!'
        )
        router.push('/cadastros/perfis-gestor')
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Erro ao salvar perfil gestor'
      )
    } finally {
      setIsLoading(false)
      onEmbedFormStateChange?.({ isSubmitting: false, canSubmit })
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/perfis-gestor')
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingPerfil) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      savePerfilAndClose: () => {
        closeAfterEmbeddedSaveRef.current = true
        const el = document.getElementById(formId)
        if (el instanceof HTMLFormElement) {
          el.requestSubmit()
        }
      },
    }),
    [formId, getFormSnapshot, isLoadingPerfil]
  )

  if (isLoadingPerfil) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header fixo (apenas fluxo página / não embutido no painel) */}
      {!isEmbedded || !hideEmbeddedHeader ? (
        <div className="sticky top-0 z-10 bg-white shadow-sm md:px-[30px] px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="md:w-12 md:h-12 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-xl md:text-2xl">
                  <MdPerson />
                </span>
              </div>
              <h1 className="font-exo text-sm font-semibold text-primary md:text-lg">
                {isEditing ? 'Editar Perfil Gestor' : 'Novo Perfil Gestor'}
              </h1>
            </div>
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="h-8 rounded-lg px-8 transition-colors hover:bg-primary/15"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide md:px-6">
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white">
            <div className="mb-4 flex items-center gap-5">
              <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                Dados do Perfil
              </h2>
              <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
            </div>

            <div className="space-y-2">
              <Input
                label="Nome do Perfil"
                value={role}
                onChange={(e) => setRole(e.target.value.toUpperCase())}
                required
                placeholder="Digite o nome do perfil"
                className="bg-white"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-input': {
                    padding: '10px 12px',
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white">
            <div className="mb-2 flex items-center gap-5">
              <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                Permissões de Acesso
              </h2>
              <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-normal text-primary-text md:text-base">
                  Acesso Financeiro?
                </span>
                <div
                  className="tooltip-hover-below tooltip-hover-below-align-end flex items-center justify-center"
                  data-tooltip={
                    acessoFinanceiro
                      ? 'Financeiro habilitado'
                      : 'Financeiro desabilitado'
                  }
                >
                  <JiffyIconSwitch
                    checked={acessoFinanceiro}
                    onChange={(e) => setAcessoFinanceiro(e.target.checked)}
                    disabled={isLoading}
                    bordered={false}
                    size="sm"
                    className="shrink-0 px-0 py-0"
                    inputProps={{
                      'aria-label': acessoFinanceiro
                        ? 'Desabilitar financeiro'
                        : 'Habilitar financeiro',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-normal text-primary-text md:text-base">
                  Acesso Estoque?
                </span>
                <div
                  className="tooltip-hover-below tooltip-hover-below-align-end flex items-center justify-center"
                  data-tooltip={
                    acessoEstoque
                      ? 'Estoque habilitado'
                      : 'Estoque desabilitado'
                  }
                >
                  <JiffyIconSwitch
                    checked={acessoEstoque}
                    onChange={(e) => setAcessoEstoque(e.target.checked)}
                    disabled={isLoading}
                    bordered={false}
                    size="sm"
                    className="shrink-0 px-0 py-0"
                    inputProps={{
                      'aria-label': acessoEstoque
                        ? 'Desabilitar estoque'
                        : 'Habilitar estoque',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-normal text-primary-text md:text-base">
                  Acesso Fiscal?
                </span>
                <div
                  className="tooltip-hover-below tooltip-hover-below-align-end flex items-center justify-center"
                  data-tooltip={
                    acessoFiscal
                      ? 'Fiscal habilitado'
                      : 'Fiscal desabilitado'
                  }
                >
                  <JiffyIconSwitch
                    checked={acessoFiscal}
                    onChange={(e) => setAcessoFiscal(e.target.checked)}
                    disabled={isLoading}
                    bordered={false}
                    size="sm"
                    className="shrink-0 px-0 py-0"
                    inputProps={{
                      'aria-label': acessoFiscal
                        ? 'Desabilitar fiscal'
                        : 'Habilitar fiscal',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-normal text-primary-text md:text-base">
                  Acesso Dashboard?
                </span>
                <div
                  className="tooltip-hover-below tooltip-hover-below-align-end flex items-center justify-center"
                  data-tooltip={
                    acessoDashboard
                      ? 'Dashboard habilitado'
                      : 'Dashboard desabilitado'
                  }
                >
                  <JiffyIconSwitch
                    checked={acessoDashboard}
                    onChange={(e) => setAcessoDashboard(e.target.checked)}
                    disabled={isLoading}
                    bordered={false}
                    size="sm"
                    className="shrink-0 px-0 py-0"
                    inputProps={{
                      'aria-label': acessoDashboard
                        ? 'Desabilitar dashboard'
                        : 'Habilitar dashboard',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {!isEmbedded ? (
            <div className="flex justify-end gap-4 pt-2">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outlined"
                className="h-8 rounded-lg px-8 transition-colors hover:bg-primary/15"
                sx={{
                  backgroundColor: 'var(--color-info)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !role.trim()}
                className="h-8 rounded-lg text-white hover:bg-primary/90"
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-info)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
})

NovoPerfilGestor.displayName = 'NovoPerfilGestor'
