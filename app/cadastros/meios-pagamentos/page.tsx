import { redirect } from 'next/navigation'

/** Rota antiga: lista de meios de pagamento em Configurações → Meios de pagamento. */
export default function MeiosPagamentosLegacyPage() {
  redirect('/configuracoes?tab=meios-pagamentos')
}

