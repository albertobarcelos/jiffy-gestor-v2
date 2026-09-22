'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { MdCheck, MdCheckCircle, MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from './deliveryHubProgresso'
import {
  montarPassosLojaHub,
  montarPassosOperacaoHub,
  type DeliveryHubPassoUi,
} from './deliveryHubPassosUi'
import type { DeliveryHubPassosExtras } from './deliveryHubCadastros'

type DeliveryHubHomeProps = {
  progresso: DeliveryHubProgresso
  passosExtras?: DeliveryHubPassosExtras
  activeEtapaId: DeliveryEtapaId | null
  onAbrirEtapa: (etapaId: DeliveryEtapaId) => void
  panel: ReactNode
}

function MenuItemButton({
  passo,
  active,
  collapsed,
  onClick,
}: {
  passo: DeliveryHubPassoUi
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? passo.titulo : undefined}
      aria-label={passo.titulo}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center rounded-lg text-left text-sm transition-colors',
        collapsed
          ? 'mx-auto h-9 w-9 justify-center'
          : 'w-full gap-1.5 px-2 py-2',
        active
          ? 'bg-primary/10 font-semibold text-primary'
          : 'text-primary-text hover:bg-primary/5 hover:text-primary'
      )}
    >
      <passo.Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-secondary')}
        aria-hidden
      />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">{passo.titulo}</span>
          {passo.concluido ? (
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500"
              aria-label="Concluído"
            >
              <MdCheck className="h-2.5 w-2.5 text-white" aria-hidden />
            </span>
          ) : passo.obrigatoria ? (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              !
            </span>
          ) : null}
        </>
      ) : passo.concluido ? (
        <span
          className="absolute right-0.5 top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500"
          aria-hidden
        >
          <MdCheck className="h-1.5 w-1.5 text-white" />
        </span>
      ) : null}
    </button>
  )
}

function MenuGroup({
  title,
  passos,
  activeEtapaId,
  collapsed,
  onAbrirEtapa,
}: {
  title: string
  passos: DeliveryHubPassoUi[]
  activeEtapaId: DeliveryEtapaId | null
  collapsed: boolean
  onAbrirEtapa: (etapaId: DeliveryEtapaId) => void
}) {
  return (
    <div className={cn(collapsed ? 'mb-2' : 'mb-4')}>
      {!collapsed ? (
        <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-secondary-text">
          {title}
        </p>
      ) : null}
      <nav
        className={cn('flex flex-col', collapsed ? 'items-center gap-1' : 'gap-0.5')}
        aria-label={title}
      >
        {passos.map(passo => (
          <MenuItemButton
            key={passo.id}
            passo={passo}
            active={activeEtapaId === passo.etapaId}
            collapsed={collapsed}
            onClick={() => onAbrirEtapa(passo.etapaId)}
          />
        ))}
      </nav>
    </div>
  )
}

function HubOverview({ progresso }: { progresso: DeliveryHubProgresso }) {
  const pronto =
    progresso.totalObrigatorios > 0 &&
    progresso.concluidosObrigatorios === progresso.totalObrigatorios

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="mb-6 max-w-lg">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-text">
          {pronto ? (
            <MdCheckCircle className="h-5 w-5 text-emerald-500" />
          ) : (
            <span className="h-5 w-5 rounded-full border-2 border-amber-400" />
          )}
          <span>
            {pronto ? 'Seu delivery está pronto' : 'Falta concluir etapas obrigatórias'}
          </span>
        </div>
        <p className="mt-1 text-xs text-secondary-text">
          {progresso.concluidosObrigatorios} de {progresso.totalObrigatorios} configurações
          obrigatórias concluídas
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progresso.porcentagemObrigatorias}%` }}
          />
        </div>
      </div>
      <p className="max-w-md text-sm text-secondary-text">
        Escolha uma opção no menu à esquerda para configurar. O conteúdo abre neste painel.
      </p>
    </div>
  )
}

/**
 * Shell Configurações Delivery: menu esquerdo + painel direito (sem TabBar do hub).
 */
export function DeliveryHubHome({
  progresso,
  passosExtras,
  activeEtapaId,
  onAbrirEtapa,
  panel,
}: DeliveryHubHomeProps) {
  const [menuCollapsed, setMenuCollapsed] = useState(false)
  const loja = useMemo(
    () => montarPassosLojaHub(progresso, passosExtras),
    [progresso, passosExtras]
  )
  const operacao = useMemo(
    () => montarPassosOperacaoHub(passosExtras),
    [passosExtras]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <aside
        className={cn(
          'relative shrink-0 overflow-y-auto border-b border-gray-200 bg-white transition-[width] duration-200 lg:border-b-0 lg:border-r',
          menuCollapsed
            ? 'p-2 lg:w-14'
            : 'p-2.5 pr-1 sm:p-3 sm:pr-1 lg:w-56 xl:w-60'
        )}
      >
        <div
          className={cn(
            'mb-3 flex items-center',
            menuCollapsed ? 'justify-center' : 'gap-0 pl-2'
          )}
        >
          {!menuCollapsed ? (
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-primary">
              Configurações Delivery
            </h1>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuCollapsed(prev => !prev)}
            title={menuCollapsed ? 'Expandir menu' : 'Ocultar menu'}
            aria-label={menuCollapsed ? 'Expandir menu' : 'Ocultar menu'}
            aria-expanded={!menuCollapsed}
            className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-primary/5 hover:text-primary"
          >
            {menuCollapsed ? (
              <MdChevronRight className="h-5 w-5" aria-hidden />
            ) : (
              <MdChevronLeft className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        <MenuGroup
          title="Loja"
          passos={loja}
          activeEtapaId={activeEtapaId}
          collapsed={menuCollapsed}
          onAbrirEtapa={onAbrirEtapa}
        />
        <MenuGroup
          title="Operações"
          passos={operacao}
          activeEtapaId={activeEtapaId}
          collapsed={menuCollapsed}
          onAbrirEtapa={onAbrirEtapa}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {panel ?? <HubOverview progresso={progresso} />}
      </div>
    </div>
  )
}
