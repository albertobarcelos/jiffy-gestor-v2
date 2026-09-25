import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = (relative: string) =>
  readFileSync(
    resolve(
      __dirname,
      '../../../../src/presentation/components/features/delivery-publico',
      relative
    ),
    'utf8'
  )

describe('LCP: so a capa tem priority', () => {
  it('capa da loja pede a foto cedo', () => {
    expect(src('shared/components/DeliveryLojaHeader.tsx')).toMatch(/priority/)
  })

  it('logo e cards nao competem no 4G', () => {
    expect(src('public/layouts/basico/DeliveryBasicoTopNav.tsx')).not.toMatch(
      /priority/
    )
    expect(src('public/layouts/catalogo/CatalogoLayoutHome.tsx')).not.toMatch(
      /primeirasImagensPriority/
    )
    expect(src('public/layouts/basico/BasicoLayoutHome.tsx')).not.toMatch(
      /primeirasImagensPriority/
    )
    expect(src('public/layouts/grade/GradeLayoutHome.tsx')).not.toMatch(
      /primeirasImagensPriority/
    )
    expect(src('public/layouts/vitrine/VitrineLayoutHome.tsx')).not.toMatch(
      /primeirasImagensPriority/
    )
  })
})
