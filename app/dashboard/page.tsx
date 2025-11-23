import { MetricCards } from '@/src/presentation/components/features/dashboard/MetricCards'
import { UltimasVendas } from '@/src/presentation/components/features/dashboard/UltimasVendas'
import { GraficoVendasLinha } from '@/src/presentation/components/features/dashboard/GraficoVendasLinha'
import { TabelaTopProdutos } from '@/src/presentation/components/features/dashboard/TabelaTopProdutos'

/**
 * Página do dashboard
 * Design clean e minimalista inspirado em sistemas POS modernos
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <MetricCards />

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - 2 colunas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfico de evolução */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Evolução de Vendas</h3>
              <p className="text-sm text-gray-500">Últimos três meses</p>
            </div>
            <GraficoVendasLinha periodo="mes" />
          </div>

          {/* Tabela de top produtos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Produtos</h3>
              <p className="text-sm text-gray-500">Mais vendidos</p>
            </div>
            <TabelaTopProdutos periodo="mes" />
          </div>
        </div>

        {/* Coluna direita - Últimas Vendas */}
        <div className="lg:col-span-1">
          <UltimasVendas />
        </div>
      </div>
    </div>
  )
}
