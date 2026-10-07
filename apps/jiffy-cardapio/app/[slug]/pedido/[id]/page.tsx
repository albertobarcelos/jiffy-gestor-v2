import { DeliveryPublicoPedidoConfirmadoScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoPedidoConfirmadoScreen'

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export default async function CardapioPedidoConfirmadoPage({ params }: PageProps) {
  const { slug: rawSlug, id: rawId } = await params
  const slug = rawSlug?.trim() ?? ''
  const pedidoId = rawId?.trim() ?? ''

  return <DeliveryPublicoPedidoConfirmadoScreen slug={slug} pedidoId={pedidoId} />
}
