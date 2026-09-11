export const TELEFONE_MIN_DIGITOS_ENTREGA_LEGADO = 8
export const TELEFONE_MIN_DIGITOS_ENTREGA_DELIVERY = 11

export const ETIQUETAS_MORADA_ENTREGA = ['Casa', 'Trabalho', 'Outro'] as const
export type TipoEtiquetaMoradaEntrega = (typeof ETIQUETAS_MORADA_ENTREGA)[number]

/** Cadastro desta empresa: precisa de id do ERP, não do diretório delivery. */
export function clienteCadastradoNestaEmpresa(clienteId?: string | null): boolean {
  return Boolean(clienteId?.trim())
}

export function telefoneMinimoDigitosBuscaEntrega(usarModuloDelivery: boolean): number {
  return usarModuloDelivery
    ? TELEFONE_MIN_DIGITOS_ENTREGA_DELIVERY
    : TELEFONE_MIN_DIGITOS_ENTREGA_LEGADO
}

export function podeExibirEnderecosClienteEntrega(input: {
  mostrarEnderecos: boolean
  clienteId?: string | null
}): boolean {
  return input.mostrarEnderecos && clienteCadastradoNestaEmpresa(input.clienteId)
}

export function normalizarTipoEtiquetaMorada(
  valor: string | undefined | null
): TipoEtiquetaMoradaEntrega {
  const raw = String(valor ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'trabalho') return 'Trabalho'
  if (raw === 'outro') return 'Outro'
  return 'Casa'
}

export function nomePadraoMoradaEntrega(tipoEtiqueta: TipoEtiquetaMoradaEntrega): string {
  if (tipoEtiqueta === 'Casa') return 'Casa Principal'
  if (tipoEtiqueta === 'Trabalho') return 'Trabalho'
  return 'Outro'
}
