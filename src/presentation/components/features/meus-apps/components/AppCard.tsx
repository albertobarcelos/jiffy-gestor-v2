'use client'

import { useRef } from 'react'
import { Heart } from 'lucide-react'
import { CardGearMenu } from '@/src/presentation/components/ui/CardGearMenu'
import { cn } from '@/src/shared/utils/cn'
import type { MeusApp } from '../types'
import { buildEmpresaCardGearItems } from '../utils/buildEmpresaCardGearItems'

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
  onGerenciarPerfisGestor,
  isSelecting = false,
  actionsLocked = false,
}: {
  app: MeusApp
  onAcessar: (appId: string) => void
  onGerenciarConvites?: (appId: string) => void
  onGerenciarPerfisGestor?: (appId: string) => void
  isSelecting?: boolean
  actionsLocked?: boolean
}) {
  const bloqueado = app.status === 'inativo'
  const interactionDisabled = bloqueado || actionsLocked || isSelecting
  const buttonEmLoading = isSelecting

  const gearItems = buildEmpresaCardGearItems(app.id, {
    navDisabled: interactionDisabled,
    onGerenciarConvites,
    onGerenciarPerfisGestor,
  })

  /** Evita clique fantasma no card após usar o menu (item, backdrop ou Escape — menu em portal). */
  const ignorarAcessarAteRef = useRef(0)

  const evitarAcessoCardPorInteracaoMenu = () => {
    ignorarAcessarAteRef.current = Date.now() + 600
  }

  const tentarAcessarPeloCard = () => {
    if (interactionDisabled) return
    if (Date.now() < ignorarAcessarAteRef.current) return
    onAcessar(app.id)
  }

  return (
    <div
      role="button"
      tabIndex={interactionDisabled ? -1 : 0}
      onClick={() => {
        tentarAcessarPeloCard()
      }}
      onKeyDown={e => {
        if (interactionDisabled) {
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          if (Date.now() < ignorarAcessarAteRef.current) return
          onAcessar(app.id)
        }
      }}
      className={cn(
        'flex h-52 flex-col rounded-2xl border bg-white px-2 py-2 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30',
        bloqueado ? 'border-gray-200' : 'border-secondary/40',
        bloqueado
          ? 'cursor-not-allowed opacity-75'
          : interactionDisabled
            ? 'cursor-default'
            : 'cursor-pointer hover:shadow-md'
      )}
      aria-busy={isSelecting}
      aria-disabled={interactionDisabled}
      aria-label={
        bloqueado
          ? `${app.nome} (bloqueado)`
          : isSelecting
            ? `Abrindo ${app.nome}`
            : `Acessar empresa ${app.nome}`
      }
    >
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
                  disabled={interactionDisabled}
                  triggerAriaLabel="Opções do aplicativo"
                  triggerTitle="Opções do aplicativo"
                  items={gearItems}
                  onBeforeMenuItemAction={evitarAcessoCardPorInteracaoMenu}
                  onMenuClose={evitarAcessoCardPorInteracaoMenu}
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
            disabled={interactionDisabled}
            onClick={e => {
              e.stopPropagation()
              if (!interactionDisabled) {
                onAcessar(app.id)
              }
            }}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center rounded-lg px-2 text-sm font-medium text-white transition disabled:opacity-100',
              bloqueado || buttonEmLoading
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-secondary hover:bg-alternate'
            )}
          >
            {bloqueado ? 'Empresa Bloqueada' : isSelecting ? 'Abrindo…' : 'Acessar Empresa'}
          </button>
        </div>
      </div>
    </div>
  )
}

