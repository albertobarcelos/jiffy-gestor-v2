import { DeliveryPublicoPedidoConfirmadoScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoPedidoConfirmadoScreen'

type PageProps = {
  params: Promise<{ slug: string; codigo: string }>
}

export default async function CardapioPedidoConfirmadoPage({ params }: PageProps) {
  const { slug: rawSlug, codigo: rawCodigo } = await params
  const slug = rawSlug?.trim() ?? ''
  const codigo = rawCodigo?.trim() ?? ''

  return <DeliveryPublicoPedidoConfirmadoScreen slug={slug} codigo={codigo} />
}
