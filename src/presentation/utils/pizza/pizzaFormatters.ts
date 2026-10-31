const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatPizzaMoney(value: number) {
  return MONEY.format(value)
}

export function textoSaboresTamanho(maxDivisoes: number) {
  if (maxDivisoes <= 1) return 'Aceita 1 sabor'
  return `Aceita 1 e ${maxDivisoes} sabores`
}

export function textoPedacos(pedacos: number) {
  return pedacos === 1 ? 'Cortada em 1 pedaço' : `Cortada em ${pedacos} pedaços`
}
