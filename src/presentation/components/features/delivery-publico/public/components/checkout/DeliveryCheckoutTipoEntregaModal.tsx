'use client'

import { Bike, Clock, MapPin, Plus, Store } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { usePublicDeliveryDisponibilidade } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

/** Taxa fictícia até existir endpoint de frete. */
export const TAXA_ENTREGA_FICTICIA = 5.9

export type ModoEntregaOpcao = {
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
}

type DeliveryCheckoutTipoEntregaModalProps = {
  slug: string
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado' | ''
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  /** Cliente já tem ao menos um endereço no cadastro (mesmo que nenhum esteja selecionado). */
  temEnderecosCadastrados: boolean
  enderecoEmpresaTexto: string | null
  onChangeOpcao: (opcao: ModoEntregaOpcao) => void
  onEditarEndereco: () => void
  onCadastrarEndereco: () => void
  onClose: () => void
  onContinuar: () => void
}

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatarProximaAbertura(iso: string | null, timeZone: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

const OPCOES: Array<{
  key: string
  label: string
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  Icon: typeof Bike
}> = [
  { key: 'entrega', label: 'Entrega', tipoEntrega: 'entrega', modoTempo: 'imediato', Icon: Bike },
  {
    key: 'entrega-agendada',
    label: 'Entrega agendada',
    tipoEntrega: 'entrega',
    modoTempo: 'agendado',
    Icon: Clock,
  },
  { key: 'retirada', label: 'Retirada', tipoEntrega: 'retirada', modoTempo: 'imediato', Icon: Store },
  {
    key: 'retirada-agendada',
    label: 'Retirada agendada',
    tipoEntrega: 'retirada',
    modoTempo: 'agendado',
    Icon: Clock,
  },
]

export function DeliveryCheckoutTipoEntregaModal({
  slug,
  tipoEntrega,
  modoTempo,
  enderecoCliente,
  temEnderecosCadastrados,
  enderecoEmpresaTexto,
  onChangeOpcao,
  onEditarEndereco,
  onCadastrarEndereco,
  onClose,
  onContinuar,
}: DeliveryCheckoutTipoEntregaModalProps) {
  const hoje = hojeEmSaoPaulo()
  const disponibilidadeEntrega = usePublicDeliveryDisponibilidade(slug, 'entrega', hoje)
  const disponibilidadeRetirada = usePublicDeliveryDisponibilidade(slug, 'retirada', hoje)
  const isEntrega = tipoEntrega === 'entrega'
  const taxaLabel = isEntrega
    ? `Taxa de entrega ${formatDeliveryCurrency(TAXA_ENTREGA_FICTICIA)}`
    : 'Sem taxa de entrega'
  const precisaCadastrarEndereco = isEntrega && !enderecoCliente && !temEnderecosCadastrados
  const disponibilidadeAtual =
    tipoEntrega === 'entrega' ? disponibilidadeEntrega : disponibilidadeRetirada
  const opcaoDisponivel =
    modoTempo === 'imediato'
      ? disponibilidadeAtual.data?.permiteImediato === true
      : modoTempo === 'agendado'
        ? disponibilidadeAtual.data?.aceitaAgendamento === true
        : false
  const consultandoDisponibilidade =
    disponibilidadeAtual.isLoading || disponibilidadeAtual.isFetching

  const handleContinuar = () => {
    if (!modoTempo) return
    if (disponibilidadeAtual.isError) return
    if (!opcaoDisponivel) return
    onContinuar()
  }

  return (
    <DeliveryCheckoutStepModal
      title="Como deseja receber?"
      onClose={onClose}
      showBack
      onBack={onClose}
      footer={
        <button
          type="button"
          onClick={handleContinuar}
          disabled={
            !modoTempo ||
            consultandoDisponibilidade ||
            disponibilidadeAtual.isError ||
            !opcaoDisponivel
          }
          className="min-h-[48px] w-full rounded-xl text-sm font-semibold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          Continuar
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {OPCOES.map(({ key, label, tipoEntrega: tipo, modoTempo: modo, Icon }) => {
          const selected = tipoEntrega === tipo && modoTempo === modo
          const query =
            tipo === 'entrega' ? disponibilidadeEntrega : disponibilidadeRetirada
          const disabled =
            query.isLoading ||
            query.isError ||
            (modo === 'imediato'
              ? query.data?.permiteImediato !== true
              : query.data?.aceitaAgendamento !== true)
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChangeOpcao({ tipoEntrega: tipo, modoTempo: modo })}
              className="flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                borderColor: selected ? 'var(--delivery-primary)' : 'var(--delivery-border)',
                backgroundColor: selected
                  ? 'color-mix(in srgb, var(--delivery-primary) 10%, white)'
                  : 'var(--delivery-surface)',
              }}
            >
              <Icon
                className="h-6 w-6"
                style={{
                  color: selected ? 'var(--delivery-primary)' : 'var(--delivery-text-muted)',
                }}
                aria-hidden
              />
              <span className="text-sm font-medium delivery-text-primary">{label}</span>
            </button>
          )
        })}
      </div>

      {disponibilidadeEntrega.isError || disponibilidadeRetirada.isError ? (
        <p className="mt-3 text-sm delivery-text-secondary">
          Não foi possível consultar a disponibilidade. Tente novamente.
        </p>
      ) : null}

      {disponibilidadeAtual.data && !disponibilidadeAtual.data.permiteImediato ? (
        <div
          className="mt-3 rounded-xl border px-3 py-3 text-sm"
          style={{
            borderColor: 'var(--delivery-border)',
            backgroundColor: 'var(--delivery-surface-muted)',
          }}
        >
          <p className="font-semibold delivery-text-primary">Loja fechada no momento</p>
          <p className="mt-1 text-xs delivery-text-secondary">
            Pedidos imediatos não estão disponíveis.
            {disponibilidadeAtual.data.proximaAbertura
              ? ` Próxima abertura: ${formatarProximaAbertura(
                  disponibilidadeAtual.data.proximaAbertura,
                  disponibilidadeAtual.data.timezone
                )}.`
              : ''}
          </p>
        </div>
      ) : null}

      <div
        className="mt-5 rounded-xl border p-3"
        style={{ borderColor: 'var(--delivery-border)' }}
      >
        {!isEntrega ? (
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
            >
              <MapPin
                className="h-5 w-5"
                style={{ color: 'var(--delivery-text-muted)' }}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs delivery-text-secondary">Retirada no local</p>
              <p className="text-sm font-semibold delivery-text-primary">
                {enderecoEmpresaTexto || 'Endereço da loja indisponível'}
              </p>
              <p className="mt-2 text-xs font-medium" style={{ color: 'var(--delivery-primary)' }}>
                {taxaLabel}
              </p>
            </div>
          </div>
        ) : precisaCadastrarEndereco ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
              >
                <MapPin
                  className="h-5 w-5"
                  style={{ color: 'var(--delivery-text-muted)' }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold delivery-text-primary">
                  Cadastre o endereço de entrega
                </p>
                <p className="mt-0.5 text-xs delivery-text-secondary">
                  Informe onde deseja receber o pedido para continuar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCadastrarEndereco}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold"
              style={{
                borderColor: 'var(--delivery-primary)',
                color: 'var(--delivery-primary)',
                backgroundColor: 'color-mix(in srgb, var(--delivery-primary) 8%, white)',
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Informar endereço
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
            >
              <MapPin
                className="h-5 w-5"
                style={{ color: 'var(--delivery-text-muted)' }}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              {enderecoCliente ? (
                <>
                  <p className="text-xs delivery-text-secondary">Endereço de entrega</p>
                  <p className="text-sm font-semibold delivery-text-primary">
                    {enderecoCliente.rua}, {enderecoCliente.numero}
                  </p>
                  <p className="mt-0.5 text-xs delivery-text-secondary">
                    {[enderecoCliente.bairro, enderecoCliente.cidade, enderecoCliente.estado]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                  <p className="sr-only">{formatarResumoEnderecoPublico(enderecoCliente)}</p>
                  <p className="mt-2 text-xs font-medium" style={{ color: 'var(--delivery-primary)' }}>
                    {taxaLabel}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold delivery-text-primary">
                    Selecione um endereço
                  </p>
                  <p className="mt-0.5 text-xs delivery-text-secondary">
                    Escolha um dos endereços salvos ou adicione um novo.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onEditarEndereco}
              className="shrink-0 text-sm font-semibold"
              style={{ color: 'var(--delivery-primary)' }}
            >
              {enderecoCliente ? 'Editar' : 'Selecionar'}
            </button>
          </div>
        )}
      </div>
    </DeliveryCheckoutStepModal>
  )
}
