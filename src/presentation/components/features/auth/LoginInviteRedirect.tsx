'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { decodeInvitePayloadFromLoginSearch } from '@/src/presentation/components/features/auth/utils/inviteLoginPayload'

/**
 * Convite por e-mail: `/login?p=<base64url>` (preferido) ou legado `email` + `novousuario`.
 * Novo usuário → redireciona para cadastro com `fluxo=convite`.
 */
export function LoginInviteRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const decoded = decodeInvitePayloadFromLoginSearch(searchParams)

  const novousuario =
    decoded?.nu === true || searchParams.get('novousuario') === 'true'
  const email = decoded?.email ?? searchParams.get('email')
  const conviteId = decoded?.cid ?? searchParams.get('conviteId')

  useEffect(() => {
    if (!novousuario) {
      return
    }
    const q = new URLSearchParams()
    if (email?.trim()) {
      q.set('email', email.trim())
    }
    if (conviteId?.trim()) {
      q.set('conviteId', conviteId.trim())
    }
    q.set('fluxo', 'convite')
    router.replace(`/registro?${q.toString()}`)
  }, [router, novousuario, email, conviteId])

  return null
}
