import { AplicarDesignPadraoDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/AplicarDesignPadraoDeliveryUseCase'
import { BuscarDesignDeliveryMeUseCase } from '@/src/application/use-cases/delivery-publico/design/BuscarDesignDeliveryMeUseCase'
import { BuscarImagensGruposDesignUseCase } from '@/src/application/use-cases/delivery-publico/design/BuscarImagensGruposDesignUseCase'
import { BuscarMidiaPublicaDesignUseCase } from '@/src/application/use-cases/delivery-publico/design/BuscarMidiaPublicaDesignUseCase'
import { EnviarCapaDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/EnviarCapaDesignDeliveryUseCase'
import { EnviarLogoDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/EnviarLogoDesignDeliveryUseCase'
import { LimparBannerEmpresaDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/LimparBannerEmpresaDeliveryUseCase'
import { LimparLogoEmpresaDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/LimparLogoEmpresaDeliveryUseCase'
import { MigrarDesignLocalParaApiUseCase } from '@/src/application/use-cases/delivery-publico/design/MigrarDesignLocalParaApiUseCase'
import { PublicarDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/PublicarDesignDeliveryUseCase'
import { PublicarLayoutDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/PublicarLayoutDesignDeliveryUseCase'
import { RestaurarDraftDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/RestaurarDraftDesignDeliveryUseCase'
import { SalvarDraftDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/SalvarDraftDesignDeliveryUseCase'
import { designMidiaApi } from '@/src/infrastructure/api/DesignMidiaApiAdapter'
import { empresaDeliveryDesignApiAdapter } from '@/src/infrastructure/api/EmpresaDeliveryDesignApiAdapter'
import { designConfigLocalStorage } from '@/src/infrastructure/storage/DesignConfigLocalStorageAdapter'

const designApi = empresaDeliveryDesignApiAdapter

export const buscarDesignDeliveryMeUseCase = new BuscarDesignDeliveryMeUseCase(designApi)
export const salvarDraftDesignDeliveryUseCase = new SalvarDraftDesignDeliveryUseCase(
  designApi
)
export const publicarDesignDeliveryUseCase = new PublicarDesignDeliveryUseCase(designApi)
export const publicarLayoutDesignDeliveryUseCase = new PublicarLayoutDesignDeliveryUseCase(
  designApi
)
export const restaurarDraftDesignDeliveryUseCase = new RestaurarDraftDesignDeliveryUseCase(
  designApi
)
export const aplicarDesignPadraoDeliveryUseCase = new AplicarDesignPadraoDeliveryUseCase(
  designApi
)
export const migrarDesignLocalParaApiUseCase = new MigrarDesignLocalParaApiUseCase(
  designConfigLocalStorage,
  designApi
)
export const limparLogoEmpresaDeliveryUseCase = new LimparLogoEmpresaDeliveryUseCase(
  designApi
)
export const limparBannerEmpresaDeliveryUseCase = new LimparBannerEmpresaDeliveryUseCase(
  designApi
)
export const buscarMidiaPublicaDesignUseCase = new BuscarMidiaPublicaDesignUseCase(
  designMidiaApi
)
export const enviarLogoDesignDeliveryUseCase = new EnviarLogoDesignDeliveryUseCase(
  designMidiaApi
)
export const enviarCapaDesignDeliveryUseCase = new EnviarCapaDesignDeliveryUseCase(
  designMidiaApi
)
export const buscarImagensGruposDesignUseCase = new BuscarImagensGruposDesignUseCase(
  designMidiaApi
)

export { designConfigLocalStorage }
