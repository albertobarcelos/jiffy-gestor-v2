'use client'

import { PainelContadorEtapaPage } from '@/src/presentation/components/features/painel-contador/PainelContadorEtapaPage'
import { PAINEL_CONTADOR_ETAPAS } from '@/src/presentation/components/features/painel-contador/painelContadorEtapas'

export default function DadosFiscaisPage() {
  const etapa = PAINEL_CONTADOR_ETAPAS.find((e) => e.id === 'etapa-1-dados-fiscais')!
  return <PainelContadorEtapaPage etapa={etapa} />
}
