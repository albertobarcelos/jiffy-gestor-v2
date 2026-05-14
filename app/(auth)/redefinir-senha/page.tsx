import { Suspense } from 'react'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'
import { RedefinirSenhaForm } from '@/src/presentation/components/features/auth/RedefinirSenhaForm'

export default function RedefinirSenhaPage() {
  return (
    <AuthPublicShell title="Redefinir senha" subtitle="Escolha uma nova senha forte para sua conta.">
      <Suspense
        fallback={
          <p className="text-center text-primary-text" role="status">
            Carregando…
          </p>
        }
      >
        <RedefinirSenhaForm />
      </Suspense>
    </AuthPublicShell>
  )
}
