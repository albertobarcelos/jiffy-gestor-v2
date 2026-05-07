'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { decodeInvitePayloadFromLoginSearch } from '@/src/presentation/components/features/auth/utils/inviteLoginPayload'

/**
 * Convite por e-mail: `/login?p=<base64url>` (preferido) ou legado `email` + `novousuario`.
 * - Novo usuário (`nu` ou legado) → `/registro?…&novousuario=true`.
 * - Usuário já cadastrado (`cid`, sem `nu`) → normaliza para `/login?email=…` (barra limpa, sem `p`).
 */
export function LoginInviteRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const decodedFromParams = decodeInvitePayloadFromLoginSearch(searchParams)

  /** Gmail às vezes quebra `p=`; `window.location.search` costuma refletir o href completo. */
  const decoded =
    decodedFromParams ??
    (typeof window !== 'undefined'
      ? decodeInvitePayloadFromLoginSearch(window.location.search)
      : null)

  const novousuario =
    decoded?.nu === true || searchParams.get('novousuario') === 'true'
  const email = decoded?.email ?? searchParams.get('email')
  const conviteId = decoded?.cid ?? searchParams.get('conviteId')

  useEffect(() => {
    if (novousuario) {
      const q = new URLSearchParams()
      if (email?.trim()) {
        q.set('email', email.trim())
      }
      if (conviteId?.trim()) {
        q.set('conviteId', conviteId.trim())
      }
      q.set('novousuario', 'true')
      router.replace(`/registro?${q.toString()}`)
      return
    }

    const temPayloadConviteExistente =
      Boolean(decoded?.email?.trim()) &&
      Boolean(decoded?.cid?.trim()) &&
      decoded?.nu !== true

    const aindaTemParamP =
      Boolean(searchParams.get('p')) ||
      (typeof window !== 'undefined' &&
        /(?:^|[?&])p(?:=|%3D)/i.test(window.location.search))

    const emailLimpo = decoded?.email?.trim()
    if (temPayloadConviteExistente && aindaTemParamP && emailLimpo) {
      const q = new URLSearchParams()
      q.set('email', emailLimpo)
      router.replace(`/login?${q.toString()}`)
    }
  }, [
    router,
    novousuario,
    email,
    conviteId,
    decoded?.email,
    decoded?.cid,
    decoded?.nu,
    searchParams,
  ])

  return null
}
