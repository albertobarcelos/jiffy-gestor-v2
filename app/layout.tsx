import type { Metadata } from 'next'
import { Exo_2, Manrope } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/src/presentation/providers/ThemeProvider'
import { QueryProvider } from '@/src/presentation/providers/QueryProvider'
import { PermissionsLoader } from '@/src/presentation/components/auth/PermissionsLoader'
import './globals.css'

// Exo 2 - Fonte para textos normais (corpo do texto)
const exo2 = Exo_2({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-exo2',
  display: 'swap',
})

// Manrope - Fonte para títulos
const manrope = Manrope({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Jiffy Gestor - Sistema de Gestão',
  description: 'Sistema de gestão empresarial Jiffy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${exo2.variable} ${manrope.variable} ${exo2.className}`}>
        <QueryProvider>
          <ThemeProvider>
            <PermissionsLoader />
            {children}
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

