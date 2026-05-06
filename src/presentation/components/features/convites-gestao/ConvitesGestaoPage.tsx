'use client'

import { useCallback, useEffect, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { useConvitesGestao } from './hooks/useConvitesGestao'
import { ConvitesGestaoList } from './ConvitesGestaoList'
import { NovoConviteModal } from './components/NovoConviteModal'

/**
 * Gestão de convites emitidos pela empresa (sessão com tenant).
 */
export default function ConvitesGestaoPage() {
  const {
    convites,
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

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex-shrink-0 px-1 pt-1 md:px-[30px]">
        <div className="flex items-start justify-between">
          <div className="flex w-1/2 flex-col md:pl-5">
            <span className="font-nunito text-sm font-semibold text-primary md:text-lg">
              Convites gestor
            </span>
            <span className="text-sm font-normal text-tertiary md:text-[22px]">
              Convites pendentes e histórico da empresa
            </span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg bg-primary px-[30px] font-exo text-sm font-semibold text-info transition-colors hover:bg-primary/90"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] flex-shrink-0 border-t-2 border-primary/70" />

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-3 md:py-4">
        <ConvitesGestaoList
          convites={convites}
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
