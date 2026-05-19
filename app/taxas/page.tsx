import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** Rota antiga: taxas passaram para Configurações. */
export default function TaxasLegacyPage() {
  redirect(configuracoesTabPath('taxas'))
}
