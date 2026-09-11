'use client'

import { Clock3, MapPin, Phone, Store, Wallet, X } from 'lucide-react'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { FuncionamentoPublicoDTO } from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import { usePublicDeliveryMeiosPagamento } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { listarAgendaSemanalPublica } from '@/src/shared/utils/funcionamentoDelivery'
import { formatEmpresaPublicaEndereco } from '../utils/formatEmpresaPublicaEndereco'
import { obterIconeMeioPagamento } from '../utils/obterIconeMeioPagamento'
import { obterEstiloMeioPagamentoPublico } from '../utils/obterEstiloMeioPagamentoPublico'
import { useDeliveryBodyScrollLock } from '../hooks/useDeliveryBodyScrollLock'

type DeliveryLojaInfoModalProps = {
  open: boolean
  onClose: () => void
  slug: string
  empresa: EmpresaPublicaDTO | null
  funcionamento: FuncionamentoPublicoDTO | null
  /** Nome de exibição do design (quando diferente do fantasia). */
  nomeExibicao?: string | null
  /** Logo do design publicado; fallback para `empresa.logoUrl`. */
  logoUrl?: string | null
}

export function DeliveryLojaInfoModal({
  open,
  onClose,
  slug,
  empresa,
  funcionamento,
  nomeExibicao,
  logoUrl,
}: DeliveryLojaInfoModalProps) {
  useDeliveryBodyScrollLock(open)

  const { data: meiosData, isLoading: loadingMeios } = usePublicDeliveryMeiosPagamento(
    slug,
    open
  )
  const meiosPagamento = meiosData?.meiosPagamento ?? []

  if (!open) return null

  const nome =
    nomeExibicao?.trim() ||
    empresa?.nomeFantasia?.trim() ||
    'Loja'
  const logo = logoUrl?.trim() || empresa?.logoUrl?.trim() || null
  const endereco = formatEmpresaPublicaEndereco(empresa?.endereco ?? null)
  const telefoneRaw = empresa?.telefone?.trim() || null
  const telefone = telefoneRaw ? formatarTelefoneBr(telefoneRaw) : null
  const agenda = listarAgendaSemanalPublica(funcionamento?.agendaSemanal)
  const temAlgumHorario = agenda.some(dia => dia.aberto)

  return (
    <div className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center sm:items-center sm:px-4 sm:py-6">
      <button
        type="button"
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        aria-label="Fechar"
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl shadow-xl sm:rounded-2xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-loja-info-titulo"
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            color: 'var(--delivery-text-muted, #6b7280)',
            backgroundColor: 'var(--delivery-surface-muted, #f3f4f6)',
          }}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-6">
          <div className="flex flex-col items-center text-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-28 w-28 rounded-2xl object-cover shadow-sm @sm:h-32 @sm:w-32"
              />
            ) : (
              <span
                className="flex h-28 w-28 items-center justify-center rounded-2xl @sm:h-32 @sm:w-32"
                style={{ backgroundColor: 'var(--delivery-surface-muted, #f3f4f6)' }}
              >
                <Store
                  className="h-12 w-12"
                  style={{ color: 'var(--delivery-primary-dark, #171717)' }}
                  aria-hidden
                />
              </span>
            )}

            <h2
              id="delivery-loja-info-titulo"
              className="mt-4 text-lg font-semibold delivery-text-primary"
            >
              {nome}
            </h2>
            {funcionamento ? (
              <p
                className={`mt-1 text-xs font-medium ${
                  funcionamento.aberta ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {funcionamento.aberta ? 'Aberto agora' : 'Fechado agora'}
              </p>
            ) : null}
          </div>

          {endereco ? (
            <section className="flex gap-3 text-left">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: 'var(--delivery-text-muted, #6b7280)' }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
                  Endereço
                </p>
                <p className="mt-0.5 text-sm leading-snug delivery-text-primary">{endereco}</p>
              </div>
            </section>
          ) : null}

          {telefone ? (
            <section className="flex gap-3 text-left">
              <Phone
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: 'var(--delivery-text-muted, #6b7280)' }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
                  Telefone
                </p>
                <a
                  href={`tel:${telefoneRaw?.replace(/\D/g, '')}`}
                  className="mt-0.5 block text-sm font-medium delivery-text-primary underline-offset-2 hover:underline"
                >
                  {telefone}
                </a>
              </div>
            </section>
          ) : null}

          <section className="flex gap-3 text-left">
            <Wallet
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: 'var(--delivery-text-muted, #6b7280)' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
                Formas de pagamento
              </p>
              {loadingMeios ? (
                <p className="mt-1 text-sm delivery-text-secondary">Carregando...</p>
              ) : meiosPagamento.length > 0 ? (
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  {meiosPagamento.map(meio => {
                    const Icone = obterIconeMeioPagamento(meio.nome)
                    const estilo = obterEstiloMeioPagamentoPublico(meio)
                    return (
                      <div
                        key={meio.id}
                        className="flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-xl border p-2"
                        style={{
                          borderColor: estilo.backgroundColor,
                          backgroundColor: estilo.backgroundColor,
                          color: estilo.color,
                        }}
                      >
                        <Icone
                          className="h-9 w-9 shrink-0"
                          style={{ color: estilo.iconColor ?? estilo.color }}
                          aria-hidden
                        />
                        <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight">
                          {meio.nome}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-1 text-sm delivery-text-secondary">
                  Formas de pagamento não informadas.
                </p>
              )}
            </div>
          </section>

          <section className="flex gap-3 text-left">
            <Clock3
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: 'var(--delivery-text-muted, #6b7280)' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide delivery-text-secondary">
                Horário de funcionamento
              </p>
              {temAlgumHorario ? (
                <ul className="mt-2 grid w-fit max-w-full grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-sm">
                  {agenda.map(dia => (
                    <li
                      key={dia.diaDaSemana}
                      className="contents"
                    >
                      <span className="delivery-text-primary">{dia.label}</span>
                      <span
                        className={`justify-self-end text-right ${
                          dia.aberto ? 'delivery-text-secondary' : 'text-gray-400'
                        }`}
                      >
                        {dia.texto}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm delivery-text-secondary">
                  Horários não informados.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
