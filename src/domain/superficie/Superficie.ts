export const CODIGOS_SUPERFICIE = ['ERP', 'PORTAL_PEDIDOS'] as const

export type CodigoSuperficie = (typeof CODIGOS_SUPERFICIE)[number]

export class Superficie {
  private constructor(private readonly codigo: CodigoSuperficie) {}

  static readonly ERP = Superficie.create('ERP')
  static readonly PORTAL_PEDIDOS = Superficie.create('PORTAL_PEDIDOS')

  static create(raw: string): Superficie {
    const codigo = String(raw ?? '')
      .trim()
      .toUpperCase()
    if (codigo !== 'ERP' && codigo !== 'PORTAL_PEDIDOS') {
      throw new Error(`Superfície inválida: ${raw}`)
    }
    return new Superficie(codigo)
  }

  static tryCreate(raw: string | null | undefined): Superficie | null {
    if (raw == null || String(raw).trim() === '') return null
    try {
      return Superficie.create(String(raw))
    } catch {
      return null
    }
  }

  getCodigo(): CodigoSuperficie {
    return this.codigo
  }

  isErp(): boolean {
    return this.codigo === 'ERP'
  }

  isPortalPedidos(): boolean {
    return this.codigo === 'PORTAL_PEDIDOS'
  }

  equals(outra: Superficie): boolean {
    return this.codigo === outra.codigo
  }
}
