'use client'

import Image from 'next/image'
import { LoginForm } from '@/src/presentation/components/features/auth/LoginForm'
import { LoginInviteRedirect } from '@/src/presentation/components/features/auth/LoginInviteRedirect'
import { ExpedicaoAppPwa } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppPwa'

export function ExpedicaoAppLoginScreen() {
  return (
    <div className="expedicao-app-login flex h-dvh flex-col bg-zinc-50 text-zinc-900">
      <ExpedicaoAppPwa />
      <header className="bg-secondary px-6 pb-10 pt-[max(2.25rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3">
          <Image
            src="/images/jiffy-favicon.png"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-2xl bg-white shadow-sm"
            priority
          />
          <p className="text-lg font-semibold tracking-normal">Jiffy</p>
        </div>
        <h1 className="mt-7 text-[1.75rem] font-semibold leading-tight tracking-normal">
          App do entregador
        </h1>
        <p className="mt-2 max-w-[20rem] text-[15px] leading-6 text-white/85">
          Entre com a conta da loja para ver seus pedidos.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <LoginInviteRedirect />
        <LoginForm variante="app" />
      </div>
    </div>
  )
}
