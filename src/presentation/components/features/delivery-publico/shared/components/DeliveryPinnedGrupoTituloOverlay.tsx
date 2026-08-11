'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { DeliveryGrupoTituloBar } from './DeliveryGrupoTituloBar'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'

const CROSSFADE = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }

type DeliveryPinnedGrupoTituloOverlayProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  /** Topo do overlay = base da toolbar sticky (sem o gap). */
  top: number
  left: number
  width: number
  /** Espaço visual entre toolbar e título (preenchido com fundo opaco). */
  gapPx?: number
}

/**
 * Título de grupo fixo sob a toolbar, com crossfade na troca de grupo
 * e faixa opaca no gap (evita conteúdo “vazar” entre as barras).
 */
export function DeliveryPinnedGrupoTituloOverlay({
  config,
  grupo,
  top,
  left,
  width,
  gapPx = 10,
}: DeliveryPinnedGrupoTituloOverlayProps) {
  const fundoPagina =
    'var(--delivery-bg, var(--delivery-surface, #ffffff))'
  const fundoTitulo =
    config.categorias.corBarraTitulo?.trim() ||
    'var(--delivery-primary-dark, #171717)'

  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 35,
        backgroundColor: fundoPagina,
        paddingTop: gapPx,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      <div className="px-4 pb-0">
        <div className="relative overflow-hidden rounded-lg shadow-sm">
          {/* Base sólida: impede flash entre frames do crossfade / troca de imagem. */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{ backgroundColor: fundoTitulo }}
            aria-hidden
          />

          <div className="relative">
            <div className="invisible" aria-hidden>
              <DeliveryGrupoTituloBar
                config={config}
                nome={grupo.nome}
                imagemUrl={grupo.imagemUrl}
                className="mb-0"
              />
            </div>

            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={grupo.id}
                className="absolute inset-x-0 top-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={CROSSFADE}
              >
                <DeliveryGrupoTituloBar
                  config={config}
                  nome={grupo.nome}
                  imagemUrl={grupo.imagemUrl}
                  className="mb-0"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
