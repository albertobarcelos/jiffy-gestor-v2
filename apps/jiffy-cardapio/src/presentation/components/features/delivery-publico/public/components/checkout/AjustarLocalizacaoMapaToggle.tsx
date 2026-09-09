'use client'

type AjustarLocalizacaoMapaToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function AjustarLocalizacaoMapaToggle({
  checked,
  onChange,
  disabled = false,
}: AjustarLocalizacaoMapaToggleProps) {
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
            Ajustar localização no mapa
          </span>
          <span className="mt-0.5 block text-xs leading-snug delivery-text-secondary">
            Abra o mapa para mover o pin e marcar o ponto exato do endereço.
          </span>
        </span>
      </label>
    </div>
  )
}
