'use client'

import { useState } from 'react'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import type { PerfilGestorOption } from '../hooks/useConvitesGestao'
import { cn } from '@/src/shared/utils/cn'
import { MdForwardToInbox, MdHighlightOff, MdClose, MdEdit } from 'react-icons/md'
import { ActionDropdown } from './ActionDropdown'

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

  const bg =
    u === 'PENDENTE'
      ? 'bg-amber-500'
      : u === 'ACEITO' || u === 'ACCEPTED'
        ? 'bg-emerald-600'
        : u === 'CANCELADO'
          ? 'bg-gray-500'
          : u === 'EXPIRADO'
            ? 'bg-red-400'
            : 'bg-slate-500'

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded px-2.5 py-0.5 font-nunito text-xs font-normal text-white',
        bg
      )}
      title={status}
    >
      {label}
    </span>
  )
}

function PerfilRadioList({
  perfisList,
  currentPerfilId,
  onSelect,
  close,
}: {
  perfisList: PerfilGestorOption[]
  currentPerfilId: string
  onSelect: (id: string) => void
  close: () => void
}) {
  return (
    <div className="max-h-48 overflow-y-auto py-1">
      {perfisList.map(p => {
        const selected = p.id === currentPerfilId
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onSelect(p.id)
              close()
            }}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50',
              selected && 'bg-gray-50'
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                selected
                  ? 'border-secondary bg-secondary'
                  : 'border-gray-300 bg-white'
              )}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="truncate font-nunito text-sm text-primary-text">
              {p.role}
            </span>
          </button>
        )
      })}
    </div>
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
  onEditarGrupos,
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
  onEditarGrupos?: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const pendente = convite.status.toUpperCase() === 'PENDENTE'
  const aceito = convite.status.toUpperCase() === 'ACEITO' || convite.status.toUpperCase() === 'ACCEPTED'
  const bloqueado = busyAction !== null

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

  const actionItem = 'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors'

  const grupoCell = (() => {
    if (aceito && perfisList && perfisList.length > 0) {
      return (
        <ActionDropdown label={perfisList.find(p => p.id === convite.perfilGestorId)?.role ?? perfilNome} disabled={updating || removendo}>
          {(close) => (
            <>
              <PerfilRadioList
                perfisList={perfisList}
                currentPerfilId={convite.perfilGestorId}
                onSelect={id => void handlePerfilSelect(id)}
                close={close}
              />
              <div className="border-t border-gray-200">
                {onRemoverVinculo && (
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      void handleRemoverVinculo()
                    }}
                    className={cn(actionItem, 'text-red-600 hover:bg-red-50')}
                  >
                    <MdClose size={16} className="shrink-0" />
                    <span className="font-nunito">
                      Cancelar o acesso de{' '}
                      <span className="font-semibold">{nomeUsuario ?? 'usuário'}</span>
                    </span>
                  </button>
                )}
                {onEditarGrupos && (
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      onEditarGrupos()
                    }}
                    className={cn(actionItem, 'justify-center border-t border-gray-200 text-primary-text hover:bg-gray-50')}
                  >
                    <MdEdit size={14} className="shrink-0" />
                    <span className="font-nunito">Editar Perfis</span>
                  </button>
                )}
              </div>
            </>
          )}
        </ActionDropdown>
      )
    }

    if (pendente) {
      return (
        <ActionDropdown label={perfilNome} disabled={bloqueado}>
          {(close) => (
            <div className="py-1">
              <button
                type="button"
                disabled={bloqueado || busyAction === 'reenviar'}
                onClick={() => {
                  close()
                  onReenviar(convite.id)
                }}
                className={cn(
                  actionItem,
                  'text-primary hover:bg-primary/10 disabled:opacity-40'
                )}
              >
                <MdForwardToInbox size={18} className="shrink-0" />
                <span className="font-nunito">Reenviar convite</span>
              </button>
              <button
                type="button"
                disabled={bloqueado || busyAction === 'cancelar'}
                onClick={() => {
                  close()
                  onCancelar(convite.id)
                }}
                className={cn(
                  actionItem,
                  'text-red-600 hover:bg-red-50 disabled:opacity-40'
                )}
              >
                <MdHighlightOff size={18} className="shrink-0" />
                <span className="font-nunito">Cancelar convite</span>
              </button>
              {onEditarGrupos && (
                <button
                  type="button"
                  onClick={() => {
                    close()
                    onEditarGrupos()
                  }}
                  className={cn(actionItem, 'justify-center border-t border-gray-200 text-primary-text hover:bg-gray-50')}
                >
                  <MdEdit size={14} className="shrink-0" />
                  <span className="font-nunito">Editar Perfis</span>
                </button>
              )}
            </div>
          )}
        </ActionDropdown>
      )
    }

    return (
      <span className="inline-flex w-full items-center justify-center rounded bg-secondary px-2.5 py-1 font-nunito text-xs font-normal text-white md:text-sm" title={perfilNome}>
        {perfilNome}
      </span>
    )
  })()

  return (
    <div className="overflow-visible transition-colors hover:bg-gray-50/80">
      {/* Desktop — grid: email | status | grupo */}
      <div className="relative hidden min-h-[52px] w-full min-w-0 grid-cols-[minmax(180px,280px)_80px_160px] items-center gap-[10px] px-3 py-2 md:grid md:px-4">
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
        <div className="flex min-w-0 justify-start">
          <StatusBadge status={convite.status} />
        </div>
        <div className="flex min-w-0 items-center justify-start font-nunito text-sm text-primary-text">
          {grupoCell}
        </div>
      </div>

      {/* Mobile */}
      <div className="p-4 md:hidden">
        <div className="min-w-0">
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
            <div className="min-w-[120px] max-w-[180px]">
              {grupoCell}
            </div>
          </div>
          {pendente && (
            <p className="mt-1 font-nunito text-xs text-secondary-text">
              Expira: {formatarDataHora(convite.expiraEm)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
