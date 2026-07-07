'use client'

import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { ImpressoraLogica } from '@/src/infrastructure/api/estacoesImpressaoApi'
import {
  DeliveryModoCupomInfoTooltip,
  DeliveryModoCupomToggle,
} from './DeliveryModoCupomToggle'

function clampCopiasUnificado(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(99, Math.max(1, Math.floor(n)))
}

function DeliveryToggleRow(props: {
  id: string
  checked: boolean
  disabled?: boolean
  onChecked: (v: boolean) => void
  titulo: string
  descricao: string
}) {
  const { id, checked, disabled, onChecked, titulo, descricao } = props
  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-gray-100 ${disabled ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary-text">{titulo}</p>
        <p className="mt-0.5 text-xs text-secondary-text">{descricao}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChecked(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-secondary focus:ring-secondary"
      />
    </label>
  )
}

export type DeliveryPreferenciasImpressaoFormState = {
  modoImpressao: ModoImpressaoDelivery
  copiasUnificado: number
  autoIniciarPreparoNovosPedidos: boolean
  imprimirAoReceber: boolean
  imprimirAoFicarPronto: boolean
  impressoraExpedicaoId: string
}

export function DeliveryPreferenciasImpressaoFields(props: {
  value: DeliveryPreferenciasImpressaoFormState
  onChange: (patch: Partial<DeliveryPreferenciasImpressaoFormState>) => void
  disabled?: boolean
  impressorasLogicas: ImpressoraLogica[]
  idPrefix?: string
}) {
  const {
    value,
    onChange,
    disabled = false,
    impressorasLogicas,
    idPrefix = 'empresa-delivery',
  } = props

  const { modoImpressao, copiasUnificado } = value

  return (
    <div className="space-y-3">
      <DeliveryToggleRow
        id={`${idPrefix}-auto-iniciar-preparo`}
        checked={value.autoIniciarPreparoNovosPedidos}
        disabled={disabled}
        onChecked={v => onChange({ autoIniciarPreparoNovosPedidos: v })}
        titulo="Enviar novos pedidos direto para produção"
        descricao="Quando ativo, pedidos novos entram automaticamente em preparo/produção."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-primary-text">Modo de cupom delivery</span>
        <DeliveryModoCupomInfoTooltip modo={modoImpressao} />
        <DeliveryModoCupomToggle
          value={modoImpressao}
          onChange={modo => onChange({ modoImpressao: modo })}
          disabled={disabled}
        />
      </div>

      {modoImpressao === 'unificado' ? (
        <div className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <label
              htmlFor={`${idPrefix}-copias`}
              className="text-sm font-semibold text-primary-text"
            >
              Quantidade de cópias do cupom unificado
            </label>
            <div className={`flex shrink-0 ${disabled ? 'opacity-60' : ''}`}>
              <input
                id={`${idPrefix}-copias`}
                type="number"
                min={1}
                max={99}
                value={copiasUnificado}
                disabled={disabled}
                onChange={e =>
                  onChange({ copiasUnificado: clampCopiasUnificado(Number(e.target.value)) })
                }
                onBlur={e =>
                  onChange({ copiasUnificado: clampCopiasUnificado(Number(e.target.value)) })
                }
                className="h-8 w-12 rounded-l-lg border border-r-0 border-gray-200 px-2 text-center text-sm tabular-nums outline-none [appearance:textfield] focus:border-secondary disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <div className="flex w-8 flex-col overflow-hidden rounded-r-lg border border-gray-200">
                <button
                  type="button"
                  aria-label="Aumentar quantidade de cópias"
                  disabled={disabled || copiasUnificado >= 99}
                  onClick={() =>
                    onChange({ copiasUnificado: clampCopiasUnificado(copiasUnificado + 1) })
                  }
                  className="flex h-4 flex-1 items-center justify-center border-b border-gray-200 bg-white text-secondary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-sm font-semibold leading-none" aria-hidden>
                    +
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Diminuir quantidade de cópias"
                  disabled={disabled || copiasUnificado <= 1}
                  onClick={() =>
                    onChange({ copiasUnificado: clampCopiasUnificado(copiasUnificado - 1) })
                  }
                  className="flex h-4 flex-1 items-center justify-center bg-white text-secondary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-sm font-semibold leading-none" aria-hidden>
                    -
                  </span>
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-secondary-text">
            No modo unificado não há segunda impressão automática ao marcar pronto; use reimpressão
            na coluna se precisar.
          </p>
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/90 p-2.5">
        <DeliveryToggleRow
          id={`${idPrefix}-imp-receber`}
          checked={value.imprimirAoReceber}
          disabled={disabled}
          onChecked={v => onChange({ imprimirAoReceber: v })}
          titulo={
            modoImpressao === 'unificado'
              ? 'Imprimir ao iniciar preparo'
              : 'Imprimir produção ao iniciar preparo'
          }
          descricao={
            modoImpressao === 'unificado'
              ? 'Cupom completo assim que o pedido entra em preparação.'
              : 'Tickets da cozinha ao entrar em preparação.'
          }
        />

        {modoImpressao === 'separado' ? (
          <>
            <DeliveryToggleRow
              id={`${idPrefix}-imp-pronto`}
              checked={value.imprimirAoFicarPronto}
              disabled={disabled}
              onChecked={v => onChange({ imprimirAoFicarPronto: v })}
              titulo="Imprimir expedição ao marcar pronto"
              descricao="Cupom ou ticket de conferência/expedição ao marcar o pedido pronto."
            />

            {!value.imprimirAoFicarPronto ? (
              <p className="text-xs text-amber-800">
                Expedição não será impressa automaticamente ao marcar pronto enquanto esta opção
                estiver desmarcada.
              </p>
            ) : null}
          </>
        ) : (
          <p className="rounded-lg bg-white px-3 py-2 text-xs text-secondary-text ring-1 ring-gray-100">
            No modo unificado a impressão ao marcar pronto não se aplica — apenas o disparo ao
            iniciar preparo (com cópias definidas acima).
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${idPrefix}-imp-expedicao`}
          className="text-sm font-semibold text-primary-text"
        >
          Impressora de expedição (sistema / lógica)
        </label>
        <p className="text-xs text-secondary-text">
          {modoImpressao === 'unificado'
            ? 'Onde o cupom completo será impresso ao iniciar preparo.'
            : 'Onde o cupom de expedição será impresso ao marcar pronto. Produção continua na impressora de cada produto.'}
        </p>
        {impressorasLogicas.length === 0 ? (
          <p className="text-xs text-amber-800">
            Nenhuma impressora cadastrada no sistema. Cadastre em Configurações → Impressoras antes
            de usar impressão delivery.
          </p>
        ) : null}
        <select
          id={`${idPrefix}-imp-expedicao`}
          value={value.impressoraExpedicaoId}
          disabled={disabled || impressorasLogicas.length === 0}
          onChange={e => onChange({ impressoraExpedicaoId: e.target.value })}
          className="h-9 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Selecione uma impressora</option>
          {impressorasLogicas.map(impressora => (
            <option key={impressora.id} value={impressora.id}>
              {impressora.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
