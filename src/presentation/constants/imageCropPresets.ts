import type { ImageCropPreset } from '@/src/presentation/utils/imageCrop'

const DELIVERY_SQUARE_ACCEPT = ['image/png', 'image/jpeg', 'image/webp'] as const
/** Limite no front para imagens de delivery (backend ainda aceita até 5 MB). */
const DELIVERY_CROP_MAX_SOURCE_BYTES = 1024 * 1024

function createDeliverySquarePreset(
  id: ImageCropPreset['id'],
  title: string
): ImageCropPreset {
  return {
    id,
    title,
    descriptionLines: [
      'Arraste a imagem, use o zoom e ajuste a moldura quadrada.',
      'A saída é limitada a 280×280 px (JPEG, PNG ou WebP — mantém o formato do ficheiro). Imagens menores não são ampliadas.',
      'Prefira imagens entre 100 KB e 600 KB (máximo 1 MB).',
    ],
    maxOutputWidth: 280,
    maxOutputHeight: 280,
    displayFrameWidth: 280,
    displayFrameHeight: 280,
    containerWidth: 360,
    containerHeight: 360,
    frameMinWidth: 64,
    frameMinHeight: 64,
    lockAspectRatio: true,
    outputMimeType: 'image/jpeg',
    outputQuality: 0.9,
    outputFileName: `${id}.jpg`,
    preserveSourceMimeType: true,
    maxSourceBytes: DELIVERY_CROP_MAX_SOURCE_BYTES,
    acceptedMimeTypes: DELIVERY_SQUARE_ACCEPT,
  }
}

export const LOGO_IMPRESSAO_CROP_PRESET: ImageCropPreset = {
  id: 'logo-impressao',
  title: 'Ajustar logo de impressão',
  descriptionLines: [
    'Arraste a imagem (zoom abaixo) e redimensione a moldura pelas bordas e cantos.',
    'Largura e altura do recorte são independentes (até 280×150 px). Imagens menores ajustam a moldura ao importar; o ficheiro não é ampliado além do recorte real.',
    'O servidor converte para preto e branco ao salvar.',
  ],
  maxOutputWidth: 280,
  maxOutputHeight: 150,
  displayFrameWidth: 280,
  displayFrameHeight: 150,
  containerWidth: 360,
  containerHeight: 200,
  frameMinWidth: 48,
  frameMinHeight: 28,
  lockAspectRatio: false,
  outputMimeType: 'image/png',
  outputQuality: 1,
  outputFileName: 'logo-impressao.png',
  maxSourceBytes: 1024 * 1024,
  acceptedMimeTypes: DELIVERY_SQUARE_ACCEPT,
  footerHint: 'Máx. cupom 280×150 px',
}

export const DELIVERY_PRODUTO_CROP_PRESET = createDeliverySquarePreset(
  'delivery-produto',
  'Ajustar imagem do produto'
)

/** Snapshot de produto no cardápio (mesmas dimensões do delivery). */
export const MENU_PRODUTO_CROP_PRESET = createDeliverySquarePreset(
  'menu-produto',
  'Ajustar imagem do produto'
)

/** @deprecated Preferir `DELIVERY_GRUPO_BANNER_CROP_PRESET` no Design (banner 1200×150). */
export const DELIVERY_GRUPO_PRODUTO_CROP_PRESET = createDeliverySquarePreset(
  'delivery-grupo-produto',
  'Ajustar imagem do grupo'
)

/** Banner de fundo do título do grupo (Design → Categorias). Proporção 8:1. */
export const DELIVERY_GRUPO_BANNER_CROP_PRESET: ImageCropPreset = {
  id: 'delivery-grupo-banner',
  title: 'Ajustar banner do grupo',
  descriptionLines: [
    'Arraste a imagem, use o zoom e ajuste a moldura (proporção 8:1).',
    'A saída é limitada a 1200×150 px (JPEG, PNG ou WebP — mantém o formato do ficheiro). Imagens menores não são ampliadas.',
    'O banner aparece como fundo da barra com o nome do grupo no delivery público.',
    'Prefira imagens até 1 MB.',
  ],
  maxOutputWidth: 1200,
  maxOutputHeight: 150,
  displayFrameWidth: 360,
  displayFrameHeight: 45,
  containerWidth: 420,
  containerHeight: 160,
  frameMinWidth: 120,
  frameMinHeight: 15,
  lockAspectRatio: true,
  outputMimeType: 'image/jpeg',
  outputQuality: 0.9,
  outputFileName: 'delivery-grupo-banner.jpg',
  preserveSourceMimeType: true,
  maxSourceBytes: DELIVERY_CROP_MAX_SOURCE_BYTES,
  acceptedMimeTypes: DELIVERY_SQUARE_ACCEPT,
  footerHint: 'Máx. 1200×150 px',
}

export const DELIVERY_COMPLEMENTO_CROP_PRESET = createDeliverySquarePreset(
  'delivery-complemento',
  'Ajustar imagem do complemento'
)

export const DELIVERY_GRUPO_COMPLEMENTO_CROP_PRESET = createDeliverySquarePreset(
  'delivery-grupo-complemento',
  'Ajustar imagem do grupo de complementos'
)

/** Logo do delivery público (Design → Cabeçalho). */
export const DELIVERY_LOGO_CROP_PRESET: ImageCropPreset = {
  id: 'delivery-logo',
  title: 'Ajustar logo',
  descriptionLines: [
    'Arraste a imagem, use o zoom e ajuste a moldura quadrada.',
    'A saída é limitada a 500×500 px (JPEG, PNG ou WebP — mantém o formato do ficheiro). Imagens menores não são ampliadas.',
    'Prefira imagens entre 100 KB e 600 KB (máximo 1 MB).',
  ],
  maxOutputWidth: 500,
  maxOutputHeight: 500,
  displayFrameWidth: 280,
  displayFrameHeight: 280,
  containerWidth: 360,
  containerHeight: 360,
  frameMinWidth: 64,
  frameMinHeight: 64,
  lockAspectRatio: true,
  outputMimeType: 'image/jpeg',
  outputQuality: 0.9,
  outputFileName: 'delivery-logo.jpg',
  preserveSourceMimeType: true,
  maxSourceBytes: DELIVERY_CROP_MAX_SOURCE_BYTES,
  acceptedMimeTypes: DELIVERY_SQUARE_ACCEPT,
  footerHint: 'Máx. 500×500 px',
}

/** Capa/banner do delivery público (Design → Cabeçalho). Proporção 4:1 (1200×300). */
export const DELIVERY_CAPA_CROP_PRESET: ImageCropPreset = {
  id: 'delivery-capa',
  title: 'Ajustar capa',
  descriptionLines: [
    'Arraste a imagem, use o zoom e ajuste a moldura (proporção 4:1).',
    'A saída é limitada a 1200×300 px (JPEG, PNG ou WebP — mantém o formato do ficheiro). Imagens menores não são ampliadas.',
    'Mantenha o conteúdo importante no centro da moldura.',
    'Prefira imagens até 1 MB.',
  ],
  maxOutputWidth: 1200,
  maxOutputHeight: 300,
  displayFrameWidth: 360,
  displayFrameHeight: 90,
  containerWidth: 420,
  containerHeight: 180,
  frameMinWidth: 96,
  frameMinHeight: 24,
  lockAspectRatio: true,
  outputMimeType: 'image/jpeg',
  outputQuality: 0.9,
  outputFileName: 'delivery-capa.jpg',
  preserveSourceMimeType: true,
  maxSourceBytes: DELIVERY_CROP_MAX_SOURCE_BYTES,
  acceptedMimeTypes: DELIVERY_SQUARE_ACCEPT,
  footerHint: 'Máx. 1200×300 px · foque o centro',
}
