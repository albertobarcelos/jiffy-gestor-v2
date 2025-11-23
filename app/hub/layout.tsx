'use client'

export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout sem sidebar e header para o Hub
  return <>{children}</>
}

