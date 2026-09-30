'use client'

import { useMemo, type ReactNode } from 'react'
import { MdCheck, MdCheckCircle } from 'react-icons/md'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from './deliveryHubProgresso'
import {
  montarPassosHubDelivery,
  type DeliveryHubPassoUi,
} from './deliveryHubPassosUi'
import type { DeliveryHubPassosExtras } from './deliveryHubCadastros'

type DeliveryHubHomeProps = {
  progresso: DeliveryHubProgresso
  passosExtras?: DeliveryHubPassosExtras
  selecionadoId: DeliveryEtapaId | null
  onSelecionarPasso: (passo: DeliveryHubPassoUi) => void
  children: ReactNode
}

function BadgeStatus({ passo }: { passo: DeliveryHubPassoUi }) {
  if (passo.concluido) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
        <MdCheck className="h-3.5 w-3.5" />
        Concluído
      </span>
    )
  }
  if (passo.obrigatoria) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
        Pendente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
      Recomendado
    </span>
  )
}

export function DeliveryHubHome({
  progresso,
  passosExtras,
  selecionadoId,
  onSelecionarPasso,
  children,
}: DeliveryHubHomeProps) {
  const passos = useMemo(
    () => montarPassosHubDelivery(progresso, passosExtras),
    [progresso, passosExtras]
  )
  const pronto =
    progresso.totalObrigatorios > 0 &&
    progresso.concluidosObrigatorios === progresso.totalObrigatorios

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <div className="flex shrink-0 flex-col gap-4 px-4 pb-3 pt-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">Configurações do Delivery</h1>
          <p className="mt-1 text-sm text-secondary-text">
            Cobertura de entrega usada no pedido gestor — áreas, raio e endereço da loja.
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 sm:px-6 lg:flex-row">
        <nav
          aria-label="Passos do delivery"
          className="flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:p-3 lg:max-h-none lg:w-[22.5rem] lg:self-stretch"
        >
          {passos.map((passo, index) => {
            const ativo = passo.id === selecionadoId
            const ultimo = index === passos.length - 1
            return (
              <div key={passo.id} className="flex gap-3">
                <div
                  className={`relative flex w-8 shrink-0 items-center justify-center ${ultimo ? '' : 'mb-2'}`}
                >
                  {index > 0 ? (
                    <span className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-gray-200" />
                  ) : null}
                  {ultimo ? null : (
                    <span className="absolute left-1/2 top-1/2 h-[calc(50%+0.5rem)] w-px -translate-x-1/2 bg-gray-200" />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                      passo.concluido ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                  >
                    {passo.numero}
                  </span>
                </div>
                <button
                  type="button"
                  aria-current={ativo ? 'page' : undefined}
                  onClick={() => onSelecionarPasso(passo)}
                  className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    ultimo ? '' : 'mb-2'
                  } ${ativo ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50'}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <passo.Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-primary">{passo.titulo}</span>
                      <BadgeStatus passo={passo} />
                    </span>
                    <span className="mt-0.5 block text-xs text-secondary-text">{passo.descricao}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </nav>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
