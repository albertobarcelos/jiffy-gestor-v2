export const DESCRICAO_MOVIMENTACAO_MIN = 5

/** Descrição canônica do suprimento inicial que sinaliza abertura implícita. */
export const DESCRICAO_FUNDO_TROCO = 'Fundo de troco'

export function validarFechamentoCaixaEstacao(valorFornecido: number):
  | { ok: true }
  | { ok: false; message: string } {
  if (!Number.isFinite(valorFornecido) || valorFornecido < 0) {
    return { ok: false, message: 'Informe o valor em dinheiro contado.' }
  }
  return { ok: true }
}

export function validarMovimentacaoCaixaEstacao(input: {
  valor: number
  descricao: string
}): { ok: true } | { ok: false; campo: 'valor' | 'descricao'; message: string } {
  const descricao = input.descricao.trim()
  if (descricao.length < DESCRICAO_MOVIMENTACAO_MIN) {
    return {
      ok: false,
      campo: 'descricao',
      message: 'A descrição deve ter no mínimo 5 caracteres',
    }
  }
  if (!(input.valor > 0)) {
    return {
      ok: false,
      campo: 'valor',
      message: 'Valor da sangria deve ser maior que zero.',
    }
  }
  return { ok: true }
}

export function validarSangriaContraSaldo(
  valor: number,
  saldoDisponivel: number
): { ok: true } | { ok: false; campo: 'valor'; message: string } {
  if (valor > saldoDisponivel) {
    return {
      ok: false,
      campo: 'valor',
      message: 'Valor da sangria não pode ser maior que o saldo em caixa.',
    }
  }
  return { ok: true }
}

export function validarSuprimentoCaixaEstacao(input: {
  valor: number
  descricao: string
}): { ok: true } | { ok: false; campo: 'valor' | 'descricao'; message: string } {
  const descricao = input.descricao.trim()
  if (descricao.length < DESCRICAO_MOVIMENTACAO_MIN) {
    return {
      ok: false,
      campo: 'descricao',
      message: 'A descrição deve ter no mínimo 5 caracteres',
    }
  }
  if (!(input.valor > 0)) {
    return {
      ok: false,
      campo: 'valor',
      message: 'Valor do suprimento deve ser maior que zero.',
    }
  }
  return { ok: true }
}

export type ResumoCaixaEstacao = {
  totalSuprimento: number
  totalSangria: number
  valorLiquidoDinheiroCaixa: number
}

function round2(valor: number): number {
  return Number(valor.toFixed(2))
}

/** Aplica uma sangria ao resumo do caixa (atualização otimista / preview). */
export function aplicarSangriaNoResumoCaixa(
  resumo: ResumoCaixaEstacao,
  valor: number
): ResumoCaixaEstacao {
  return {
    ...resumo,
    totalSangria: round2(resumo.totalSangria + valor),
    valorLiquidoDinheiroCaixa: round2(resumo.valorLiquidoDinheiroCaixa - valor),
  }
}

/** Aplica um suprimento ao resumo do caixa (atualização otimista / preview). */
export function aplicarSuprimentoNoResumoCaixa(
  resumo: ResumoCaixaEstacao,
  valor: number
): ResumoCaixaEstacao {
  return {
    ...resumo,
    totalSuprimento: round2(resumo.totalSuprimento + valor),
    valorLiquidoDinheiroCaixa: round2(resumo.valorLiquidoDinheiroCaixa + valor),
  }
}

/** Resumo inicial de caixa aberto via suprimento (sem operação prévia). */
export function resumoInicialCaixaAbertoComSuprimento(valor: number): ResumoCaixaEstacao {
  return {
    totalSuprimento: round2(valor),
    totalSangria: 0,
    valorLiquidoDinheiroCaixa: round2(valor),
  }
}

/** Diferença gravada pelo backend: valorFornecido − valorLiquidoDinheiroCaixa. */
export function calcularDiferencaFechamento(
  valorFornecido: number,
  valorLiquidoDinheiroCaixa: number
): number {
  return Number((valorFornecido - valorLiquidoDinheiroCaixa).toFixed(2))
}
