/**
 * Reexport do mapper de application (fronteira UI ↔ DTO).
 * Mantém imports estáveis nas features de presentation.
 */
export {
  apiDesignConfigToUi,
  uiDesignConfigToApi,
  type DeliveryPublicoDesignUiModel,
} from '@/src/application/mappers/DeliveryDesignConfigMapper'
