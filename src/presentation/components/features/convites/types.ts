export type ConvitePendente = {
  id: string
  email: string
  empresaId: string
  nomeEmpresa: string
  perfilGestorId: string
  /** Data/hora (string) vinda do contrato (provavelmente ISO). */
  expiraEm: string
}

