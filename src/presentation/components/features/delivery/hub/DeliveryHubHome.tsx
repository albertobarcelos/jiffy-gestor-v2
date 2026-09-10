'use client'

import { useMemo, useState } from 'react'
import {
  MdCheck,
  MdCheckCircle,
  MdChevronRight,
  MdLightbulbOutline,
  MdLocationOn,
  MdMyLocation,
  MdPayments,
  MdStorefront,
} from 'react-icons/md'
import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import type { DeliveryHubProgresso } from './deliveryHubProgresso'
import {
  montarPassosHubDelivery,
  type DeliveryHubPassoUi,
} from './deliveryHubPassosUi'
import {
  ctaPrimarioPreviewHub,
  fatosPreviewHub,
} from './deliveryHubPreview'
import type { ResumoCoberturaHub } from './deliveryHubResumoCobertura'
import type { DeliveryHubPassosExtras } from './deliveryHubCadastros'

type DeliveryHubHomeProps = {
  progresso: DeliveryHubProgresso
  resumoCobertura: ResumoCoberturaHub
  endereco: EnderecoEmpresaMe | null
  nomeEmpresa: string | null
  passosExtras?: DeliveryHubPassosExtras
  onAbrirPasso: (passo: DeliveryHubPassoUi) => void
}

function DeliveryHubMapIllustration() {
  return (
    <div className="relative mx-auto h-40 w-full max-w-[280px]" aria-hidden>
      <svg viewBox="0 0 280 160" className="h-full w-full">
        <rect width="280" height="160" rx="16" fill="#EEF4FB" />
        <path d="M20 110h240M40 70h80M140 40h90M50 130h70" stroke="#C5D7EA" strokeWidth="6" strokeLinecap="round" />
        <circle cx="140" cy="78" r="52" fill="#C7D7F5" fillOpacity="0.45" />
        <circle cx="140" cy="78" r="34" fill="#9BB6EA" fillOpacity="0.4" />
        <circle cx="140" cy="78" r="16" fill="#5B82C9" fillOpacity="0.45" />
        <path
          d="M140 42c-14 0-26 11.2-26 25.2 0 18.8 26 44.8 26 44.8s26-26 26-44.8C166 53.2 154 42 140 42z"
          fill="#530CA3"
        />
        <circle cx="140" cy="66" r="8" fill="#fff" />
      </svg>
    </div>
  )
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

function DeliveryHubPreview({
  passo,
  resumo,
  endereco,
  nomeEmpresa,
  extras,
  onAbrirPasso,
}: {
  passo: DeliveryHubPassoUi
  resumo: ResumoCoberturaHub
  endereco: EnderecoEmpresaMe | null
  nomeEmpresa: string | null
  extras?: DeliveryHubPassosExtras
  onAbrirPasso: (passo: DeliveryHubPassoUi) => void
}) {
  const fatos = fatosPreviewHub(passo, resumo, endereco, nomeEmpresa, extras).map(fato => ({
    ...fato,
    Icon:
      fato.id === 'areas' || fato.id === 'endereco'
        ? MdLocationOn
        : fato.id === 'raio'
          ? MdMyLocation
          : fato.id === 'taxa'
            ? MdPayments
            : fato.id === 'empresa'
              ? MdStorefront
              : passo.Icon,
  }))
  const ctaPrimario = ctaPrimarioPreviewHub(passo)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-primary">{passo.titulo}</h3>
      {passo.id === 'delivery-cobertura' ? <DeliveryHubMapIllustration /> : null}
      <ul className="mt-4 space-y-3">
        {fatos.map(fato => (
          <li key={fato.texto} className="flex items-start gap-2.5 text-sm text-primary-text">
            <fato.Icon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
            <span>{fato.texto}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onAbrirPasso(passo)}
        className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
      >
        {ctaPrimario}
      </button>
      {passo.id === 'delivery-cobertura' ? (
        <button
          type="button"
          onClick={() => onAbrirPasso(passo)}
          className="mt-3 text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Visualizar no mapa
        </button>
      ) : null}
      <div className="mt-6 flex items-start gap-2 rounded-xl bg-secondary/10 px-3 py-3 text-xs text-secondary">
        <MdLightbulbOutline className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Você pode alterar estas configurações quando quiser.</span>
      </div>
    </div>
  )
}

export function DeliveryHubHome({
  progresso,
  resumoCobertura,
  endereco,
  nomeEmpresa,
  passosExtras,
  onAbrirPasso,
}: DeliveryHubHomeProps) {
  const passos = useMemo(
    () => montarPassosHubDelivery(progresso, passosExtras),
    [progresso, passosExtras]
  )
  const [selecionadoId, setSelecionadoId] = useState('delivery-cobertura')
  const selecionado = passos.find(passo => passo.id === selecionadoId) ?? passos[1] ?? passos[0]
  const pronto = progresso.totalObrigatorios > 0 && progresso.concluidosObrigatorios === progresso.totalObrigatorios

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
        <div className="relative flex flex-col rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:p-3">
          {passos.map((passo, index) => {
            const ativo = passo.id === selecionado.id
            const ultimo = index === passos.length - 1
            return (
              <div key={passo.id} className="relative flex gap-3">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <span
                    className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                      passo.concluido ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                  >
                    {passo.numero}
                  </span>
                  {ultimo ? null : <span className="w-px flex-1 bg-gray-200" />}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelecionadoId(passo.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelecionadoId(passo.id)
                    }
                  }}
                  className={`mb-2 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    ativo
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <passo.Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-primary">{passo.titulo}</span>
                    <span className="mt-0.5 block text-xs text-secondary-text">{passo.descricao}</span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <BadgeStatus passo={passo} />
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation()
                        onAbrirPasso(passo)
                      }}
                      className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                    >
                      {passo.cta}
                      <MdChevronRight className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <DeliveryHubPreview
          passo={selecionado}
          resumo={resumoCobertura}
          endereco={endereco}
          nomeEmpresa={nomeEmpresa}
          extras={passosExtras}
          onAbrirPasso={onAbrirPasso}
        />
      </div>
    </div>
  )
}
