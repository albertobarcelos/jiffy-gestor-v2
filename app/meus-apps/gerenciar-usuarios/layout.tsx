/**
 * Sub-rota do hub: gestão de convites sem TopNav do ERP (sessão já na empresa).
 */
export default function GerenciarUsuariosLayout({
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
