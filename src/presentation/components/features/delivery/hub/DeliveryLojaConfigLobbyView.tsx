'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MdCheck, MdChevronRight } from 'react-icons/md'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useCanalWhatsAppDelivery, useCanalWhatsAppStatus } from '@/src/presentation/hooks/useCanalWhatsAppDelivery'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  DELIVERY_HUB_PATH,
  DELIVERY_HUB_TAB_ID,
  getDeliveryEtapaById,
  type DeliveryEtapaId,
} from './deliveryHubEtapas'
import { calcularDeliveryHubProgresso } from './deliveryHubProgresso'
import { montarPassosLojaHub, type DeliveryHubPassoUi } from './deliveryHubPassosUi'

function BadgeCard({ passo }: { passo: DeliveryHubPassoUi }) {
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

/**
 * Lobby "Configurar Loja Delivery" — cards que abrem as etapas existentes em nova aba.
 */
export function DeliveryLojaConfigLobbyView() {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const addTab = useTabsStore(s => s.addTab)
  const setActiveTab = useTabsStore(s => s.setActiveTab)

  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const configurado = empresaDeliveryQuery.data != null
  const pendencias = empresaDeliveryQuery.data?.pendencias ?? []
  const progresso = useMemo(
    () => calcularDeliveryHubProgresso(pendencias, configurado),
    [pendencias, configurado]
  )

  const canalWhatsAppQuery = useCanalWhatsAppDelivery()
  const statusWhatsAppQuery = useCanalWhatsAppStatus({
    enabled: canalWhatsAppQuery.data != null,
    pollar: false,
  })
  const whatsappConectado =
    statusWhatsAppQuery.data != null
      ? statusWhatsAppQuery.data.conectado === true
      : canalWhatsAppQuery.data?.conectado === true

  const passosExtras = useMemo(
    () => ({
      whatsappConectado,
      empresaDeliveryConfigurada: configurado,
      agendaConfigurada:
        configurado &&
        !pendencias.some(
          p => p.type === EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA
        ),
    }),
    [configurado, pendencias, whatsappConectado]
  )

  const cards = useMemo(
    () => montarPassosLojaHub(progresso, passosExtras),
    [progresso, passosExtras]
  )

  const obrigatorios = cards.filter(c => c.obrigatoria)
  const concluidosObrigatorios = obrigatorios.filter(c => c.concluido).length
  const totalObrigatorios = obrigatorios.length
  const porcentagem =
    totalObrigatorios === 0
      ? 100
      : Math.round((concluidosObrigatorios / totalObrigatorios) * 100)

  const abrirEtapa = useCallback(
    (etapaId: DeliveryEtapaId) => {
      const etapa = getDeliveryEtapaById(etapaId)
      if (!etapa) return
      addTab({ id: etapa.id, label: etapa.label, path: etapa.path })
      router.push(toGestao(etapa.path))
    },
    [addTab, router, toGestao]
  )

  const voltarAoHub = useCallback(() => {
    setActiveTab(DELIVERY_HUB_TAB_ID)
    router.push(toGestao(DELIVERY_HUB_PATH))
  }, [router, setActiveTab, toGestao])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={voltarAoHub}
          className="mb-3 text-sm font-semibold text-primary hover:underline"
        >
          ← Voltar ao Delivery
        </button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">Configurar Loja Delivery</h1>
            <p className="mt-1 max-w-2xl text-sm text-secondary-text">
              Escolha o que deseja configurar. Cada opção abre a tela correspondente.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <p className="text-xs font-semibold text-primary-text">
              {concluidosObrigatorios} de {totalObrigatorios} obrigatórios da loja
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(card => (
          <button
            key={card.id}
            type="button"
            onClick={() => abrirEtapa(card.etapaId)}
            className="group flex min-h-[140px] flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <card.Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-primary">{card.titulo}</span>
                  <BadgeCard passo={card} />
                </span>
                <span className="mt-1 block text-sm text-secondary-text">{card.descricao}</span>
              </span>
            </div>
            <span className="mt-auto flex items-center pt-4 text-xs font-semibold text-primary">
              {card.cta}
              <MdChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
