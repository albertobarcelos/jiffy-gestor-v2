'use client'

import { Search } from 'lucide-react'

type DeliveryCatalogoSearchProps = {
  termoBusca: string
  interactive?: boolean
  onChange?: (termo: string) => void
}

export function DeliveryCatalogoSearch({
  termoBusca,
  interactive = false,
  onChange,
}: DeliveryCatalogoSearchProps) {
  return (
    <div className="px-4">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'var(--delivery-text-muted)' }}
          aria-hidden
        />
        <input
          type="search"
          value={termoBusca}
          readOnly={!interactive}
          onChange={e => interactive && onChange?.(e.target.value)}
          placeholder="Pesquisar por produtos"
          className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--delivery-primary)_35%,transparent)]"
          style={{
            borderColor: 'var(--delivery-card-border)',
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-body)',
            backgroundColor: 'var(--delivery-surface)',
          }}
        />
      </label>
    </div>
  )
}
