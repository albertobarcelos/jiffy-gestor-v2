import { DeliveryPublicoPedidoConfirmadoScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoPedidoConfirmadoScreen'
import { exigirSlugPublicoDaPagina } from '@/src/infrastructure/seo/exigirSlugPublicoDaPagina'

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function CardapioPedidoConfirmadoPage({ params }: PageProps) {
  const { slug: rawSlug, id: rawId } = await params
  const pedidoId = rawId?.trim() ?? ''
  const slug = exigirSlugPublicoDaPagina(rawSlug, `/pedido/${encodeURIComponent(pedidoId)}`)

  return <DeliveryPublicoPedidoConfirmadoScreen slug={slug} pedidoId={pedidoId} />
}
