import { TopNav } from '@/src/presentation/components/layouts/TopNav'

/**
 * Layout da página de perfil
 * Mantém a navegação superior e estrutura do dashboard
 */
export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegação superior */}
      <TopNav />

      {/* Conteúdo principal */}
      <main>
        {children}
      </main>
    </div>
  )
}

