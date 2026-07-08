'use client'

type DeliveryTipoEntregaToggleProps = {
  value: 'entrega' | 'retirada'
  interactive?: boolean
  onChange?: (value: 'entrega' | 'retirada') => void
  /** chips = home do catálogo; segmented = checkout full-width */
  variant?: 'chips' | 'segmented'
}

export function DeliveryTipoEntregaToggle({
  value,
  interactive = false,
  onChange,
  variant = 'chips',
}: DeliveryTipoEntregaToggleProps) {
  if (variant === 'segmented') {
    return (
      <div className="flex gap-2">
        {(['retirada', 'entrega'] as const).map(tipo => {
          const active = value === tipo
          const label = tipo === 'entrega' ? 'Entrega' : 'Retirada'
          return (
            <button
              key={tipo}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(tipo)}
              className="flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors disabled:cursor-default"
              style={{
                borderColor: active ? 'var(--delivery-primary)' : 'var(--delivery-border)',
                backgroundColor: active ? 'var(--delivery-surface-muted)' : 'transparent',
                color: active ? 'var(--delivery-primary-dark)' : 'var(--delivery-text)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  const baseClass =
    'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors @sm:text-sm'

  const renderButton = (tipo: 'entrega' | 'retirada', label: string) => {
    const active = value === tipo
    const style = active
      ? { backgroundColor: 'var(--delivery-primary-dark)', color: '#FFFFFF' }
      : undefined

    if (interactive && onChange) {
      return (
        <button
          type="button"
          onClick={() => onChange(tipo)}
          className={`${baseClass} ${active ? '' : 'border border-gray-200 text-gray-600'}`}
          style={style}
        >
          {label}
        </button>
      )
    }

    return (
      <span
        className={`${baseClass} ${active ? '' : 'border border-gray-200 text-gray-600'}`}
        style={style}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="flex gap-2 px-4">
      {renderButton('entrega', 'Delivery')}
      {renderButton('retirada', 'Para retirar')}
    </div>
  )
}
