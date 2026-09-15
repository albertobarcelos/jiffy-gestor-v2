'use client'

import { Search } from 'lucide-react'

type DeliveryBuscaProdutosProps = {
  value: string
  interactive?: boolean
  embedded?: boolean
  onChange?: (value: string) => void
}

export function DeliveryBuscaProdutos({
  value,
  interactive = false,
  embedded = false,
  onChange,
}: DeliveryBuscaProdutosProps) {
  const wrapperClass = embedded ? 'px-4' : 'mt-3 px-4'

  return (
    <div className={wrapperClass}>
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'var(--delivery-text-muted)' }}
          aria-hidden
        />
        {interactive && onChange ? (
          <input
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Pesquisar por produtos"
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-gray-400"
            style={{ fontFamily: 'var(--delivery-font-body)' }}
          />
        ) : (
          <div className="rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-500">
            Pesquisar por produtos
          </div>
        )}
      </label>
    </div>
  )
}
