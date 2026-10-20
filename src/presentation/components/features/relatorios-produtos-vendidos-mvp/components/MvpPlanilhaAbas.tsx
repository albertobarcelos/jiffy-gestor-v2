'use client'

import { cn } from '@/src/shared/utils/cn'

export type MvpPlanilhaAbaId = 'produtos' | 'complementos'

const ABAS: Array<{ id: MvpPlanilhaAbaId; label: string }> = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'complementos', label: 'Complementos' },
]

/**
 * Abas estilo planilha (Excel) no rodapé da grade do relatório.
 */
export function MvpPlanilhaAbas(props: {
  abaAtiva: MvpPlanilhaAbaId
  onChange: (aba: MvpPlanilhaAbaId) => void
}) {
  const { abaAtiva, onChange } = props

  return (
    <div
      className="mx-1 flex items-start gap-0.5 overflow-x-auto bg-[#e8eaed] px-1 pb-1"
      role="tablist"
      aria-label="Planilhas do relatório"
    >
      {ABAS.map(aba => {
        const ativa = abaAtiva === aba.id
        return (
          <button
            key={aba.id}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(aba.id)}
            className={cn(
              'relative -mt-px shrink-0 rounded-b-md border px-4 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
              ativa
                ? 'z-[1] border-[#d0d7de] border-t-white bg-white text-primary'
                : 'border-transparent bg-[#dfe1e5] text-secondary-text hover:bg-[#d0d7de]'
            )}
          >
            {aba.label}
          </button>
        )
      })}
    </div>
  )
}
