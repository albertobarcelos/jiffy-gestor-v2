import { describe, expect, it } from 'vitest'
import {
  avisoNotificacaoWhatsAppDaEtapaAtual,
  avisoNotificacaoWhatsAppDaVenda,
} from '@/src/application/mappers/avisoNotificacaoWhatsAppEtapa'

const sequencia = [
  {
    status: 'EM_PREPARO',
    ordem: 1,
    notificacaoEnviada: true,
    feedbackEnvioNotificacao: 'Notificação enviada com sucesso',
  },
  {
    status: 'PRONTO',
    ordem: 2,
    notificacaoEnviada: false,
    feedbackEnvioNotificacao: 'Número inválido',
  },
]

describe('avisoNotificacaoWhatsAppDaEtapaAtual', () => {
  it('mostra o sucesso da etapa atual', () => {
    expect(avisoNotificacaoWhatsAppDaEtapaAtual(sequencia, 'EM_PREPARO')).toEqual({
      resultado: 'sucesso',
      texto: 'WhatsApp: Notificação enviada com sucesso',
    })
  })

  it('mostra o motivo quando o envio falhou', () => {
    expect(avisoNotificacaoWhatsAppDaEtapaAtual(sequencia, 'pronto')).toEqual({
      resultado: 'falha',
      texto: 'Mensagem não entregue: Número inválido',
    })
  })

  it('omite a linha enquanto não há resultado', () => {
    expect(
      avisoNotificacaoWhatsAppDaEtapaAtual(
        [
          {
            status: 'PRONTO',
            notificacaoEnviada: false,
            feedbackEnvioNotificacao: null,
          },
        ],
        'PRONTO'
      )
    ).toBeNull()
  })

  it('usa a última passagem quando a etapa se repete', () => {
    expect(
      avisoNotificacaoWhatsAppDaEtapaAtual(
        [
          {
            status: 'PRONTO',
            ordem: 2,
            notificacaoEnviada: false,
            feedbackEnvioNotificacao: 'Canal WhatsApp indisponível',
          },
          {
            status: 'PRONTO',
            ordem: 4,
            notificacaoEnviada: true,
            feedbackEnvioNotificacao: null,
          },
        ],
        'PRONTO'
      )
    ).toEqual({
      resultado: 'sucesso',
      texto: 'WhatsApp: Notificação enviada com sucesso',
    })
  })
})

describe('avisoNotificacaoWhatsAppDaVenda', () => {
  it('resolve a mensagem com o status operacional atual da venda', () => {
    expect(
      avisoNotificacaoWhatsAppDaVenda({
        sequenciaTransicoes: sequencia,
        statusEtapaOperacional: 'PRONTO',
      })
    ).toEqual({
      resultado: 'falha',
      texto: 'Mensagem não entregue: Número inválido',
    })
  })

  it('usa os campos alternativos de status quando necessário', () => {
    expect(
      avisoNotificacaoWhatsAppDaVenda({
        sequenciaTransicoes: sequencia,
        statusDelivery: 'EM_PREPARO',
      })
    ).toEqual({
      resultado: 'sucesso',
      texto: 'WhatsApp: Notificação enviada com sucesso',
    })
  })

  it('não exibe mensagem se não houver status ou resultado de transição', () => {
    expect(avisoNotificacaoWhatsAppDaVenda({ sequenciaTransicoes: sequencia })).toBeNull()
  })
})
