/**
 * Opções dos selects de configuração fiscal (NFe / cardápio).
 * Compartilhado entre NovoProduto e atualização em lote.
 */
export const origensMercadoria = [
  { value: '0', label: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
  { value: '1', label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
  { value: '2', label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
  { value: '3', label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%' },
  { value: '4', label: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos de que tratam as legislações citadas nos Ajustes' },
  { value: '5', label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
  { value: '6', label: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX e gás natural' },
  { value: '7', label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX e gás natural' },
  { value: '8', label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' },
]

export const tiposProduto = [
  { value: '00', label: '00 - Mercadoria para Revenda' },
  { value: '01', label: '01 - Matéria Prima' },
  { value: '02', label: '02 - Embalagem' },
  { value: '03', label: '03 - Produto em Processo' },
  { value: '04', label: '04 - Produto Acabado' },
  { value: '05', label: '05 - Subproduto' },
  { value: '06', label: '06 - Produto Intermediário' },
  { value: '07', label: '07 - Material de Uso e Consumo' },
  { value: '08', label: '08 - Ativo Imobilizado' },
  { value: '09', label: '09 - Serviços' },
  { value: '10', label: '10 - Outros Insumos' },
  { value: '99', label: '99 - Outras' },
  { value: 'KT', label: 'KT - Kit' },
]

export const indicadoresProducao = [
  { value: '0', label: 'Produzido em Escala NÃO Relevante' },
  { value: '1', label: 'Produzido em Escala Relevante' },
]
