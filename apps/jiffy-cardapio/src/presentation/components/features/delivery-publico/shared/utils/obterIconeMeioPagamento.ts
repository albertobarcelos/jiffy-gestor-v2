import type { IconType } from 'react-icons'
import { HiOutlineCreditCard } from 'react-icons/hi2'
import { LiaMoneyBillSolid } from 'react-icons/lia'
import { MdPix } from 'react-icons/md'

/** Mesma regra de ícones do modal de pedido delivery no gestor. */
export function obterIconeMeioPagamento(nome: string): IconType {
  const nomeLower = nome.toLowerCase()
  if (nomeLower.includes('dinheiro') || nomeLower.includes('cash')) {
    return LiaMoneyBillSolid
  }
  if (nomeLower.includes('pix')) {
    return MdPix
  }
  if (
    nomeLower.includes('credito') ||
    nomeLower.includes('debito') ||
    nomeLower.includes('cartão') ||
    nomeLower.includes('cartao')
  ) {
    return HiOutlineCreditCard
  }
  return HiOutlineCreditCard
}
