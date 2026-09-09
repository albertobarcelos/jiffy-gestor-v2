import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

export default function CadastroPorPlanilhaPage() {
  redirect(configuracoesTabPath('importar-dados'))
}
