export interface OpcaoCodigoFiscal {
  value: string
  label: string
}

export const CSOSN_OPTIONS: OpcaoCodigoFiscal[] = [
  { value: '102', label: '102 - Tributada pelo Simples Nacional sem permissão de crédito' },
  { value: '103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta' },
  { value: '300', label: '300 - Imune' },
  { value: '400', label: '400 - Não tributada pelo Simples Nacional' },
  { value: '500', label: '500 - ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação' },
  { value: '900', label: '900 - Outros' },
  { value: 'M61', label: 'M61 - ICMS cobrado anteriormente por substituição tributária (substituidor)' },
]

export const CST_ICMS_OPTIONS: OpcaoCodigoFiscal[] = [
  { value: '00', label: '00 - Tributada integralmente' },
  { value: '10', label: '10 - Tributada e com cobrança do ICMS por substituição tributária' },
  { value: '20', label: '20 - Com redução de base de cálculo' },
  { value: '30', label: '30 - Isenta ou não tributada e com cobrança do ICMS por substituição tributária' },
  { value: '40', label: '40 - Isenta' },
  { value: '41', label: '41 - Não tributada' },
  { value: '50', label: '50 - Suspensa' },
  { value: '51', label: '51 - Diferimento' },
  { value: '60', label: '60 - ICMS cobrado anteriormente por substituição tributária' },
  { value: '70', label: '70 - Com redução de base de cálculo e cobrança do ICMS por substituição tributária' },
  { value: '90', label: '90 - Outras' },
]

export const CST_PIS_COFINS_OPTIONS: OpcaoCodigoFiscal[] = [
  { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
  { value: '02', label: '02 - Operação Tributável com Alíquota Diferenciada' },
  { value: '03', label: '03 - Operação Tributável com Alíquota por Unidade de Medida de Produto' },
  { value: '04', label: '04 - Operação Tributável Monofásica - Revenda a Alíquota Zero' },
  { value: '05', label: '05 - Operação Tributável por Substituição Tributária' },
  { value: '06', label: '06 - Operação Tributável a Alíquota Zero' },
  { value: '07', label: '07 - Operação Isenta da Contribuição' },
  { value: '08', label: '08 - Operação sem Incidência da Contribuição' },
  { value: '09', label: '09 - Operação com Suspensão da Incidência da Contribuição' },
  { value: '49', label: '49 - Outras Operações de Saída' },
  { value: '50', label: '50 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno' },
  { value: '51', label: '51 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada no Mercado Interno' },
  { value: '52', label: '52 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita de Exportação' },
  { value: '53', label: '53 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno' },
  { value: '54', label: '54 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
  { value: '55', label: '55 - Operação com Direito a Crédito - Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação' },
  { value: '56', label: '56 - Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno e de Exportação' },
  { value: '60', label: '60 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada no Mercado Interno' },
  { value: '61', label: '61 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Não-Tributada no Mercado Interno' },
  { value: '62', label: '62 - Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita de Exportação' },
  { value: '63', label: '63 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno' },
  { value: '64', label: '64 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas no Mercado Interno e de Exportação' },
  { value: '65', label: '65 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação' },
  { value: '66', label: '66 - Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas no Mercado Interno e de Exportação' },
  { value: '67', label: '67 - Crédito Presumido - Outras Operações' },
  { value: '70', label: '70 - Operação de Aquisição sem Direito a Crédito' },
  { value: '71', label: '71 - Operação de Aquisição com Isenção' },
  { value: '72', label: '72 - Operação de Aquisição com Suspensão' },
  { value: '73', label: '73 - Operação de Aquisição a Alíquota Zero' },
  { value: '74', label: '74 - Operação de Aquisição sem Incidência da Contribuição' },
  { value: '75', label: '75 - Operação de Aquisição por Substituição Tributária' },
  { value: '98', label: '98 - Outras Operações de Entrada' },
  { value: '99', label: '99 - Outras Operações' },
]
