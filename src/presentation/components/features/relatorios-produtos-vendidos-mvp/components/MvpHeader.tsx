'use client'

export function MvpHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Produtos vendidos · MVP
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
        Visão paralela ao relatório clássico: KPIs, participação por grupo (categoria) e tendência dos
        principais produtos por valor. Comparativo opcional quando o período não excede cerca de 95 dias — ver aviso
        quando estiver omitido.
      </p>
    </header>
  )
}
