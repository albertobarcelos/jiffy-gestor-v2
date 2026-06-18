/**
 * Barrel Fase 1 — re-exporta de `features/nfe` até a migração física (Fase 4).
 * @see docs/arquitetura-jiffy/PEDIDOS_FEATURES_REORGANIZACAO.md
 */
export { FiscalFlowKanban } from '../nfe/FiscalFlowKanban'
export {
  KanbanModoVendasToggle,
  type KanbanModoVendasToggleProps,
  type ModoKanbanVendas,
} from '../nfe/KanbanModoVendasToggle'
