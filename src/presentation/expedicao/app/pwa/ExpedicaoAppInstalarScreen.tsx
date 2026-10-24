'use client'

import Image from 'next/image'
import type { PwaInstallPrompt } from '@/src/presentation/expedicao/app/pwa/usePwaInstallPrompt'

type ExpedicaoAppInstalarScreenProps = {
  pwa: Pick<PwaInstallPrompt, 'podeInstalar' | 'acabouDeInstalar' | 'instalar'>
}

export function ExpedicaoAppInstalarScreen({ pwa }: ExpedicaoAppInstalarScreenProps) {
  return (
    <div className="flex h-dvh flex-col bg-secondary text-white">
      <div className="px-6 pb-10 pt-[max(2.25rem,env(safe-area-inset-top))]">
        <Image
          src="/images/expedicao/logo_app.png"
          alt="JiffyGO"
          width={96}
          height={96}
          className="h-24 w-24 rounded-[1.5rem] bg-white shadow-sm"
          priority
        />
        <h1 className="mt-6 text-[1.75rem] font-semibold leading-tight">
          Instale o app para continuar
        </h1>
        <p className="mt-2 max-w-[22rem] text-[15px] leading-6 text-white/85">
          O QR só abre o navegador. O login e os pedidos ficam no ícone da tela
          inicial — o celular não instala sozinho.
        </p>
      </div>
      <div className="min-h-0 flex-1 rounded-t-3xl bg-zinc-50 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-zinc-900">
        {pwa.acabouDeInstalar ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
            <p className="text-base font-semibold text-emerald-900">App instalado</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Feche esta aba e toque no ícone <strong>JiffyGO</strong> na tela
              inicial. O login acontece lá.
            </p>
          </div>
        ) : (
          <>
            {pwa.podeInstalar ? (
              <button
                type="button"
                onClick={() => void pwa.instalar()}
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-violet-700 text-base font-semibold text-white"
              >
                Instalar app
              </button>
            ) : (
              <ol className="space-y-3 text-sm leading-6 text-zinc-700">
                <li>
                  <span className="font-semibold text-zinc-900">Android (Chrome):</span> menu{' '}
                  <span className="font-semibold">⋮</span> → Instalar app.
                </li>
                <li>
                  <span className="font-semibold text-zinc-900">iPhone:</span> Compartilhar →
                  Adicionar à Tela de Início.
                </li>
                <li>
                  <span className="font-semibold text-zinc-900">WhatsApp/Instagram:</span> copie
                  o link e abra no Chrome ou Safari. Esses apps não instalam PWA.
                </li>
              </ol>
            )}
            <p className="mt-6 text-center text-sm text-zinc-500">
              Depois de instalar, abra o ícone e faça o login da loja.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
