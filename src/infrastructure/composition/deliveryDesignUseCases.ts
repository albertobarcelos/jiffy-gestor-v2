import { BuscarDesignDeliveryMeUseCase } from '@/src/application/use-cases/delivery-publico/design/BuscarDesignDeliveryMeUseCase'
import { LimparBannerEmpresaDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/LimparBannerEmpresaDeliveryUseCase'
import { LimparLogoEmpresaDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/LimparLogoEmpresaDeliveryUseCase'
import { PublicarDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/PublicarDesignDeliveryUseCase'
import { SalvarDraftDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/SalvarDraftDesignDeliveryUseCase'
import { empresaDeliveryDesignApiAdapter } from '@/src/infrastructure/api/EmpresaDeliveryDesignApiAdapter'

const designApi = empresaDeliveryDesignApiAdapter

export const buscarDesignDeliveryMeUseCase = new BuscarDesignDeliveryMeUseCase(designApi)
export const salvarDraftDesignDeliveryUseCase = new SalvarDraftDesignDeliveryUseCase(
  designApi
)
export const publicarDesignDeliveryUseCase = new PublicarDesignDeliveryUseCase(designApi)
export const limparLogoEmpresaDeliveryUseCase = new LimparLogoEmpresaDeliveryUseCase(
  designApi
)
export const limparBannerEmpresaDeliveryUseCase = new LimparBannerEmpresaDeliveryUseCase(
  designApi
)
