import { MeusAppsTopNav } from '@/src/presentation/components/features/meus-apps/components/MeusAppsTopNav'

/**
 * Layout da página de perfil — mesma barra do hub (Meus Aplicativos).
 */
export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <MeusAppsTopNav />

      <main>{children}</main>
    </div>
  )
}

