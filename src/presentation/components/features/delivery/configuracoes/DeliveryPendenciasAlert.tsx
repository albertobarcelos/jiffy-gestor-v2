'use client'

import Link from 'next/link'
import { MdInfoOutline, MdWarningAmber } from 'react-icons/md'
import type { EmpresaDeliveryPendenciaItem } from '@/src/shared/constants/empresaDeliveryPendencias'
import { resolverAcaoPendencia } from '@/src/shared/constants/empresaDeliveryPendencias'
import { cn } from '@/src/shared/utils/cn'

type DeliveryPendenciasAlertProps = {
  pendencias: EmpresaDeliveryPendenciaItem[]
  variant?: 'bloqueante' | 'orientacao'
  titulo?: string
}

export function DeliveryPendenciasAlert({
  pendencias,
  variant = 'bloqueante',
  titulo,
}: DeliveryPendenciasAlertProps) {
  if (!pendencias.length) return null

  const orientacao = variant === 'orientacao'
  const tituloPadrao = orientacao
    ? 'Orientações de configuração'
    : 'Pendências para publicar a loja online'

  return (
    <section
      role={orientacao ? 'status' : 'alert'}
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        orientacao
          ? 'border-sky-200 bg-sky-50 text-sky-950'
          : 'border-amber-300 bg-amber-50 text-amber-950'
      )}
    >
      <div className="flex items-start gap-3">
        {orientacao ? (
          <MdInfoOutline className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <MdWarningAmber className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">{titulo ?? tituloPadrao}</p>
            <p
              className={cn(
                'mt-1 text-xs',
                orientacao ? 'text-sky-900/80' : 'text-amber-900/80'
              )}
            >
              {orientacao
                ? 'Itens recomendados para o técnico. A loja online continua disponível.'
                : 'Há pendências obrigatórias que precisam ser resolvidas. Enquanto isso, o catálogo público retorna indisponível (403).'}
            </p>
          </div>
          <ul className="space-y-2">
            {pendencias.map(item => {
              const acao = resolverAcaoPendencia(item.type)
              return (
                <li
                  key={item.type}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm',
                    orientacao
                      ? 'border-sky-200/80 bg-white/70'
                      : 'border-amber-200/80 bg-white/70'
                  )}
                >
                  <p>{item.message}</p>
                  {acao ? (
                    <Link
                      href={acao.href}
                      className="mt-1 inline-block text-xs font-semibold text-secondary underline-offset-2 hover:underline"
                    >
                      {acao.label}
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
