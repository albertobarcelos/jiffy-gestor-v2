import type {
  BuscarMenuProdutosParams,
  BuscarMenusPaginatedResponse,
  IMenuRepository,
} from '@/src/domain/repositories/IMenuRepository'
import type {
  ImageUploadIntentInput,
  ImageUploadIntentResponse,
  Menu,
  MenuProduto,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TAMANHO_MAXIMO_BYTES = 5_242_880

export class ListarMenuProdutosUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(
    menuId: string,
    params: BuscarMenuProdutosParams
  ): Promise<BuscarMenusPaginatedResponse<MenuProduto>> {
    if (!menuId?.trim()) {
      throw new Error('Menu não informado')
    }
    return this.menuRepository.listarProdutos(menuId.trim(), params)
  }
}

export class AtualizarMenuProdutosBatchUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(menuId: string, input: UpdateMenuProdutosBatchInput): Promise<Menu> {
    if (!menuId?.trim()) {
      throw new Error('Menu não informado')
    }
    return this.menuRepository.atualizarProdutos(menuId.trim(), input)
  }
}

export class BuscarMenuProdutoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(menuId: string, produtoId: string): Promise<MenuProduto> {
    if (!menuId?.trim() || !produtoId?.trim()) {
      throw new Error('Menu e produto são obrigatórios')
    }
    return this.menuRepository.buscarProduto(menuId.trim(), produtoId.trim())
  }
}

export class AtualizarMenuProdutoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(
    menuId: string,
    produtoId: string,
    input: UpdateMenuProdutoInput
  ): Promise<MenuProduto> {
    if (!menuId?.trim() || !produtoId?.trim()) {
      throw new Error('Menu e produto são obrigatórios')
    }
    return this.menuRepository.atualizarProduto(menuId.trim(), produtoId.trim(), input)
  }
}

export class ReordenarMenuProdutoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  async execute(menuId: string, produtoId: string, novaPosicao: number): Promise<void> {
    if (!menuId?.trim() || !produtoId?.trim()) {
      throw new Error('Menu e produto são obrigatórios')
    }
    if (!Number.isFinite(novaPosicao) || novaPosicao < 1) {
      throw new Error('Nova posição inválida')
    }
    await this.menuRepository.reordenarProduto(menuId.trim(), produtoId.trim(), novaPosicao)
  }
}

export class CriarUploadIntentMenuProdutoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(
    menuId: string,
    produtoId: string,
    input: ImageUploadIntentInput
  ): Promise<ImageUploadIntentResponse> {
    if (!menuId?.trim() || !produtoId?.trim()) {
      throw new Error('Menu e produto são obrigatórios')
    }
    if (!input.fileName?.trim() || !input.mimeType?.trim() || !input.sizeInBytes) {
      throw new Error('fileName, mimeType e sizeInBytes são obrigatórios')
    }
    return this.menuRepository.criarUploadIntentProduto(menuId.trim(), produtoId.trim(), input)
  }
}

export class UploadImagemMenuProdutoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  async execute(params: {
    menuId: string
    produtoId: string
    file: File
  }): Promise<MenuProduto> {
    const { menuId, produtoId, file } = params
    if (!menuId?.trim() || !produtoId?.trim()) {
      throw new Error('Menu e produto são obrigatórios')
    }
    if (file.size <= 0) {
      throw new Error('Envie um arquivo de imagem.')
    }
    const mimeType = file.type
    if (!MIME_PERMITIDOS.has(mimeType)) {
      throw new Error('Use uma imagem JPEG, PNG ou WebP.')
    }
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      throw new Error('A imagem deve ter no máximo 5 MB.')
    }

    const intent = await this.menuRepository.criarUploadIntentProduto(
      menuId.trim(),
      produtoId.trim(),
      {
        fileName: file.name || 'produto.jpg',
        mimeType,
        sizeInBytes: file.size,
      }
    )

    const bytes = new Uint8Array(await file.arrayBuffer())
    const upload = await fetch(intent.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: bytes,
    })

    if (!upload.ok) {
      throw new Error('Não foi possível enviar a imagem para o armazenamento.')
    }

    await this.menuRepository.confirmarUploadIntent(intent.uploadIntentId)
    return this.menuRepository.buscarProduto(menuId.trim(), produtoId.trim())
  }
}
