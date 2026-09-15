import {
  extrairMensagensPendenciasCatalogo,
  isEmpresaDeliveryIndisponivel,
  isPublicDeliverySlugNotFound,
  PublicDeliveryApiError,
} from '@/src/application/errors/publicDeliveryErrors'

export type TipoErroCatalogoPublicoUi =
  | 'loja_nao_encontrada'
  | 'loja_indisponivel'
  | 'muitas_requisicoes'
  | 'instabilidade'
  | 'generico'

export type MensagemErroCatalogoPublicoUi = {
  tipo: TipoErroCatalogoPublicoUi
  titulo: string
  descricao: string
}

/**
 * Cópia humanizada para o cliente final na falha de carga do catálogo público.
 * Sem jargão técnico (slug, frete, HTTP, rate limit).
 */
export function resolverMensagemErroCatalogoPublicoUi(
  error: unknown
): MensagemErroCatalogoPublicoUi {
  if (isPublicDeliverySlugNotFound(error)) {
    return {
      tipo: 'loja_nao_encontrada',
      titulo: 'Loja não encontrada',
      descricao:
        'O link que você abriu não corresponde a uma loja disponível. Confira o endereço e tente novamente.',
    }
  }

  if (isEmpresaDeliveryIndisponivel(error)) {
    return {
      tipo: 'loja_indisponivel',
      titulo: 'Loja indisponível no momento',
      descricao: 'Esta loja online ainda não está pronta para pedidos. Tente novamente em breve.',
    }
  }

  const status = error instanceof PublicDeliveryApiError ? error.status : 0

  if (status === 429) {
    return {
      tipo: 'muitas_requisicoes',
      titulo: 'Página indisponível no momento',
      descricao: 'Aguarde cerca de 1 minuto e tente novamente.',
    }
  }

  if (status >= 500) {
    return {
      tipo: 'instabilidade',
      titulo: 'Página indisponível no momento',
      descricao: 'Estamos com uma instabilidade temporária. Tente novamente em instantes.',
    }
  }

  return {
    tipo: 'generico',
    titulo: 'Não foi possível abrir a página',
    descricao: 'Aguarde um momento e tente novamente. Se o problema continuar, volte mais tarde.',
  }
}

/** Log técnico para diagnóstico — não exibir ao cliente. */
export function logErroCatalogoPublico(
  error: unknown,
  contexto: { slug: string; origem?: string }
): void {
  const status = error instanceof PublicDeliveryApiError ? error.status : undefined
  const message = error instanceof Error ? error.message : String(error)
  const details = error instanceof PublicDeliveryApiError ? error.details : undefined
  const pendencias = isEmpresaDeliveryIndisponivel(error)
    ? extrairMensagensPendenciasCatalogo(error)
    : undefined

  console.error('[delivery-publico] Falha ao carregar catálogo', {
    slug: contexto.slug,
    origem: contexto.origem ?? 'catalogo',
    status,
    message,
    details,
    pendencias,
    error,
  })
}
