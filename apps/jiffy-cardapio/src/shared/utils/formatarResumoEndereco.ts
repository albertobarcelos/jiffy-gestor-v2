/**
 * Resumo textual de endereço (cliente ou loja) — canônico do cardápio.
 */

export type EnderecoResumoInput = {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
}

/** Formato compacto para cards/listas de cliente. */
export function formatarResumoEndereco(endereco: EnderecoResumoInput): string {
  const cidadeEstado = [endereco.cidade, endereco.estado].filter(Boolean).join('/')
  const partes = [
    endereco.rua,
    endereco.numero ? `nº ${endereco.numero}` : '',
    endereco.bairro,
    cidadeEstado,
  ].filter(Boolean)
  return partes.join(', ')
}

/** Formato multilinha curto para endereço da empresa (home/carrinho). */
export function formatarEnderecoEmpresa(endereco: EnderecoResumoInput | null | undefined): string | null {
  if (!endereco) return null

  const linha1 = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  const linha2 = [endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(', ')
  const cep = endereco.cep?.trim()

  const partes = [linha1, linha2, cep ? `${cep}, Brasil` : 'Brasil'].filter(
    parte => String(parte).trim().length > 0
  )

  return partes.length > 0 ? partes.join(' - ') : null
}
