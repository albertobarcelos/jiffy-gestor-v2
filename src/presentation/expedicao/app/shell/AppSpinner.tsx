export function AppSpinner(props: { className?: string; tom?: 'branco' | 'roxo' }) {
  const tom = props.tom === 'branco' ? 'border-white border-t-transparent' : 'border-secondary border-t-transparent'
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 ${tom} ${props.className ?? 'h-4 w-4'}`}
      aria-hidden
    />
  )
}
