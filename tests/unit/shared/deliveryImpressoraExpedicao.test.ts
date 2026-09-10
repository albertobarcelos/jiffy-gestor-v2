import { describe, expect, it } from 'vitest'
import {
  TOAST_CUPOM_NAO_IMPRIMIU_SEM_VINCULO_PC,
  TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS,
  TOAST_QUADRO_SEGUE_SEM_EXPEDICAO_ESCOLHIDA,
} from '@/src/shared/utils/deliveryImpressoraExpedicao'

describe('toasts de impressora lógica sem vínculo no PC', () => {
  it('explica que o pedido já existe e o fluxo segue sem o papel', () => {
    const mensagem = TOAST_CUPOM_NAO_IMPRIMIU_SEM_VINCULO_PC('COZINHA')
    expect(mensagem).toContain('Pedido criado')
    expect(mensagem).toContain('COZINHA')
    expect(mensagem).toContain('NÃO imprimiu')
    expect(mensagem).toContain('Configurações de impressão')
    expect(mensagem).toContain('segue mesmo sem o papel')
  })

  it('no quadro deixa explícito que o cupom falhou e o pedido avançou', () => {
    const producao = TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS('COZINHA')
    expect(producao).toContain('COZINHA')
    expect(producao).toContain('NÃO imprimiu')
    expect(producao).toContain('avançou no quadro')
    expect(producao).toContain('segue mesmo sem o papel')
    expect(producao).not.toContain('Erro ao criar pedido')

    expect(TOAST_QUADRO_SEGUE_SEM_EXPEDICAO_ESCOLHIDA).toContain('cupom de expedição NÃO imprimiu')
    expect(TOAST_QUADRO_SEGUE_SEM_EXPEDICAO_ESCOLHIDA).toContain('segue mesmo sem o papel')
  })
})
