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

export function ConviteGestaoRow({
  convite,
  index,
  busyAction,
  onCancelar,
  onReenviar,
}: {
  convite: ConviteGestaoDTO
  index: number
  busyAction: 'cancelar' | 'reenviar' | null
  onCancelar: (id: string) => void
  onReenviar: (id: string) => void
}) {
  const pendente = convite.status === 'PENDENTE'
  const bloqueado = busyAction !== null

  const podeAgir = pendente && !bloqueado

  const iconBtn =
    'tooltip-hover-below tooltip-hover-below-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  const isZebraEven = index % 2 === 0
  const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

  return (
    <div
      className={cn(
        bgClass,
        'rounded-lg my-2 overflow-visible transition-colors hover:bg-primary/10'
      )}
    >
      {/* Desktop — mesma grade CSS do cabeçalho (minmax 0 evita overflow horizontal) */}
      <div className="relative hidden min-h-[50px] w-full min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,1.35fr)_5rem] items-center gap-[10px] px-2 py-1 md:grid md:px-4">
        <div className="min-w-0 font-nunito text-left text-sm text-primary-text">
          <span className="block truncate" title={convite.email}>
            {convite.email}
          </span>
        </div>
        <div className="min-w-0 text-center font-nunito text-xs text-primary-text md:text-sm">
          <span className="block truncate font-semibold" title={convite.status}>
            {convite.status}
          </span>
        </div>
        <div className="min-w-0 text-center font-nunito text-xs text-secondary-text md:text-sm">
          <span className="block truncate">{convite.emailEnviado ? 'Sim' : 'Não'}</span>
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
      <div className="md:hidden p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-nunito text-sm font-semibold text-primary-text break-all">
              {convite.email}
            </p>
            <p className="mt-1 font-nunito text-xs text-secondary-text">
              Status:{' '}
              <span className="font-semibold text-primary-text">{convite.status}</span>
              {' · '}
              E-mail enviado: {convite.emailEnviado ? 'Sim' : 'Não'}
            </p>
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
