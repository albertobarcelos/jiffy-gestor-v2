'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clienteDeliveryParaMoradas,
  extrairMoradaDeClienteDeliveryResponse,
  moradaDtoParaEnderecoDeliveryPayload,
  normalizarClienteDeliveryApi,
} from '@/src/application/mappers/ClienteDeliveryMoradaMapper'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { showToast } from '@/src/shared/utils/toast'

export interface MoradaTelefoneHookOptions {
  /** Usa `GET/POST/PATCH /api/delivery/clientes` em vez de morada-telefone do gestor. */
  usarModuloDelivery?: boolean
}

/**
 * `empresaId` incluso na key para evitar cross-tenant cache leak:
 * empresas diferentes podem ter clientes com o mesmo telefone.
 */
function moradasTelefoneQueryKey(
  telefone: string | null,
  usarModuloDelivery: boolean,
  empresaId: string | null
) {
  return ['moradas-telefone', empresaId, telefone, usarModuloDelivery ? 'delivery' : 'gestor'] as const
}

/** Corpo JSON comum em erros do BFF / Nest (`error`, `message`, `title`). */
function mensagemErroResposta(payload: unknown, status: number, fallback: string): string {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    for (const key of ['error', 'message', 'title'] as const) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return `${fallback} (${status})`
}

export interface EnderecoMorada {
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento?: string
  referencia?: string
}

export interface MoradaTelefone {
  id: string
  telefone: string
  tipoEtiqueta?: string
  nomeMorada?: string
  /** Presente após normalização; a API pode omitir em alguns payloads. */
  endereco?: EnderecoMorada
}

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function optStr(v: unknown): string | undefined {
  const s = asStr(v)
  return s === '' ? undefined : s
}

/**
 * Lê o primeiro campo definido (camelCase / snake_case do backend).
 */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] != null && String(obj[k]).trim() !== '') {
      return obj[k]
    }
  }
  return undefined
}

/** Verifica se há pelo menos um campo de logradouro preenchido após extração. */
function enderecoTemConteudoMinimo(e: EnderecoMorada): boolean {
  return Boolean(
    e.cep || e.rua || e.numero || e.bairro || e.cidade || e.estado || e.complemento || e.referencia
  )
}

/** Monta `EnderecoMorada` a partir de um objeto (raiz ou `endereco` aninhado). */
function extrairEnderecoDeRecord(rec: Record<string, unknown>): EnderecoMorada {
  const estadoRaw = asStr(pick(rec, ['estado', 'uf', 'state']))
  return {
    cep: asStr(pick(rec, ['cep', 'CEP', 'codigoPostal', 'codigo_postal'])),
    rua: asStr(pick(rec, ['rua', 'logradouro', 'street'])),
    numero: asStr(pick(rec, ['numero', 'numeroEndereco', 'numero_endereco', 'number'])),
    bairro: asStr(pick(rec, ['bairro', 'district'])),
    cidade: asStr(pick(rec, ['cidade', 'localidade', 'city', 'municipio'])),
    estado: estadoRaw.toUpperCase().slice(0, 2),
    complemento: optStr(pick(rec, ['complemento', 'complement'])),
    referencia: optStr(pick(rec, ['referencia', 'referência', 'reference'])),
  }
}

/**
 * Converte item bruto do GET/POST morada-telefone no modelo usado na UI.
 * Suporta:
 * - `endereco` aninhado (objeto)
 * - Resposta 201 plana (cep, rua, numero… no raiz, sem objeto `endereco`) — Swagger gestor
 * - Se existir `endereco: {}` vazio, usa os campos do raiz.
 */
export function normalizarMoradaTelefone(raw: unknown): MoradaTelefone | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const o = raw as Record<string, unknown>

  const id = asStr(
    pick(o, ['id', 'moradaTelefoneId', 'morada_telefone_id', 'moradaId'])
  )
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

export interface CriarMoradaTelefoneDTO {
  telefone: string
  tipoEtiqueta?: string
  nomeMorada?: string
  endereco: EnderecoMorada
}

/** Mesmo contrato do POST (Swagger PATCH morada-telefone/{id}). */
export type AtualizarMoradaTelefoneDTO = CriarMoradaTelefoneDTO

async function moradaFromResponse(
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

/**
 * Busca moradas ativas da empresa para o telefone informado.
 * Retorna lista vazia quando não há moradas cadastradas para o número.
 */
export function useMoradasPorTelefone(
  telefone: string | null,
  options?: MoradaTelefoneHookOptions
) {
  const { tenantAuth, isAuthenticated, isRehydrated } = useAuthStore()
  const token = tenantAuth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useQuery<MoradaTelefone[]>({
    queryKey: moradasTelefoneQueryKey(telefone, usarModuloDelivery, empresaId),
    queryFn: async () => {
      if (!telefone || !token || !empresaId) return []

      if (usarModuloDelivery) {
        const response = await fetch(
          `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        )

        if (response.status === 404) return []

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            mensagemErroResposta(errorData, response.status, 'Erro ao buscar moradas')
          )
        }

        const data = await response.json()
        const cliente = normalizarClienteDeliveryApi(data)
        return cliente ? clienteDeliveryParaMoradas(cliente) : []
      }

      const response = await fetch(
        `/api/gestor/morada-telefone?telefone=${encodeURIComponent(telefone)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          mensagemErroResposta(errorData, response.status, 'Erro ao buscar moradas')
        )
      }

      const data = await response.json()
      const listaBruta = Array.isArray(data) ? data : (data.items || data.moradas || [])
      const lista = listaBruta
        .map((item: unknown) => normalizarMoradaTelefone(item))
        .filter((m: MoradaTelefone | null): m is MoradaTelefone => m != null)
      return lista
    },
    enabled: !!telefone && isRehydrated && isAuthenticated && !!token && !!empresaId && !(tenantAuth?.isExpired()),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  })
}

/**
 * Cria uma nova morada reutilizável para o par empresa + telefone.
 * Invalida o cache de moradas do telefone após sucesso.
 */
export function useCriarMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, dto: CriarMoradaTelefoneDTO) => {
      if (usarModuloDelivery) {
        const enderecoPayload = moradaDtoParaEnderecoDeliveryPayload(dto)
        const telefone = dto.telefone.replace(/\D/g, '')

        const getResponse = await fetch(
          `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        )

        if (getResponse.ok) {
          const patchResponse = await fetch(
            `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                enderecos: { create: [enderecoPayload] },
              }),
            }
          )

          if (!patchResponse.ok) {
            const errorData = await patchResponse.json().catch(() => ({}))
            throw new Error(
              mensagemErroResposta(errorData, patchResponse.status, 'Erro ao criar morada')
            )
          }

          const patchData = await patchResponse.json()
          return extrairMoradaDeClienteDeliveryResponse(patchData, dto)
        }

        if (getResponse.status !== 404) {
          const errorData = await getResponse.json().catch(() => ({}))
          throw new Error(
            mensagemErroResposta(errorData, getResponse.status, 'Erro ao criar morada')
          )
        }

        const postResponse = await fetch('/api/delivery/clientes', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            telefone,
            enderecos: [enderecoPayload],
          }),
        })

        if (!postResponse.ok) {
          const errorData = await postResponse.json().catch(() => ({}))
          throw new Error(
            mensagemErroResposta(errorData, postResponse.status, 'Erro ao criar morada')
          )
        }

        const postData = await postResponse.json()
        return extrairMoradaDeClienteDeliveryResponse(postData, dto)
      }

      const response = await fetch('/api/gestor/morada-telefone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          mensagemErroResposta(errorData, response.status, 'Erro ao criar morada')
        )
      }

      return moradaFromResponse(response, dto)
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(variables.telefone, usarModuloDelivery, empresaId),
        })
        showToast.success('Endereço cadastrado com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao cadastrar endereço')
      },
    }
  )
}

/**
 * Atualiza morada existente (PATCH gestor/morada-telefone/:id).
 */
export function useAtualizarMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, {
      id,
      dto,
    }: {
      id: string
      dto: AtualizarMoradaTelefoneDTO
    }) => {
      if (usarModuloDelivery) {
        const telefone = dto.telefone.replace(/\D/g, '')
        const enderecoPayload = moradaDtoParaEnderecoDeliveryPayload(dto)

        const response = await fetch(
          `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              enderecos: {
                update: [{ id, ...enderecoPayload }],
              },
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            mensagemErroResposta(errorData, response.status, 'Erro ao atualizar morada')
          )
        }

        const data = await response.json()
        return extrairMoradaDeClienteDeliveryResponse(data, dto, id)
      }

      const response = await fetch(`/api/gestor/morada-telefone/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          mensagemErroResposta(errorData, response.status, 'Erro ao atualizar morada')
        )
      }

      return moradaFromResponse(response, dto)
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(variables.dto.telefone, usarModuloDelivery, empresaId),
        })
        showToast.success('Endereço atualizado com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao atualizar endereço')
      },
    }
  )
}

/**
 * Regista utilização da morada (POST …/registrar-uso) para ordenar como mais recente no catálogo.
 * Deve ser chamado ao selecionar um endereço; não está acoplado ao POST da venda.
 */
export function useRegistrarUsoMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, {
      id,
      telefoneDigitos,
    }: {
      id: string
      /** Mesmo valor da query `moradas-telefone` — dígitos do telefone usados na busca. */
      telefoneDigitos: string
    }) => {
      if (usarModuloDelivery) {
        return
      }

      const response = await fetch(
        `/api/gestor/morada-telefone/${encodeURIComponent(id)}/registrar-uso`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          mensagemErroResposta(errorData, response.status, 'Erro ao registrar uso do endereço')
        )
      }
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(variables.telefoneDigitos, usarModuloDelivery, empresaId),
        })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Não foi possível atualizar o endereço recente')
      },
    }
  )
}
