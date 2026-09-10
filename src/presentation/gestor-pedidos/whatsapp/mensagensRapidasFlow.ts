export type MensagemRapidaFlow = {
  id: string
  titulo: string
  corpo: string
}

export type PacoteMensagensFlow = {
  chavePix: string
  mensagens: MensagemRapidaFlow[]
}

const PREFIXO = 'jiffy.flow.mensagens.'

export function mensagensRapidasPadrao(): MensagemRapidaFlow[] {
  return [
    {
      id: 'pix',
      titulo: 'PIX',
      corpo: 'Segue a chave PIX para pagamento:\n{pix}',
    },
    {
      id: 'ola',
      titulo: 'Saudação',
      corpo: 'Olá! Seja bem-vindo. Como posso ajudar?',
    },
    {
      id: 'preparo',
      titulo: 'Em preparo',
      corpo: 'Ótimo pedido! Aguarde, já estamos preparando com carinho.',
    },
    {
      id: 'saiu',
      titulo: 'Saiu para entrega',
      corpo: 'Seu pedido saiu para entrega!',
    },
    {
      id: 'retirada',
      titulo: 'Pronto para retirada',
      corpo: 'Seu pedido está pronto. Pode vir retirar!',
    },
  ]
}

export function pacoteMensagensVazio(): PacoteMensagensFlow {
  return { chavePix: '', mensagens: mensagensRapidasPadrao() }
}

export function chaveStorageMensagensFlow(empresaId: string): string {
  return `${PREFIXO}${empresaId}`
}

export function lerPacoteMensagensFlow(empresaId: string): PacoteMensagensFlow {
  if (!empresaId || typeof localStorage === 'undefined') return pacoteMensagensVazio()
  try {
    const raw = localStorage.getItem(chaveStorageMensagensFlow(empresaId))
    if (!raw) return pacoteMensagensVazio()
    const parsed = JSON.parse(raw) as Partial<PacoteMensagensFlow>
    const mensagens = Array.isArray(parsed.mensagens) && parsed.mensagens.length > 0
      ? parsed.mensagens.filter(m => m && m.id && m.titulo && typeof m.corpo === 'string')
      : mensagensRapidasPadrao()
    return {
      chavePix: typeof parsed.chavePix === 'string' ? parsed.chavePix : '',
      mensagens,
    }
  } catch {
    return pacoteMensagensVazio()
  }
}

export function gravarPacoteMensagensFlow(empresaId: string, pacote: PacoteMensagensFlow): void {
  if (!empresaId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(chaveStorageMensagensFlow(empresaId), JSON.stringify(pacote))
  } catch {
    /* quota */
  }
}

export function aplicarVariaveisMensagem(corpo: string, chavePix: string): string {
  return corpo.split('{pix}').join(chavePix.trim() || '(configure a chave PIX)')
}
