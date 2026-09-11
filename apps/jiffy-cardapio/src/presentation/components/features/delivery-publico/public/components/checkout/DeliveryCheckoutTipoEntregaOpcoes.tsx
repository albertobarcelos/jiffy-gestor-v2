'use client'

import { useEffect, type ReactNode } from 'react'
import { Bike, /* Clock, */ MapPin, Plus, RefreshCw, Store } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import {
  calcularDistanciaAproximadaDaLoja,
  pontoClienteParaDistancia,
} from '../../../shared/utils/formatarDistanciaAproximadaDaLoja'
import { DeliveryDistanciaLojaHint } from './DeliveryDistanciaLojaHint'

export type ModoEntregaOpcao = {
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
}

type DeliveryCheckoutTipoEntregaOpcoesProps = {
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  /** Cliente já tem ao menos um endereço no cadastro (mesmo que nenhum esteja selecionado). */
  temEnderecosCadastrados: boolean
  /** Quantidade de endereços do cliente (para exibir “Trocar endereço”). */
  quantidadeEnderecos?: number
  enderecoEmpresaTexto: string | null
  localizacaoEmpresa?: GeoJsonPoint | null
  onChangeOpcao: (opcao: ModoEntregaOpcao) => void
  /** Abre a lista de endereços cadastrados. */
  onTrocarEndereco: () => void
  /** Abre o formulário de novo endereço. */
  onCadastrarEndereco: () => void
  /** Cliente já tem o máximo de endereços — botão fica visualmente bloqueado. */
  novoEnderecoBloqueado?: boolean
}

const OPCOES: Array<{
  key: string
  label: string
  tipoEntrega: DeliveryTipoEntrega
  modoTempo: 'imediato' | 'agendado'
  Icon: typeof Bike
}> = [
  { key: 'entrega', label: 'Entrega', tipoEntrega: 'entrega', modoTempo: 'imediato', Icon: Bike },
  // TODO: reativar quando agendamento de entrega estiver disponível
  // {
  //   key: 'entrega-agendada',
  //   label: 'Entrega agendada',
  //   tipoEntrega: 'entrega',
  //   modoTempo: 'agendado',
  //   Icon: Clock,
  // },
  { key: 'retirada', label: 'Retirada', tipoEntrega: 'retirada', modoTempo: 'imediato', Icon: Store },
  // TODO: reativar quando agendamento de retirada estiver disponível
  // {
  //   key: 'retirada-agendada',
  //   label: 'Retirada agendada',
  //   tipoEntrega: 'retirada',
  //   modoTempo: 'agendado',
  //   Icon: Clock,
  // },
]

function BotaoSecundarioEndereco({
  onClick,
  icon: Icon,
  children,
  bloqueado = false,
}: {
  onClick: () => void
  icon: typeof Plus
  children: ReactNode
  /** Visualmente bloqueado, mas ainda clicável (ex.: aviso de limite). */
  bloqueado?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={bloqueado || undefined}
      className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold delivery-text-primary ${
        bloqueado ? 'opacity-50' : ''
      }`}
      style={{ borderColor: 'var(--delivery-border)' }}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </button>
  )
}

/** Grid de opções + card de endereço/retirada (usado no modal unificado de identificação). */
export function DeliveryCheckoutTipoEntregaOpcoes({
  tipoEntrega,
  modoTempo,
  enderecoCliente,
  temEnderecosCadastrados,
  quantidadeEnderecos = 0,
  enderecoEmpresaTexto,
  localizacaoEmpresa = null,
  onChangeOpcao,
  onTrocarEndereco,
  onCadastrarEndereco,
  novoEnderecoBloqueado = false,
}: DeliveryCheckoutTipoEntregaOpcoesProps) {
  const isEntrega = tipoEntrega === 'entrega'
  const precisaCadastrarEndereco = isEntrega && !enderecoCliente && !temEnderecosCadastrados
  /** Lista para trocar ou remover — mesmo com 1 endereço. */
  const podeTrocarEndereco = isEntrega && quantidadeEnderecos > 0

  // Enquanto agendamento estiver oculto, força modo imediato na UI.
  useEffect(() => {
    if (modoTempo !== 'agendado') return
    onChangeOpcao({ tipoEntrega, modoTempo: 'imediato' })
  }, [modoTempo, tipoEntrega, onChangeOpcao])

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-sm font-semibold delivery-text-primary">Como deseja receber?</p>
        <div className="grid grid-cols-2 gap-3">
          {OPCOES.map(({ key, label, tipoEntrega: tipo, modoTempo: modo, Icon }) => {
            const selected = tipoEntrega === tipo && modoTempo === modo
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeOpcao({ tipoEntrega: tipo, modoTempo: modo })}
                className="flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors"
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
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--delivery-border)' }}>
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
                    <DeliveryDistanciaLojaHint
                      texto={calcularDistanciaAproximadaDaLoja(
                        localizacaoEmpresa,
                        pontoClienteParaDistancia(enderecoCliente)
                      )}
                    />
                    <p className="sr-only">{formatarResumoEnderecoPublico(enderecoCliente)}</p>
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
              {!enderecoCliente ? (
                <button
                  type="button"
                  onClick={onTrocarEndereco}
                  className="shrink-0 text-sm font-semibold"
                  style={{ color: 'var(--delivery-primary)' }}
                >
                  Selecionar
                </button>
              ) : null}
            </div>
          )}
        </div>

        {isEntrega && enderecoCliente ? (
          <div className="flex gap-2">
            {podeTrocarEndereco ? (
              <BotaoSecundarioEndereco onClick={onTrocarEndereco} icon={RefreshCw}>
                Trocar endereço
              </BotaoSecundarioEndereco>
            ) : null}
            <BotaoSecundarioEndereco
              onClick={onCadastrarEndereco}
              icon={Plus}
              bloqueado={novoEnderecoBloqueado}
            >
              Novo endereço
            </BotaoSecundarioEndereco>
          </div>
        ) : null}

        {isEntrega && !enderecoCliente && temEnderecosCadastrados ? (
          <div className="flex gap-2">
            <BotaoSecundarioEndereco
              onClick={onCadastrarEndereco}
              icon={Plus}
              bloqueado={novoEnderecoBloqueado}
            >
              Novo endereço
            </BotaoSecundarioEndereco>
          </div>
        ) : null}
      </div>
    </div>
  )
}
