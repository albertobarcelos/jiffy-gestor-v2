import { redirect } from 'next/navigation'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

/** Fluxo migrado para painel lateral na lista (`?modalNovaTaxaOpen=true`). */
export default function NovaTaxaLegacyPage() {
<<<<<<<< HEAD:app/taxas/novo/page.tsx
  redirect(`${configuracoesTabPath('taxas')}?modalNovaTaxaOpen=true`)
========
  redirect('/taxas?modalNovaTaxaOpen=true')
>>>>>>>> main:app/(erp)/taxas/novo/page.tsx
}
