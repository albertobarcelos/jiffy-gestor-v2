import { Suspense } from 'react'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'
import { ConfirmarEmailClient } from '@/src/presentation/components/features/auth/ConfirmarEmailClient'

export default function ConfirmarEmailPage() {
  return (
    <AuthPublicShell title="Confirmar e-mail" subtitle="Validando seu link de confirmação…">
      <Suspense
        fallback={
          <p className="text-center text-primary-text" role="status">
            Carregando…
          </p>
        }
      >
        <ConfirmarEmailClient />
      </Suspense>
    </AuthPublicShell>
  )
}
