'use client'

import { useParams } from 'next/navigation'
import CardapioCatalogoScreen from '@/src/presentation/components/features/cardapio-digital/CardapioCatalogoScreen'

export default function CardapioCatalogoPage() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''
  return <CardapioCatalogoScreen slug={slug} />
}
