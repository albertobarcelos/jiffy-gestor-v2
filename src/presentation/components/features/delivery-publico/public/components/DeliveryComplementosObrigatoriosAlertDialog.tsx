'use client'

import { MdClose } from 'react-icons/md'
import type { GrupoComplementoPendente } from '../../shared/utils/produtoComplementosUtils'

type DeliveryComplementosObrigatoriosAlertDialogProps = {
  gruposPendentes: GrupoComplementoPendente[]
  onConfirmar: () => void
}

function formatarQuantidadeItens(quantidade: number): string {
  return quantidade === 1 ? '1 item' : `${quantidade} itens`
}

export function DeliveryComplementosObrigatoriosAlertDialog({
  gruposPendentes,
  onConfirmar,
}: DeliveryComplementosObrigatoriosAlertDialogProps) {
  if (gruposPendentes.length === 0) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
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
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2"
          style={{
            borderColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-primary-dark)',
          }}
          aria-hidden
        >
          <span className="text-[2.25rem] font-bold leading-none">!</span>
        </div>

        <p
          id="delivery-complementos-obrigatorios-titulo"
          className="delivery-font-title mt-4 text-center text-base font-bold leading-snug delivery-text-primary"
        >
          Ops! Separei alguns complementos obrigatórios para você olhar!
        </p>

        <ul
          id="delivery-complementos-obrigatorios-descricao"
          className="mt-4 space-y-3 text-center text-sm leading-relaxed delivery-text-secondary"
        >
          {gruposPendentes.map(grupo => (
            <li key={grupo.id}>
              <p>
                É obrigatório escolher no mínimo{' '}
                <strong className="delivery-text-primary">
                  {formatarQuantidadeItens(grupo.quantidadeMinima)}
                </strong>{' '}
                na opção{' '}
                <strong className="delivery-text-primary">{grupo.nome}</strong>
              </p>
              {grupo.obrigatorio ? (
                <p className="mt-1">
                  A opção{' '}
                  <strong className="delivery-text-primary">{grupo.nome}</strong> é obrigatória
                </p>
              ) : null}
            </li>
          ))}
        </ul>

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
