'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardCheck,
  DollarSign,
  MapPin,
  PackageCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { MdClose } from 'react-icons/md'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'
import { useDeliveryCheckoutProgress } from './DeliveryCheckoutProgressContext'
import type { DeliveryCheckoutStep } from './deliveryCheckoutProgress'

type DeliveryCheckoutStepModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Título centralizado com seta de voltar à esquerda (ex.: form endereço). */
  showBack?: boolean
  onBack?: () => void
  /**
   * @deprecated Mantido por compatibilidade. O checkout sempre usa o drawer
   * (tela cheia no mobile, 40% no desktop), alinhado ao carrinho.
   */
  fullScreen?: boolean
  /** Header preto com texto/ícones brancos (ex.: revisão). */
  headerTone?: 'default' | 'dark'
}

const STEP_ICONS: Record<Exclude<DeliveryCheckoutStep, null>, LucideIcon> = {
  telefone: UserRound,
  tipoEntrega: PackageCheck,
  enderecos: MapPin,
  enderecoForm: MapPin,
  pagamento: DollarSign,
  revisao: ClipboardCheck,
}

const SLIDE_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

function DeliveryCheckoutProgressIndicator() {
  const progress = useDeliveryCheckoutProgress()
  if (!progress) return null

  const StepIcon = STEP_ICONS[progress.step]
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress.percentage / 100)

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
          stroke="var(--delivery-border)"
          strokeWidth="2.5"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="var(--delivery-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <StepIcon
        className="h-4 w-4"
        style={{ color: 'var(--delivery-primary)' }}
        aria-hidden
      />
    </div>
  )
}

export function DeliveryCheckoutStepModal({
  title,
  onClose,
  children,
  footer,
  showBack = false,
  onBack,
  headerTone = 'default',
}: DeliveryCheckoutStepModalProps) {
  useDeliveryBodyScrollLock()
  const progress = useDeliveryCheckoutProgress()

  const isDarkHeader = headerTone === 'dark'
  const headerFg = isDarkHeader ? '#ffffff' : 'var(--delivery-text-primary)'

  return (
    <>
      <motion.div
        className="delivery-vv-overlay z-[60]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed right-0 z-[60] flex w-full flex-col overflow-hidden overscroll-none shadow-2xl lg:w-[40%]"
        style={{
          top: 'var(--delivery-vv-offset-top, 0px)',
          height: 'var(--delivery-vv-height, 100dvh)',
          backgroundColor: 'var(--delivery-surface, #ffffff)',
        }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={SLIDE_TRANSITION}
      >
        <div
          className={`relative flex shrink-0 items-center gap-2 border-b px-4 ${
            isDarkHeader ? 'py-2' : 'py-3'
          }`}
          style={{
            borderColor: isDarkHeader ? '#000000' : 'var(--delivery-border)',
            backgroundColor: isDarkHeader ? '#000000' : undefined,
            color: headerFg,
          }}
        >
          {showBack ? (
            <button
              type="button"
              onClick={onBack ?? onClose}
              aria-label="Voltar"
              className={`flex items-center justify-center rounded-full ${
                isDarkHeader ? 'h-8 w-8' : 'h-9 w-9'
              }`}
              style={{ color: headerFg }}
            >
              <span className="text-lg leading-none">‹</span>
            </button>
          ) : null}
          <h2
            className={`delivery-font-title absolute left-1/2 -translate-x-1/2 truncate text-center text-base font-semibold ${
              progress ? 'max-w-[calc(100%_-_10rem)]' : 'max-w-[calc(100%_-_6rem)]'
            }`}
            style={{ color: headerFg }}
          >
            {title}
          </h2>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <DeliveryCheckoutProgressIndicator />
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

        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          {children}
        </div>

        {footer ? (
          <div
            className="shrink-0 border-t border-neutral-200 bg-white"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            {footer}
          </div>
        ) : null}
      </motion.aside>
    </>
  )
}
