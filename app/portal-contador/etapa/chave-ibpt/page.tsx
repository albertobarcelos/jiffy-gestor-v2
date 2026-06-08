'use client'

import { PainelContadorEtapaPage } from '@/src/presentation/components/features/painel-contador/PainelContadorEtapaPage'
import { PAINEL_CONTADOR_ETAPAS } from '@/src/presentation/components/features/painel-contador/painelContadorEtapas'

export default function ChaveIbptPage() {
  const etapa = PAINEL_CONTADOR_ETAPAS.find((e) => e.id === 'etapa-5-chave-ibpt')!
  return <PainelContadorEtapaPage etapa={etapa} />
}
