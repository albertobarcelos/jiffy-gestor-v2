'use client'

import { useParams } from 'next/navigation'
import CarrinhoPublicoScreen from '@/src/presentation/components/features/cardapio-digital/CarrinhoPublicoScreen'

export default function CardapioCarrinhoPage() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''
  return <CarrinhoPublicoScreen slug={slug} />
}
