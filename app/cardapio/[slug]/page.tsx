'use client'

import { useParams } from 'next/navigation'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'

export default function DeliveryPublicoSlugPage() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''

  return <DeliveryPublicoHomeScreen slug={slug} />
}
