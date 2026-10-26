'use client'

interface PizzaCategoriaSetupPlaceholderStepProps {
  titulo: string
  descricao: string
}

export function PizzaCategoriaSetupPlaceholderStep({
  titulo,
  descricao,
}: PizzaCategoriaSetupPlaceholderStepProps) {
  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <h2 className="text-base font-semibold text-primary-text">{titulo}</h2>
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-secondary-text">
        {descricao}
      </p>
    </div>
  )
}
