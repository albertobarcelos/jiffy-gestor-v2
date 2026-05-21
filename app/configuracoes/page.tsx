import { redirect } from 'next/navigation'
import {
  configuracoesTabPath,
  resolveConfiguracoesTabFromLegacyQuery,
} from '@/src/shared/constants/configuracoesRoutes'

type SearchParams = Promise<{ tab?: string }>

/** `/configuracoes` → `/configuracoes/empresa` (ou aba legada em `?tab=`). */
export default async function ConfiguracoesIndexPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { tab } = await searchParams
  const slug = resolveConfiguracoesTabFromLegacyQuery(tab)
  redirect(configuracoesTabPath(slug))
}
