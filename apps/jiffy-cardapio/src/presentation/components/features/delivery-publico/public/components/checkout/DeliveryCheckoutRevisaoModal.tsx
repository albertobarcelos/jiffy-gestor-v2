'use client'

import { useState, type ReactNode } from 'react'
import { Camera, MapPin, Pencil, UserRound } from 'lucide-react'
import { MdDeliveryDining } from 'react-icons/md'
import { TbPaperBag } from 'react-icons/tb'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { formatarCpfCnpjInput } from '@/src/shared/utils/cpfCnpj'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import type { DeliveryCarrinhoItem } from '../../../shared/stores/deliveryCarrinhoStore'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import { DELIVERY_PAIS_TELEFONE_PADRAO } from '../../../shared/constants/deliveryPaisesTelefone'
import { observacaoItemCarrinho } from '../../../shared/utils/deliveryCarrinhoItemUtils'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'
import { formatarTelefoneExibicao } from '../../../shared/utils/deliveryTelefonePais'
import { calcularTrocoCheckout } from '../../../shared/utils/checkoutPagamentosUtils'
import { etiquetaEnderecoPublicoLabel } from '../../../shared/utils/etiquetaEnderecoPublicoLabel'
import { isMeioPagamentoDinheiro } from '../../../shared/utils/isMeioPagamentoDinheiro'
import { obterIconeMeioPagamento } from '../../../shared/utils/obterIconeMeioPagamento'
import { DeliveryCheckoutFooterActions } from './DeliveryCheckoutFooterActions'
import {
  DeliveryCheckoutShellFooter,
  DeliveryCheckoutShellHeader,
} from './DeliveryCheckoutShell'

type DeliveryCheckoutRevisaoModalProps = {
  /** `somenteLeitura` = pós-confirmação (sem editar / sem enviar). */
  modo?: 'edicao' | 'somenteLeitura'
  tipoEntrega: DeliveryTipoEntrega
  nome: string
  telefone: string
  telefonePaisIso2?: string
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  itens: DeliveryCarrinhoItem[]
  total: number
  subtotalOficial?: number | null
  taxaEntregaOficial?: number | null
  totalOficial?: number | null
  cotacaoLoading?: boolean
  cotacaoPronta?: boolean
  pagamentos: Array<{
    meioPagamentoId: string
    valor: number
    meio: MeioPagamentoPublicoDTO | null
  }>
  observacaoPedido: string
  cpfNotaFiscal: string
  enviando?: boolean
  onClose?: () => void
  onVoltar: () => void
  onEditarTipoEntrega?: () => void
  onEditarCliente?: () => void
  onEditarEndereco?: () => void
  onEditarPedido?: () => void
  onEditarPagamento?: () => void
  onChangeObservacaoPedido?: (value: string) => void
  onChangeCpfNotaFiscal?: (value: string) => void
  onEnviar?: () => void
  /** Exibido no header em modo leitura (ex.: código do pedido). */
  codigoVenda?: string | null
}

function IconeCaixa({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {children}
    </div>
  )
}

function BotaoEditarLapiz({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
    >
      <Pencil className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} strokeWidth={1.75} />
    </button>
  )
}

function LinhaSecao({
  icone,
  label,
  onEditar,
  editLabel,
  children,
}: {
  icone?: ReactNode
  label: string
  onEditar?: () => void
  editLabel?: string
  children: ReactNode
}) {
  return (
    <div
      className="flex items-start gap-3 border-b py-3"
      style={{ borderColor: 'var(--delivery-border)' }}
    >
      {icone ? <IconeCaixa>{icone}</IconeCaixa> : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs delivery-text-secondary">{label}</p>
        {children}
      </div>
      {onEditar ? <BotaoEditarLapiz onClick={onEditar} label={editLabel ?? 'Editar'} /> : null}
    </div>
  )
}

function ProdutoThumb({ imagemUrl, nome }: { imagemUrl: string | null; nome: string }) {
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera className="h-4 w-4" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
        </div>
      )}
      <span className="sr-only">{nome}</span>
    </div>
  )
}

export function DeliveryCheckoutRevisaoModal({
  modo = 'edicao',
  tipoEntrega,
  nome,
  telefone,
  telefonePaisIso2 = DELIVERY_PAIS_TELEFONE_PADRAO,
  enderecoCliente,
  enderecoEmpresaTexto,
  itens,
  total,
  subtotalOficial = null,
  taxaEntregaOficial = null,
  totalOficial = null,
  cotacaoLoading = false,
  cotacaoPronta = true,
  pagamentos,
  observacaoPedido,
  cpfNotaFiscal,
  enviando = false,
  onClose: _onClose,
  onVoltar,
  onEditarTipoEntrega,
  onEditarCliente,
  onEditarEndereco,
  onEditarPedido,
  onEditarPagamento,
  onChangeObservacaoPedido,
  onChangeCpfNotaFiscal,
  onEnviar,
  codigoVenda = null,
}: DeliveryCheckoutRevisaoModalProps) {
  const somenteLeitura = modo === 'somenteLeitura'
  const [adicionarObservacao, setAdicionarObservacao] = useState(
    () => observacaoPedido.trim().length > 0
  )
  const [desejaNotaFiscal, setDesejaNotaFiscal] = useState(
    () => cpfNotaFiscal.replace(/\D/g, '').length > 0
  )
  const telefoneExibicao = telefone.trim()
    ? formatarTelefoneExibicao(telefone, telefonePaisIso2)
    : 'Não informado'
  const nomeExibicao = nome.trim() || 'Não informado'
  const isEntrega = tipoEntrega === 'entrega'
  const totalExibicao = totalOficial ?? total
  const subtotalExibicao = subtotalOficial ?? total
  const taxaExibicao = taxaEntregaOficial ?? 0
  const exibirTaxaEntrega = isEntrega
  const taxaEntregaTexto = cotacaoLoading
    ? 'Calculando...'
    : transformarParaReal(taxaExibicao)
  const trocoReceber = calcularTrocoCheckout(
    totalExibicao,
    pagamentos.map(p => ({ meioPagamentoId: p.meioPagamentoId, valor: p.valor })),
    meioPagamentoId =>
      isMeioPagamentoDinheiro(
        pagamentos.find(p => p.meioPagamentoId === meioPagamentoId)?.meio ?? null
      )
  )
  const primeiroMeioNome = pagamentos[0]?.meio?.nome ?? ''
  const IconePagamento = obterIconeMeioPagamento(primeiroMeioNome)
  const observacaoTrim = observacaoPedido.trim()
  const cpfTrim = cpfNotaFiscal.replace(/\D/g, '')

  const handleToggleObservacao = (checked: boolean) => {
    if (somenteLeitura || !onChangeObservacaoPedido) return
    setAdicionarObservacao(checked)
    if (!checked) {
      onChangeObservacaoPedido('')
    }
  }

  const handleToggleNotaFiscal = (checked: boolean) => {
    if (somenteLeitura || !onChangeCpfNotaFiscal) return
    setDesejaNotaFiscal(checked)
    if (!checked) {
      onChangeCpfNotaFiscal('')
    }
  }

  const handleCpfChange = (raw: string) => {
    if (somenteLeitura || !onChangeCpfNotaFiscal) return
    const apenasDigitos = raw.replace(/\D/g, '').slice(0, 11)
    onChangeCpfNotaFiscal(formatarCpfCnpjInput(apenasDigitos))
  }

  return (
    <>
      <DeliveryCheckoutShellHeader
        title={somenteLeitura ? 'Detalhes do pedido' : 'Revise seu pedido'}
        showBack
        onBack={onVoltar}
        headerTone="dark"
      />
      <DeliveryCheckoutShellFooter>
        {somenteLeitura ? (
          <div
            className="px-4 pt-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={onVoltar}
              className="flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-black text-base font-semibold text-white"
            >
              Voltar
            </button>
          </div>
        ) : (
          <DeliveryCheckoutFooterActions
            onVoltar={onVoltar}
            onContinuar={() => onEnviar?.()}
            continuarDisabled={enviando || cotacaoLoading || !cotacaoPronta}
            continuarLabel={
              cotacaoLoading
                ? 'Atualizando valores...'
                : enviando
                  ? 'Enviando...'
                  : 'Enviar pedido'
            }
          />
        )}
      </DeliveryCheckoutShellFooter>

      <div>
        {somenteLeitura && codigoVenda ? (
          <div
            className="mb-1 border-b pb-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <p className="text-xs delivery-text-secondary">Código do pedido</p>
            <p className="text-base font-semibold delivery-text-primary">{codigoVenda}</p>
          </div>
        ) : null}

        <LinhaSecao
          icone={
            isEntrega ? (
              <MdDeliveryDining className="h-5 w-5 text-black" aria-hidden />
            ) : (
              <TbPaperBag className="h-5 w-5 text-black" aria-hidden />
            )
          }
          label="Tipo de Pedido:"
          onEditar={somenteLeitura ? undefined : onEditarTipoEntrega}
          editLabel="Editar tipo de pedido"
        >
          <p className="text-sm font-semibold delivery-text-primary">
            {isEntrega ? 'Entrega' : 'Retirada'}
          </p>
        </LinhaSecao>

        <LinhaSecao
          icone={<UserRound className="h-5 w-5 text-black" />}
          label={isEntrega ? 'Entregue a:' : 'Pedido de:'}
          onEditar={somenteLeitura ? undefined : onEditarCliente}
          editLabel="Editar cliente"
        >
          <p className="text-sm font-semibold delivery-text-primary">{nomeExibicao}</p>
          <p className="text-sm delivery-text-secondary">{telefoneExibicao}</p>
        </LinhaSecao>

        <LinhaSecao
          icone={<MapPin className="h-5 w-5 text-black" />}
          label={isEntrega ? 'Seu endereço:' : 'Retirada no local:'}
          onEditar={somenteLeitura || !isEntrega ? undefined : onEditarEndereco}
          editLabel="Editar endereço"
        >
          {isEntrega && enderecoCliente ? (
            <>
              <p className="text-sm font-semibold delivery-text-primary">
                {enderecoCliente.rua}, {enderecoCliente.numero}
              </p>
              <p className="text-sm delivery-text-secondary">
                {[
                  enderecoCliente.bairro,
                  etiquetaEnderecoPublicoLabel(enderecoCliente.etiqueta),
                ]
                  .filter(Boolean)
                  .join(' - ')}
              </p>
            </>
          ) : null}
          {isEntrega && !enderecoCliente ? (
            <p className="text-sm delivery-text-secondary">Endereço não informado</p>
          ) : null}
          {!isEntrega ? (
            <p className="text-sm font-semibold delivery-text-primary">
              {enderecoEmpresaTexto || 'Endereço da loja indisponível'}
            </p>
          ) : null}
        </LinhaSecao>

        <LinhaSecao
          icone={<IconePagamento className="h-5 w-5 text-black" />}
          label="Pagamento:"
          onEditar={somenteLeitura ? undefined : onEditarPagamento}
          editLabel="Editar pagamento"
        >
          {pagamentos.length === 0 ? (
            <p className="text-sm font-semibold delivery-text-primary">Não selecionado</p>
          ) : (
            <ul className="space-y-0.5">
              {pagamentos.map((pagamento, index) => (
                <li
                  key={`${pagamento.meioPagamentoId}-${index}`}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 font-semibold delivery-text-primary">
                    {pagamento.meio?.nome ?? 'Pagamento'}
                  </span>
                  <span className="shrink-0 tabular-nums delivery-text-primary">
                    {transformarParaReal(pagamento.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {trocoReceber > 0 ? (
            <p className="text-sm font-semibold text-green-700">
              Troco a receber: {transformarParaReal(trocoReceber)}
            </p>
          ) : null}
        </LinhaSecao>

        <div
          className="flex items-center justify-between gap-2 border-b py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <h3 className="text-sm font-semibold delivery-text-primary">Seu pedido</h3>
          {!somenteLeitura && onEditarPedido ? (
            <BotaoEditarLapiz onClick={onEditarPedido} label="Editar pedido" />
          ) : null}
        </div>

        <ul>
          {itens.map(item => {
            const obsItem = observacaoItemCarrinho(item)
            return (
              <li
                key={item.id}
                className="border-b py-3"
                style={{ borderColor: 'var(--delivery-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <ProdutoThumb imagemUrl={item.produtoImagemUrl} nome={item.produtoNome} />
                  <span className="min-w-0 flex-1 text-sm delivery-text-primary">
                    <span className="font-semibold">{item.quantidade}x</span> {item.produtoNome}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums delivery-text-primary">
                    {formatDeliveryCurrency(item.valorTotal)}
                  </span>
                </div>

                {item.complementos.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 pl-[3.625rem]">
                    {item.complementos.map(c => (
                      <li
                        key={`${c.complementoId}-${c.grupoComplementoId}`}
                        className="flex items-center gap-2 text-xs delivery-text-secondary"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium tabular-nums">{c.quantidade}x</span>{' '}
                          {c.nome}
                        </span>
                        <span className="shrink-0 tabular-nums delivery-text-accent">
                          {formatarValorComplemento(
                            c.valor,
                            normalizeTipoImpactoPreco(c.tipoImpactoPreco)
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {obsItem ? (
                  <p className="mt-1.5 pl-[3.625rem] text-xs delivery-text-secondary">
                    <span className="font-semibold">Obs:</span> {obsItem}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>

        {somenteLeitura ? (
          <div
            className="space-y-3 border-b py-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            {observacaoTrim ? (
              <div>
                <p className="text-xs delivery-text-secondary">Observação</p>
                <p className="mt-0.5 text-sm delivery-text-primary">{observacaoTrim}</p>
              </div>
            ) : null}
            {cpfTrim.length === 11 ? (
              <div>
                <p className="text-xs delivery-text-secondary">CPF na nota fiscal</p>
                <p className="mt-0.5 text-sm delivery-text-primary">
                  {formatarCpfCnpjInput(cpfTrim)}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className="space-y-3 border-b py-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
            >
              <span className="min-w-0 text-sm font-medium text-white">
                Deseja adicionar observação?
              </span>
              <div
                className="flex shrink-0 rounded-full p-0.5"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                role="group"
                aria-label="Adicionar observação"
              >
                <button
                  type="button"
                  onClick={() => handleToggleObservacao(true)}
                  aria-pressed={adicionarObservacao}
                  className="min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={
                    adicionarObservacao
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { backgroundColor: 'transparent', color: '#ffffff' }
                  }
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleObservacao(false)}
                  aria-pressed={!adicionarObservacao}
                  className="min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={
                    !adicionarObservacao
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { backgroundColor: 'transparent', color: '#ffffff' }
                  }
                >
                  Não
                </button>
              </div>
            </div>

            {adicionarObservacao ? (
              <div className="space-y-2">
                <textarea
                  className="min-h-[110px] w-full resize-y rounded-xl border bg-transparent px-3 py-3 text-base outline-none delivery-text-primary"
                  style={{ borderColor: 'var(--delivery-border)' }}
                  placeholder="Ex.: sem cebola, tocar a campainha, etc."
                  value={observacaoPedido}
                  onChange={e => onChangeObservacaoPedido?.(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-right text-[11px] delivery-text-secondary">
                  {observacaoPedido.length}/500
                </p>
              </div>
            ) : null}

            <div
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{ backgroundColor: '#000000', color: '#ffffff' }}
            >
              <span className="min-w-0 text-sm font-medium text-white">
                Deseja Nota fiscal?
              </span>
              <div
                className="flex shrink-0 rounded-full p-0.5"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                role="group"
                aria-label="Deseja nota fiscal"
              >
                <button
                  type="button"
                  onClick={() => handleToggleNotaFiscal(true)}
                  aria-pressed={desejaNotaFiscal}
                  className="min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={
                    desejaNotaFiscal
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { backgroundColor: 'transparent', color: '#ffffff' }
                  }
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleNotaFiscal(false)}
                  aria-pressed={!desejaNotaFiscal}
                  className="min-w-[3.25rem] rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={
                    !desejaNotaFiscal
                      ? { backgroundColor: '#ffffff', color: '#000000' }
                      : { backgroundColor: 'transparent', color: '#ffffff' }
                  }
                >
                  Não
                </button>
              </div>
            </div>

            {desejaNotaFiscal ? (
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium delivery-text-primary"
                  htmlFor="cpf-nota-fiscal"
                >
                  CPF
                </label>
                <input
                  id="cpf-nota-fiscal"
                  className="w-full rounded-xl border bg-transparent px-3 py-3 text-base outline-none delivery-text-primary"
                  style={{ borderColor: 'var(--delivery-border)' }}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  value={cpfNotaFiscal}
                  onChange={e => handleCpfChange(e.target.value)}
                  maxLength={14}
                  aria-label="CPF para nota fiscal"
                />
                <p className="text-right text-[11px] delivery-text-secondary">
                  {cpfNotaFiscal.replace(/\D/g, '').length}/11
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="space-y-2 pt-3">
          {cotacaoLoading ? (
            <p className="text-xs delivery-text-secondary">Calculando valores oficiais...</p>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <span className="delivery-text-secondary">Subtotal</span>
            <span className="font-medium delivery-text-primary">
              {transformarParaReal(subtotalExibicao)}
            </span>
          </div>
          {exibirTaxaEntrega ? (
            <div className="flex items-center justify-between text-sm">
              <span className="delivery-text-secondary">Taxa de entrega</span>
              <span className="font-medium delivery-text-primary">{taxaEntregaTexto}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="delivery-text-primary">Total</span>
            <span className="delivery-text-primary">{transformarParaReal(totalExibicao)}</span>
          </div>
        </div>
      </div>
    </>
  )
}
