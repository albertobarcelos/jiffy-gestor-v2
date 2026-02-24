'use client'

import React from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { MdSettings } from 'react-icons/md'

/**
 * ETAPA 4 - Cenário Fiscal
 * 
 * Card simples e bonito similar ao Certificado Digital.
 * Ao clicar em "Configurar", abre nova aba com a tabela de NCMs (MapearProdutosView).
 */
export function Etapa4CenarioFiscal() {
  const { addTab } = useTabsStore()

  const handleOpenConfigNCM = () => {
    addTab({
      id: 'config-ncm-cest',
      label: 'Configurar NCM/CEST',
      path: '/painel-contador/config/ncm-cest',
    })
  }

  return (
    <>
      <div className="flex flex-row w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
        <div className="flex flex-col gap-1 px-4">
          <p className="font-inter font-medium text-secondary-text text-xs text-justify lg:text-sm">
            Configure impostos por NCM. Uma configuração vale para todos os produtos com o mesmo NCM.
          </p>
          <p className="font-inter font-medium text-secondary-text text-xs text-justify lg:text-sm">
            Configure também as regras da Reforma Tributária por NCM.
          </p>
        </div>
        <div className="flex flex-col w-full mb-2 items-center rounded-[10px] px-3 py-1 gap-2">
          <Button
            onClick={handleOpenConfigNCM}
            className="rounded-lg gap-2 px-3 py-2 text-white text-sm font-medium"
            sx={{
              backgroundColor: 'var(--color-secondary)',
              '&:hover': { backgroundColor: 'var(--color-alternate)' },
            }}
          >
            <MdSettings size={18} />
            Configurar
          </Button>
        </div>
      </div>
    </>
  )
}
