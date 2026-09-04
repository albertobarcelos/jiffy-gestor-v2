/**
 * Subconjunto tipado do response de POST /delivery/pedidos/publico
 * (VendaExpandedDeliveryDTO) usado na tela de confirmação/detalhes.
 */

export type CreatePedidoPublicoEnderecoResponseDTO = {
  etiqueta: string
  rua: string
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  complemento: string | null
}

export type CreatePedidoPublicoComplementoResponseDTO = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
  nomeComplemento: string
  valorUnitario: number
  tipoImpactoPreco: string
}

export type CreatePedidoPublicoProdutoResponseDTO = {
  id: string
  produtoId: string
  nomeProduto: string
  quantidade: number
  valorUnitario: number
  valorFinal: number
  removido: boolean
  complementos: CreatePedidoPublicoComplementoResponseDTO[]
  observacoes: string[]
}

export type CreatePedidoPublicoCobrancaResponseDTO = {
  meioPagamentoId: string
  valor: number
}

export type CreatePedidoPublicoResponseDTO = {
  id: string | null
  codigoVenda: string | null
  numeroVenda: number | null
  tipoEntrega: 'entrega' | 'retirada' | null
  pedidoAgendado: boolean
  valorFinal: number | null
  documentoCpfCnpj: string | null
  cliente: { id: string; nome: string } | null
  contextoEntrega: {
    destinatarioNome: string | null
    destinatarioTelefone: string | null
    destinatarioCpf: string | null
    enderecoEntrega: CreatePedidoPublicoEnderecoResponseDTO | null
  } | null
  produtosLancados: CreatePedidoPublicoProdutoResponseDTO[]
  cobrancas: CreatePedidoPublicoCobrancaResponseDTO[]
  observacoes: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function parseEndereco(raw: unknown): CreatePedidoPublicoEnderecoResponseDTO | null {
  const o = asRecord(raw)
  if (!o) return null
  const rua = asString(o.rua)
  if (!rua) return null
  return {
    etiqueta: asString(o.etiqueta) ?? 'outro',
    rua,
    numero: asString(o.numero),
    bairro: asString(o.bairro),
    cidade: asString(o.cidade),
    estado: asString(o.estado),
    cep: asString(o.cep),
    complemento: asString(o.complemento),
  }
}

function parseObservacoes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (typeof item === 'string') return item.trim()
      const o = asRecord(item)
      return asString(o?.observacao) ?? ''
    })
    .filter(Boolean)
}

function parseComplementos(raw: unknown): CreatePedidoPublicoComplementoResponseDTO[] {
  if (!Array.isArray(raw)) return []
  const out: CreatePedidoPublicoComplementoResponseDTO[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const complementoId = asString(o.complementoId)
    const nomeComplemento = asString(o.nomeComplemento)
    const quantidade = asNumber(o.quantidade)
    if (!complementoId || !nomeComplemento || quantidade == null) continue
    out.push({
      complementoId,
      grupoComplementoId: asString(o.grupoComplementoId) ?? '',
      quantidade,
      nomeComplemento,
      valorUnitario: asNumber(o.valorUnitario) ?? 0,
      tipoImpactoPreco: asString(o.tipoImpactoPreco) ?? 'acrescimo',
    })
  }
  return out
}

function parseProdutos(raw: unknown): CreatePedidoPublicoProdutoResponseDTO[] {
  if (!Array.isArray(raw)) return []
  const out: CreatePedidoPublicoProdutoResponseDTO[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const id = asString(o.id)
    const produtoId = asString(o.produtoId)
    const nomeProduto = asString(o.nomeProduto)
    const quantidade = asNumber(o.quantidade)
    if (!id || !produtoId || !nomeProduto || quantidade == null) continue
    if (o.removido === true) continue
    out.push({
      id,
      produtoId,
      nomeProduto,
      quantidade,
      valorUnitario: asNumber(o.valorUnitario) ?? 0,
      valorFinal: asNumber(o.valorFinal) ?? 0,
      removido: false,
      complementos: parseComplementos(o.complementos),
      observacoes: parseObservacoes(o.observacoes),
    })
  }
  return out
}

function parseCobrancas(raw: unknown): CreatePedidoPublicoCobrancaResponseDTO[] {
  if (!Array.isArray(raw)) return []
  const out: CreatePedidoPublicoCobrancaResponseDTO[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const meioPagamentoId = asString(o.meioPagamentoId)
    const valor = asNumber(o.valor)
    if (!meioPagamentoId || valor == null) continue
    out.push({ meioPagamentoId, valor })
  }
  return out
}

/** Extrai do JSON cru do backend só o necessário para a UI pública. */
export function parseCreatePedidoPublicoResponse(
  raw: unknown
): CreatePedidoPublicoResponseDTO {
  const o = asRecord(raw) ?? {}
  const tipoRaw = asString(o.tipoEntrega)
  const tipoEntrega =
    tipoRaw === 'entrega' || tipoRaw === 'retirada' ? tipoRaw : null

  const clienteRaw = asRecord(o.cliente)
  const contextoRaw = asRecord(o.contextoEntrega)

  return {
    id: asString(o.id),
    codigoVenda: asString(o.codigoVenda),
    numeroVenda: asNumber(o.numeroVenda),
    tipoEntrega,
    pedidoAgendado: asBoolean(o.pedidoAgendado),
    valorFinal: asNumber(o.valorFinal),
    documentoCpfCnpj: asString(o.documentoCpfCnpj),
    cliente: clienteRaw
      ? {
          id: asString(clienteRaw.id) ?? '',
          nome: asString(clienteRaw.nome) ?? '',
        }
      : null,
    contextoEntrega: contextoRaw
      ? {
          destinatarioNome: asString(contextoRaw.destinatarioNome),
          destinatarioTelefone: asString(contextoRaw.destinatarioTelefone),
          destinatarioCpf: asString(contextoRaw.destinatarioCpf),
          enderecoEntrega: parseEndereco(contextoRaw.enderecoEntrega),
        }
      : null,
    produtosLancados: parseProdutos(o.produtosLancados),
    cobrancas: parseCobrancas(o.cobrancas),
    observacoes: parseObservacoes(o.observacoes),
  }
}
