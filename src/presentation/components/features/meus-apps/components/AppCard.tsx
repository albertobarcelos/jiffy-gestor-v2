'use client'

import { useRef } from 'react'
import { Heart } from 'lucide-react'
import { CardGearMenu } from '@/src/presentation/components/ui/CardGearMenu'
import { cn } from '@/src/shared/utils/cn'
import type { MeusApp } from '../types'
import { buildEmpresaCardGearItems } from '../utils/buildEmpresaCardGearItems'

function StatusBadge({ status }: { status: MeusApp['status'] }) {
  const label = status === 'ativo' ? 'Ativo' : 'Inativo'
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold leading-none text-gray-700">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'ativo' ? 'bg-emerald-500' : 'bg-gray-400'
        )}
        aria-hidden
      />
      {label}
    </span>
  )
}

function AppAvatar({ nome, sigla }: { nome: string; sigla?: string }) {
  const fallback = (sigla?.trim() || nome.trim().slice(0, 2)).toUpperCase()
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
      <span className="text-xs font-bold text-gray-700">{fallback}</span>
    </div>
  )
}

export function AppCard({
  app,
  onAcessar,
  onGerenciarConvites,
  onGerenciarUsuariosGestor,
  isSelecting = false,
  actionsLocked = false,
}: {
  app: MeusApp
  onAcessar: (appId: string) => void
  /** Convites gestor (sessão empresa): mesma base que Acessar, abre rota de convites em nova aba */
  onGerenciarConvites?: (appId: string) => void
  /** Lista de usuários gestor no hub */
  onGerenciarUsuariosGestor?: (appId: string) => void
  /** Esta empresa está em POST escolher-empresa */
  isSelecting?: boolean
  /** Outra empresa está abrindo; bloqueia interação neste card */
  actionsLocked?: boolean
}) {
  const bloqueado = app.status === 'inativo'
  const navDisabled = bloqueado || actionsLocked || isSelecting

  const gearItems = buildEmpresaCardGearItems(app.id, {
    navDisabled,
    onGerenciarConvites,
    onGerenciarUsuariosGestor,
  })

  /** Evita que o clique no item do menu (portal) dispare o `onClick` do card e abra o dashboard junto. */
  const ignorarAcessarAteRef = useRef(0)

  const handleAntesMenuGear = () => {
    ignorarAcessarAteRef.current = Date.now() + 600
  }

  const tentarAcessarPeloCard = () => {
    if (navDisabled) return
    if (Date.now() < ignorarAcessarAteRef.current) return
    onAcessar(app.id)
  }

  return (
    <div
      role="button"
      tabIndex={navDisabled ? -1 : 0}
      onClick={() => {
        tentarAcessarPeloCard()
      }}
      onKeyDown={e => {
        if (navDisabled) {
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          if (Date.now() < ignorarAcessarAteRef.current) return
          onAcessar(app.id)
        }
      }}
      className={cn(
        'flex h-52 flex-col rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30',
        navDisabled
          ? 'cursor-not-allowed opacity-75'
          : 'cursor-pointer hover:shadow-md'
      )}
      aria-busy={isSelecting}
      aria-disabled={navDisabled}
      aria-label={
        bloqueado
          ? `${app.nome} (bloqueado)`
          : isSelecting
            ? `Abrindo ${app.nome}`
            : `Acessar ${app.nome}`
      }
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3">
            {/* Uma linha: status à esquerda; plano + ícones à direita, todos com centro vertical alinhado */}
            <div className="flex min-h-9 w-full shrink-0 items-center justify-between gap-2">
              <div className="flex shrink-0 items-center">
                <StatusBadge status={app.status} />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
                {/* TODO: substituir por plano real quando o backend expuser o campo */}
                <span
                  className="truncate text-[11px] font-semibold leading-none text-secondary"
                  title="Jiffy Starter"
                >
                  Jiffy Starter
                </span>
                <button
                  type="button"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Favoritar"
                  title="Favoritar"
                >
                  <Heart className="h-4 w-4" aria-hidden />
                </button>
                <CardGearMenu
                  disabled={navDisabled}
                  triggerAriaLabel="Opções do aplicativo"
                  triggerTitle="Opções do aplicativo"
                  items={gearItems}
                  onBeforeMenuItemAction={handleAntesMenuGear}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AppAvatar nome={app.nome} sigla={app.sigla} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{app.nome}</p>
                {app.tipo ? (
                  <p className="truncate text-xs font-medium text-gray-500">{app.tipo}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 shrink-0">
          <button
            type="button"
            disabled={navDisabled}
            onClick={e => {
              e.stopPropagation()
              if (!navDisabled) {
                onAcessar(app.id)
              }
            }}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition',
              navDisabled
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-secondary hover:bg-alternate'
            )}
          >
            {bloqueado ? 'Bloqueado' : isSelecting ? 'Abrindo…' : 'Acessar'}
          </button>
        </div>
      </div>
    </div>
  )
}

