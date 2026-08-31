'use client'

import Link from 'next/link'
import { MdWarningAmber } from 'react-icons/md'
import type { EmpresaDeliveryPendenciaItem } from '@/src/shared/constants/empresaDeliveryPendencias'
import { resolverAcaoPendencia } from '@/src/shared/constants/empresaDeliveryPendencias'

type DeliveryPendenciasAlertProps = {
  pendencias: EmpresaDeliveryPendenciaItem[]
  titulo?: string
}

export function DeliveryPendenciasAlert({
  pendencias,
  titulo = 'Pendências para publicar a loja online',
}: DeliveryPendenciasAlertProps) {
  if (!pendencias.length) return null

  return (
    <section
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <MdWarningAmber className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">{titulo}</p>
            <p className="mt-1 text-xs text-amber-900/80">
              Enquanto houver pendências, o catálogo público retorna indisponível (403).
            </p>
          </div>
          <ul className="space-y-2">
            {pendencias.map(item => {
              const acao = resolverAcaoPendencia(item.type)
              return (
                <li
                  key={item.type}
                  className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2 text-sm"
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
