const DURACAO_MS = 320

/** Desliza o login do entregador para a direita antes de sair da página. */
export async function deslizarSaidaLoginApp(form: HTMLFormElement): Promise<void> {
  const root = form.closest('.expedicao-app-login')
  if (!(root instanceof HTMLElement)) return
  root.classList.add('expedicao-app-login-sair')
  await new Promise<void>(resolve => {
    window.setTimeout(resolve, DURACAO_MS)
  })
}
