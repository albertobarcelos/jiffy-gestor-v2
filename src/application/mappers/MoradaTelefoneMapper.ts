import type {
  CriarMoradaTelefoneDTO,
  EnderecoMorada,
  MoradaTelefone,
} from '@/src/domain/types/moradaEntrega'

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function optStr(v: unknown): string | undefined {
  const s = asStr(v)
  return s === '' ? undefined : s
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] != null && String(obj[k]).trim() !== '') {
      return obj[k]
    }
  }
  return undefined
}

function enderecoTemConteudoMinimo(e: EnderecoMorada): boolean {
  return Boolean(
    e.cep || e.rua || e.numero || e.bairro || e.cidade || e.estado || e.complemento || e.referencia
  )
}

function extrairEnderecoDeRecord(rec: Record<string, unknown>): EnderecoMorada {
  const estadoRaw = asStr(pick(rec, ['estado', 'uf', 'state']))
  const enderecoLocalizacao = (() => {
    const raw = rec.enderecoLocalizacao ?? rec.endereco_localizacao
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const o = raw as Record<string, unknown>
    if (o.type !== 'Point' || !Array.isArray(o.coordinates) || o.coordinates.length < 2) {
      return null
    }
    const lng = Number(o.coordinates[0])
    const lat = Number(o.coordinates[1])
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
    return { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }
  })()
  const preferenciaEntrega = (() => {
    const raw = rec.preferenciaEntrega ?? rec.preferencia_entrega
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const o = raw as Record<string, unknown>
    if (o.type !== 'Point' || !Array.isArray(o.coordinates) || o.coordinates.length < 2) {
      return null
    }
    const lng = Number(o.coordinates[0])
    const lat = Number(o.coordinates[1])
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
    return { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }
  })()
  const providerEnderecoId = optStr(pick(rec, ['providerEnderecoId', 'provider_endereco_id']))

  return {
    cep: asStr(pick(rec, ['cep', 'CEP', 'codigoPostal', 'codigo_postal'])),
    rua: asStr(pick(rec, ['rua', 'logradouro', 'street'])),
    numero: asStr(pick(rec, ['numero', 'numeroEndereco', 'numero_endereco', 'number'])),
    bairro: asStr(pick(rec, ['bairro', 'district'])),
    cidade: asStr(pick(rec, ['cidade', 'localidade', 'city', 'municipio'])),
    estado: estadoRaw.toUpperCase().slice(0, 2),
    complemento: optStr(pick(rec, ['complemento', 'complement'])),
    referencia: optStr(pick(rec, ['referencia', 'referência', 'reference'])),
    ...(enderecoLocalizacao
      ? {
          enderecoLocalizacao,
          providerEnderecoId: providerEnderecoId ?? null,
          ...(preferenciaEntrega ? { preferenciaEntrega } : {}),
        }
      : {}),
  }
}

export function normalizarMoradaTelefone(raw: unknown): MoradaTelefone | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const o = raw as Record<string, unknown>

  const id = asStr(pick(o, ['id', 'moradaTelefoneId', 'morada_telefone_id', 'moradaId']))
  if (!id) {
    return null
  }

  const nestedRaw = o.endereco
  let enderecoPlano = extrairEnderecoDeRecord(o)

  if (nestedRaw && typeof nestedRaw === 'object' && !Array.isArray(nestedRaw)) {
    const nestedMap = nestedRaw as Record<string, unknown>
    const doNested = extrairEnderecoDeRecord(nestedMap)
    if (enderecoTemConteudoMinimo(doNested)) {
      enderecoPlano = doNested
    }
  }

  return {
    id,
    telefone: asStr(
      pick(o, ['telefone', 'telefoneNormalizado', 'telefone_normalizado', 'phone'])
    ),
    tipoEtiqueta: optStr(pick(o, ['tipoEtiqueta', 'tipo_etiqueta'])),
    nomeMorada: optStr(pick(o, ['nomeMorada', 'nome_morada'])),
    endereco: enderecoPlano,
  }
}

export async function moradaFromResponse(
  response: Response,
  dtoFallback?: CriarMoradaTelefoneDTO
): Promise<MoradaTelefone> {
  let raw: unknown = {}
  try {
    const text = await response.text()
    raw = text.trim() ? JSON.parse(text) : {}
  } catch {
    raw = {}
  }

  const payload =
    raw && typeof raw === 'object' && raw !== null && 'data' in raw && (raw as { data: unknown }).data != null
      ? (raw as { data: unknown }).data
      : raw

  const normalizada = normalizarMoradaTelefone(payload)
  if (normalizada) {
    return normalizada
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload) && dtoFallback) {
    const p = payload as Record<string, unknown>
    const id = asStr(pick(p, ['id', 'moradaTelefoneId', 'morada_telefone_id']))
    if (id) {
      return {
        id,
        telefone: asStr(pick(p, ['telefone'])) || dtoFallback.telefone,
        tipoEtiqueta: dtoFallback.tipoEtiqueta,
        nomeMorada: dtoFallback.nomeMorada,
        endereco: { ...dtoFallback.endereco },
      }
    }
  }

  throw new Error(
    dtoFallback
      ? 'A morada pode ter sido salva, mas a resposta do servidor não trouxe os dados completos. Busque de novo pelo telefone.'
      : 'Resposta inválida do servidor.'
  )
}
