/** Tipos e normalização mínima do cliente delivery (API pública). */

export interface ClienteDeliveryEnderecoApi {
  id?: string | null
  etiqueta?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
  ultimaUtilizacaoEm?: string | null
}

export interface ClienteDeliveryApi {
  telefone: string
  nome?: string | null
  cpf?: string | null
  clienteIdVinculado?: string | null
  enderecos?: ClienteDeliveryEnderecoApi[]
}

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

export function normalizarClienteDeliveryApi(raw: unknown): ClienteDeliveryApi | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const inner =
    o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)
      ? (o.data as Record<string, unknown>)
      : o

  const telefone = asStr(inner.telefone)
  if (!telefone) return null

  const enderecosRaw = inner.enderecos
  const enderecos = Array.isArray(enderecosRaw)
    ? (enderecosRaw as ClienteDeliveryEnderecoApi[])
    : []

  return {
    telefone,
    nome: inner.nome != null ? asStr(inner.nome) : null,
    cpf: inner.cpf != null ? asStr(inner.cpf) : null,
    clienteIdVinculado:
      inner.clienteIdVinculado != null ? asStr(inner.clienteIdVinculado) : null,
    enderecos,
  }
}
