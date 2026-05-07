import Link from 'next/link'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'

export default function RedefinirSenhaSucessoPage() {
  return (
    <AuthPublicShell title="Senha alterada com sucesso!" subtitle="Você já pode entrar com a nova senha.">
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex w-full justify-center py-3 px-4 rounded-lg font-semibold text-white bg-[var(--color-alternate)] hover:opacity-95"
        >
          Ir para o login
        </Link>
      </div>
    </AuthPublicShell>
  )
}
