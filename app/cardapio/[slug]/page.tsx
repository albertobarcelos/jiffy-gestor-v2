'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CardapioHomeScreen from '@/src/presentation/components/features/cardapio-digital/CardapioHomeScreen'
import {
  flattenCatalogoGrupos,
  listarProdutosFavoritos,
  usePublicDeliveryCatalogPage,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { PublicDeliveryApiError, isPublicDeliverySlugNotFound } from '@/src/infrastructure/api/publicDeliveryApi'

export default function CardapioSlugHomePage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params.slug as string)?.trim() ?? ''

  const { data, isLoading, isError, error } = usePublicDeliveryCatalogPage(slug, {
    offset: 0,
    limit: 20,
  })

  useEffect(() => {
    if (isError && isPublicDeliverySlugNotFound(error)) {
      router.replace('/cardapio/instrucoes')
    }
  }, [isError, error, router])

  if (!slug || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--cardapio-accent-primary)' }}
        />
      </div>
    )
  }

  if (isError) {
    const mensagem =
      error instanceof PublicDeliveryApiError
        ? error.message
        : 'Não foi possível carregar o cardápio.'
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="max-w-md w-full rounded-2xl shadow-xl p-8 text-center"
          style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
        >
          <h1
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--cardapio-text-primary)' }}
          >
            Cardápio indisponível
          </h1>
          <p className="text-sm" style={{ color: 'var(--cardapio-text-secondary)' }}>
            {mensagem}
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const grupos = flattenCatalogoGrupos([data])
  const produtosDestaque = listarProdutosFavoritos(grupos).map(p => ({
    id: p.id,
    nome: p.nome,
    imagemUrl: p.imagemUrl,
    descricao: p.descricao,
    valor: p.valor,
  }))

  return (
    <CardapioHomeScreen
      slug={slug}
      empresa={data.empresa}
      produtosDestaque={produtosDestaque}
    />
  )
}
