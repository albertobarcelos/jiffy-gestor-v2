'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { PORTAL_CONTADOR_PATH } from '@/src/presentation/components/features/painel-contador/painelContadorEtapas'

/** Chave IBPT agora faz parte de Configurações Fiscais (etapa 1). */
export default function ChaveIbptPage() {
  const router = useRouter()
  const { addTab } = useTabsStore()

  useEffect(() => {
    addTab({
      id: 'etapa-1-dados-fiscais',
      label: 'Configurações Fiscais',
      path: PORTAL_CONTADOR_PATH,
    })
    router.replace(`${PORTAL_CONTADOR_PATH}/etapa/dados-fiscais`)
  }, [addTab, router])

  return null
}
