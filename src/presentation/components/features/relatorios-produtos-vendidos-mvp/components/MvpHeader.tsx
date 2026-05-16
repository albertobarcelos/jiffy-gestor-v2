'use client'

export function MvpHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Produtos vendidos · MVP
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Visão paralela ao relatório clássica: KPIs, participação por grupo (categoria) e tendência dos
          principais SKU por valor. Comparativo opcional quando o período não excede cerca de 95 dias — ver
          aviso quando estiver omitido.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled
          title="Exportação CSV/Excel será habilitada em breve."
          className="cursor-not-allowed rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-400 dark:border-gray-600 dark:text-gray-500"
        >
          Exportar (em breve)
        </button>
      </div>
    </header>
  )
}
