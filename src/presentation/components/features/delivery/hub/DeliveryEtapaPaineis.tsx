'use client'

import type { ReactNode } from 'react'
import { CoberturaDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab'
import { EmpresaTab } from '@/src/presentation/components/features/configuracoes/tabs/EmpresaTab'
import { EntregadoresList } from '@/src/presentation/components/features/entregadores/EntregadoresList'
import { MeiosPagamentosList } from '@/src/presentation/components/features/meios-pagamentos/MeiosPagamentosList'
import { ImpressorasList } from '@/src/presentation/components/features/impressoras/ImpressorasList'
import { NotificacoesWhatsAppDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/NotificacoesWhatsAppDeliveryTab'
import { DeliveryNomeCardapioView } from './DeliveryNomeCardapioView'
import { DeliveryAgendaView } from './DeliveryAgendaView'
import { DeliveryDesignEtapaView } from './DeliveryDesignEtapaView'

function DeliveryEtapaPainel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">{children}</div>
  )
}

export function EmpresaDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <EmpresaTab />
    </DeliveryEtapaPainel>
  )
}

export function EntregadoresDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <EntregadoresList />
    </DeliveryEtapaPainel>
  )
}

export function MeiosDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <MeiosPagamentosList />
    </DeliveryEtapaPainel>
  )
}

export function ImpressorasDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <ImpressorasList />
    </DeliveryEtapaPainel>
  )
}

export function NotificacoesWhatsAppDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <NotificacoesWhatsAppDeliveryTab />
    </DeliveryEtapaPainel>
  )
}

export function NomeCardapioDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <DeliveryNomeCardapioView />
    </DeliveryEtapaPainel>
  )
}

export function DesignDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <DeliveryDesignEtapaView />
    </DeliveryEtapaPainel>
  )
}

export function AgendaDeliveryEtapa() {
  return (
    <DeliveryEtapaPainel>
      <DeliveryAgendaView />
    </DeliveryEtapaPainel>
  )
}

export { CoberturaDeliveryTab }
