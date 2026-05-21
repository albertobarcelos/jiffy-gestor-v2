import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** Rota antiga: lista de meios de pagamento em Configurações. */
export default function MeiosPagamentosLegacyPage() {
  redirect(configuracoesTabPath('meios-pagamentos'))
}
