import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** Lista de meios de pagamento em Configurações. */
export default function MeiosPagamentosPage() {
  redirect(configuracoesTabPath('meios-pagamentos'))
}

