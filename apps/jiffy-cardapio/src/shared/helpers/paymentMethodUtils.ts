/**
 * @file Funções utilitárias para lógica de exibição de meios de pagamento.
 */

/**
 * Interface que define o status de um meio de pagamento para fins de exibição.
 */
export interface PaymentMethodStatus {
  used: boolean;
  confirmed: boolean;
  canceled: boolean;
  tf: boolean; // Tipo especial de pagamento, não bloqueia exibição quando false.
}

/**
 * Determina se um meio de pagamento deve ser exibido na interface
 * com base em suas propriedades de status.
 *
 * @param payment O objeto de status do meio de pagamento.
 * @returns `true` se o meio de pagamento deve ser exibido, `false` caso contrário.
 */
export function shouldShowPaymentMethod(payment: PaymentMethodStatus): boolean {
  // 1. Se `canceled` for `true`, NÃO exibir o meio de pagamento.
  if (payment.canceled) {
    return false;
  }

  // 2. Se `used` for `true` E `confirmed` for `false`, NÃO exibir.
  //    (Exemplo: usuário clicou no meio de pagamento, mas não confirmou).
  if (payment.used && !payment.confirmed) {
    return false;
  }

  // 3. Em todos os outros casos, EXIBIR o meio de pagamento.
  //    O campo `tf` não impede a exibição por si só, conforme a regra de negócio.
  return true;
}

