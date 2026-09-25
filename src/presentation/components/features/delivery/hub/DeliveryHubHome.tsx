'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MdCheck, MdChevronLeft, MdChevronRight, MdExpandLess, MdExpandMore } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import {
  DESIGN_TABS,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import type { DesignTabId } from '@/src/presentation/components/features/delivery-publico/shared/types/deliveryPublicoDesignConfig'
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
  /** Seção ativa de Personalizar Loja (`?secao=`), ou null no lobby. */
  activeDesignSection?: DesignTabId | null
  onAbrirEtapa: (etapaId: DeliveryEtapaId) => void
  onAbrirDesignSecao?: (section: DesignTabId) => void
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

function DesignMenuItem({
  passo,
  activeEtapa,
  activeSection,
  collapsed,
  expanded,
  onToggleExpand,
  onAbrirLobby,
  onAbrirSecao,
}: {
  passo: DeliveryHubPassoUi
  activeEtapa: boolean
  activeSection: DesignTabId | null
  collapsed: boolean
  expanded: boolean
  onToggleExpand: () => void
  onAbrirLobby: () => void
  onAbrirSecao: (section: DesignTabId) => void
}) {
  const lobbyActive = activeEtapa && activeSection == null

  if (collapsed) {
    return (
      <MenuItemButton
        passo={passo}
        active={activeEtapa}
        collapsed
        onClick={onAbrirLobby}
      />
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={cn(
          'relative flex items-center rounded-lg text-sm transition-colors',
          lobbyActive
            ? 'bg-primary/10 font-semibold text-primary'
            : activeEtapa
              ? 'text-primary'
              : 'text-primary-text hover:bg-primary/5 hover:text-primary'
        )}
      >
        <button
          type="button"
          onClick={onAbrirLobby}
          aria-label={passo.titulo}
          aria-current={lobbyActive ? 'page' : undefined}
          className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 text-left"
        >
          <passo.Icon
            className={cn(
              'h-4 w-4 shrink-0',
              activeEtapa ? 'text-primary' : 'text-secondary'
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate font-medium">{passo.titulo}</span>
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onToggleExpand()
          }}
          title={expanded ? 'Ocultar seções' : 'Mostrar seções'}
          aria-label={expanded ? 'Ocultar seções' : 'Mostrar seções'}
          aria-expanded={expanded}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {expanded ? (
            <MdExpandLess className="h-4 w-4" aria-hidden />
          ) : (
            <MdExpandMore className="h-4 w-4" aria-hidden />
          )}
        </button>
        {passo.concluido ? (
          <span
            className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500"
            aria-label="Concluído"
          >
            <MdCheck className="h-2.5 w-2.5 text-white" aria-hidden />
          </span>
        ) : null}
      </div>

      {expanded ? (
        <ul className="ml-3 flex flex-col gap-0.5 border-l border-gray-200 pl-2" role="list">
          {DESIGN_TABS.map(tab => {
            const sectionActive = activeEtapa && activeSection === tab.id
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => onAbrirSecao(tab.id)}
                  aria-current={sectionActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                    sectionActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-secondary-text hover:bg-primary/5 hover:text-primary'
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function MenuGroup({
  title,
  passos,
  activeEtapaId,
  activeDesignSection,
  collapsed,
  designSubmenuExpanded,
  onToggleDesignSubmenu,
  onAbrirEtapa,
  onAbrirDesignSecao,
}: {
  title: string
  passos: DeliveryHubPassoUi[]
  activeEtapaId: DeliveryEtapaId | null
  activeDesignSection: DesignTabId | null
  collapsed: boolean
  designSubmenuExpanded: boolean
  onToggleDesignSubmenu: () => void
  onAbrirEtapa: (etapaId: DeliveryEtapaId) => void
  onAbrirDesignSecao: (section: DesignTabId) => void
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
        {passos.map(passo =>
          passo.etapaId === 'delivery-design' ? (
            <DesignMenuItem
              key={passo.id}
              passo={passo}
              activeEtapa={activeEtapaId === 'delivery-design'}
              activeSection={activeDesignSection}
              collapsed={collapsed}
              expanded={designSubmenuExpanded}
              onToggleExpand={onToggleDesignSubmenu}
              onAbrirLobby={() => onAbrirEtapa('delivery-design')}
              onAbrirSecao={onAbrirDesignSecao}
            />
          ) : (
            <MenuItemButton
              key={passo.id}
              passo={passo}
              active={activeEtapaId === passo.etapaId}
              collapsed={collapsed}
              onClick={() => onAbrirEtapa(passo.etapaId)}
            />
          )
        )}
      </nav>
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
  activeDesignSection = null,
  onAbrirEtapa,
  onAbrirDesignSecao,
  panel,
}: DeliveryHubHomeProps) {
  const [menuCollapsed, setMenuCollapsed] = useState(false)
  const [designSubmenuExpanded, setDesignSubmenuExpanded] = useState(
    () => activeEtapaId === 'delivery-design'
  )

  const loja = useMemo(
    () => montarPassosLojaHub(progresso, passosExtras),
    [progresso, passosExtras]
  )
  const operacao = useMemo(
    () => montarPassosOperacaoHub(passosExtras),
    [passosExtras]
  )

  useEffect(() => {
    if (activeEtapaId === 'delivery-design') {
      if (activeDesignSection != null) {
        setDesignSubmenuExpanded(true)
      }
      return
    }
    setDesignSubmenuExpanded(false)
  }, [activeEtapaId, activeDesignSection])

  const handleAbrirDesignSecao = (section: DesignTabId) => {
    setDesignSubmenuExpanded(true)
    onAbrirDesignSecao?.(section)
  }

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
          activeDesignSection={activeDesignSection}
          collapsed={menuCollapsed}
          designSubmenuExpanded={designSubmenuExpanded}
          onToggleDesignSubmenu={() => setDesignSubmenuExpanded(prev => !prev)}
          onAbrirEtapa={onAbrirEtapa}
          onAbrirDesignSecao={handleAbrirDesignSecao}
        />
        <MenuGroup
          title="Operações"
          passos={operacao}
          activeEtapaId={activeEtapaId}
          activeDesignSection={activeDesignSection}
          collapsed={menuCollapsed}
          designSubmenuExpanded={designSubmenuExpanded}
          onToggleDesignSubmenu={() => setDesignSubmenuExpanded(prev => !prev)}
          onAbrirEtapa={onAbrirEtapa}
          onAbrirDesignSecao={handleAbrirDesignSecao}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {panel}
      </div>
    </div>
  )
}
