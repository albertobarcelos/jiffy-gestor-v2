'use client'

import dynamic from 'next/dynamic'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const AgendamentoDeliveryConfigScreen = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/configuracoes/agendamento/AgendamentoDeliveryConfigScreen'
    ).then(m => ({ default: m.AgendamentoDeliveryConfigScreen })),
  { ssr: false, loading: () => <PageLoading /> }
)

export default function EmpresaDeliveryAgendamentoPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <AgendamentoDeliveryConfigScreen />
    </div>
  )
}
