import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'
import { EsqueciSenhaForm } from '@/src/presentation/components/features/auth/EsqueciSenhaForm'

export default function EsqueciSenhaPage() {
  return (
    <AuthPublicShell title="Esqueci minha senha" subtitle="Enviaremos um link para redefinir sua senha.">
      <EsqueciSenhaForm />
    </AuthPublicShell>
  )
}
