'use client'

import Image from 'next/image'
import { LoginForm } from '@/src/presentation/components/features/auth/LoginForm'
import { LoginInviteRedirect } from '@/src/presentation/components/features/auth/LoginInviteRedirect'
import { ExpedicaoAppPwaPortao } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppPwaPortao'

export function ExpedicaoAppLoginScreen() {
  return (
    <ExpedicaoAppPwaPortao>
      <div className="expedicao-app-login flex h-dvh flex-col bg-secondary text-zinc-900">
        <header className="px-6 pb-10 pt-[max(2.25rem,env(safe-area-inset-top))] text-white">
          <Image
            src="/images/expedicao/logo_app.png"
            alt="JiffyGO"
            width={96}
            height={96}
            className="h-24 w-24 rounded-[1.5rem] bg-white shadow-sm"
            priority
          />
          <h1 className="mt-6 text-[1.75rem] font-semibold leading-tight tracking-normal">
            Entre na loja
          </h1>
          <p className="mt-2 max-w-[20rem] text-[15px] leading-6 text-white/85">
            Use a conta da loja para ver seus pedidos.
          </p>
        </header>
        <div className="min-h-0 flex-1 rounded-t-3xl bg-zinc-50 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
          <LoginInviteRedirect />
          <LoginForm variante="app" />
        </div>
      </div>
    </ExpedicaoAppPwaPortao>
  )
}
