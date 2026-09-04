import { describe, expect, it } from 'vitest'
import {
  isWindowsUserAgent,
  planearAbrirPedidosWindows,
} from '@/src/presentation/gestor-pedidos/windows/planearAbrirPedidosWindows'

describe('planearAbrirPedidosWindows', () => {
  it('reconhece Windows de secretária e ignora Windows Phone', () => {
    expect(isWindowsUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(true)
    expect(isWindowsUserAgent('Mozilla/5.0 (Windows Phone 10.0)')).toBe(false)
    expect(isWindowsUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
  })

  it('fora do Windows só oferece download', () => {
    expect(planearAbrirPedidosWindows({ userAgent: 'Macintosh' })).toEqual({
      tentarProtocolo: false,
      mostrarDownload: true,
      motivo: 'nao-windows',
    })
  })

  it('no Windows tenta o protocolo e mostra download', () => {
    expect(planearAbrirPedidosWindows({ userAgent: 'Windows NT 10.0' })).toEqual({
      tentarProtocolo: true,
      mostrarDownload: true,
      motivo: 'windows',
    })
  })
})
