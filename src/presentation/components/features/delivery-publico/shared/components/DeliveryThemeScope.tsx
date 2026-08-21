'use client'

import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { useDeliveryPublicoTheme } from '../hooks/useDeliveryPublicoTheme'

type DeliveryThemeContextValue = {
  config: DeliveryPublicoDesignConfig
  themeStyle: CSSProperties
}

const DeliveryThemeContext = createContext<DeliveryThemeContextValue | null>(null)

export function useDeliveryThemeContext(): DeliveryThemeContextValue {
  const ctx = useContext(DeliveryThemeContext)
  if (!ctx) {
    throw new Error('useDeliveryThemeContext deve ser usado dentro de DeliveryThemeScope')
  }
  return ctx
}

type DeliveryThemeScopeProps = {
  slug: string
  nomeExibicaoFallback?: string
  empresa?: EmpresaPublicaDTO | null
  className?: string
  children: ReactNode
  loadingFallback?: ReactNode
}

function DeliveryThemeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div
        className="h-12 w-12 animate-spin rounded-full border-b-2"
        style={{ borderColor: 'var(--delivery-primary, #8338EC)' }}
      />
    </div>
  )
}

/**
 * Aplica paleta/tipografia publicada num escopo isolado (home, modal, carrinho).
 */
export function DeliveryThemeScope({
  slug,
  nomeExibicaoFallback,
  empresa,
  className,
  children,
  loadingFallback,
}: DeliveryThemeScopeProps) {
  const { config, themeStyle, hydrated } = useDeliveryPublicoTheme({
    slug,
    nomeExibicaoFallback,
    empresa,
  })

  if (!hydrated) {
    return loadingFallback ?? <DeliveryThemeLoading />
  }

  return (
    <DeliveryThemeContext.Provider value={{ config, themeStyle }}>
      <div
        className={`delivery-theme @container min-h-full w-full min-w-0 overflow-x-clip ${className ?? ''}`.trim()}
        style={themeStyle}
      >
        {children}
      </div>
    </DeliveryThemeContext.Provider>
  )
}
