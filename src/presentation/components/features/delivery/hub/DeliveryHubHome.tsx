'use client'

import { useMemo, type ReactNode } from 'react'
import { MdCheckCircle } from 'react-icons/md'
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
  onClick,
}: {
  passo: DeliveryHubPassoUi
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        active
          ? 'bg-primary/10 font-semibold text-primary'
          : 'text-primary-text hover:bg-primary/5 hover:text-primary'
      )}
    >
      <passo.Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-secondary')}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-medium">{passo.titulo}</span>
      {passo.concluido ? (
        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
          OK
        </span>
      ) : passo.obrigatoria ? (
        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          !
        </span>
      ) : null}
    </button>
  )
}

function MenuGroup({
  title,
  passos,
  activeEtapaId,
  onAbrirEtapa,
}: {
  title: string
  passos: DeliveryHubPassoUi[]
  activeEtapaId: DeliveryEtapaId | null
  onAbrirEtapa: (etapaId: DeliveryEtapaId) => void
}) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-text">
        {title}
      </p>
      <nav className="flex flex-col gap-0.5" aria-label={title}>
        {passos.map(passo => (
          <MenuItemButton
            key={passo.id}
            passo={passo}
            active={activeEtapaId === passo.etapaId}
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
      <aside className="shrink-0 overflow-y-auto border-b border-gray-200 bg-white p-3 sm:p-4 lg:w-64 lg:border-b-0 lg:border-r xl:w-72">
        <h1 className="mb-4 px-2.5 text-lg font-bold text-primary sm:text-xl">
          Configurações Delivery
        </h1>
        <MenuGroup
          title="Loja"
          passos={loja}
          activeEtapaId={activeEtapaId}
          onAbrirEtapa={onAbrirEtapa}
        />
        <MenuGroup
          title="Operações"
          passos={operacao}
          activeEtapaId={activeEtapaId}
          onAbrirEtapa={onAbrirEtapa}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {panel ?? <HubOverview progresso={progresso} />}
      </div>
    </div>
  )
}
