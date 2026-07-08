'use client'

type DeliveryStatusHorarioProps = {
  disponivel: boolean
  horarioTexto: string
}

export function DeliveryStatusHorario({ disponivel, horarioTexto }: DeliveryStatusHorarioProps) {
  return (
    <div className="mt-2 flex items-center gap-2 px-4 text-xs sm:text-sm">
      <span
        className={`rounded px-2 py-0.5 font-semibold ${
          disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {disponivel ? 'Disponível' : 'Indisponível'}
      </span>
      <span className="text-gray-500">{horarioTexto}</span>
    </div>
  )
}
