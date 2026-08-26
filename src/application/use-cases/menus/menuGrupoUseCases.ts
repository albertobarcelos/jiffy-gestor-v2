import type {
  BuscarMenuGruposParams,
  BuscarMenusPaginatedResponse,
  IMenuRepository,
} from '@/src/domain/repositories/IMenuRepository'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TAMANHO_MAXIMO_BYTES = 5_242_880

function imagemUrlDoGrupo(grupo: {
  image?: { imageUrl?: string | null } | null
  grupoBase?: { imagemUrl?: string | null }
}): string | null {
  const fromImage = grupo.image?.imageUrl?.trim()
  if (fromImage) return fromImage
  const fromBase = grupo.grupoBase?.imagemUrl?.trim()
  return fromBase || null
}

export class ListarMenuGruposUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(
    menuId: string,
    params: BuscarMenuGruposParams
  ): Promise<BuscarMenusPaginatedResponse<MenuGrupoProduto>> {
    if (!menuId?.trim()) {
      throw new Error('Menu não informado')
    }
    return this.menuRepository.listarGrupos(menuId.trim(), params)
  }
}

export class AtualizarMenuGrupoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  execute(menuId: string, grupoProdutoId: string, nome: string): Promise<MenuGrupoProduto> {
    if (!menuId?.trim() || !grupoProdutoId?.trim()) {
      throw new Error('Menu e categoria são obrigatórios')
    }
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      throw new Error('Nome é obrigatório')
    }
    return this.menuRepository.atualizarGrupo(menuId.trim(), grupoProdutoId.trim(), nomeTrim)
  }
}

export class ReordenarMenuGrupoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  async execute(menuId: string, grupoProdutoId: string, novaPosicao: number): Promise<void> {
    if (!menuId?.trim() || !grupoProdutoId?.trim()) {
      throw new Error('Menu e categoria são obrigatórios')
    }
    if (!Number.isFinite(novaPosicao) || novaPosicao < 1) {
      throw new Error('Nova posição inválida')
    }
    await this.menuRepository.reordenarGrupo(
      menuId.trim(),
      grupoProdutoId.trim(),
      novaPosicao
    )
  }
}

export class UploadImagemMenuGrupoUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  async execute(params: {
    menuId: string
    grupoProdutoId: string
    file: File
  }): Promise<{ grupo: MenuGrupoProduto | null; imagemUrl: string | null }> {
    const { menuId, grupoProdutoId, file } = params
    if (!menuId?.trim() || !grupoProdutoId?.trim()) {
      throw new Error('Menu e categoria são obrigatórios')
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

    const intent = await this.menuRepository.criarUploadIntentGrupo(
      menuId.trim(),
      grupoProdutoId.trim(),
      {
        fileName: file.name || 'grupo.jpg',
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
    const listed = await this.menuRepository.listarGrupos(menuId.trim(), {
      grupoProdutoId: grupoProdutoId.trim(),
      limit: 1,
    })
    const grupo = listed.items[0] ?? null

    return {
      grupo,
      imagemUrl: grupo ? imagemUrlDoGrupo(grupo) : null,
    }
  }
}
