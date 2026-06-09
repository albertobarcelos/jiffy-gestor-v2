'use client'

import { useState } from 'react'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { CardGearMenu } from '@/src/presentation/components/ui/CardGearMenu'
import { cn } from '@/src/shared/utils/cn'
import type { ConvitePendente } from '../types'

function formatarDataHora(expiraEm: string): string {
  const d = new Date(expiraEm)
  if (Number.isNaN(d.getTime())) return expiraEm
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Linha de convite no modo lista — alinhada à grade de `EmpresaListRow` (MeusAppsFeedList).
 */
export function ConviteListRow({
  convite,
  onAceitar,
  onRecusar,
  loadingAction,
}: {
  convite: ConvitePendente
  onAceitar: (id: string) => void
  onRecusar: (id: string) => void
  loadingAction?: 'aceitar' | 'recusar' | null
}) {
  const isLoading = loadingAction != null
  const [confirmRecusarAberto, setConfirmRecusarAberto] = useState(false)

  /** Abre o mesmo modal de confirmação usado no ConviteCard (recusar só após “Continuar”). */
  const handleAbrirConfirmacaoRecusar = () => {
    setConfirmRecusarAberto(true)
  }

  const handleConfirmarRecusar = () => {
    setConfirmRecusarAberto(false)
    onRecusar(convite.id)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{convite.nomeEmpresa}</p>
          <p className="truncate text-xs font-medium text-gray-500">{convite.email}</p>
          <p className="mt-0.5 truncate text-xs text-gray-600">
            Expira em <span className="font-semibold">{formatarDataHora(convite.expiraEm)}</span>
          </p>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAceitar(convite.id)}
            className={cn(
              'inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg border-0 px-4 py-0 text-sm font-semibold leading-none text-white transition sm:w-[140px] sm:flex-none',
              isLoading && loadingAction !== 'aceitar'
                ? 'cursor-not-allowed bg-gray-400'
                : loadingAction === 'aceitar'
                  ? 'cursor-wait bg-gray-400'
                  : 'bg-secondary hover:bg-alternate'
            )}
          >
            {loadingAction === 'aceitar' ? 'Aceitando…' : 'Aceitar'}
          </button>
          <CardGearMenu
            disabled={isLoading}
            triggerAriaLabel="Opções do convite"
            triggerTitle="Opções do convite"
            items={[
              {
                id: 'recusar',
                label: loadingAction === 'recusar' ? 'Recusando…' : 'Recusar',
                onClick: handleAbrirConfirmacaoRecusar,
                disabled: isLoading,
                tone: 'danger',
              },
            ]}
            triggerClassName="h-10 w-10 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          />
        </div>
      </div>

      <JiffyConfirmDialog
        open={confirmRecusarAberto}
        onOpenChange={setConfirmRecusarAberto}
        title="Recusar convite?"
        description={
          <>
            O convite para <strong>{convite.nomeEmpresa}</strong> será recusado e não poderá ser aceito
            depois. Deseja continuar?
          </>
        }
        cancelLabel="Cancelar"
        confirmLabel="Continuar"
        onConfirm={handleConfirmarRecusar}
        busy={loadingAction === 'recusar'}
        confirmDisabled={isLoading}
        titleSx={{ color: 'var(--color-alternate)' }}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
      />
    </div>
  )
}
