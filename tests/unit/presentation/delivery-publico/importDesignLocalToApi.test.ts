import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'
import { createDefaultDeliveryPublicoDesignConfig } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { writeDesignStorage } from '@/src/presentation/components/features/delivery-publico/shared/utils/designConfigStorage'
import { importDesignLocalToApi } from '@/src/presentation/components/features/delivery-publico/shared/utils/importDesignLocalToApi'

const EMPRESA_ID = 'emp-import-test'

describe('importDesignLocalToApi', () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('salva draft e publica quando published local é publicável', async () => {
    const defaults = createDefaultDesignConfig('Loja')
    const localPublished = {
      ...defaults,
      cores: { paletaId: 'lavanda' as const },
    }
    const localDraft = {
      ...defaults,
      cores: { paletaId: 'mirtilo' as const },
    }
    writeDesignStorage(EMPRESA_ID, {
      draft: localDraft,
      published: localPublished,
    })

    let publishedOnServer = createDefaultDeliveryPublicoDesignConfig()
    const salvarDraft = vi.fn(async input => ({
      draft: input,
      published: publishedOnServer,
      publishedAt: null as string | null,
      schemaVersion: 1,
    }))
    const publicar = vi.fn(async input => {
      publishedOnServer = input
      return {
        draft: input,
        published: input,
        publishedAt: '2026-08-03T12:00:00.000Z',
        schemaVersion: 1,
      }
    })

    const me = await importDesignLocalToApi({
      empresaId: EMPRESA_ID,
      nomeExibicaoFallback: 'Loja',
      salvarDraft,
      publicar,
    })

    expect(salvarDraft).toHaveBeenCalled()
    expect(publicar).toHaveBeenCalled()
    expect(me.draft.cores.paletaId).toBe('mirtilo')
    expect(me.published.cores.paletaId).toBe('lavanda')
    expect(memory.get(`jiffy:delivery-design:migrated:${EMPRESA_ID}`)).toBe(
      'imported'
    )
    expect(memory.get(`jiffy:delivery-design:empresa:${EMPRESA_ID}`)).toBeUndefined()
  })

  it('só salva draft quando published local não é publicável', async () => {
    const defaults = createDefaultDesignConfig('Loja')
    writeDesignStorage(EMPRESA_ID, {
      draft: { ...defaults, layoutId: 'vitrine' },
      published: { ...defaults, layoutId: 'vitrine' },
    })

    const salvarDraft = vi.fn(async input => ({
      draft: input,
      published: createDefaultDeliveryPublicoDesignConfig(),
      publishedAt: null,
      schemaVersion: 1,
    }))
    const publicar = vi.fn()

    await importDesignLocalToApi({
      empresaId: EMPRESA_ID,
      salvarDraft,
      publicar,
    })

    expect(salvarDraft).toHaveBeenCalledTimes(1)
    expect(publicar).not.toHaveBeenCalled()
  })
})
