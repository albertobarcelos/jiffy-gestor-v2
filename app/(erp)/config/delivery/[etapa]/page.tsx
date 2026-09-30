import { notFound } from 'next/navigation'
import { deliveryEtapaIdFromSlug } from '@/src/shared/constants/configuracoesRoutes'

/** `/config/delivery/:etapa` — valida o slug; o layout do hub desenha a tela. */
export default async function ConfigDeliveryEtapaPage({
  params,
}: {
  params: Promise<{ etapa: string }>
}) {
  const { etapa } = await params
  if (!deliveryEtapaIdFromSlug(etapa)) notFound()
  return null
}
