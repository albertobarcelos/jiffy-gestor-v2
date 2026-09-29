import type { IconType } from 'react-icons'

type DesignLobbyCardProps = {
  icon: IconType
  title: string
  description: string
  onClick: () => void
}

export function DesignLobbyCard({
  icon: Icon,
  title,
  description,
  onClick,
}: DesignLobbyCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-center shadow-sm transition-all hover:border-alternate/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alternate/40"
    >
      <span className="flex min-h-[9rem] w-full items-center justify-center bg-alternate/20 text-alternate transition-colors group-hover:bg-alternate/30">
        <Icon className="h-16 w-16" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col justify-center gap-1.5 px-4 py-5">
        <span className="block text-base font-bold text-primary-text group-hover:text-alternate">
          {title}
        </span>
        <span className="block text-sm leading-snug text-secondary-text">{description}</span>
      </span>
    </button>
  )
}
