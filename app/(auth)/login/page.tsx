import { Suspense } from 'react'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'
import { LoginForm } from '@/src/presentation/components/features/auth/LoginForm'
import { LoginInviteRedirect } from '@/src/presentation/components/features/auth/LoginInviteRedirect'

/**
 * Página de login — fundo + vídeo à esquerda; formulário no painel lateral (mesmo padrão dos demais fluxos públicos).
 */
export default function LoginPage() {
  return (
    <AuthPublicShell
      title="Login"
      panelDismissible={false}
      headingSlot={
        <>
          <h1 className="text-2xl font-semibold text-primary-text text-center mb-4 font-heading">
            Sua operação mais inteligente
            <span className="block">começa aqui!</span>
          </h1>
          <p className="text-secondary font-semibold text-base text-center mb-8">
            Faça login para acessar o sistema
          </p>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginInviteRedirect />
      </Suspense>
      <Suspense
        fallback={
          <p className="text-center text-sm text-primary-text" role="status">
            Carregando…
          </p>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthPublicShell>
  )
}
