'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Tooltip from '@mui/material/Tooltip'
import { MdCheck, MdChevronLeft, MdChevronRight, MdSettings } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import { colors } from '@/src/shared/theme/colors'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from './deliveryHubProgresso'
import {
  montarPassosHubDelivery,
  type DeliveryHubPassoUi,
} from './deliveryHubPassosUi'
import type { DeliveryHubPassosExtras } from './deliveryHubCadastros'

/** Token Alternate (roxo) da progressão do menu lateral. */
const COR_PROGRESSO = colors.alternate
/** Mesmo vermelho do trilho desligado do `JiffyIconSwitch`. */
const VERMELHO_TOGGLE = '#dc2626'

type DeliveryHubHomeProps = {
  progresso: DeliveryHubProgresso
  passosExtras?: DeliveryHubPassosExtras
  selecionadoId: DeliveryEtapaId | null
  onSelecionarPasso: (passo: DeliveryHubPassoUi) => void
  children: ReactNode
}

function BadgeStatus({ passo }: { passo: DeliveryHubPassoUi }) {
  if (passo.concluido) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ borderColor: colors.accent5, color: colors.accent5 }}
      >
        <MdCheck className="h-3.5 w-3.5" />
        Concluído
      </span>
    )
  }
  if (passo.obrigatoria) {
    return (
      <span
        className="inline-flex items-center rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ borderColor: VERMELHO_TOGGLE, color: VERMELHO_TOGGLE }}
      >
        Pendente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
      Recomendado
    </span>
  )
}

/** Trecho da linha entre passos: Alternate se o passo de origem estiver concluído. */
function LinhaPasso({
  concluidoOrigem,
  posicao,
}: {
  concluidoOrigem: boolean
  posicao: 'acima' | 'abaixo'
}) {
  return (
    <span
      className={cn(
        'absolute left-1/2 w-px -translate-x-1/2 transition-colors duration-300',
        posicao === 'acima' ? 'top-0 h-1/2' : 'top-1/2 h-[calc(50%+0.5rem)]',
        !concluidoOrigem && 'bg-gray-200'
      )}
      style={concluidoOrigem ? { backgroundColor: COR_PROGRESSO } : undefined}
      aria-hidden
    />
  )
}

export function DeliveryHubHome({
  progresso,
  passosExtras,
  selecionadoId,
  onSelecionarPasso,
  children,
}: DeliveryHubHomeProps) {
  const [menuRecolhido, setMenuRecolhido] = useState(false)
  const passos = useMemo(
    () => montarPassosHubDelivery(progresso, passosExtras),
    [progresso, passosExtras]
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row">
        <div
          className={cn(
            'relative flex max-h-[42vh] min-h-0 w-full shrink-0 lg:max-h-none lg:self-stretch',
            menuRecolhido ? 'lg:w-auto' : 'lg:w-[22.5rem]'
          )}
        >
          <nav
            aria-label="Passos do delivery"
            className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm scrollbar-hide sm:p-3"
          >
            <div className="shrink-0 px-2 pb-3 pt-1 sm:px-1">
              <div
                className={cn(
                  'flex min-h-[3.875rem] items-center gap-2',
                  menuRecolhido && 'justify-center'
                )}
              >
                {menuRecolhido ? (
                  <button
                    type="button"
                    onClick={() => setMenuRecolhido(false)}
                    aria-label="Expandir menu"
                    title="Expandir menu"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/15"
                  >
                    <MdSettings className="h-6 w-6" aria-hidden />
                  </button>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MdSettings className="h-6 w-6" aria-hidden />
                  </span>
                )}
                {menuRecolhido ? (
                  <span className="sr-only">Configurações do Delivery</span>
                ) : (
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base font-bold leading-7 text-primary sm:text-lg">
                      Configurações do Delivery
                    </h1>
                    <p className="mt-0.5 text-xs leading-4 text-secondary-text">
                      Cobertura de entrega usada no pedido gestor — áreas, raio e
                      endereço da loja.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {passos.map((passo, index) => {
              const ativo = passo.id === selecionadoId
              const ultimo = index === passos.length - 1
              const passoAnterior = index > 0 ? passos[index - 1] : null
              const numeroClassName =
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white text-xs font-bold'
              const numeroStyle = passo.concluido
                ? { borderColor: COR_PROGRESSO, color: COR_PROGRESSO }
                : { borderColor: colors.primary, color: colors.primary }
              const linhaAcima = passoAnterior ? (
                <LinhaPasso concluidoOrigem={passoAnterior.concluido} posicao="acima" />
              ) : null
              const linhaAbaixo = ultimo ? null : (
                <LinhaPasso concluidoOrigem={passo.concluido} posicao="abaixo" />
              )

              return (
                <div key={passo.id} className="flex gap-1.5">
                  {menuRecolhido ? (
                    <Tooltip title={passo.titulo} arrow placement="right">
                      <button
                        type="button"
                        aria-label={passo.titulo}
                        aria-current={ativo ? 'page' : undefined}
                        onClick={() => onSelecionarPasso(passo)}
                        className={cn(
                          'flex min-h-[4.75rem] w-full items-center justify-center rounded-xl border px-3 py-3 transition-colors',
                          !ultimo && 'mb-2',
                          ativo
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-gray-50'
                        )}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                          <passo.Icon className="h-6 w-6" aria-hidden />
                        </span>
                      </button>
                    </Tooltip>
                  ) : (
                    <>
                      <div
                        className={cn(
                          'relative flex w-8 shrink-0 items-center justify-center',
                          !ultimo && 'mb-2'
                        )}
                      >
                        {linhaAcima}
                        {linhaAbaixo}
                        <span className={numeroClassName} style={numeroStyle}>
                          {passo.numero}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-current={ativo ? 'page' : undefined}
                        onClick={() => onSelecionarPasso(passo)}
                        className={cn(
                          'flex min-h-[4.75rem] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                          !ultimo && 'mb-2',
                          ativo
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-gray-50'
                        )}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                          <passo.Icon className="h-6 w-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {passo.titulo}
                            </span>
                            <BadgeStatus passo={passo} />
                          </span>
                          <span className="mt-0.5 block text-xs text-secondary-text">
                            {passo.descricao}
                          </span>
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={() => setMenuRecolhido(atual => !atual)}
            aria-expanded={!menuRecolhido}
            aria-label={menuRecolhido ? 'Expandir menu' : 'Ocultar menu'}
            title={menuRecolhido ? 'Expandir menu' : 'Ocultar menu'}
            className="absolute right-0 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors hover:bg-black/[0.03]"
            style={{ borderColor: COR_PROGRESSO, color: COR_PROGRESSO }}
          >
            {menuRecolhido ? (
              <MdChevronRight className="h-4 w-4" aria-hidden />
            ) : (
              <MdChevronLeft className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
