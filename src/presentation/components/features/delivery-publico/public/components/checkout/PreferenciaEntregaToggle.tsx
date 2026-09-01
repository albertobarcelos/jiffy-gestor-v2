'use client'

type PreferenciaEntregaToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function PreferenciaEntregaToggle({
  checked,
  onChange,
  disabled = false,
}: PreferenciaEntregaToggleProps) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{ borderColor: 'var(--delivery-border)' }}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--delivery-primary,#2563eb)]"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold delivery-text-primary">
            Entrega em outro ponto neste endereço
          </span>
          <span className="mt-0.5 block text-xs leading-snug delivery-text-secondary">
            Ex.: portaria, bloco, estacionamento. O endereço escrito acima permanece igual.
          </span>
        </span>
      </label>
      {checked ? (
        <p className="mt-2 pl-7 text-xs delivery-text-secondary">
          Arraste o pin no mapa para marcar onde você vai receber o pedido.
        </p>
      ) : null}
    </div>
  )
}
