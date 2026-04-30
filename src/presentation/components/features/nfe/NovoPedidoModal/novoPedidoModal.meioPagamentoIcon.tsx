import type React from 'react'
import { MdAttachMoney, MdCreditCard, MdQrCode } from 'react-icons/md'

/** Ícone React para exibição conforme nome do meio (dinheiro, pix, cartão…). */
export function obterIconeMeioPagamento(nome: string): React.ComponentType<{ className?: string }> {
  const nomeLower = nome.toLowerCase()
  if (nomeLower.includes('dinheiro') || nomeLower.includes('cash')) {
    return MdAttachMoney
  }
  if (nomeLower.includes('pix')) {
    return MdQrCode
  }
  if (
    nomeLower.includes('credito') ||
    nomeLower.includes('debito') ||
    nomeLower.includes('cartão') ||
    nomeLower.includes('cartao')
  ) {
    return MdCreditCard
  }
  return MdCreditCard
}
