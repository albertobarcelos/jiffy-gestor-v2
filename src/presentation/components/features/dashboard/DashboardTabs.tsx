'use client'

import { useState } from 'react'
import { MdPointOfSale, MdInventory, MdPeople, MdAccountBalance } from 'react-icons/md'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/presentation/components/ui/tabs'
import { Card } from '@/src/presentation/components/ui/card'
import { GraficoVendasLinha } from './GraficoVendasLinha'
import { GraficoVendasTerminal } from './GraficoVendasTerminal'
import { TabelaTopProdutos } from './TabelaTopProdutos'
import { PeriodoFilter, PeriodoType } from './PeriodoFilter'

/**
 * Tabs do dashboard
 * Design moderno inspirado em sistemas POS internacionais
 */
export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState(0)
  const [periodo, setPeriodo] = useState<PeriodoType>('hoje')

  const tabs = [
    { name: 'Vendas PDV', id: 'vendas', icon: MdPointOfSale },
    { name: 'Estoque', id: 'estoque', icon: MdInventory },
    { name: 'Pessoas', id: 'pessoas', icon: MdPeople },
    { name: 'Financeiro', id: 'financeiro', icon: MdAccountBalance },
  ]

  return (
    <Card>
      <Tabs defaultValue="vendas" className="w-full">
        <div className="bg-primary-bg/50 border-b border-secondary/10 px-6">
          <TabsList className="bg-transparent h-auto p-0">
            {tabs.map((tab) => {
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none"
                />
              )
            })}
          </TabsList>
        </div>

        <div className="p-8 min-h-[400px]">
          <TabsContent value="vendas" className="mt-0">
            <VendasPdvTab periodo={periodo} onPeriodoChanged={setPeriodo} />
          </TabsContent>
          <TabsContent value="estoque" className="mt-0">
            <EstoqueTab />
          </TabsContent>
          <TabsContent value="pessoas" className="mt-0">
            <PessoasTab />
          </TabsContent>
          <TabsContent value="financeiro" className="mt-0">
            <FinanceiroTab />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}

function VendasPdvTab({
  periodo,
  onPeriodoChanged,
}: {
  periodo: PeriodoType
  onPeriodoChanged: (periodo: PeriodoType) => void
}) {
  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex justify-end">
        <PeriodoFilter periodoInicial={periodo} onPeriodoChanged={onPeriodoChanged} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoVendasLinha periodo={periodo} />
        <GraficoVendasTerminal periodo={periodo} />
      </div>

      {/* Tabela de top produtos */}
      <TabelaTopProdutos periodo={periodo} />
    </div>
  )
}

function EstoqueTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <MdInventory className="w-10 h-10 text-primary" />
      </div>
      <p className="text-lg font-exo font-semibold text-primary-text mb-2">
        Análise de Estoque
      </p>
      <p className="text-sm text-tertiary font-nunito">
        Em desenvolvimento...
      </p>
    </div>
  )
}

function PessoasTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <MdPeople className="w-10 h-10 text-primary" />
      </div>
      <p className="text-lg font-exo font-semibold text-primary-text mb-2">
        Gestão de Pessoas
      </p>
      <p className="text-sm text-tertiary font-nunito">
        Em desenvolvimento...
      </p>
    </div>
  )
}

function FinanceiroTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <MdAccountBalance className="w-10 h-10 text-primary" />
      </div>
      <p className="text-lg font-exo font-semibold text-primary-text mb-2">
        Análise Financeira
      </p>
      <p className="text-sm text-tertiary font-nunito">
        Em desenvolvimento...
      </p>
    </div>
  )
}
