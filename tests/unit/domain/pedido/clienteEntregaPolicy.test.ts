import { describe, expect, it } from 'vitest'
import {
  clienteCadastradoNestaEmpresa,
  nomePadraoMoradaEntrega,
  normalizarTipoEtiquetaMorada,
  podeExibirEnderecosClienteEntrega,
  telefoneMinimoDigitosBuscaEntrega,
} from '@/src/domain/policies/pedido/ClienteEntregaPolicy'

describe('ClienteEntregaPolicy', () => {
  it('só considera cadastrado nesta empresa com id do ERP', () => {
    expect(clienteCadastradoNestaEmpresa(undefined)).toBe(false)
    expect(clienteCadastradoNestaEmpresa('')).toBe(false)
    expect(clienteCadastradoNestaEmpresa('  ')).toBe(false)
    expect(clienteCadastradoNestaEmpresa('cli-1')).toBe(true)
  })

  it('exige 11 dígitos no delivery e 8 no legado', () => {
    expect(telefoneMinimoDigitosBuscaEntrega(true)).toBe(11)
    expect(telefoneMinimoDigitosBuscaEntrega(false)).toBe(8)
  })

  it('só exibe endereços após cadastro nesta empresa', () => {
    expect(
      podeExibirEnderecosClienteEntrega({ mostrarEnderecos: true, clienteId: null })
    ).toBe(false)
    expect(
      podeExibirEnderecosClienteEntrega({ mostrarEnderecos: true, clienteId: 'cli-1' })
    ).toBe(true)
    expect(
      podeExibirEnderecosClienteEntrega({ mostrarEnderecos: false, clienteId: 'cli-1' })
    ).toBe(false)
  })

  it('normaliza etiqueta e nome padrão da morada', () => {
    expect(normalizarTipoEtiquetaMorada('trabalho')).toBe('Trabalho')
    expect(normalizarTipoEtiquetaMorada(null)).toBe('Casa')
    expect(nomePadraoMoradaEntrega('Casa')).toBe('Casa Principal')
    expect(nomePadraoMoradaEntrega('Outro')).toBe('Outro')
  })
})
