'use client'

import { useSearchParams } from 'next/navigation'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'
import { LoginForm } from '@/src/presentation/components/features/auth/LoginForm'
import { LoginHeading } from '@/src/presentation/components/features/auth/LoginHeading'
import { LoginInviteRedirect } from '@/src/presentation/components/features/auth/LoginInviteRedirect'
import { ExpedicaoAppLoginScreen } from '@/src/presentation/expedicao/app/login/ExpedicaoAppLoginScreen'
import { isSuperficieExpedicaoApp } from '@/src/presentation/expedicao/sessao/sinalExpedicao'

export function LoginPageGate() {
  const search = useSearchParams()
  const host = typeof window !== 'undefined' ? window.location.host : ''
  if (
    isSuperficieExpedicaoApp({
      pathname: '/login',
      search: search.toString(),
      host,
    })
  ) {
    return <ExpedicaoAppLoginScreen />
  }

  return (
    <AuthPublicShell title="Login" panelDismissible={false} headingSlot={<LoginHeading />}>
      <LoginInviteRedirect />
      <LoginForm />
    </AuthPublicShell>
  )
}
