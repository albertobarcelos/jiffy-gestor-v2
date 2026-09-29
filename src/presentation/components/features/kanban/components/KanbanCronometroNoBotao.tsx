import type { TomTempoPedidoKanban } from '../utils/kanbanPedidoTempo'

export function KanbanCronometroNoBotao(props: {
  rotulo: string
  tom?: TomTempoPedidoKanban
}) {
  const { rotulo, tom } = props
  const classe =
    tom === 'atraso'
      ? 'bg-red-500 text-white'
      : tom === 'alerta'
        ? 'bg-orange-400 text-orange-950'
        : 'bg-white/20 text-white'

  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[12px] font-bold tabular-nums leading-none tracking-wide ${classe}`}
      title="Tempo de preparo"
    >
      {rotulo}
    </span>
  )
}
