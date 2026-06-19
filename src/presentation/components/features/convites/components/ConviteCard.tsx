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

/** Avatar circular igual ao AppCard (nome fantasia da empresa). */
function ConviteAvatar({ nome }: { nome: string }) {
  const fallback = nome.trim().slice(0, 2).toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
      <span className="text-xs font-bold text-gray-700">{fallback}</span>
    </div>
  )
}

/**
 * Card de convite pendente — mesmo shell visual do AppCard (Meus aplicativos).
 * Não exibe IDs; dados conforme GET /convites/me (nome empresa, e-mail, expiração).
 */
export function ConviteCard({
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

  /** Abre o modal de confirmação (recusar só após “Continuar”). */
  const handleAbrirConfirmacaoRecusar = () => {
    setConfirmRecusarAberto(true)
  }

  const handleConfirmarRecusar = () => {
    setConfirmRecusarAberto(false)
    onRecusar(convite.id)
  }

  return (
    <div className="flex h-52 flex-col rounded-2xl border border-secondary/40 px-4 py-2 shadow-sm">
      {/* Pai: justify-between — bloco de dados (scroll se precisar) + botão com mb-3 */}
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex min-h-9 w-full shrink-0 items-center justify-between gap-2">
              <div className="flex min-w-0 shrink items-center">
                {/* TODO: substituir por plano real quando o backend expuser o campo */}
                <span
                  className="truncate text-[11px] font-semibold leading-none text-secondary"
                  title="Jiffy Starter"
                >
                  Jiffy Starter
                </span>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-1">
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
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ConviteAvatar nome={convite.nomeEmpresa} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{convite.nomeEmpresa}</p>
                <p className="truncate text-xs font-medium text-gray-500">{convite.email}</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Expira em <span className="font-semibold">{formatarDataHora(convite.expiraEm)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAceitar(convite.id)}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center rounded-lg px-2 text-sm font-medium text-white transition',
              isLoading && loadingAction !== 'aceitar'
                ? 'cursor-not-allowed bg-gray-400'
                : loadingAction === 'aceitar'
                  ? 'cursor-wait bg-gray-400'
                  : 'bg-secondary hover:bg-alternate'
            )}
          >
            {loadingAction === 'aceitar' ? 'Aceitando…' : 'Aceitar Convite'}
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
