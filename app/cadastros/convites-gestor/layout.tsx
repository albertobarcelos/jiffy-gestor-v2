/**
 * Layout sem TopNav: acesso principal pelo Hub Meus Apps (engrenagem no card).
 * Mantém só fundo e área rolável para parecer tela à parte do ERP.
 */
export default function ConvitesGestorLayout({
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
