import {
  gestorConfigDelete,
  gestorConfigJson,
  type GestorConfigResult,
} from '@/src/infrastructure/api/gestorConfigRequest'

const EMPRESA_ME = '/api/delivery/empresas/me'
const FUNCIONAMENTO = '/api/delivery/empresas/me/funcionamento'
const RAIOS = '/api/delivery/empresas/me/raios-entrega'
const AREAS = '/api/delivery/empresas/me/areas-entrega'
const CANAL_WHATSAPP = '/api/delivery/empresas/me/canal-whatsapp'
const NOTIFICACOES_WHATSAPP = '/api/delivery/empresas/me/notificacoes-whatsapp'

export function getEmpresaDeliveryMe(token: string): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(EMPRESA_ME, token)
}

export function criarEmpresaDeliveryMe(
  token: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(EMPRESA_ME, token, { method: 'POST', json: body })
}

export function patchEmpresaDeliveryMe(
  token: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(EMPRESA_ME, token, { method: 'PATCH', json: body })
}

export function getCanalWhatsAppDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(CANAL_WHATSAPP, token)
}

export function getCanalWhatsAppStatusDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${CANAL_WHATSAPP}/status`, token)
}

export function putCanalWhatsAppDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(CANAL_WHATSAPP, token, { method: 'PUT' })
}

export function getCanalWhatsAppQrcodeDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${CANAL_WHATSAPP}/qrcode`, token)
}

export function excluirCanalWhatsAppDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete(CANAL_WHATSAPP, token)
}

export function listarNotificacoesWhatsAppDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(NOTIFICACOES_WHATSAPP, token)
}

export function patchNotificacaoWhatsAppDelivery(
  token: string,
  tipo: string,
  body: { ativo: boolean }
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(
    `${NOTIFICACOES_WHATSAPP}/${encodeURIComponent(tipo)}`,
    token,
    { method: 'PATCH', json: body }
  )
}

export function listarEntregadoresDeliveryPagina(
  token: string,
  params: { limit: number; offset: number }
): Promise<GestorConfigResult<unknown>> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  return gestorConfigJson(`/api/delivery/entregadores?${qs.toString()}`, token)
}

export function listarMeiosPagamentoPagina(
  token: string,
  params: { limit: number; offset: number }
): Promise<GestorConfigResult<unknown>> {
  const qs = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })
  return gestorConfigJson(`/api/meios-pagamentos?${qs.toString()}`, token)
}

export function getFuncionamentoDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(FUNCIONAMENTO, token)
}

export function getAgendaFuncionamentoDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${FUNCIONAMENTO}/agenda`, token)
}

export function putAgendaFuncionamentoDelivery(
  token: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${FUNCIONAMENTO}/agenda`, token, {
    method: 'PUT',
    json: body,
  })
}

export function postToggleFuncionamentoDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${FUNCIONAMENTO}/toggle`, token, { method: 'POST' })
}

export function listarRaiosEntregaDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(RAIOS, token)
}

export function criarRaioEntregaDelivery(
  token: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(RAIOS, token, { method: 'POST', json: body })
}

export function patchRaioEntregaDelivery(
  token: string,
  id: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${RAIOS}/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    json: body,
  })
}

export function excluirRaioEntregaDelivery(
  token: string,
  id: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete(`${RAIOS}/${encodeURIComponent(id)}`, token)
}

export function listarAreasEntregaDelivery(
  token: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(AREAS, token)
}

export function criarAreaEntregaDelivery(
  token: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(AREAS, token, { method: 'POST', json: body })
}

export function patchAreaEntregaDelivery(
  token: string,
  id: string,
  body: unknown
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigJson(`${AREAS}/${encodeURIComponent(id)}`, token, {
    method: 'PATCH',
    json: body,
  })
}

export function excluirAreaEntregaDelivery(
  token: string,
  id: string
): Promise<GestorConfigResult<unknown>> {
  return gestorConfigDelete(`${AREAS}/${encodeURIComponent(id)}`, token)
}
