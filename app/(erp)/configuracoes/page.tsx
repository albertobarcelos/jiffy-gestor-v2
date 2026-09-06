import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** `/configuracoes` → aba Empresa. */
export default function ConfiguracoesIndexPage() {
  redirect(configuracoesTabPath('empresa'))
}
