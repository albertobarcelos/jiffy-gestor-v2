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

/** Pill no mesmo padrão visual de StatusPill (lista de empresas). */
function ConvitePendentePill() {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 ring-1 ring-amber-100">
      Convite pendente
    </span>
  )
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
      <div className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[1fr_140px_auto] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{convite.nomeEmpresa}</p>
          <p className="truncate text-xs font-medium text-gray-500">{convite.email}</p>
          <p className="mt-0.5 truncate text-xs text-gray-600">
            Expira em <span className="font-semibold">{formatarDataHora(convite.expiraEm)}</span>
          </p>
        </div>
        <div className="sm:flex sm:justify-center">
          <ConvitePendentePill />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
          <CardGearMenu
            disabled={isLoading}
            triggerAriaLabel="Opções do convite"
            triggerTitle="Opções do convite"
            triggerClassName="self-end sm:self-auto"
            items={[
              {
                id: 'recusar',
                label: loadingAction === 'recusar' ? 'Recusando…' : 'Recusar',
                onClick: handleAbrirConfirmacaoRecusar,
                disabled: isLoading,
                tone: 'danger',
              },
            ]}
          />
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAceitar(convite.id)}
            className={cn(
              // Paridade com Acessar em EmpresaListRow (MeusAppsFeedList): mesma altura, padding e largura em sm+
              'inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border-0 px-4 py-0 text-sm font-semibold leading-none text-white transition sm:w-[140px]',
              isLoading && loadingAction !== 'aceitar'
                ? 'cursor-not-allowed bg-gray-400'
                : loadingAction === 'aceitar'
                  ? 'cursor-wait bg-gray-400'
                  : 'bg-secondary hover:bg-alternate'
            )}
          >
            {loadingAction === 'aceitar' ? 'Aceitando…' : 'Aceitar'}
          </button>
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
