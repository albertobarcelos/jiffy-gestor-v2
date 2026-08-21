'use client'

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

  if (interactive && onChange) {
    return (
      <div className={wrapperClass}>
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Pesquisar por produtos"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400"
          style={{ fontFamily: 'var(--delivery-font-body)' }}
        />
      </div>
    )
  }

  return (
    <div className={wrapperClass}>
      <div className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-500">
        Pesquisar por produtos
      </div>
    </div>
  )
}
