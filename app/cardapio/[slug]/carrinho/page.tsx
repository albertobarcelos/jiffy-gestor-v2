'use client'

import { useParams } from 'next/navigation'
import { DeliveryPublicoCarrinhoScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoCarrinhoScreen'

export default function DeliveryPublicoCarrinhoPage() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''

  return <DeliveryPublicoCarrinhoScreen slug={slug} />
}
