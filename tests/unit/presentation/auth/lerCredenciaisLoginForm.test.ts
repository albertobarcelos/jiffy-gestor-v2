/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { lerCredenciaisLoginForm } from '@/src/presentation/components/features/auth/utils/lerCredenciaisLoginForm'

function montarForm(email: string, password: string): HTMLFormElement {
  const form = document.createElement('form')
  const emailEl = document.createElement('input')
  emailEl.name = 'email'
  emailEl.value = email
  const senhaEl = document.createElement('input')
  senhaEl.name = 'password'
  senhaEl.value = password
  form.append(emailEl, senhaEl)
  return form
}

describe('lerCredenciaisLoginForm', () => {
  it('usa o valor do DOM quando o state do React ainda está vazio (autofill)', () => {
    const form = montarForm('loja@jiffy.com', 'segredo')
    expect(lerCredenciaisLoginForm(form, { email: '', password: '' })).toEqual({
      email: 'loja@jiffy.com',
      password: 'segredo',
    })
  })

  it('cai no state se o DOM vier vazio', () => {
    const form = montarForm('', '')
    expect(lerCredenciaisLoginForm(form, { email: 'a@b.com', password: 'x' })).toEqual({
      email: 'a@b.com',
      password: 'x',
    })
  })
})
