import { redirect } from 'next/navigation'

/** Fluxo migrado para painel lateral na lista (`?modalNovaTaxaOpen=true`). */
export default function NovaTaxaLegacyPage() {
  redirect('/cadastros/taxas?modalNovaTaxaOpen=true')
}
