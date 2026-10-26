import type { Viewport } from 'next'
import { Suspense } from 'react'
import { LoginPageGate } from '@/src/presentation/components/features/auth/LoginPageGate'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Carregando…
        </div>
      }
    >
      <LoginPageGate />
    </Suspense>
  )
}
