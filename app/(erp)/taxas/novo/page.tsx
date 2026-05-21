import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** Fluxo migrado para painel lateral na lista (`?modalNovaTaxaOpen=true`). */
export default function NovaTaxaLegacyPage() {
  redirect(`${configuracoesTabPath('taxas')}?modalNovaTaxaOpen=true`)
}
