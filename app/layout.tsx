import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/src/presentation/providers/ThemeProvider'
import { QueryProvider } from '@/src/presentation/providers/QueryProvider'
import { DocumentoFiscalPdfRetryModal } from '@/src/presentation/components/features/nfe/DocumentoFiscalPdfRetryModal'
import './globals.css'

/**
 * General Sans (variável, 200–700) — self-hosted em app/fonts/general-sans/
 * Variável CSS --font-general-sans para Tailwind (font-sans, etc.)
 */
const generalSans = localFont({
  src: './fonts/general-sans/GeneralSans-Variable.woff2',
  variable: '--font-general-sans',
  weight: '200 700',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Jiffy Gestor - Sistema de Gestão',
  description: 'Sistema de gestão empresarial Jiffy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={generalSans.variable}>
      {/* suppressHydrationWarning: extensões (ex. ColorZilla) injetam atributos no body e disparam falso positivo de hidratação */}
      <body className={`${generalSans.className} antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider>
            {children}
            <DocumentoFiscalPdfRetryModal />
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
