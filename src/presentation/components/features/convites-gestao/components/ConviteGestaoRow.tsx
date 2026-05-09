'use client'

import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import { cn } from '@/src/shared/utils/cn'
import { MdForwardToInbox, MdHighlightOff } from 'react-icons/md'

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const raw = status.trim()
  const u = raw.toUpperCase()
  let label = raw
  if (u === 'PENDENTE') label = 'Pendente'
  else if (u === 'ACEITO' || u === 'ACCEPTED') label = 'Aceito'
  else if (u === 'CANCELADO') label = 'Cancelado'
  else if (u === 'EXPIRADO') label = 'Expirado'

  const tone =
    u === 'PENDENTE'
      ? 'text-amber-700'
      : u === 'ACEITO' || u === 'ACCEPTED'
        ? 'text-emerald-700'
        : u === 'CANCELADO' || u === 'EXPIRADO'
          ? 'text-gray-600'
          : 'text-slate-700'

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center font-nunito text-xs font-semibold tabular-nums',
        tone
      )}
      title={status}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}

export function ConviteGestaoRow({
  convite,
  perfilNome,
  busyAction,
  onCancelar,
  onReenviar,
}: {
  convite: ConviteGestaoDTO
  perfilNome: string
  busyAction: 'cancelar' | 'reenviar' | null
  onCancelar: (id: string) => void
  onReenviar: (id: string) => void
}) {
  const pendente = convite.status === 'PENDENTE'
  const bloqueado = busyAction !== null

  const podeAgir = pendente && !bloqueado

  const iconBtn =
    'tooltip-hover-below tooltip-hover-below-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="overflow-visible transition-colors hover:bg-gray-50/80">
      {/* Desktop — mesma grade CSS do cabeçalho (minmax 0 evita overflow horizontal) */}
      <div className="relative hidden min-h-[52px] w-full min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_5rem] items-center gap-[10px] px-3 py-2 md:grid md:px-4">
        <div className="min-w-0 font-nunito text-left text-sm text-primary-text">
          <span className="block truncate font-normal" title={convite.email}>
            {convite.email}
          </span>
        </div>
        <div className="flex min-w-0 justify-center">
          <StatusBadge status={convite.status} />
        </div>
        <div className="min-w-0 text-center font-nunito text-sm text-primary-text">
          <span className="block truncate font-medium" title={perfilNome}>
            {perfilNome}
          </span>
        </div>
        <div className="min-w-0 text-center font-nunito text-xs text-secondary-text tabular-nums md:text-sm">
          <span className="block truncate" title={formatarDataHora(convite.expiraEm)}>
            {formatarDataHora(convite.expiraEm)}
          </span>
        </div>
        <div className="min-w-0 text-center font-nunito text-xs text-secondary-text tabular-nums md:text-sm">
          <span className="block truncate" title={formatarDataHora(convite.dataCriacao)}>
            {formatarDataHora(convite.dataCriacao)}
          </span>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-0.5">
          <button
            type="button"
            disabled={!podeAgir || busyAction === 'reenviar'}
            onClick={() => onReenviar(convite.id)}
            className={cn(
              iconBtn,
              podeAgir && busyAction !== 'reenviar'
                ? 'text-primary hover:bg-primary/20'
                : ''
            )}
            data-tooltip={
              busyAction === 'reenviar'
                ? 'Reenviando…'
                : pendente
                  ? 'Reenviar convite'
                  : 'Somente convites pendentes'
            }
            aria-label="Reenviar convite"
          >
            <MdForwardToInbox size={20} className={busyAction === 'reenviar' ? 'animate-pulse' : ''} />
          </button>
          <button
            type="button"
            disabled={!podeAgir || busyAction === 'cancelar'}
            onClick={() => onCancelar(convite.id)}
            className={cn(
              iconBtn,
              podeAgir && busyAction !== 'cancelar'
                ? 'text-red-600 hover:bg-red-50'
                : ''
            )}
            data-tooltip={
              busyAction === 'cancelar'
                ? 'Cancelando…'
                : pendente
                  ? 'Cancelar convite'
                  : 'Somente convites pendentes'
            }
            aria-label="Cancelar convite"
          >
            <MdHighlightOff size={22} className={busyAction === 'cancelar' ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-nunito text-sm font-normal text-primary-text break-all">
              {convite.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={convite.status} />
              <span className="font-nunito text-xs text-secondary-text">
                Perfil: <span className="font-semibold text-primary-text">{perfilNome}</span>
              </span>
            </div>
            <p className="mt-1 font-nunito text-xs text-secondary-text">
              Expira: {formatarDataHora(convite.expiraEm)}
            </p>
            <p className="font-nunito text-xs text-secondary-text">
              Criado: {formatarDataHora(convite.dataCriacao)}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              disabled={!podeAgir || busyAction === 'reenviar'}
              onClick={() => onReenviar(convite.id)}
              className={cn(
                iconBtn,
                podeAgir && busyAction !== 'reenviar'
                  ? 'text-primary hover:bg-primary/20'
                  : ''
              )}
              data-tooltip="Reenviar convite"
              aria-label="Reenviar convite"
            >
              <MdForwardToInbox size={22} />
            </button>
            <button
              type="button"
              disabled={!podeAgir || busyAction === 'cancelar'}
              onClick={() => onCancelar(convite.id)}
              className={cn(
                iconBtn,
                podeAgir && busyAction !== 'cancelar'
                  ? 'text-red-600 hover:bg-red-50'
                  : ''
              )}
              data-tooltip="Cancelar convite"
              aria-label="Cancelar convite"
            >
              <MdHighlightOff size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
