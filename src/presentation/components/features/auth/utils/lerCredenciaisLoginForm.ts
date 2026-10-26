/**
 * Lê e-mail/senha do DOM no submit.
 * No celular o autofill pinta o campo sem disparar onChange — o state do React
 * fica vazio, o submit apaga o que o usuário vê e a primeira tentativa falha.
 */
export function lerCredenciaisLoginForm(
  form: HTMLFormElement,
  estado: { email: string; password: string }
): { email: string; password: string } {
  const emailEl = form.elements.namedItem('email')
  const senhaEl = form.elements.namedItem('password')
  const emailDom = emailEl instanceof HTMLInputElement ? emailEl.value : ''
  const senhaDom = senhaEl instanceof HTMLInputElement ? senhaEl.value : ''
  return {
    email: (emailDom || estado.email).trim(),
    password: senhaDom || estado.password,
  }
}
