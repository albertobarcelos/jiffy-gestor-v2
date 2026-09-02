'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MdInfoOutline, MdNotificationsNone } from 'react-icons/md'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import type { EmpresaDeliveryPendenciaItem } from '@/src/shared/constants/empresaDeliveryPendencias'
import { resolverAcaoPendencia } from '@/src/shared/constants/empresaDeliveryPendencias'

type DeliveryPendenciasOrientacaoNotifierProps = {
  pendencias: EmpresaDeliveryPendenciaItem[]
}

export function DeliveryPendenciasOrientacaoNotifier({
  pendencias,
}: DeliveryPendenciasOrientacaoNotifierProps) {
  const [aberto, setAberto] = useState(false)
  const quantidade = pendencias.length

  if (quantidade === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100"
        aria-label={`${quantidade} orientação${quantidade === 1 ? '' : 'ões'} de configuração`}
      >
        <MdNotificationsNone className="h-5 w-5" aria-hidden />
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {quantidade > 9 ? '9+' : quantidade}
        </span>
      </button>

      <Dialog open={aberto} onOpenChange={setAberto} maxWidth="sm" fullWidth>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-primary-text">
            <MdInfoOutline className="h-5 w-5 text-sky-600" aria-hidden />
            Orientações de configuração
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="pb-6">
          <p className="mb-4 text-sm text-secondary-text">
            Itens recomendados para o técnico. A loja online continua disponível enquanto forem
            apenas orientações.
          </p>
          <ul className="space-y-2">
            {pendencias.map(item => {
              const acao = resolverAcaoPendencia(item.type)
              return (
                <li
                  key={item.type}
                  className="rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2.5 text-sm text-sky-950"
                >
                  <p>{item.message}</p>
                  {acao ? (
                    <Link
                      href={acao.href}
                      onClick={() => setAberto(false)}
                      className="mt-1.5 inline-block text-xs font-semibold text-secondary underline-offset-2 hover:underline"
                    >
                      {acao.label}
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
