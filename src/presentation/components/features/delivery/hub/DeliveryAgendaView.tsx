'use client'

import { useState } from 'react'
import { MdAdd, MdSchedule } from 'react-icons/md'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { FuncionamentoDeliverySection } from '@/src/presentation/components/features/delivery/configuracoes/FuncionamentoDeliverySection'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

export function DeliveryAgendaView() {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const configurado = empresaDeliveryQuery.data != null
  const timezonePendente = (empresaDeliveryQuery.data?.pendencias ?? []).some(
    p => p.type === EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO
  )
  const [adicionarHorarioRequestKey, setAdicionarHorarioRequestKey] = useState(0)

  if (empresaDeliveryQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[900px] space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <MdSchedule className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-primary-text">Agenda e funcionamento</h1>
              <p className="mt-1 text-sm text-secondary-text">
                Defina dias, horários e abertura/fechamento automático da loja online.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!configurado}
            onClick={() => setAdicionarHorarioRequestKey(key => key + 1)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3.5 text-xs font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MdAdd className="h-4 w-4" aria-hidden />
            Adicionar Horário
          </button>
        </div>

        <FuncionamentoDeliverySection
          empresaDeliveryConfigurada={configurado}
          timezonePendente={timezonePendente}
          adicionarHorarioRequestKey={adicionarHorarioRequestKey}
        />
      </div>
    </div>
  )
}
