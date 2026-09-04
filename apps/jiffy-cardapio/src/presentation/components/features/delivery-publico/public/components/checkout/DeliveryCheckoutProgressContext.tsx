'use client'

import { createContext, type ReactNode, useContext } from 'react'
import type { DeliveryCheckoutProgress } from './deliveryCheckoutProgress'

const DeliveryCheckoutProgressContext = createContext<DeliveryCheckoutProgress | null>(null)

type DeliveryCheckoutProgressProviderProps = {
  value: DeliveryCheckoutProgress | null
  children: ReactNode
}

export function DeliveryCheckoutProgressProvider({
  value,
  children,
}: DeliveryCheckoutProgressProviderProps) {
  return (
    <DeliveryCheckoutProgressContext.Provider value={value}>
      {children}
    </DeliveryCheckoutProgressContext.Provider>
  )
}

export function useDeliveryCheckoutProgress(): DeliveryCheckoutProgress | null {
  return useContext(DeliveryCheckoutProgressContext)
}
