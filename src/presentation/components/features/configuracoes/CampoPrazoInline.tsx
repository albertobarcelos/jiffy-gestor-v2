'use client'

export function CampoPrazoInline({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center rounded-md border border-gray-200 bg-white">
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        onFocus={event => event.currentTarget.select()}
        onMouseUp={event => event.preventDefault()}
        className="w-full min-w-0 bg-transparent px-1 py-1 text-center text-sm text-primary-text outline-none disabled:opacity-50"
      />
      <span className="pr-1.5 text-[10px] text-secondary-text">min</span>
    </div>
  )
}
