import { describe, it, expect } from 'vitest'
import { EmpresaPainelResumo } from '@/src/domain/entities/painel-contador/EmpresaPainelResumo'
import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'
import { CertificadoDigital } from '@/src/domain/entities/painel-contador/CertificadoDigital'
import { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'
import { ConfiguracaoNcmImpostos } from '@/src/domain/entities/painel-contador/ConfiguracaoNcmImpostos'
import { CertificadoValidoPolicy } from '@/src/domain/policies/painel-contador/CertificadoValidoPolicy'
import { EtapaDadosFiscaisCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaDadosFiscaisCompletaPolicy'
import { EtapaEmissorFiscalCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaEmissorFiscalCompletaPolicy'
import { EtapaCenarioFiscalCompletoPolicy } from '@/src/domain/policies/painel-contador/EtapaCenarioFiscalCompletoPolicy'
import { EtapaIbptCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaIbptCompletaPolicy'
import { JustificativaInutilizacaoPolicy } from '@/src/domain/policies/painel-contador/JustificativaInutilizacaoPolicy'

describe('CertificadoValidoPolicy', () => {
  it('retorna inválido quando certificado é null', () => {
    const result = CertificadoValidoPolicy.check(null)
    expect(result.existe).toBe(false)
    expect(result.estaValido).toBe(false)
  })

  it('retorna válido quando certificado existe sem validade', () => {
    const cert = CertificadoDigital.fromApiResponse({
      id: '1',
      ambiente: 'PRODUCAO',
      validadeCertificado: null,
    })
    const result = CertificadoValidoPolicy.check(cert)
    expect(result.estaValido).toBe(true)
  })
})

describe('EtapaDadosFiscaisCompletaPolicy', () => {
  const empresa = EmpresaPainelResumo.fromApiResponse({
    id: '1',
    cnpj: '12345678000190',
    razaoSocial: 'Empresa Teste',
    endereco: { estado: 'SP' },
  })
  const fiscal = ConfiguracaoFiscalEmpresa.fromApiResponse({
    inscricaoEstadual: 'ISENTO',
    codigoRegimeTributario: 1,
  })

  it('conclui etapa com dados e certificado válidos', () => {
    const cert = CertificadoDigital.fromApiResponse({
      id: 'c1',
      ambiente: 'PRODUCAO',
      validadeCertificado: new Date(Date.now() + 86400000).toISOString(),
    })
    const result = EtapaDadosFiscaisCompletaPolicy.check(empresa, fiscal, cert)
    expect(result.concluida).toBe(true)
  })
})

describe('EtapaEmissorFiscalCompletaPolicy', () => {
  it('falha quando nenhum modelo está ativo', () => {
    const configs = [
      new ConfiguracaoEmissao('1', 55, 1, 1, 1, false, null, false, false, '', '', 'PRODUCAO'),
    ]
    expect(EtapaEmissorFiscalCompletaPolicy.check(configs).concluida).toBe(false)
  })

  it('conclui com NF-e ativa e completa', () => {
    const configs = [
      new ConfiguracaoEmissao('1', 55, 1, 10, 1, true, null, true, false, '', '', 'PRODUCAO'),
    ]
    expect(EtapaEmissorFiscalCompletaPolicy.check(configs).concluida).toBe(true)
  })
})

describe('EtapaCenarioFiscalCompletoPolicy', () => {
  it('falha sem NCMs', () => {
    const fiscal = ConfiguracaoFiscalEmpresa.fromApiResponse({ codigoRegimeTributario: 1 })
    expect(EtapaCenarioFiscalCompletoPolicy.check(fiscal, []).concluida).toBe(false)
  })

  it('exige CSOSN no simples nacional', () => {
    const fiscal = ConfiguracaoFiscalEmpresa.fromApiResponse({ codigoRegimeTributario: 1 })
    const ncms = [
      new ConfiguracaoNcmImpostos('12345678', 'Produto', { csosn: '' }),
    ]
    expect(EtapaCenarioFiscalCompletoPolicy.check(fiscal, ncms).concluida).toBe(false)
  })
})

describe('EtapaIbptCompletaPolicy', () => {
  it('conclui com token cadastrado', () => {
    const fiscal = ConfiguracaoFiscalEmpresa.fromApiResponse({
      codigoRegimeTributario: 1,
      ibptTokenStatus: 'CADASTRADO',
    })
    expect(EtapaIbptCompletaPolicy.check(fiscal).concluida).toBe(true)
  })
})

describe('JustificativaInutilizacaoPolicy', () => {
  it('rejeita justificativa curta', () => {
    expect(JustificativaInutilizacaoPolicy.check('curta').valida).toBe(false)
  })

  it('aceita justificativa com 15+ caracteres', () => {
    expect(
      JustificativaInutilizacaoPolicy.check('Inutilização de numeração por lacuna.').valida
    ).toBe(true)
  })
})
