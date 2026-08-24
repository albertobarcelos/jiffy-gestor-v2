'use client'

import { useEffect, useMemo } from 'react'
import { PEDIDOS_WINDOWS_PROTOCOLO, urlInstaladorPedidosWindows } from '../constantes'
import { planearAbrirPedidosWindows } from './planearAbrirPedidosWindows'

export function AbrirPedidosWindowsPainel() {
  const plano = useMemo(
    () =>
      planearAbrirPedidosWindows({
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      }),
    []
  )
  const instaladorUrl = urlInstaladorPedidosWindows()

  useEffect(() => {
    if (!plano.tentarProtocolo) return
    window.location.assign(PEDIDOS_WINDOWS_PROTOCOLO)
  }, [plano.tentarProtocolo])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pedidos</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Abrir no Windows</h1>
        <p className="mt-2 text-sm text-gray-600">
          Se o app já estiver instalado neste PC, ele deve abrir sozinho. Caso contrário, baixe o
          instalador (quadro + agente de impressão).
        </p>
      </div>

      {plano.motivo === 'nao-windows' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este browser não é Windows. O app da loja só corre em PC Windows — pode baixar o
          instalador e levar para o computador da impressora.
        </p>
      )}

      {plano.tentarProtocolo && (
        <p className="text-sm text-gray-500">A tentar abrir o app local…</p>
      )}

      {plano.mostrarDownload && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Instalador</h2>
          <p className="mt-1 text-sm text-gray-600">
            Pacote da loja: janela de pedidos (`/pedidos`) e agente de impressão. Cada um atualiza
            à parte depois de instalado.
          </p>
          {instaladorUrl ? (
            <a
              href={instaladorUrl}
              className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Baixar instalador
            </a>
          ) : (
            <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
              O ficheiro ainda não está publicado. Quando houver release, defina{' '}
              <code className="text-xs">NEXT_PUBLIC_PEDIDOS_WINDOWS_SETUP_URL</code>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
