import { Suspense } from 'react'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'
import { RegistroForm } from '@/src/presentation/components/features/auth/RegistroForm'

export default function RegistroPage() {
  return (
    <AuthPublicShell title="Criar conta" subtitle="Preencha os dados para se cadastrar no Jiffy Gestor.">
      <Suspense
        fallback={
          <p className="text-center text-primary-text" role="status">
            Carregando…
          </p>
        }
      >
        <RegistroForm />
      </Suspense>
    </AuthPublicShell>
  )
}
