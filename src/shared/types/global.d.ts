export {}

declare global {
  // Cache em memória por instância do servidor (BFF). TTL controlado por cada rota.
  // eslint-disable-next-line no-var
  var __jiffyTopProdutosCache:
    | Map<string, { expiresAt: number; items: Array<{ produto: string; quantidade: number; valorTotal: number }> }>
    | undefined

  // eslint-disable-next-line no-var
  var __jiffyProdutoNomeCache: Map<string, string> | undefined
}

