import {
  gestorConfigDelete,
  gestorConfigJson,
  type GestorConfigResult,
} from '@/src/infrastructure/api/gestorConfigRequest'

const FUNCIONAMENTO = '/api/delivery/empresas/me/funcionamento'
const RAIOS = '/api/delivery/empresas/me/raios-entrega'
const AREAS = '/api/delivery/empresas/me/areas-entrega'

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
