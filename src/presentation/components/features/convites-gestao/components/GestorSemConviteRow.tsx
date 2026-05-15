'use client'

import { useState } from 'react'
import type { PerfilGestorOption } from '../services/convitesGestaoService'
import type { UsuarioGestorListaItem } from '../services/convitesGestaoService'
import { cn } from '@/src/shared/utils/cn'
import { MdClose, MdEdit } from 'react-icons/md'
import { ActionDropdown } from './ActionDropdown'

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
                selected ? 'border-secondary bg-secondary' : 'border-gray-300 bg-white'
              )}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="truncate font-nunito text-sm text-primary-text">{p.role}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Linha para gestor cadastrado sem convite associado (mesmo fluxo de perfil / remover vínculo). */
export function GestorSemConviteRow({
  gestor,
  perfisList,
  perfilGestorNomePorId,
  busyAction,
  onPerfilChange,
  onRemoverVinculo,
  onEditarGrupos,
}: {
  gestor: UsuarioGestorListaItem
  perfisList: PerfilGestorOption[]
  perfilGestorNomePorId: Record<string, string>
  busyAction: 'cancelar' | 'reenviar' | null
  onPerfilChange: (email: string, novoPerfilGestorId: string) => void
  onRemoverVinculo: (email: string) => void
  onEditarGrupos?: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const email = gestor.username
  const bloqueado = busyAction !== null
  const perfilNome =
    perfilGestorNomePorId[gestor.perfilGestorId] ?? gestor.perfilGestorName ?? '—'

  const handlePerfilSelect = async (novoPerfilId: string) => {
    if (novoPerfilId === gestor.perfilGestorId) return
    setUpdating(true)
    try {
      await onPerfilChange(email, novoPerfilId)
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoverVinculo = async () => {
    setRemovendo(true)
    try {
      await onRemoverVinculo(email)
    } finally {
      setRemovendo(false)
    }
  }

  const actionItem = 'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors'

  const grupoCell =
    perfisList.length > 0 ? (
      <ActionDropdown
        label={perfisList.find(p => p.id === gestor.perfilGestorId)?.role ?? perfilNome}
        disabled={bloqueado || updating || removendo}
      >
        {close => (
          <>
            <PerfilRadioList
              perfisList={perfisList}
              currentPerfilId={gestor.perfilGestorId}
              onSelect={id => void handlePerfilSelect(id)}
              close={close}
            />
            <div className="border-t border-gray-200">
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
                  <span className="font-semibold">{gestor.nome || 'usuário'}</span>
                </span>
              </button>
              {onEditarGrupos && (
                <button
                  type="button"
                  onClick={() => {
                    close()
                    onEditarGrupos()
                  }}
                  className={cn(
                    actionItem,
                    'justify-center border-t border-gray-200 text-primary-text hover:bg-gray-50'
                  )}
                >
                  <MdEdit size={14} className="shrink-0" />
                  <span className="font-nunito">Editar Perfis</span>
                </button>
              )}
            </div>
          </>
        )}
      </ActionDropdown>
    ) : (
      <span
        className="inline-flex w-full items-center justify-center rounded bg-secondary px-2.5 py-1 font-nunito text-xs font-normal text-white md:text-sm"
        title={perfilNome}
      >
        {perfilNome}
      </span>
    )

  return (
    <div className="overflow-visible transition-colors hover:bg-gray-50/80">
      <div className="relative hidden min-h-[52px] w-full min-w-0 grid-cols-[minmax(180px,280px)_80px_160px] items-center gap-[10px] px-3 py-2 md:grid md:px-4">
        <div className="min-w-0 font-nunito text-left text-sm text-primary-text">
          {gestor.nome ? (
            <>
              <span className="block truncate font-medium" title={gestor.nome}>
                {gestor.nome}
              </span>
              <span className="block truncate text-xs text-secondary-text" title={email}>
                {email}
              </span>
            </>
          ) : (
            <span className="block truncate font-normal" title={email}>
              {email}
            </span>
          )}
          <span className="block truncate text-xs text-secondary-text">Gestor (sem convite)</span>
        </div>
        <div className="flex min-w-0 justify-start">
          <span
            className="inline-flex items-center justify-center rounded bg-sky-600 px-2.5 py-0.5 font-nunito text-xs font-normal text-white"
            title="Usuário gestor ativo na empresa"
          >
            Ativo
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-start font-nunito text-sm text-primary-text">
          {grupoCell}
        </div>
      </div>

      <div className="p-4 md:hidden">
        <div className="min-w-0">
          {gestor.nome ? (
            <>
              <p className="font-nunito text-sm font-medium text-primary-text">{gestor.nome}</p>
              <p className="font-nunito text-xs text-secondary-text break-all">{email}</p>
            </>
          ) : (
            <p className="font-nunito text-sm font-normal text-primary-text break-all">{email}</p>
          )}
          <p className="mt-1 font-nunito text-xs text-secondary-text">Gestor (sem convite)</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center justify-center rounded bg-sky-600 px-2.5 py-0.5 font-nunito text-xs font-normal text-white">
              Ativo
            </span>
            <div className="min-w-[120px] max-w-[180px]">{grupoCell}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
