'use client'

import { MdCheck, MdPalette } from 'react-icons/md'
import { useMemo } from 'react'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { calcularDeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { DESIGN_SECTIONS, type DesignSectionId } from '../../shared/constants/designTabs'

type DesignSectionCardsProps = {
  onOpenSection: (section: DesignSectionId) => void
}

function BadgeNomeCardapio({ concluido }: { concluido: boolean }) {
  if (concluido) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
        <MdCheck className="h-3.5 w-3.5" />
        Concluído
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
      Pendente
    </span>
  )
}

export function DesignSectionCards({ onOpenSection }: DesignSectionCardsProps) {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const nomeCardapioConcluido = useMemo(() => {
    const progresso = calcularDeliveryHubProgresso(
      empresaDeliveryQuery.data?.pendencias,
      empresaDeliveryQuery.data != null
    )
    return (
      progresso.passos.find(passo => passo.id === 'delivery-nome-cardapio')?.concluido === true
    )
  }, [empresaDeliveryQuery.data])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <MdPalette className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-primary">Personalizar loja</h1>
          <p className="mt-1 text-sm text-secondary-text">
            Escolha uma seção para editar. Você pode abrir várias abas e alternar entre elas.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DESIGN_SECTIONS.map(section => {
          const mostraBadge = section.id === 'nome-cardapio'
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onOpenSection(section.id)}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <section.Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-primary">{section.label}</span>
                  {mostraBadge ? <BadgeNomeCardapio concluido={nomeCardapioConcluido} /> : null}
                </span>
                <span className="mt-0.5 block text-xs text-secondary-text">
                  {section.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
