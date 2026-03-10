/**
 * Mapeamento de imagens para produtos
 * 
 * Este arquivo permite definir imagens específicas para cada produto
 * usando o ID do produto como chave.
 * 
 * Quando o backend estiver pronto e enviar imagemUrl, este mapeamento
 * será usado como fallback ou pode ser removido.
 */

/**
 * Mapeamento de ID do produto para URL da imagem
 * 
 * Para adicionar uma imagem a um produto:
 * 1. Obtenha o ID do produto (pode ser visto no console ou no banco de dados)
 * 2. Adicione uma entrada neste objeto: 'id-do-produto': 'url-da-imagem'
 * 
 * Exemplo:
 * ```typescript
 * export const PRODUTO_IMAGENS: Record<string, string> = {
 *   'produto-123': 'https://exemplo.com/pizza-margherita.jpg',
 *   'produto-456': 'https://exemplo.com/hamburguer-artesanal.jpg',
 *   'produto-789': 'https://exemplo.com/batata-frita.jpg',
 * }
 * ```
 * 
 * Exemplo de uso no código:
 * ```typescript
 * const imagemUrl = getProdutoImagem(produto.getId())
 * ```
 */
export const PRODUTO_IMAGENS: Record<string, string> = {
  // Adicione aqui os mapeamentos de produtos
  // Formato: 'id-do-produto': 'url-da-imagem'
  // Exemplo: 'produto-123': 'https://exemplo.com/imagem.jpg',
  cmmdhvh1f00ajot01xqdgji0h: 'https://i.pinimg.com/736x/99/6c/69/996c694d54dbd401d3dd1366ab960935.jpg',
  cmmdhvh1200agot01vb9veii2: 'https://i.pinimg.com/736x/8b/f3/97/8bf39745060a9417c545a8f61a956dcc.jpg',
  cmmdhvh2c00apot01kaskmnuj: 'https://i.pinimg.com/736x/02/84/6b/02846b5d27c3e6d25765f1425f72b2dc.jpg',
  cmmdhvh0j00adot014mtyjwry: 'https://i.pinimg.com/1200x/2c/f9/8b/2cf98bf90e479b81155fe1afe1ef40d1.jpg',
  cmmdhvh1y00amot01s05kgvcj: 'https://i.pinimg.com/1200x/05/13/74/051374682577b61452f22065506243a6.jpg',
  cmmdhvh0700abot01cetnpy02: 'https://i.pinimg.com/736x/8c/03/c1/8c03c16e4dd7843232d11bb089e15a5f.jpg',
  cmmdhvgzv00a9ot01bizdrmoc: 'https://i.pinimg.com/736x/84/8f/99/848f99ec64d61341eac82beca59e35b9.jpg',
  cmmdhvgzh00a7ot01ojpytwp5: 'https://i.pinimg.com/736x/3d/12/ef/3d12efb66cfacbda1704115ae357b63c.jpg',
  cmmdhvgz400a5ot01dbchcpex: 'https://i.pinimg.com/1200x/b3/e0/a5/b3e0a5678eccd90997a85adb6bbcbbfc.jpg',
  cmmdhvgyd00a1ot01d1xiear5: 'https://i.pinimg.com/736x/3f/cf/eb/3fcfebd04d035c4703c1478a2e70ebed.jpg',
  cmmdhvgys00a3ot010llphd21: 'https://i.pinimg.com/736x/6e/49/00/6e49003fd6a280a58534fd0bd5f4ed5f.jpg',
  cmmdhvgx5009sot01zmab1ohv: 'https://i.pinimg.com/736x/13/b6/99/13b699bdd0177af113a401d2d629c621.jpg',
  cmmdhvgwm009pot011l17u4wt: 'https://i.pinimg.com/736x/ff/f0/42/fff042dc57b93da33c821a479426abcd.jpg',
  cmmdhvgxk009vot01dbc0l0kh: 'https://i.pinimg.com/736x/a1/98/b6/a198b6496b29520230700caf94f44d25.jpg',
  cmmdhvgxw009yot01yqk58uzx: 'https://i.pinimg.com/1200x/9d/2f/c1/9d2fc17d128f9e2853ce84510bc462f8.jpg',
  cmmdhvgvy009kot01ni92rhzt: 'https://i.pinimg.com/1200x/7c/d8/cc/7cd8ccf85398c422197e958f3d64c9a0.jpg',
  cmmdhvguv009eot01b3h6fdit: 'https://i.pinimg.com/736x/03/58/cf/0358cf807997827afec34a9b63123e49.jpg',
  cmmdhvgvm009iot01j4598417: 'https://i.pinimg.com/1200x/f6/d7/ba/f6d7bafa7595f6ce99e98d41578db7d3.jpg',
  cmmdhvgvb009got012qslaoqy: 'https://i.pinimg.com/736x/71/b5/03/71b5039490b015b66aa8ac3b8cf60b49.jpg',
  cmmdhvgwa009mot01il76yhgs: 'https://i.pinimg.com/736x/c3/df/e9/c3dfe977712c263486f513113ccb0c2f.jpg',
}

/**
 * Busca a URL da imagem de um produto
 * 
 * @param produtoId - ID do produto
 * @param imagemUrlBackend - URL da imagem vinda do backend (opcional)
 * @returns URL da imagem ou undefined se não encontrada
 * 
 * @example
 * ```typescript
 * const imagemUrl = getProdutoImagem(produto.getId(), produto.getImagemUrl?.())
 * ```
 */
export function getProdutoImagem(
  produtoId: string,
  imagemUrlBackend?: string | null
): string | undefined {
  // Prioridade: backend > mapeamento manual > undefined
  if (imagemUrlBackend) {
    return imagemUrlBackend
  }
  
  return PRODUTO_IMAGENS[produtoId] || undefined
}

/**
 * Adiciona ou atualiza uma imagem para um produto
 * 
 * @param produtoId - ID do produto
 * @param imagemUrl - URL da imagem
 * 
 * @example
 * ```typescript
 * setProdutoImagem('produto-123', 'https://exemplo.com/imagem.jpg')
 * ```
 */
export function setProdutoImagem(produtoId: string, imagemUrl: string): void {
  PRODUTO_IMAGENS[produtoId] = imagemUrl
}

/**
 * Remove a imagem de um produto do mapeamento
 * 
 * @param produtoId - ID do produto
 */
export function removeProdutoImagem(produtoId: string): void {
  delete PRODUTO_IMAGENS[produtoId]
}
