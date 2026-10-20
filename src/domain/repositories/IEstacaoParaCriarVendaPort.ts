/** Estação deste PC (storage + revalidação no backend). */
export interface IEstacaoParaCriarVendaPort {
  resolverEstacaoId(token?: string | null): Promise<string | null>
}
