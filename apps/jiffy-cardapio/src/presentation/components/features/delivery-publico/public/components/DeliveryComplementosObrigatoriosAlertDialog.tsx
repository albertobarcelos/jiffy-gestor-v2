'use client'

import { MdClose } from 'react-icons/md'
import type {
  GrupoComplementoAcimaDoMaximo,
  GrupoComplementoPendente,
} from '../../shared/utils/produtoComplementosUtils'

type GrupoPendenteAlerta = GrupoComplementoPendente & { produtoNome?: string }
type GrupoAcimaDoMaximoAlerta = GrupoComplementoAcimaDoMaximo & { produtoNome?: string }

type DeliveryComplementosObrigatoriosAlertDialogProps = {
  gruposPendentes: GrupoPendenteAlerta[]
  gruposAcimaDoMaximo?: GrupoAcimaDoMaximoAlerta[]
  /** No carrinho a frase do detalhe do produto não cabe: o item já está na lista. */
  origem?: 'detalhe-produto' | 'remocao-carrinho'
  onConfirmar: () => void
}

function formatarQuantidadeItens(quantidade: number): string {
  return quantidade === 1 ? '1 item' : `${quantidade} itens`
}

function rotuloProduto(produtoNome: string | undefined) {
  if (!produtoNome) return null
  return (
    <>
      {' '}
      do produto <strong className="delivery-text-primary">{produtoNome}</strong>
    </>
  )
}

export function DeliveryComplementosObrigatoriosAlertDialog({
  gruposPendentes,
  gruposAcimaDoMaximo = [],
  origem = 'detalhe-produto',
  onConfirmar,
}: DeliveryComplementosObrigatoriosAlertDialogProps) {
  if (gruposPendentes.length === 0 && gruposAcimaDoMaximo.length === 0) return null

  const somenteMaximo = gruposPendentes.length === 0
  const remocaoCarrinho = origem === 'remocao-carrinho'

  return (
    <div
      className="delivery-vv-overlay z-[70] flex items-center justify-center overscroll-none px-4"
      style={{ zIndex: 70 }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        onClick={onConfirmar}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delivery-complementos-obrigatorios-titulo"
        aria-describedby="delivery-complementos-obrigatorios-descricao"
      >
        <button
          type="button"
          onClick={onConfirmar}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full"
          style={{ color: 'var(--delivery-text-muted)' }}
        >
          <MdClose className="h-5 w-5" />
        </button>

        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-600 text-red-600"
          aria-hidden
        >
          <span className="text-[2.25rem] font-bold leading-none">!</span>
        </div>

        <p
          id="delivery-complementos-obrigatorios-titulo"
          className="delivery-font-title mt-4 text-center text-base font-bold leading-snug delivery-text-primary"
        >
          {remocaoCarrinho
            ? 'Ops! Você não pode remover este complemento.'
            : somenteMaximo
              ? 'Ops! Alguns complementos passaram do máximo permitido.'
              : 'Ops! Separei alguns complementos obrigatórios para você olhar!'}
        </p>

        <ul
          id="delivery-complementos-obrigatorios-descricao"
          className="mt-4 space-y-3 text-center text-sm leading-relaxed delivery-text-secondary"
        >
          {gruposPendentes.map(grupo => (
            <li key={`${grupo.produtoNome ?? ''}-${grupo.id}`}>
              <p>
                É obrigatório escolher no mínimo{' '}
                <strong className="delivery-text-primary">
                  {formatarQuantidadeItens(grupo.quantidadeMinima)}
                </strong>{' '}
                na opção{' '}
                <strong className="delivery-text-primary">{grupo.nome}</strong>
                {rotuloProduto(grupo.produtoNome)}
              </p>
              {grupo.obrigatorio && !remocaoCarrinho ? (
                <p className="mt-1">
                  A opção{' '}
                  <strong className="delivery-text-primary">{grupo.nome}</strong> é obrigatória
                </p>
              ) : null}
            </li>
          ))}
          {gruposAcimaDoMaximo.map(grupo => (
            <li key={`max-${grupo.produtoNome ?? ''}-${grupo.id}`}>
              <p>
                É permitido no máximo{' '}
                <strong className="delivery-text-primary">
                  {formatarQuantidadeItens(grupo.quantidadeMaxima)}
                </strong>{' '}
                na opção{' '}
                <strong className="delivery-text-primary">{grupo.nome}</strong>
                {rotuloProduto(grupo.produtoNome)}
              </p>
            </li>
          ))}
        </ul>

        {remocaoCarrinho ? (
          <p className="mt-3 text-center text-[11px] leading-snug delivery-text-secondary">
            Caso queira, clique no produto e troque o complemento.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onConfirmar}
          className="delivery-font-title mt-6 min-h-[48px] w-full rounded-xl px-4 text-sm font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          Ok, entendi!
        </button>
      </div>
    </div>
  )
}
