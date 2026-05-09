'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { showToast } from '@/src/shared/utils/toast'
import { MeusAppsTopNav } from '@/src/presentation/components/features/meus-apps/components/MeusAppsTopNav'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useConvitesGestao } from './hooks/useConvitesGestao'
import { ConvitesGestaoList } from './ConvitesGestaoList'
import { NovoConviteModal } from './components/NovoConviteModal'

/**
 * Gestão de convites emitidos pela empresa (sessão com tenant).
 */
export default function ConvitesGestaoPage() {
  const { empresa, isLoading: empresaLoading } = useEmpresaMe()
  const {
    convites,
    perfilGestorNomePorId,
    loading,
    error,
    fetchConvites,
    criarConvite,
    cancelarConvite,
    reenviarConvite,
  } = useConvitesGestao()

  const [modalOpen, setModalOpen] = useState(false)
  const [busyById, setBusyById] = useState<Record<string, 'cancelar' | 'reenviar' | null>>({})

  useEffect(() => {
    void fetchConvites()
  }, [fetchConvites])

  const setBusy = useCallback((id: string, action: 'cancelar' | 'reenviar' | null) => {
    setBusyById(prev => ({ ...prev, [id]: action }))
  }, [])

  const handleCancelar = useCallback(
    async (id: string) => {
      setBusy(id, 'cancelar')
      try {
        await cancelarConvite(id)
        showToast.success('Convite cancelado.')
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Erro ao cancelar')
      } finally {
        setBusy(id, null)
      }
    },
    [cancelarConvite, setBusy]
  )

  const handleReenviar = useCallback(
    async (id: string) => {
      setBusy(id, 'reenviar')
      try {
        await reenviarConvite(id)
        showToast.success('Convite atualizado / reenvio processado.')
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'Erro ao reenviar')
      } finally {
        setBusy(id, null)
      }
    },
    [reenviarConvite, setBusy]
  )

  const handleCriar = useCallback(
    async (payload: { email: string; perfilGestorId: string }) => {
      await criarConvite(payload)
      showToast.success('Convite criado.')
    },
    [criarConvite]
  )

  const nomeEmpresa =
    empresa?.nomeExibicao ?? (empresaLoading ? 'Carregando…' : 'Empresa')

  /**
   * Voltar: esta tela costuma abrir em nova aba a partir do hub.
   * Se a aba do Meus Apps ainda existir (`window.opener`), foca e fecha só esta guia.
   * Caso contrário, abre o hub numa nova guia, tenta fechar esta; se o navegador bloquear o close, navega aqui.
   */
  const handleVoltar = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const { opener } = window
      if (opener && !opener.closed) {
        opener.focus()
        window.close()
        return
      }
    } catch {
      /* opener indisponível em alguns cenários */
    }

    window.open('/meus-apps', '_blank', 'noopener,noreferrer')
    try {
      window.close()
    } catch {
      /* noop */
    }

    window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        window.location.assign('/meus-apps')
      }
    }, 250)
  }, [])

  return (
    <div className="flex h-full min-h-screen min-w-0 flex-col bg-[#fafafa]">
      <MeusAppsTopNav />

      <div className="mx-auto w-full max-w-6xl flex-shrink-0 px-3 pt-4 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleVoltar}
            className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-secondary px-5 font-exo text-sm font-semibold text-info transition-colors hover:bg-alternate"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg bg-secondary px-[30px] font-exo text-sm font-semibold text-info transition-colors hover:bg-alternate"
          >
            Convidar
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-b border-gray-200 pb-6 md:mt-8 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <h1 className="font-nunito text-xl font-bold tracking-tight text-primary-text md:text-2xl">
              {nomeEmpresa}
            </h1>
            <p className="mt-1 font-nunito text-sm text-secondary-text">
              {empresa ? 'Ativo' : empresaLoading ? '…' : '—'}
            </p>
          </div>
          <div
            className="flex h-28 w-full max-w-[220px] shrink-0 items-center justify-center self-start rounded-lg border border-dashed border-gray-300 bg-white font-nunito text-xs text-secondary-text md:self-center"
            aria-hidden
          >
            Imagem da empresa
          </div>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-8 md:pb-8">
        <ConvitesGestaoList
          convites={convites}
          perfilGestorNomePorId={perfilGestorNomePorId}
          loading={loading}
          error={error}
          busyById={busyById}
          onCancelar={handleCancelar}
          onReenviar={handleReenviar}
        />
      </div>

      <NovoConviteModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCriar} />
    </div>
  )
}
