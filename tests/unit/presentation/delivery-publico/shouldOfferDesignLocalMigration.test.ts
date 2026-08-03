import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'
import {
  isEssentiallyDefaultDesign,
  markDesignMigrated,
  writeDesignStorage,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/designConfigStorage'
import { shouldOfferDesignLocalMigration } from '@/src/presentation/components/features/delivery-publico/shared/utils/shouldOfferDesignLocalMigration'

const EMPRESA_ID = 'emp-test-migration'

describe('shouldOfferDesignLocalMigration', () => {
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

  it('oferece quando API está pristine e local tem design rico', () => {
    const defaults = createDefaultDesignConfig('Loja')
    writeDesignStorage(EMPRESA_ID, {
      draft: { ...defaults, cores: { paletaId: 'lavanda' } },
      published: { ...defaults, cores: { paletaId: 'lavanda' } },
    })

    expect(
      shouldOfferDesignLocalMigration({
        empresaId: EMPRESA_ID,
        publishedAt: null,
        serverDraft: defaults,
        serverPublished: defaults,
        nomeExibicaoFallback: 'Loja',
      })
    ).toBe(true)
  })

  it('não oferecece se já publicou na API', () => {
    const defaults = createDefaultDesignConfig('Loja')
    writeDesignStorage(EMPRESA_ID, {
      draft: { ...defaults, cores: { paletaId: 'mirtilo' } },
      published: { ...defaults, cores: { paletaId: 'mirtilo' } },
    })

    expect(
      shouldOfferDesignLocalMigration({
        empresaId: EMPRESA_ID,
        publishedAt: '2026-08-03T12:00:00.000Z',
        serverDraft: defaults,
        serverPublished: defaults,
        nomeExibicaoFallback: 'Loja',
      })
    ).toBe(false)
  })

  it('não oferecece após dismiss', () => {
    const defaults = createDefaultDesignConfig('Loja')
    writeDesignStorage(EMPRESA_ID, {
      draft: { ...defaults, tipografia: { presetId: 'moderna' } },
      published: defaults,
    })
    markDesignMigrated(EMPRESA_ID, 'dismissed')

    expect(
      shouldOfferDesignLocalMigration({
        empresaId: EMPRESA_ID,
        publishedAt: null,
        serverDraft: defaults,
        serverPublished: defaults,
        nomeExibicaoFallback: 'Loja',
      })
    ).toBe(false)
  })

  it('isEssentiallyDefaultDesign ignora nome', () => {
    const a = createDefaultDesignConfig('A')
    const b = createDefaultDesignConfig('B')
    expect(isEssentiallyDefaultDesign(a)).toBe(true)
    expect(isEssentiallyDefaultDesign(b, 'B')).toBe(true)
  })
})
