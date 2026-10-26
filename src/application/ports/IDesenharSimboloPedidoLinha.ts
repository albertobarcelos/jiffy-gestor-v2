/** PNG do QR/barras à esquerda e do texto do rodapé à direita. */
export type DesenharSimboloPedidoLinha = (input: {
  payload: string
  tipo: 'qrcode' | 'codigo_barras'
  linhas: string[]
}) => string | null
