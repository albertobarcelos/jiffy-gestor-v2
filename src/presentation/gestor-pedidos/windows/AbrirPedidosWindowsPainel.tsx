'use client'

import { useEffect, useMemo } from 'react'
import { PEDIDOS_WINDOWS_PROTOCOLO } from '../constantes'
import { planearAbrirPedidosWindows } from './planearAbrirPedidosWindows'
import { BaixarFredyCard } from './BaixarFredyCard'

export function AbrirPedidosWindowsPainel() {
  const plano = useMemo(
    () =>
      planearAbrirPedidosWindows({
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      }),
    []
  )

  useEffect(() => {
    if (!plano.tentarProtocolo) return
    window.location.assign(PEDIDOS_WINDOWS_PROTOCOLO)
  }, [plano.tentarProtocolo])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pedidos</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Abrir o Fredy</h1>
        <p className="mt-2 text-sm text-gray-600">
          Se o Fredy já estiver neste PC, ele deve abrir sozinho. Caso contrário, baixe o
          instalador. O Jiffy Print (cupons) instala-se à parte.
        </p>
      </div>

      {plano.motivo === 'nao-windows' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este browser não é Windows. O Fredy só corre em PC Windows — pode baixar o instalador e
          levar para o computador da loja.
        </p>
      )}

      {plano.tentarProtocolo && (
        <p className="text-sm text-gray-500">A tentar abrir o Fredy…</p>
      )}

      {plano.mostrarDownload ? <BaixarFredyCard /> : null}
    </div>
  )
}
