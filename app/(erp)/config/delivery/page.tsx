import { redirect } from 'next/navigation'
import { ConfiguracoesDeliveryScreen } from '@/src/presentation/components/features/configuracoes/ConfiguracoesDeliveryScreen'
import {
  deliveryHubEtapaPath,
  isDeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'

type SearchParams = Promise<{ abrir?: string }>

/** `/config/delivery` — hub. `?abrir=delivery-cobertura` redireciona para a etapa. */
export default async function ConfigDeliveryHubPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { abrir } = await searchParams
  if (abrir && isDeliveryEtapaId(abrir)) {
    redirect(deliveryHubEtapaPath(abrir))
  }

  return <ConfiguracoesDeliveryScreen />
}
