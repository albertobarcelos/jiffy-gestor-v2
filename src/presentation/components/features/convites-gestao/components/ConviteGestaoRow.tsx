'use client'

import { useState } from 'react'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import type { PerfilGestorOption } from '../hooks/useConvitesGestao'
import { cn } from '@/src/shared/utils/cn'
import { MdForwardToInbox, MdHighlightOff, MdPersonRemove } from 'react-icons/md'

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
  nomeUsuario,
  perfilNome,
  perfisList,
  busyAction,
  onCancelar,
  onReenviar,
  onPerfilChange,
  onRemoverVinculo,
}: {
  convite: ConviteGestaoDTO
  nomeUsuario: string | null
  perfilNome: string
  perfisList: PerfilGestorOption[] | null
  busyAction: 'cancelar' | 'reenviar' | null
  onCancelar: (id: string) => void
  onReenviar: (id: string) => void
  onPerfilChange?: (email: string, novoPerfilGestorId: string) => void
  onRemoverVinculo?: (email: string) => void
}) {
  const [updating, setUpdating] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const pendente = convite.status.toUpperCase() === 'PENDENTE'
  const aceito = convite.status.toUpperCase() === 'ACEITO' || convite.status.toUpperCase() === 'ACCEPTED'
  const bloqueado = busyAction !== null

  const podeAgir = pendente && !bloqueado

  const iconBtn =
    'tooltip-hover-above flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  const handlePerfilSelect = async (novoPerfilId: string) => {
    if (!onPerfilChange || novoPerfilId === convite.perfilGestorId) return
    setUpdating(true)
    try {
      await onPerfilChange(convite.email, novoPerfilId)
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoverVinculo = async () => {
    if (!onRemoverVinculo) return
    setRemovendo(true)
    try {
      await onRemoverVinculo(convite.email)
    } finally {
      setRemovendo(false)
    }
  }

  const perfilCell = perfisList && perfisList.length > 0 ? (
    <select
      value={convite.perfilGestorId}
      disabled={updating}
      onChange={e => void handlePerfilSelect(e.target.value)}
      className={cn(
        'w-full max-w-[140px] truncate rounded border border-gray-200 bg-white px-2 py-1 font-nunito text-xs text-primary-text focus:border-primary focus:outline-none md:text-sm',
        updating && 'opacity-50'
      )}
    >
      {perfisList.map(p => (
        <option key={p.id} value={p.id}>
          {p.role}
        </option>
      ))}
    </select>
  ) : (
    <span className="block truncate font-medium" title={perfilNome}>
      {perfilNome}
    </span>
  )

  return (
    <div className="overflow-visible transition-colors hover:bg-gray-50/80">
      {/* Desktop — grid: email | status | perfil | acoes */}
      <div className="relative hidden min-h-[52px] w-full min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.5fr)_5rem] items-center gap-[10px] px-3 py-2 md:grid md:px-4">
        <div className="min-w-0 font-nunito text-left text-sm text-primary-text">
          {nomeUsuario ? (
            <>
              <span className="block truncate font-medium" title={nomeUsuario}>
                {nomeUsuario}
              </span>
              <span className="block truncate text-xs text-secondary-text" title={convite.email}>
                {convite.email}
              </span>
            </>
          ) : (
            <span className="block truncate font-normal" title={convite.email}>
              {convite.email}
            </span>
          )}
          {pendente && (
            <span className="block truncate text-xs text-secondary-text">
              Expira: {formatarDataHora(convite.expiraEm)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 justify-center">
          <StatusBadge status={convite.status} />
        </div>
        <div className="flex min-w-0 items-center justify-center font-nunito text-sm text-primary-text">
          {perfilCell}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-0.5">
          {pendente && (
            <>
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
                data-tooltip={busyAction === 'reenviar' ? 'Reenviando...' : 'Reenviar convite'}
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
                data-tooltip={busyAction === 'cancelar' ? 'Cancelando...' : 'Cancelar convite'}
                aria-label="Cancelar convite"
              >
                <MdHighlightOff size={22} className={busyAction === 'cancelar' ? 'animate-pulse' : ''} />
              </button>
            </>
          )}
          {aceito && onRemoverVinculo && (
            <button
              type="button"
              disabled={removendo}
              onClick={() => void handleRemoverVinculo()}
              className={cn(
                iconBtn,
                !removendo
                  ? 'text-orange-600 hover:bg-orange-50'
                  : ''
              )}
              data-tooltip={removendo ? 'Removendo...' : 'Remover vínculo'}
              aria-label="Remover vínculo"
            >
              <MdPersonRemove size={20} className={removendo ? 'animate-pulse' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="p-4 md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {nomeUsuario ? (
              <>
                <p className="font-nunito text-sm font-medium text-primary-text">
                  {nomeUsuario}
                </p>
                <p className="font-nunito text-xs text-secondary-text break-all">
                  {convite.email}
                </p>
              </>
            ) : (
              <p className="font-nunito text-sm font-normal text-primary-text break-all">
                {convite.email}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={convite.status} />
              {perfisList && perfisList.length > 0 ? (
                <select
                  value={convite.perfilGestorId}
                  disabled={updating}
                  onChange={e => void handlePerfilSelect(e.target.value)}
                  className={cn(
                    'rounded border border-gray-200 bg-white px-2 py-0.5 font-nunito text-xs text-primary-text focus:border-primary focus:outline-none',
                    updating && 'opacity-50'
                  )}
                >
                  {perfisList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.role}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-nunito text-xs text-secondary-text">
                  Perfil: <span className="font-semibold text-primary-text">{perfilNome}</span>
                </span>
              )}
            </div>
            {pendente && (
              <p className="mt-1 font-nunito text-xs text-secondary-text">
                Expira: {formatarDataHora(convite.expiraEm)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
            {pendente && (
              <>
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
              </>
            )}
            {aceito && onRemoverVinculo && (
              <button
                type="button"
                disabled={removendo}
                onClick={() => void handleRemoverVinculo()}
                className={cn(
                  iconBtn,
                  !removendo
                    ? 'text-orange-600 hover:bg-orange-50'
                    : ''
                )}
                data-tooltip={removendo ? 'Removendo...' : 'Remover vínculo'}
                aria-label="Remover vínculo"
              >
                <MdPersonRemove size={22} className={removendo ? 'animate-pulse' : ''} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
