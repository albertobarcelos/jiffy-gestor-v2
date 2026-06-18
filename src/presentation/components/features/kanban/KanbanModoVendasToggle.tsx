'use client'

export type ModoKanbanVendas = 'delivery' | 'balcao'

export interface KanbanModoVendasToggleProps {
  value: ModoKanbanVendas
  onChange: (next: ModoKanbanVendas) => void
  className?: string
}

/**
 * Segmento Delivery / Balcão para alternar colunas e cartões do Kanban fiscal.
 */
export function KanbanModoVendasToggle({
  value,
  onChange,
  className = '',
}: KanbanModoVendasToggleProps) {
  return (
    <div
      role="group"
      aria-label="Modo de visualização do quadro de vendas"
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 shadow-sm ${className}`}
    >
      <button
        type="button"
        aria-pressed={value === 'delivery'}
        onClick={() => onChange('delivery')}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'delivery'
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Delivery
      </button>
      <button
        type="button"
        aria-pressed={value === 'balcao'}
        onClick={() => onChange('balcao')}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'balcao'
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Balcão
      </button>
    </div>
  )
}
