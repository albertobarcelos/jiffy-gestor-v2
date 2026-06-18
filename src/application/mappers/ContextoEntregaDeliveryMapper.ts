import type {
  ContextoEntregaDeliveryApi,
  EnderecoEntregaSnapshotApi,
  UpdatePedidoEnderecoEntregaApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import type { EnderecoEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import { mapTipoEtiquetaUiParaEtiquetaDelivery } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function pickEnderecoField(e: Record<string, unknown>, key: string): string | null {
  const v = e[key]
  return v != null && String(v).trim() !== '' ? String(v).trim() : null
}

/** Lê `contextoEntrega` do GET pedido delivery (ou venda adaptada). */
export function extrairContextoEntregaDeVendaData(
  vendaData: Record<string, unknown>
): ContextoEntregaDeliveryApi | null {
  const raw = vendaData.contextoEntrega
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as ContextoEntregaDeliveryApi
}

/** Converte snapshot do pedido (`contextoEntrega.enderecoEntrega`) para exibição no detalhe. */
export function enderecoSnapshotParaEnderecoEntregaDetalhe(
  snapshot: EnderecoEntregaSnapshotApi | null | undefined
): EnderecoEntregaDetalhe | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const e = snapshot as Record<string, unknown>
  const mapped: EnderecoEntregaDetalhe = {
    cep: pickEnderecoField(e, 'cep'),
    rua: pickEnderecoField(e, 'rua'),
    numero: pickEnderecoField(e, 'numero'),
    bairro: pickEnderecoField(e, 'bairro'),
    cidade: pickEnderecoField(e, 'cidade'),
    estado: pickEnderecoField(e, 'estado'),
    complemento: pickEnderecoField(e, 'complemento'),
    referencia: null,
  }
  const hasAny = Object.values(mapped).some(Boolean)
  return hasAny ? mapped : null
}

/** Endereço congelado no pedido — prioridade sobre catálogo do cliente delivery. */
export function extrairEnderecoEntregaSnapshotDeVendaData(
  vendaData: Record<string, unknown>
): EnderecoEntregaDetalhe | null {
  const contexto = extrairContextoEntregaDeVendaData(vendaData)
  if (contexto?.enderecoEntrega) {
    return enderecoSnapshotParaEnderecoEntregaDetalhe(contexto.enderecoEntrega)
  }

  const legado = vendaData.enderecoEntrega
  if (!legado || typeof legado !== 'object' || Array.isArray(legado)) return null
  return enderecoSnapshotParaEnderecoEntregaDetalhe(legado as EnderecoEntregaSnapshotApi)
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Monta PATCH `enderecoEntrega` — referência a morada salva ou correção manual do snapshot. */
export function buildUpdateEnderecoEntregaPedidoPayload(input: {
  enderecoDeliveryId?: string | null
  enderecoManual?: {
    tipoEtiqueta?: string | null
    endereco: {
      rua: string
      numero: string
      bairro: string
      cidade?: string
      estado?: string
      cep?: string
      complemento?: string
    }
  } | null
}): { enderecoEntrega: UpdatePedidoEnderecoEntregaApi } {
  const enderecoDeliveryId = input.enderecoDeliveryId?.trim()
  if (enderecoDeliveryId) {
    return { enderecoEntrega: { enderecoDeliveryId } }
  }

  const manual = input.enderecoManual
  if (!manual?.endereco) {
    throw new Error('Informe enderecoDeliveryId ou os dados do endereço para atualização.')
  }

  const e = manual.endereco
  const endereco: EnderecoEntregaSnapshotApi = {
    etiqueta: mapTipoEtiquetaUiParaEtiquetaDelivery(manual.tipoEtiqueta),
    rua: asStr(e.rua),
    numero: asStr(e.numero),
    bairro: asStr(e.bairro),
    cidade: asStr(e.cidade) || null,
    estado: asStr(e.estado).slice(0, 2).toUpperCase() || null,
    cep: onlyDigits(asStr(e.cep)).slice(0, 8),
    complemento: asStr(e.complemento) || null,
  }

  return { enderecoEntrega: { endereco } }
}
