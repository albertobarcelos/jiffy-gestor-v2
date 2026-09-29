import { describe, expect, it, vi } from 'vitest'
import { SolicitacaoConexaoMarketplace } from '@/src/domain/integracoes/SolicitacaoConexaoMarketplace'
import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'
import { HubMarketplaceAdapter } from '@/src/infrastructure/integracoes/HubMarketplaceAdapter'
import {
  HUB_BASE_URL_HOMOLOG,
  HUB_BASE_URL_PRODUCAO,
  lerHubBaseUrl,
  lerHubMarketplaceConfig,
} from '@/src/infrastructure/integracoes/hubMarketplaceConfig'
import {
  hubSemRotaDeCardapio,
  lerCaminhoConnectDoHub,
  mensagemFalhaHub401,
} from '@/src/infrastructure/integracoes/hubMarketplaceParse'

describe('hubMarketplaceConfig', () => {
  it('usa homolog por defeito e produção só no Vercel production', () => {
    expect(lerHubBaseUrl({})).toBe(HUB_BASE_URL_HOMOLOG)
    expect(lerHubBaseUrl({ NODE_ENV: 'production' })).toBe(HUB_BASE_URL_HOMOLOG)
    expect(lerHubBaseUrl({ VERCEL_ENV: 'preview' })).toBe(HUB_BASE_URL_HOMOLOG)
    expect(lerHubBaseUrl({ VERCEL_ENV: 'production' })).toBe(HUB_BASE_URL_PRODUCAO)
    expect(lerHubBaseUrl({ HUB_BASE_URL: 'https://hub.jiffy.run/' })).toBe(HUB_BASE_URL_PRODUCAO)
  })

  it('lê o segredo só de variáveis server-side', () => {
    expect(lerHubMarketplaceConfig({})).toBeNull()
    expect(lerHubMarketplaceConfig({ WEBHOOK_SECRET: 'sec-hub' })?.webhookSecret).toBe('sec-hub')
    expect(lerHubMarketplaceConfig({ HUB_WEBHOOK_SECRET: 'sec-pref' })?.webhookSecret).toBe(
      'sec-pref'
    )
  })
})

describe('lerCaminhoConnectDoHub', () => {
  it('usa connectPath do hub e aceita só o id', () => {
    expect(
      lerCaminhoConnectDoHub({
        connectPath: '/oauth/conectar?merchantConnectionId=1',
      })
    ).toBe('/oauth/conectar?merchantConnectionId=1')
    expect(lerCaminhoConnectDoHub({ id: 'mc-9' })).toBe(
      '/oauth/conectar?merchantConnectionId=mc-9'
    )
    expect(
      lerCaminhoConnectDoHub({
        connectUrl: 'https://hub.homolog.jiffy.run/oauth/conectar?merchantConnectionId=2',
      })
    ).toBe('/oauth/conectar?merchantConnectionId=2')
  })

  it('ignora URL que não é /oauth/conectar', () => {
    expect(lerCaminhoConnectDoHub({ connectUrl: 'https://evil.example/steal' })).toBeNull()
  })
})

describe('hubSemRotaDeCardapio', () => {
  it('reconhece o 404 do Express quando a rota ainda não foi publicada', () => {
    expect(hubSemRotaDeCardapio(404, 'Cannot GET /cardapio/aiqfome/remoto')).toBe(true)
    expect(hubSemRotaDeCardapio(404, JSON.stringify({ error: 'Loja Aiqfome não encontrado' }))).toBe(
      false
    )
  })
})

describe('mensagemFalhaHub401', () => {
  it('só aponta o segredo quando o hub recusou o header', () => {
    expect(mensagemFalhaHub401('Webhook secret inválido ou ausente').code).toBe(
      'INTEGRACAO_CONNECT_UNAUTHORIZED'
    )
    expect(mensagemFalhaHub401('invalid_client: autenticação do aplicativo ausente').code).toBe(
      'INTEGRACAO_MAGALU_TOKEN_EXPIRED'
    )
    expect(mensagemFalhaHub401('invalid_client').message).not.toContain('Confira HUB_WEBHOOK_SECRET')
  })
})

describe('HubMarketplaceAdapter', () => {
  it('usa o mesmo hub para o marketplace, sem expor o segredo', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('X-Webhook-Secret')).toBe('segredo-hub')
      expect(String(input)).not.toContain('segredo')
      expect(JSON.parse(String(init?.body))).toEqual({
        empresaId: 'emp-aberta',
        marketplace: 'AIQFOME',
        merchantIdOd: '777',
      })
      return new Response(
        JSON.stringify({
          id: 'mc-1',
          connectPath: '/oauth/conectar?merchantConnectionId=mc-1',
        }),
        { status: 201 }
      )
    }) as unknown as typeof fetch

    const getSemRedirect = vi.fn(async (url: string, headers: Record<string, string>) => {
      expect(url).toBe('https://hub.homolog.jiffy.run/oauth/conectar?merchantConnectionId=mc-1')
      expect(headers['X-Webhook-Secret']).toBe('segredo-hub')
      return { status: 302, location: 'https://id.exemplo.com/login?state=xyz', body: null }
    })

    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      { fetchFn, getSemRedirect }
    )
    const solicitacao = SolicitacaoConexaoMarketplace.criar({
      empresaId: 'emp-aberta',
      marketplace: 'AIQFOME',
      merchantIdOd: '777',
    })
    const resultado = await adapter.iniciarConexao(solicitacao)
    expect(resultado.authorizationUrl).toBe('https://id.exemplo.com/login?state=xyz')
    expect(JSON.stringify(resultado)).not.toContain('segredo-hub')
  })

  it('recusa resposta sem caminho de oauth', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ connectUrl: 'https://evil.example/steal' }), { status: 200 })
    ) as unknown as typeof fetch

    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      { fetchFn, getSemRedirect: vi.fn() }
    )
    const solicitacao = SolicitacaoConexaoMarketplace.criar({
      empresaId: 'emp-aberta',
      marketplace: 'AIQFOME',
      merchantIdOd: '777',
    })
    await expect(adapter.iniciarConexao(solicitacao)).rejects.toBeInstanceOf(
      IntegracaoMarketplaceError
    )
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('explica 422 quando o hub não tem o app Magalu', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: 'mc-1', connectPath: '/oauth/conectar?merchantConnectionId=mc-1' }), {
          status: 201,
        })
    ) as unknown as typeof fetch

    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      {
        fetchFn,
        getSemRedirect: vi.fn(async () => ({
          status: 422,
          location: null,
          body: JSON.stringify({
            error: 'OAuth Magalu sem MAGALU_CLIENT_ID, MAGALU_CLIENT_SECRET ou MAGALU_REDIRECT_URI',
          }),
        })),
      }
    )
    const solicitacao = SolicitacaoConexaoMarketplace.criar({
      empresaId: 'emp-aberta',
      marketplace: 'AIQFOME',
      merchantIdOd: '777',
    })
    await expect(adapter.iniciarConexao(solicitacao)).rejects.toMatchObject({
      message: 'O hub ainda não tem o app Magalu configurado (CLIENT_ID, SECRET ou REDIRECT_URI).',
    })
  })

  it('consulta lojas e cardápio com secret e Bearer, sem /internal', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      expect(headers.get('X-Webhook-Secret')).toBe('segredo-hub')
      expect(url).not.toContain('/internal')
      expect(url).not.toContain('segredo')
      if (url.endsWith('/lojas')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'mc-1',
                empresaId: 'emp-1',
                marketplace: 'AIQFOME',
                merchantIdOd: '777',
                active: true,
              },
            ],
          }),
          { status: 200 }
        )
      }
      expect(headers.get('Authorization')).toBe('Bearer sessao-gestor')
      if (url.includes('/cardapio/aiqfome/produtos')) {
        expect(url).toContain('empresaId=emp-1')
        expect(url).toContain('menuId=menu-1')
        return new Response(
          JSON.stringify({
            empresaId: 'emp-1',
            menuId: 'menu-1',
            produtos: [
              {
                produtoId: 'p1',
                nome: 'Coxinha',
                descricao: null,
                preco: 8.5,
                grupoId: 'g1',
                grupoNome: 'Salgados',
                acao: null,
                vinculo: null,
                sugestao: { idItem: 'i1', sku: 'SKU1', nome: 'Coxinha', preco: 8 },
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (url.includes('/cardapio/aiqfome/aplicar')) {
        expect(JSON.parse(String(init?.body))).toEqual({
          empresaId: 'emp-1',
          menuId: 'menu-1',
          itens: [{ produtoId: 'p1', acao: 'CRIAR' }],
        })
        return new Response(
          JSON.stringify({ resultados: [{ produtoId: 'p1', acao: 'CRIAR', salvo: true, sku: 'p1' }] }),
          { status: 200 }
        )
      }
      return new Response('nope', { status: 404 })
    }) as unknown as typeof fetch

    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      { fetchFn }
    )
    const lojas = await adapter.listarLojasAtivas()
    expect(lojas).toEqual([
      {
        id: 'mc-1',
        empresaId: 'emp-1',
        marketplace: 'AIQFOME',
        merchantIdOd: '777',
        active: true,
      },
    ])
    const produtos = await adapter.listarProdutos({
      empresaId: 'emp-1',
      menuId: 'menu-1',
      authorization: 'Bearer sessao-gestor',
    })
    expect(produtos.produtos[0]?.sugestao?.idItem).toBe('i1')
    const aplicado = await adapter.aplicar({
      empresaId: 'emp-1',
      menuId: 'menu-1',
      authorization: 'Bearer sessao-gestor',
      itens: [{ produtoId: 'p1', acao: 'CRIAR' }],
    })
    expect(aplicado.resultados[0]?.salvo).toBe(true)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('explica 404 quando o hub ainda não tem a rota de cardápio', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response('<pre>Cannot GET /cardapio/aiqfome/remoto</pre>', {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        })
    ) as unknown as typeof fetch
    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      { fetchFn }
    )
    await expect(
      adapter.listarRemoto({
        empresaId: 'emp-1',
        authorization: 'Bearer sessao-gestor',
      })
    ).rejects.toMatchObject({
      code: 'INTEGRACAO_CARDAPIO_HUB_ROUTE_MISSING',
    })
  })

  it('não trata 401 do Magalu como segredo do hub', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'invalid_client: autenticação do aplicativo ausente' }), {
          status: 401,
        })
    ) as unknown as typeof fetch
    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      { fetchFn }
    )
    await expect(
      adapter.listarRemoto({
        empresaId: 'emp-1',
        authorization: 'Bearer sessao-gestor',
      })
    ).rejects.toMatchObject({
      code: 'INTEGRACAO_MAGALU_TOKEN_EXPIRED',
    })
  })

  it('só fala de HUB_WEBHOOK_SECRET quando o hub recusou o header', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Webhook secret inválido ou ausente' }), { status: 401 })
    ) as unknown as typeof fetch
    const adapter = new HubMarketplaceAdapter(
      { baseUrl: HUB_BASE_URL_HOMOLOG, webhookSecret: 'segredo-hub' },
      { fetchFn }
    )
    await expect(
      adapter.listarRemoto({
        empresaId: 'emp-1',
        authorization: 'Bearer sessao-gestor',
      })
    ).rejects.toMatchObject({
      code: 'INTEGRACAO_CONNECT_UNAUTHORIZED',
    })
  })
})
