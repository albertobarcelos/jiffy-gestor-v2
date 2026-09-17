'use client'

import { useMemo, type ComponentType } from 'react'
import { MdCheckCircle, MdChevronRight } from 'react-icons/md'
import type { IconType } from 'react-icons'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from './deliveryHubProgresso'
import { DELIVERY_LOJA_ETAPA } from './deliveryHubEtapas'
import {
  montarPassosOperacaoHub,
  type DeliveryHubPassoUi,
} from './deliveryHubPassosUi'
import type { DeliveryHubPassosExtras } from './deliveryHubCadastros'

type DeliveryHubHomeProps = {
  progresso: DeliveryHubProgresso
  passosExtras?: DeliveryHubPassosExtras
  onAbrirEtapa: (etapaId: DeliveryEtapaId) => void
}

function BadgeStatus({
  concluido,
  labelPendente = 'Recomendado',
}: {
  concluido: boolean
  labelPendente?: string
}) {
  if (concluido) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        Concluído
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
      {labelPendente}
    </span>
  )
}

function HubConfigCard({
  title,
  description,
  cta,
  Icon,
  concluido,
  badgePendente,
  onClick,
}: {
  title: string
  description: string
  cta: string
  Icon: IconType | ComponentType<{ className?: string }>
  concluido: boolean
  badgePendente?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
    >
      <span className="mb-3 flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <BadgeStatus concluido={concluido} labelPendente={badgePendente} />
      </span>
      <span className="text-sm font-semibold text-primary">{title}</span>
      <span className="mt-1 text-xs text-secondary-text">{description}</span>
      <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary">
        {cta}
        <MdChevronRight className="h-4 w-4" />
      </span>
    </button>
  )
}

export function DeliveryHubHome({
  progresso,
  passosExtras,
  onAbrirEtapa,
}: DeliveryHubHomeProps) {
  const operacao = useMemo(
    () => montarPassosOperacaoHub(passosExtras),
    [passosExtras]
  )
  const pronto =
    progresso.totalObrigatorios > 0 &&
    progresso.concluidosObrigatorios === progresso.totalObrigatorios

  const lojaEtapa = DELIVERY_LOJA_ETAPA

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Configurações do Delivery</h1>
          <p className="mt-1 text-sm text-secondary-text">
            Configure a loja pública e a operação do dia a dia.
          </p>
        </div>
        <div className="w-full max-w-sm lg:pt-1">
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
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-primary">Loja</h2>
        <p className="mb-4 text-sm text-secondary-text">
          Nome, cobertura, agenda, design e WhatsApp do cardápio público.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <HubConfigCard
            title={lojaEtapa.title}
            description="Nome e cardápio, áreas de entrega, agenda, design e WhatsApp."
            cta="Abrir"
            Icon={lojaEtapa.icon}
            concluido={pronto}
            badgePendente="Pendente"
            onClick={() => onAbrirEtapa(lojaEtapa.id)}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-primary">Operação do dia a dia</h2>
        <p className="mb-4 text-sm text-secondary-text">
          Entregadores, pagamentos e impressão — use quando a loja já estiver configurada.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {operacao.map((passo: DeliveryHubPassoUi) => (
            <HubConfigCard
              key={passo.id}
              title={passo.titulo}
              description={passo.descricao}
              cta={passo.cta}
              Icon={passo.Icon}
              concluido={passo.concluido}
              onClick={() => onAbrirEtapa(passo.etapaId)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
