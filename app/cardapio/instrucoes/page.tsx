'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deliveryPublicoInstrucoesPath } from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

/**
 * Redirect legado: `/cardapio/instrucoes` → `/delivery/instrucoes`.
 */
export default function CardapioInstrucoesLegacyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(deliveryPublicoInstrucoesPath())
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400" />
    </div>
  )
}
