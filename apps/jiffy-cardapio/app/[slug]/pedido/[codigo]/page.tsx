import { DeliveryPublicoPedidoConfirmadoScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoPedidoConfirmadoScreen'
import { exigirSlugPublicoDaPagina } from '@/src/infrastructure/seo/exigirSlugPublicoDaPagina'

type PageProps = {
  params: Promise<{ slug: string; codigo: string }>
}

export default async function CardapioPedidoConfirmadoPage({ params }: PageProps) {
  const { slug: rawSlug, codigo: rawCodigo } = await params
  const codigo = rawCodigo?.trim() ?? ''
  const slug = exigirSlugPublicoDaPagina(rawSlug, `/pedido/${encodeURIComponent(codigo)}`)

  return <DeliveryPublicoPedidoConfirmadoScreen slug={slug} codigo={codigo} />
}
