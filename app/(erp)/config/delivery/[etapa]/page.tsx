import { notFound } from 'next/navigation'
import { ConfiguracoesDeliveryScreen } from '@/src/presentation/components/features/configuracoes/ConfiguracoesDeliveryScreen'
import { deliveryEtapaIdFromSlug } from '@/src/shared/constants/configuracoesRoutes'

/** `/config/delivery/:etapa` — ex.: `/config/delivery/cobertura`. */
export default async function ConfigDeliveryEtapaPage({
  params,
}: {
  params: Promise<{ etapa: string }>
}) {
  const { etapa } = await params
  const etapaId = deliveryEtapaIdFromSlug(etapa)
  if (!etapaId) notFound()

  return <ConfiguracoesDeliveryScreen etapaId={etapaId} />
}
