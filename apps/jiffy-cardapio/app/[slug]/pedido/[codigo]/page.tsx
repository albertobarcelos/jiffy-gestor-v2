import type { Metadata } from 'next'
import { DeliveryPublicoPedidoConfirmadoScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoPedidoConfirmadoScreen'
import { carregarEmpresaPublicaSeo } from '@/src/infrastructure/seo/carregarEmpresaPublicaSeo'
import {
  metadataCardapioNaoIndexavel,
  metadataCardapioSlug,
} from '@/src/infrastructure/seo/cardapioSlugMetadata'

type PageProps = {
  params: Promise<{ slug: string; codigo: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim() ?? ''
  const empresa = await carregarEmpresaPublicaSeo(slug)
  if (!empresa) return metadataCardapioNaoIndexavel
  return {
    ...metadataCardapioSlug(empresa),
    robots: { index: false, follow: false },
  }
}

export default async function CardapioPedidoConfirmadoPage({ params }: PageProps) {
  const { slug: rawSlug, codigo: rawCodigo } = await params
  const slug = rawSlug?.trim() ?? ''
  const codigo = rawCodigo?.trim() ?? ''

  return <DeliveryPublicoPedidoConfirmadoScreen slug={slug} codigo={codigo} />
}
