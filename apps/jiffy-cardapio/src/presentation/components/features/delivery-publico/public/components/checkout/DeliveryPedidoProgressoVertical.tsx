import {
  montarEtapasAcompanhamentoPedido,
  type EstadoEtapaAcompanhamento,
  type EtapaAcompanhamentoPedido,
  type StatusAcompanhamentoPedido,
} from '@/src/domain/services/pedido/etapasAcompanhamentoPedido'
import type { DeliveryTipoEntrega } from '@/src/domain/types/entrega'

type DeliveryPedidoProgressoVerticalProps = {
  tipoEntrega: DeliveryTipoEntrega
  statusDelivery: StatusAcompanhamentoPedido
}

function corTexto(estado: EstadoEtapaAcompanhamento, cancelado: boolean): string {
  if (cancelado) return 'var(--delivery-text-primary)'
  if (estado === 'futuro') return 'var(--delivery-text-secondary)'
  return 'var(--delivery-text-primary)'
}

function Rotulo({ etapa }: { etapa: EtapaAcompanhamentoPedido }) {
  const cancelado = etapa.status === 'CANCELADO'
  return (
    <span
      className={etapa.estado === 'atual' ? 'text-sm font-semibold' : 'text-sm'}
      style={{ color: corTexto(etapa.estado, cancelado) }}
    >
      {etapa.rotulo}
    </span>
  )
}

function Ponto({ estado, cancelado }: { estado: EstadoEtapaAcompanhamento; cancelado: boolean }) {
  const atual = estado === 'atual'
  const feito = estado === 'feito'
  const preenchido = atual || feito || cancelado

  return (
    <span
      className="block rounded-full"
      style={{
        width: atual ? '0.875rem' : '0.625rem',
        height: atual ? '0.875rem' : '0.625rem',
        backgroundColor: preenchido
          ? 'var(--delivery-primary, #111111)'
          : 'var(--delivery-surface, #ffffff)',
        boxShadow: preenchido
          ? undefined
          : 'inset 0 0 0 2px var(--delivery-border, #d4d4d4)',
      }}
    />
  )
}

export function DeliveryPedidoProgressoVertical({
  tipoEntrega,
  statusDelivery,
}: DeliveryPedidoProgressoVerticalProps) {
  const etapas = montarEtapasAcompanhamentoPedido(tipoEntrega, statusDelivery)
  const indiceAtual = Math.max(
    0,
    etapas.findIndex(etapa => etapa.estado === 'atual')
  )
  const progresso = etapas.length <= 1 ? 1 : indiceAtual / (etapas.length - 1)

  return (
    <ol aria-label="Andamento do pedido" className="relative mt-4 w-full list-none">
      <span
        className="pointer-events-none absolute bottom-4 left-1/2 top-4 w-px -translate-x-1/2"
        style={{ backgroundColor: 'var(--delivery-border, #d4d4d4)' }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-1/2 top-4 w-px -translate-x-1/2"
        style={{
          height: `calc((100% - 2rem) * ${progresso})`,
          backgroundColor: 'var(--delivery-primary, #111111)',
        }}
        aria-hidden
      />
      {etapas.map(etapa => (
        <li
          key={etapa.status}
          aria-current={etapa.estado === 'atual' ? 'step' : undefined}
          className="grid grid-cols-[1fr_1.75rem_1fr] items-center py-2.5"
        >
          <div className={etapa.lado === 'esquerda' ? 'pr-3 text-right' : ''}>
            {etapa.lado === 'esquerda' ? <Rotulo etapa={etapa} /> : null}
          </div>
          <div className="relative z-[1] flex justify-center">
            <Ponto estado={etapa.estado} cancelado={etapa.status === 'CANCELADO'} />
          </div>
          <div className={etapa.lado === 'direita' ? 'pl-3 text-left' : ''}>
            {etapa.lado === 'direita' ? <Rotulo etapa={etapa} /> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
