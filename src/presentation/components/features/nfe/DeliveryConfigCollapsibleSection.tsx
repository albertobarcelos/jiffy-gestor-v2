'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { MdExpandMore } from 'react-icons/md'

interface DeliveryConfigCollapsibleSectionProps {
  icon: ReactNode
  title: string
  description?: ReactNode
  headerActions?: ReactNode
  defaultExpanded?: boolean
  /** Quando muda (ex.: modal aberto), restaura o estado inicial de expansão. */
  resetExpandedWhen?: unknown
  /** Classes do bloco de conteúdo expandido (default: mt-4 space-y-4). */
  contentClassName?: string
  children: ReactNode
}

export function DeliveryConfigCollapsibleSection({
  icon,
  title,
  description,
  headerActions,
  defaultExpanded = true,
  resetExpandedWhen,
  contentClassName = 'mt-4 space-y-4',
  children,
}: DeliveryConfigCollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const contentId = useId()

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [defaultExpanded, resetExpandedWhen])

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              aria-expanded={expanded}
              aria-controls={contentId}
              className="min-w-0 flex-1 rounded-lg text-left transition-colors hover:bg-gray-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <h3 className="text-base font-semibold text-primary-text">{title}</h3>
              {description ? (
                <div className="mt-1 text-sm text-secondary-text">{description}</div>
              ) : null}
            </button>

            {headerActions ? <div className="shrink-0">{headerActions}</div> : null}

            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              aria-expanded={expanded}
              aria-controls={contentId}
              aria-label={expanded ? 'Recolher seção' : 'Expandir seção'}
              className="shrink-0 rounded-lg p-0.5 text-secondary-text transition-colors hover:bg-gray-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <MdExpandMore
                className={`h-6 w-6 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div id={contentId} className={contentClassName}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
