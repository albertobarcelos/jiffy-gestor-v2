export type GerarPrintJobId = (params: {
  vendaId: string
  tipoCupom: string
  ticketKey: string
  reimpressao?: boolean
}) => string
