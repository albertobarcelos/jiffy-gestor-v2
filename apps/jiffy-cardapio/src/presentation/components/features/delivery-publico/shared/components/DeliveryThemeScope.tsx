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
  /** @deprecated Spinner de tema removido — children pintam com default síncrono. */
  loadingFallback?: ReactNode
}

/**
 * Aplica paleta/tipografia publicada num escopo isolado (home, modal, carrinho).
 * Não bloqueia o first paint: default → merge do localStorage após mount.
 */
export function DeliveryThemeScope({
  slug,
  nomeExibicaoFallback,
  empresa,
  className,
  children,
}: DeliveryThemeScopeProps) {
  const { config, themeStyle } = useDeliveryPublicoTheme({
    slug,
    nomeExibicaoFallback,
    empresa,
  })

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
