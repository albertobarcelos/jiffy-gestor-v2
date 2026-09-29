import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

type DeliveryOpcaoCardProps = {
  icon: IconType
  title: string
  description?: string
  children?: ReactNode
}

/**
 * Card de opção do Configurar Delivery.
 * A faixa roxa com o ícone acompanha só o título e a descrição.
 * O restante do conteúdo ocupa a largura inteira do card.
 */
export function DeliveryOpcaoCard({
  icon: Icon,
  title,
  description,
  children,
}: DeliveryOpcaoCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex min-h-[6.25rem] items-stretch border-b border-gray-200">
        <div className="flex w-24 shrink-0 items-center justify-center bg-alternate/20 text-alternate sm:w-28">
          <Icon className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3.5 md:px-5">
          <h2 className="text-base font-bold text-primary-text">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-secondary-text">{description}</p>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="space-y-3 px-4 py-4 md:px-5 md:py-5">{children}</div>
      ) : null}
    </section>
  )
}
