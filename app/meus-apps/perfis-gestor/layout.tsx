/**
 * Sub-rota do hub: gestão de perfis gestor sem TopNav do ERP (sessão já na empresa).
 */
export default function PerfisGestorHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="min-h-0 min-w-0">{children}</main>
    </div>
  )
}
