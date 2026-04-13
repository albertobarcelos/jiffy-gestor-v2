import { redirect } from 'next/navigation'

/** Rota antiga: importação em massa passou para Configurações → Cadastro por planilha. */
export default function CadastroPorPlanilhaLegacyPage() {
  redirect('/configuracoes?tab=planilha')
}
