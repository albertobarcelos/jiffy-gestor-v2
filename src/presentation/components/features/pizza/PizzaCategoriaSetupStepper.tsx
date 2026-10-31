'use client'

import { cn } from '@/src/shared/utils/cn'

export type PizzaCategoriaSetupStepId =
  | 'informacoes'
  | 'regra-preco'
  | 'tamanhos'
  | 'sabores'
  | 'massas-bordas'
  | 'adicionais'

export const PIZZA_CATEGORIA_SETUP_STEPS: Array<{
  id: PizzaCategoriaSetupStepId
  label: string
}> = [
  { id: 'informacoes', label: 'Informações' },
  { id: 'regra-preco', label: 'Regra de preço' },
  { id: 'tamanhos', label: 'Tamanhos' },
  { id: 'sabores', label: 'Sabores' },
  { id: 'massas-bordas', label: 'Massas e bordas' },
  { id: 'adicionais', label: 'Adicionais' },
]

interface PizzaCategoriaSetupStepperProps {
  active: PizzaCategoriaSetupStepId
  onChange: (step: PizzaCategoriaSetupStepId) => void
  className?: string
}

export function PizzaCategoriaSetupStepper({
  active,
  onChange,
  className,
}: PizzaCategoriaSetupStepperProps) {
  const activeIndex = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(step => step.id === active)

  return (
    <nav
      className={cn('border-b border-gray-200 px-4 py-4 md:px-6', className)}
      aria-label="Passos da nova categoria pizza"
    >
      <ol className="flex w-full items-center overflow-x-auto pb-1">
        {PIZZA_CATEGORIA_SETUP_STEPS.map((step, index) => {
          const isActive = step.id === active
          const isDone = index < activeIndex
          const isLast = index === PIZZA_CATEGORIA_SETUP_STEPS.length - 1

          return (
            <li
              key={step.id}
              className={cn('flex min-w-0 items-center', !isLast && 'flex-1')}
            >
              <button
                type="button"
                onClick={() => onChange(step.id)}
                className="flex shrink-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isActive || isDone
                      ? 'bg-[#C6F34D] text-primary-text'
                      : 'bg-[#D7E0EA] text-primary-text'
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-sm',
                    isActive
                      ? 'font-semibold text-primary-text'
                      : isDone
                        ? 'font-medium text-primary-text'
                        : 'font-medium text-secondary-text'
                  )}
                >
                  {step.label}
                </span>
              </button>

              {!isLast ? (
                <span
                  className={cn(
                    'mx-2 h-px min-w-[12px] flex-1',
                    isDone ? 'bg-primary/35' : 'bg-[#C5D0DC]'
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function nextPizzaCategoriaSetupStep(
  current: PizzaCategoriaSetupStepId
): PizzaCategoriaSetupStepId | null {
  const idx = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(step => step.id === current)
  if (idx < 0 || idx >= PIZZA_CATEGORIA_SETUP_STEPS.length - 1) return null
  return PIZZA_CATEGORIA_SETUP_STEPS[idx + 1]!.id
}

export function prevPizzaCategoriaSetupStep(
  current: PizzaCategoriaSetupStepId
): PizzaCategoriaSetupStepId | null {
  const idx = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(step => step.id === current)
  if (idx <= 0) return null
  return PIZZA_CATEGORIA_SETUP_STEPS[idx - 1]!.id
}
