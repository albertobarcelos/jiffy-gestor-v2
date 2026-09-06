'use client'

import type { ReactNode } from 'react'
import { CoberturaDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab'
import { EmpresaTab } from '@/src/presentation/components/features/configuracoes/tabs/EmpresaTab'
import { EntregadoresList } from '@/src/presentation/components/features/entregadores/EntregadoresList'
import { MeiosPagamentosList } from '@/src/presentation/components/features/meios-pagamentos/MeiosPagamentosList'
import { ImpressorasList } from '@/src/presentation/components/features/impressoras/ImpressorasList'

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

export { CoberturaDeliveryTab }
