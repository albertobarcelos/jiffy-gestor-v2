import { describe, expect, it } from 'vitest'
import {
  DEFAULT_JIFFY_FLOW_R2_PUBLIC_BASE,
  JIFFY_FLOW_R2_BUCKET,
  JIFFY_FLOW_R2_PATHS,
  jiffyFlowReleaseExePath,
  urlInstaladorJiffyFlow,
} from '@/src/infrastructure/windows/jiffyFlowR2'

describe('jiffyFlowR2', () => {
  it('usa pastas brand / stable / releases no bucket do Flow', () => {
    expect(JIFFY_FLOW_R2_BUCKET).toBe('jiffy-flow')
    expect(JIFFY_FLOW_R2_PATHS.brandLogo).toBe('brand/logo.png')
    expect(JIFFY_FLOW_R2_PATHS.setup).toBe('stable/JiffyFlow-setup.exe')
    expect(JIFFY_FLOW_R2_PATHS.manifest).toBe('stable/update-manifest.stable.json')
    expect(jiffyFlowReleaseExePath('0.1.0')).toBe('releases/0.1.0/jiffy-flow.exe')
  })

  it('o Setup aponta para o bucket jiffy-flow, não para o Print', () => {
    expect(urlInstaladorJiffyFlow()).toBe(
      `${DEFAULT_JIFFY_FLOW_R2_PUBLIC_BASE}/stable/JiffyFlow-setup.exe`
    )
    expect(DEFAULT_JIFFY_FLOW_R2_PUBLIC_BASE).toContain('pub-143026e1401641a5ad59a389410eed2a')
  })
})
