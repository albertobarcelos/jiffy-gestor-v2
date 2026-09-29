import type {
  ICardapioMarketplaceHub,
  ListaCardapioRemoto,
  ListaCategoriasCardapio,
  ListaPagamentosCardapio,
  ListaProdutosCardapio,
  SessaoCardapioHub,
} from '@/src/domain/integracoes/ICardapioMarketplaceHub'
import type {
  ItemAplicarCardapio,
  ItemAplicarCategoria,
  ItemAplicarPagamento,
  ItemImportarCardapio,
  ResultadoAplicarCardapio,
  ResultadoAplicarCategoria,
  ResultadoAplicarPagamento,
  ResultadoImportarCardapio,
} from '@/src/domain/integracoes/cardapioMarketplace'
import type {
  AutorizacaoMarketplace,
  IMarketplaceHub,
  LojaMarketplace,
} from '@/src/domain/integracoes/IMarketplaceHub'
import type { SolicitacaoConexaoMarketplace } from '@/src/domain/integracoes/SolicitacaoConexaoMarketplace'
import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'
import {
  lerCategoriasCardapioDoHub,
  lerPagamentosCardapioDoHub,
  lerProdutosCardapioDoHub,
  lerRemotoCardapioDoHub,
  lerResultadosAplicarCategoriaDoHub,
  lerResultadosAplicarDoHub,
  lerResultadosAplicarPagamentoDoHub,
  lerResultadosImportarDoHub,
} from '@/src/infrastructure/integracoes/hubCardapioParse'
import {
  lerHubMarketplaceConfig,
  type HubMarketplaceConfig,
} from '@/src/infrastructure/integracoes/hubMarketplaceConfig'
import {
  getLocationSemSeguir,
  type RespostaRedirectHub,
} from '@/src/infrastructure/integracoes/hubMarketplaceHttp'
import {
  authorizationUrlValida,
  connectUrlPertenceAoHub,
  lerCaminhoConnectDoHub,
  hubSemRotaDeCardapio,
  lerLojasAtivasDoHub,
  mensagemErroDoHub,
  mensagemErroDoHubJson,
  mensagemFalhaHub401,
  resolverUrlDoHub,
} from '@/src/infrastructure/integracoes/hubMarketplaceParse'

function mensagemFalhaConnect(status: number, body: string | null): string {
  const hub = mensagemErroDoHub(body)
  if (hub?.includes('MAGALU_')) {
    return 'O hub ainda não tem o app Magalu configurado (CLIENT_ID, SECRET ou REDIRECT_URI).'
  }
  if (hub?.includes('Merchant inativo')) {
    return 'Esta loja está inativa no hub.'
  }
  if (hub) return hub
  if (status === 422) {
    return 'O hub recusou iniciar o login Magalu. Confira o ID da loja e a configuração OAuth do hub.'
  }
  return 'Não foi possível abrir o login da integração.'
}

const HUB_TIMEOUT_MS = 15_000

type HubFetch = typeof fetch
type GetSemRedirect = (
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
) => Promise<RespostaRedirectHub>

export type HubMarketplaceAdapterDeps = {
  fetchFn?: HubFetch
  getSemRedirect?: GetSemRedirect
}

function headersDoHub(secret: string, json = false, authorization?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Webhook-Secret': secret,
    Accept: 'application/json',
  }
  if (json) {
    headers['Content-Type'] = 'application/json'
  }
  if (authorization) {
    headers.Authorization = authorization
  }
  return headers
}
async function lerJsonSilencioso(response: Response): Promise<unknown> {
  const texto = await response.text()
  return parseJsonOuNulo(texto)
}

function parseJsonOuNulo(texto: string): unknown {
  if (!texto.trim()) return null
  try {
    return JSON.parse(texto) as unknown
  } catch {
    return null
  }
}

/**
 * Único adapter do hub. O marketplace vai no body; o protocolo não muda.
 * Cardápio e lojas usam as rotas públicas do hub, nunca /internal.
 */
export class HubMarketplaceAdapter implements IMarketplaceHub, ICardapioMarketplaceHub {
  private readonly fetchFn: HubFetch
  private readonly getSemRedirect: GetSemRedirect

  constructor(
    private readonly config: HubMarketplaceConfig,
    deps: HubMarketplaceAdapterDeps = {}
  ) {
    this.fetchFn = deps.fetchFn ?? fetch
    this.getSemRedirect = deps.getSemRedirect ?? getLocationSemSeguir
  }

  async iniciarConexao(solicitacao: SolicitacaoConexaoMarketplace): Promise<AutorizacaoMarketplace> {
    const connectUrl = await this.criarMerchant(solicitacao)
    const authorizationUrl = await this.abrirConnectSemSeguirRedirect(connectUrl)
    return { authorizationUrl }
  }

  private async criarMerchant(solicitacao: SolicitacaoConexaoMarketplace): Promise<URL> {
    const url = `${this.config.baseUrl}/lojas`
    let response: Response
    try {
      response = await this.fetchFn(url, {
        method: 'POST',
        headers: headersDoHub(this.config.webhookSecret, true),
        body: JSON.stringify({
          empresaId: solicitacao.empresaId,
          marketplace: solicitacao.marketplace.codigo,
          merchantIdOd: solicitacao.merchantIdOd.valor,
        }),
        signal: AbortSignal.timeout(HUB_TIMEOUT_MS),
        cache: 'no-store',
      })
    } catch {
      throw new IntegracaoMarketplaceError(
        'Não foi possível falar com o hub de integrações.',
        503,
        'INTEGRACAO_HUB_UNAVAILABLE'
      )
    }

    if (!response.ok) {
      console.error('[hub-marketplace] POST /lojas falhou', {
        status: response.status,
        marketplace: solicitacao.marketplace.codigo,
      })
      throw new IntegracaoMarketplaceError(
        'Não foi possível registrar a loja no marketplace.',
        response.status >= 400 && response.status < 500 ? response.status : 502,
        'INTEGRACAO_MERCHANT_CREATE_FAILED'
      )
    }

    const payload = await lerJsonSilencioso(response)
    const caminho = lerCaminhoConnectDoHub(payload)
    if (!caminho) {
      throw new IntegracaoMarketplaceError(
        'O hub não devolveu o endereço de conexão.',
        502,
        'INTEGRACAO_CONNECT_URL_MISSING'
      )
    }

    let connectUrl: URL
    try {
      connectUrl = resolverUrlDoHub(caminho, this.config.baseUrl)
    } catch {
      throw new IntegracaoMarketplaceError(
        'O hub devolveu um endereço de conexão inválido.',
        502,
        'INTEGRACAO_CONNECT_URL_INVALID'
      )
    }

    if (!connectUrlPertenceAoHub(connectUrl, this.config.baseUrl)) {
      throw new IntegracaoMarketplaceError(
        'O hub devolveu um endereço de conexão inválido.',
        502,
        'INTEGRACAO_CONNECT_URL_HOST'
      )
    }

    return connectUrl
  }

  private async abrirConnectSemSeguirRedirect(connectUrl: URL): Promise<string> {
    let resposta: RespostaRedirectHub
    try {
      resposta = await this.getSemRedirect(
        connectUrl.toString(),
        headersDoHub(this.config.webhookSecret),
        HUB_TIMEOUT_MS
      )
    } catch {
      throw new IntegracaoMarketplaceError(
        'Não foi possível iniciar o login da integração.',
        503,
        'INTEGRACAO_CONNECT_UNAVAILABLE'
      )
    }

    if (resposta.status === 401) {
      const falha = mensagemFalhaHub401(mensagemErroDoHub(resposta.body))
      throw new IntegracaoMarketplaceError(falha.message, 502, falha.code)
    }

    const locationRaw = resposta.location
    if (!locationRaw) {
      console.error('[hub-marketplace] GET /oauth/conectar sem Location', {
        status: resposta.status,
        erro: mensagemErroDoHub(resposta.body),
      })
      throw new IntegracaoMarketplaceError(
        mensagemFalhaConnect(resposta.status, resposta.body),
        502,
        'INTEGRACAO_CONNECT_LOCATION_MISSING'
      )
    }

    let location: string
    try {
      location = new URL(locationRaw, connectUrl).toString()
    } catch {
      throw new IntegracaoMarketplaceError(
        'Não foi possível abrir o login da integração.',
        502,
        'INTEGRACAO_CONNECT_LOCATION_INVALID'
      )
    }

    if (!authorizationUrlValida(location)) {
      throw new IntegracaoMarketplaceError(
        'Não foi possível abrir o login da integração.',
        502,
        'INTEGRACAO_CONNECT_LOCATION_INVALID'
      )
    }

    return location
  }

  async listarLojasAtivas(): Promise<LojaMarketplace[]> {
    const payload = await this.chamarHub({
      path: '/lojas',
      method: 'GET',
      codigoErro: 'INTEGRACAO_LOJAS_FAILED',
      mensagemFalha: 'Não foi possível consultar as lojas conectadas.',
    })
    return lerLojasAtivasDoHub(payload)
  }

  async listarProdutos(input: SessaoCardapioHub & { menuId: string }): Promise<ListaProdutosCardapio> {
    const query = new URLSearchParams({
      empresaId: input.empresaId,
      menuId: input.menuId,
    })
    const payload = await this.chamarHub({
      path: `/cardapio/aiqfome/produtos?${query}`,
      method: 'GET',
      authorization: input.authorization,
      codigoErro: 'INTEGRACAO_CARDAPIO_PRODUTOS_FAILED',
      mensagemFalha: 'Não foi possível ler o cardápio da loja.',
    })
    return lerProdutosCardapioDoHub(payload)
  }

  async listarRemoto(input: SessaoCardapioHub & { busca?: string }): Promise<ListaCardapioRemoto> {
    const query = new URLSearchParams({ empresaId: input.empresaId })
    if (input.busca) query.set('busca', input.busca)
    const payload = await this.chamarHub({
      path: `/cardapio/aiqfome/remoto?${query}`,
      method: 'GET',
      authorization: input.authorization,
      codigoErro: 'INTEGRACAO_CARDAPIO_REMOTO_FAILED',
      mensagemFalha: 'Não foi possível listar o cardápio do Aiqfome.',
    })
    return lerRemotoCardapioDoHub(payload)
  }

  async listarCategorias(input: SessaoCardapioHub & { menuId: string }): Promise<ListaCategoriasCardapio> {
    const query = new URLSearchParams({
      empresaId: input.empresaId,
      menuId: input.menuId,
    })
    const payload = await this.chamarHub({
      path: `/cardapio/aiqfome/categorias?${query}`,
      method: 'GET',
      authorization: input.authorization,
      codigoErro: 'INTEGRACAO_CARDAPIO_CATEGORIAS_FAILED',
      mensagemFalha: 'Não foi possível ler as categorias do cardápio.',
    })
    return lerCategoriasCardapioDoHub(payload)
  }

  async aplicar(input: SessaoCardapioHub & { menuId: string; itens: ItemAplicarCardapio[] }): Promise<{
    resultados: ResultadoAplicarCardapio[]
  }> {
    const payload = await this.chamarHub({
      path: '/cardapio/aiqfome/aplicar',
      method: 'POST',
      authorization: input.authorization,
      body: {
        empresaId: input.empresaId,
        menuId: input.menuId,
        itens: input.itens,
      },
      codigoErro: 'INTEGRACAO_CARDAPIO_APLICAR_FAILED',
      mensagemFalha: 'Não foi possível gravar a sincronização.',
    })
    return { resultados: lerResultadosAplicarDoHub(payload) }
  }

  async aplicarCategorias(input: SessaoCardapioHub & {
    menuId: string
    itens: ItemAplicarCategoria[]
  }): Promise<{ resultados: ResultadoAplicarCategoria[] }> {
    const payload = await this.chamarHub({
      path: '/cardapio/aiqfome/categorias/aplicar',
      method: 'POST',
      authorization: input.authorization,
      body: {
        empresaId: input.empresaId,
        menuId: input.menuId,
        itens: input.itens,
      },
      codigoErro: 'INTEGRACAO_CARDAPIO_CATEGORIAS_APLICAR_FAILED',
      mensagemFalha: 'Não foi possível gravar as categorias.',
    })
    return { resultados: lerResultadosAplicarCategoriaDoHub(payload) }
  }

  async listarPagamentos(input: SessaoCardapioHub): Promise<ListaPagamentosCardapio> {
    const query = new URLSearchParams({ empresaId: input.empresaId })
    const payload = await this.chamarHub({
      path: `/cardapio/aiqfome/pagamentos?${query}`,
      method: 'GET',
      authorization: input.authorization,
      codigoErro: 'INTEGRACAO_CARDAPIO_PAGAMENTOS_FAILED',
      mensagemFalha: 'Não foi possível ler as formas de pagamento.',
    })
    return lerPagamentosCardapioDoHub(payload)
  }

  async aplicarPagamentos(input: SessaoCardapioHub & {
    itens: ItemAplicarPagamento[]
  }): Promise<{ resultados: ResultadoAplicarPagamento[] }> {
    const payload = await this.chamarHub({
      path: '/cardapio/aiqfome/pagamentos/aplicar',
      method: 'POST',
      authorization: input.authorization,
      body: {
        empresaId: input.empresaId,
        itens: input.itens,
      },
      codigoErro: 'INTEGRACAO_CARDAPIO_PAGAMENTOS_APLICAR_FAILED',
      mensagemFalha: 'Não foi possível gravar as formas de pagamento.',
    })
    return { resultados: lerResultadosAplicarPagamentoDoHub(payload) }
  }

  async importar(input: SessaoCardapioHub & {
    menuId: string
    grupoId?: string | null
    itens: ItemImportarCardapio[]
  }): Promise<{ resultados: ResultadoImportarCardapio[] }> {
    const payload = await this.chamarHub({
      path: '/cardapio/aiqfome/importar',
      method: 'POST',
      authorization: input.authorization,
      body: {
        empresaId: input.empresaId,
        menuId: input.menuId,
        grupoId: input.grupoId ?? null,
        itens: input.itens,
      },
      codigoErro: 'INTEGRACAO_CARDAPIO_IMPORTAR_FAILED',
      mensagemFalha: 'Não foi possível importar os itens do Aiqfome.',
    })
    return { resultados: lerResultadosImportarDoHub(payload) }
  }

  private async chamarHub(input: {
    path: string
    method: 'GET' | 'POST'
    authorization?: string
    body?: unknown
    codigoErro: string
    mensagemFalha: string
  }): Promise<unknown> {
    const url = `${this.config.baseUrl}${input.path}`
    let response: Response
    try {
      response = await this.fetchFn(url, {
        method: input.method,
        headers: headersDoHub(this.config.webhookSecret, input.method === 'POST', input.authorization),
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: AbortSignal.timeout(HUB_TIMEOUT_MS),
        cache: 'no-store',
      })
    } catch {
      throw new IntegracaoMarketplaceError(
        'Não foi possível falar com o hub de integrações.',
        503,
        'INTEGRACAO_HUB_UNAVAILABLE'
      )
    }

    const texto = await response.text()
    const payload = parseJsonOuNulo(texto)
    if (response.ok) return payload

    if (response.status === 401) {
      const detalhe = mensagemErroDoHubJson(payload) ?? mensagemErroDoHub(texto)
      const falha = mensagemFalhaHub401(detalhe)
      throw new IntegracaoMarketplaceError(falha.message, 502, falha.code)
    }

    if (hubSemRotaDeCardapio(response.status, texto)) {
      throw new IntegracaoMarketplaceError(
        'O Hub de homologação ainda não tem a sincronização de cardápio. Atualize e publique o Hub.',
        502,
        'INTEGRACAO_CARDAPIO_HUB_ROUTE_MISSING'
      )
    }

    const detalhe = mensagemErroDoHubJson(payload) ?? mensagemErroDoHub(texto)
    console.error('[hub-marketplace] chamada falhou', {
      path: input.path,
      status: response.status,
      erro: detalhe,
    })
    throw new IntegracaoMarketplaceError(
      detalhe || input.mensagemFalha,
      response.status >= 400 && response.status < 500 ? response.status : 502,
      input.codigoErro
    )
  }
}

export function criarHubMarketplaceAdapter(): HubMarketplaceAdapter {
  const config = lerHubMarketplaceConfig()
  if (!config) {
    throw new IntegracaoMarketplaceError(
      'Falta HUB_WEBHOOK_SECRET no servidor do Gestor (o mesmo WEBHOOK_SECRET do hub).',
      503,
      'INTEGRACAO_HUB_NOT_CONFIGURED'
    )
  }
  return new HubMarketplaceAdapter(config)
}
