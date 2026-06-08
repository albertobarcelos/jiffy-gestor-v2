'use client'

import { PainelContadorEtapaPage } from '@/src/presentation/components/features/painel-contador/PainelContadorEtapaPage'
import { PAINEL_CONTADOR_ETAPAS } from '@/src/presentation/components/features/painel-contador/painelContadorEtapas'

export default function CenarioFiscalPage() {
  const etapa = PAINEL_CONTADOR_ETAPAS.find((e) => e.id === 'etapa-3-cenario-fiscal')!
  return <PainelContadorEtapaPage etapa={etapa} />
}
