'use client'

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  ClipboardCheck,
  CalendarClock,
  DollarSign,
  MapPin,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { MdClose } from 'react-icons/md'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'
import { useDeliveryCheckoutProgress } from './DeliveryCheckoutProgressContext'
import type { DeliveryCheckoutStep } from './deliveryCheckoutProgress'

export type DeliveryCheckoutHeaderConfig = {
  title: string
  showBack?: boolean
  onBack?: () => void
  headerTone?: 'default' | 'dark'
}

type ShellSlotsContextValue = {
  footerHost: HTMLElement | null
  setHeader: (config: DeliveryCheckoutHeaderConfig) => void
}

const DeliveryCheckoutShellSlotsContext = createContext<ShellSlotsContextValue | null>(null)

const STEP_ICONS: Record<Exclude<DeliveryCheckoutStep, null>, LucideIcon> = {
  telefone: UserRound,
  enderecos: MapPin,
  enderecoForm: MapPin,
  quando: CalendarClock,
  pagamento: DollarSign,
  revisao: ClipboardCheck,
  sucesso: CheckCircle2,
  pedidoDetalhe: ClipboardCheck,
}

const SLIDE_TRANSITION = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const }

/** Ordem visual para calcular direção do slide (frente / voltar). */
export const DELIVERY_CHECKOUT_STEP_ORDER: Exclude<DeliveryCheckoutStep, null>[] = [
  'telefone',
  'enderecos',
  'enderecoForm',
  'quando',
  'pagamento',
  'revisao',
  'sucesso',
  'pedidoDetalhe',
]

export function getCheckoutSlideDirection(
  from: DeliveryCheckoutStep,
  to: DeliveryCheckoutStep
): 1 | -1 {
  if (!from || !to) return 1
  const a = DELIVERY_CHECKOUT_STEP_ORDER.indexOf(from)
  const b = DELIVERY_CHECKOUT_STEP_ORDER.indexOf(to)
  if (a < 0 || b < 0) return 1
  return b >= a ? 1 : -1
}

function DeliveryCheckoutProgressIndicator({ dark }: { dark?: boolean }) {
  const progress = useDeliveryCheckoutProgress()
  if (!progress) return null

  const StepIcon = STEP_ICONS[progress.step]
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress.percentage / 100)
  const trackStroke = dark ? 'rgba(255, 255, 255, 0.28)' : 'var(--delivery-border)'
  const progressStroke = dark ? '#ffffff' : 'var(--delivery-primary)'
  const iconColor = dark ? '#ffffff' : 'var(--delivery-primary)'

  return (
    <div
      role="progressbar"
      aria-label="Progresso do pedido"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.percentage}
      aria-valuetext={progress.label}
      title={progress.label}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center"
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={trackStroke}
          strokeWidth="2.5"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={progressStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <StepIcon className="h-4 w-4" style={{ color: iconColor }} aria-hidden />
    </div>
  )
}

function useShellSlots() {
  const ctx = useContext(DeliveryCheckoutShellSlotsContext)
  if (!ctx) {
    throw new Error('Hooks do checkout shell devem ser usados dentro de DeliveryCheckoutShell')
  }
  return ctx
}

/** Atualiza título / seta / tom do header fixo do shell. */
export function DeliveryCheckoutShellHeader(config: DeliveryCheckoutHeaderConfig) {
  const { setHeader } = useShellSlots()
  const { title, showBack = false, onBack, headerTone = 'default' } = config

  useLayoutEffect(() => {
    setHeader({ title, showBack, onBack, headerTone })
  }, [setHeader, title, showBack, onBack, headerTone])

  return null
}

/** Renderiza o footer no slot fixo do shell (fora da área que desliza). */
export function DeliveryCheckoutShellFooter({ children }: { children: ReactNode }) {
  const { footerHost } = useShellSlots()
  if (!footerHost) return null
  return createPortal(children, footerHost)
}

type DeliveryCheckoutShellProps = {
  open: boolean
  stepKey: Exclude<DeliveryCheckoutStep, null>
  direction: 1 | -1
  onClose: () => void
  children: ReactNode
}

export function DeliveryCheckoutShell({
  open,
  stepKey,
  direction,
  onClose,
  children,
}: DeliveryCheckoutShellProps) {
  useDeliveryBodyScrollLock(open)

  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null)
  const [header, setHeader] = useState<DeliveryCheckoutHeaderConfig>({
    title: '',
    showBack: false,
    headerTone: 'default',
  })

  const slotsCtx = useMemo(
    () => ({
      footerHost,
      setHeader,
    }),
    [footerHost]
  )

  const isDarkHeader = header.headerTone === 'dark'
  const headerFg = isDarkHeader ? '#ffffff' : 'var(--delivery-text-primary)'
  const progress = useDeliveryCheckoutProgress()

  const variants = {
    enter: (dir: 1 | -1) => ({ x: dir > 0 ? '100%' : '-100%' }),
    center: { x: 0 },
    exit: (dir: 1 | -1) => ({ x: dir > 0 ? '-100%' : '100%' }),
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="checkout-shell-backdrop"
            className="delivery-vv-overlay z-[60]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            key="checkout-shell"
            role="dialog"
            aria-modal="true"
            aria-label={header.title || 'Checkout'}
            className="delivery-vv-panel z-[60] flex flex-col shadow-2xl"
            style={{
              backgroundColor: 'var(--delivery-surface, #ffffff)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SLIDE_TRANSITION}
          >
            <DeliveryCheckoutShellSlotsContext.Provider value={slotsCtx}>
              <div
                className={`relative flex shrink-0 items-center gap-2 border-b px-4 ${
                  isDarkHeader ? 'py-2' : 'py-3'
                }`}
                style={{
                  borderColor: isDarkHeader
                    ? 'var(--delivery-primary-dark, #171717)'
                    : 'var(--delivery-border)',
                  backgroundColor: isDarkHeader
                    ? 'var(--delivery-primary-dark, #171717)'
                    : undefined,
                  color: headerFg,
                }}
              >
                {header.showBack ? (
                  <button
                    type="button"
                    onClick={header.onBack ?? onClose}
                    aria-label="Voltar"
                    className={`flex items-center justify-center rounded-full ${
                      isDarkHeader ? 'h-8 w-8' : 'h-9 w-9'
                    }`}
                    style={{ color: headerFg }}
                  >
                    <span className="text-lg leading-none">‹</span>
                  </button>
                ) : (
                  <span className="w-9 shrink-0" aria-hidden />
                )}
                <h2
                  className={`delivery-font-title absolute left-1/2 -translate-x-1/2 truncate text-center text-base font-semibold ${
                    progress ? 'max-w-[calc(100%_-_10rem)]' : 'max-w-[calc(100%_-_6rem)]'
                  }`}
                  style={{ color: headerFg }}
                >
                  {header.title}
                </h2>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <DeliveryCheckoutProgressIndicator dark={isDarkHeader} />
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className={`flex shrink-0 items-center justify-center rounded-full ${
                      isDarkHeader ? 'h-8 w-8' : 'h-9 w-9'
                    }`}
                    style={{ color: headerFg }}
                  >
                    <MdClose className={isDarkHeader ? 'h-4 w-4' : 'h-5 w-5'} />
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div
                    key={stepKey}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={SLIDE_TRANSITION}
                    className="absolute inset-0 max-w-full touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-4"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div
                ref={setFooterHost}
                className="shrink-0 border-t border-neutral-200 bg-white empty:hidden"
                style={{ borderColor: 'var(--delivery-border)' }}
              />
            </DeliveryCheckoutShellSlotsContext.Provider>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
