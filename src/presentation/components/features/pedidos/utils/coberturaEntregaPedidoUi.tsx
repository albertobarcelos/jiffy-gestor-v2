'use client'

import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { MdOpenInNew, MdWarningAmber } from 'react-icons/md'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { MENSAGEM_ENDERECO_FORA_COBERTURA } from '@/src/domain/policies/pedido/cotacaoEntregaPolicy'
import { deliveryHubEtapaPath } from '@/src/shared/constants/configuracoesRoutes'

export const LABEL_BOTAO_CONFIGURAR_COBERTURA = 'Configurar cobertura'
export const TOAST_ID_ENDERECO_FORA_COBERTURA = 'endereco-fora-cobertura'

export function useHrefCoberturaEntregaPedido(): string {
  const { toGestao } = useGestaoPath()
  return useMemo(() => toGestao(deliveryHubEtapaPath('delivery-cobertura')), [toGestao])
}

function BotaoConfigurarCobertura({
  href,
  className,
  onClick,
}: {
  href: string
  className: string
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {LABEL_BOTAO_CONFIGURAR_COBERTURA}
      <MdOpenInNew className="h-3.5 w-3.5" aria-hidden />
    </a>
  )
}

export function AlertaEnderecoForaDaCobertura({ href }: { href: string }) {
  return (
    <div
      role="alert"
      className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-amber-950"
    >
      <div className="flex items-start gap-2">
        <MdWarningAmber className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium">{MENSAGEM_ENDERECO_FORA_COBERTURA}</p>
          <BotaoConfigurarCobertura
            href={href}
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          />
        </div>
      </div>
    </div>
  )
}

export function notificarEnderecoForaDaCobertura(href: string) {
  toast(
    <span className="flex flex-col gap-2 text-sm">
      <span>{MENSAGEM_ENDERECO_FORA_COBERTURA}</span>
      <BotaoConfigurarCobertura
        href={href}
        className="inline-flex w-fit items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        onClick={() => toast.dismiss(TOAST_ID_ENDERECO_FORA_COBERTURA)}
      />
    </span>,
    {
      id: TOAST_ID_ENDERECO_FORA_COBERTURA,
      icon: '⚠️',
      duration: 12000,
      style: {
        background: '#fff',
        color: '#333',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #fbbf24',
      },
    }
  )
}
