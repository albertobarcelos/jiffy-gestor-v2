import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** Rota antiga: importação em massa em Configurações → Importar dados. */
export default function CadastroPorPlanilhaLegacyPage() {
  redirect(configuracoesTabPath('importar-dados'))
}
