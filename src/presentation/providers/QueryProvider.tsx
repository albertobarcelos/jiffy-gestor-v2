'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'

/**
 * Provider do React Query com configurações otimizadas
 * 
 * Configurações:
 * - staleTime: 5 minutos - dados considerados frescos por 5min
 * - gcTime: 10 minutos - cache mantido por 10min após último uso
 * - retry: 1 tentativa em caso de erro
 * - refetchOnWindowFocus: false - não refaz requisição ao focar janela
 * - refetchOnReconnect: true - refaz requisição ao reconectar
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Dados são considerados "frescos" por 5 minutos
            // Durante esse tempo, não faz nova requisição mesmo se componente re-renderizar
            staleTime: 1000 * 60 * 5, // 5 minutos

            // Cache é mantido por 10 minutos após último uso
            // Após isso, dados são removidos da memória
            gcTime: 1000 * 60 * 10, // 10 minutos (anteriormente cacheTime)

            // Retry automático: 1 tentativa em caso de erro
            retry: 1,

            // Não refaz requisição automaticamente ao focar a janela
            // Melhora performance e reduz requisições desnecessárias
            refetchOnWindowFocus: false,

            // Refaz requisição ao reconectar à internet
            refetchOnReconnect: true,

            // Não refaz requisição ao montar componente se dados estão frescos
            refetchOnMount: false,
          },
          mutations: {
            // Retry automático para mutations: 0 (não tenta novamente)
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

