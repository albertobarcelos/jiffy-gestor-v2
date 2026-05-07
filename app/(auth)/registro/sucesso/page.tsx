import Link from 'next/link'
import { AuthPublicShell } from '@/src/presentation/components/features/auth/components/AuthPublicShell'

export default function RegistroSucessoPage({
  searchParams,
}: {
  searchParams: { ativo?: string }
}) {
  const isAtivo = searchParams.ativo === 'true'

  return (
    <AuthPublicShell
      title="Cadastro realizado!"
      subtitle={
        isAtivo
          ? 'Seu cadastro foi finalizado com sucesso!'
          : 'Verifique sua caixa de entrada para confirmar seu e-mail.'
      }
    >
      <div className="space-y-6 text-center">
        <p className="text-sm text-primary-text">
          {isAtivo
            ? 'Você já pode fazer login na plataforma.'
            : 'Assim que confirmar, você poderá fazer login normalmente.'}
        </p>
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
