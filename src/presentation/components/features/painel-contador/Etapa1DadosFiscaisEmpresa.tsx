'use client'

import React from 'react'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { Button } from '@/src/presentation/components/ui/button'
import { MdSettings } from 'react-icons/md'

export function Etapa1DadosFiscaisEmpresa() {
  const { addTab } = useTabsStore()

  return (
    <div className="flex items-center justify-center p-4">
      <Button
        onClick={() => {
          addTab({
            id: 'config-empresa-completa',
            label: 'Configuração Completa',
            path: '/painel-contador/config/empresa-completa',
          })
        }}
        className="rounded-lg px-4 py-2 text-white text-sm font-medium flex items-center gap-2"
        sx={{
          backgroundColor: 'var(--color-secondary)',
          '&:hover': { backgroundColor: 'var(--color-alternate)' },
        }}
      >
        <MdSettings size={18} />
        Configurar
      </Button>
    </div>
  )
}
