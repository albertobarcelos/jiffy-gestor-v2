import { describe, expect, it } from 'vitest'
import { snapshotPropagavelDePatch } from '@/src/shared/types/propagarAlteracaoProduto'
import {
  completarDestinosSyncCadastroPrincipal,
  descricaoVinculoMenusCriacao,
  ehMenuPrincipal,
  garantirMenuPrincipalNosIds,
  menuIdsParaEspelharAposSalvarCadastro,
  idMenuPrincipalDeLista,
  idsMenuPrincipalTravados,
  labelCadastroNaPropagacao,
  menusParaPerguntarReplicacao,
  podeDesvincularProdutoDoMenu,
} from '@/src/domain/policies/produto/syncCadastroComMenuPrincipal'

const PRINCIPAL = 'menu-principal'
const DELIVERY = 'menu-delivery'
const EXTRA = 'menu-extra'

describe('syncCadastroComMenuPrincipal', () => {
  it('identifica o menu de tipo principal e não chuta quando há vários sem tipo', () => {
    expect(
      idMenuPrincipalDeLista([
        { id: DELIVERY, tipo: 'custom' },
        { id: PRINCIPAL, tipo: 'principal' },
      ])
    ).toBe(PRINCIPAL)
    expect(
      idMenuPrincipalDeLista([
        { id: DELIVERY },
        { id: EXTRA },
      ])
    ).toBeNull()
    expect(idMenuPrincipalDeLista([{ id: PRINCIPAL }])).toBe(PRINCIPAL)
  })

  it('cadastro novo manda valor/nome no snapshot do menu principal por padrão', () => {
    const menuIdsCriacao = garantirMenuPrincipalNosIds([], PRINCIPAL)
    const body = {
      nome: 'X-Bacon',
      descricao: 'No ponto',
      valor: 25.5,
      grupoId: 'cat-1',
      menuIds: menuIdsCriacao,
    }
    const snapshot = snapshotPropagavelDePatch(body)
    const destinos = menuIdsParaEspelharAposSalvarCadastro({
      isEdit: false,
      destinosEdicao: [],
      menuIdsCriacao,
    })

    expect(menuIdsCriacao).toEqual([PRINCIPAL])
    expect(snapshot).toMatchObject({
      nome: 'X-Bacon',
      descricao: 'No ponto',
      valor: 25.5,
      grupoProdutoId: 'cat-1',
    })
    expect(destinos).toEqual([PRINCIPAL])
  })

  it('na criação espelha o snapshot nos menus do POST; na edição só os destinos da política', () => {
    expect(
      menuIdsParaEspelharAposSalvarCadastro({
        isEdit: false,
        destinosEdicao: [],
        menuIdsCriacao: [PRINCIPAL, DELIVERY],
      })
    ).toEqual([PRINCIPAL, DELIVERY])
    expect(
      menuIdsParaEspelharAposSalvarCadastro({
        isEdit: true,
        destinosEdicao: [PRINCIPAL],
        menuIdsCriacao: [PRINCIPAL, DELIVERY],
      })
    ).toEqual([PRINCIPAL])
    expect(
      menuIdsParaEspelharAposSalvarCadastro({
        isEdit: true,
        destinosEdicao: [],
        menuIdsCriacao: [PRINCIPAL],
      })
    ).toEqual([])
  })

  it('na criação sempre inclui o principal e o trava', () => {
    expect(garantirMenuPrincipalNosIds([DELIVERY], PRINCIPAL)).toEqual([
      PRINCIPAL,
      DELIVERY,
    ])
    expect(idsMenuPrincipalTravados(PRINCIPAL, [DELIVERY])).toEqual([
      PRINCIPAL,
      DELIVERY,
    ])
    expect(podeDesvincularProdutoDoMenu('principal')).toBe(false)
    expect(podeDesvincularProdutoDoMenu('custom')).toBe(true)
  })

  it('com a ponte desligada não força o principal', () => {
    expect(garantirMenuPrincipalNosIds([DELIVERY], PRINCIPAL, false)).toEqual([DELIVERY])
    expect(idsMenuPrincipalTravados(PRINCIPAL, [], false)).toEqual([])
    expect(podeDesvincularProdutoDoMenu('principal', false)).toBe(true)
  })

  it('editar o cadastro espelha só o principal e ignora outros menus', () => {
    const outros = menusParaPerguntarReplicacao({
      menus: [
        { id: PRINCIPAL, nome: 'Principal', tipo: 'principal' },
        { id: DELIVERY, nome: 'Delivery' },
      ],
      origem: 'cadastroBase',
      principalId: PRINCIPAL,
    })
    expect(outros.map(m => m.id)).toEqual([DELIVERY])

    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: false, menuIds: [] },
        origem: 'cadastroBase',
        principalId: PRINCIPAL,
      })
    ).toEqual({ aplicarNoCadastroBase: false, menuIds: [PRINCIPAL] })

    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: false, menuIds: [DELIVERY] },
        origem: 'cadastroBase',
        principalId: PRINCIPAL,
      })
    ).toEqual({ aplicarNoCadastroBase: false, menuIds: [PRINCIPAL] })
  })

  it('editar o menu principal espelha o cadastro e pergunta só os outros', () => {
    const outros = menusParaPerguntarReplicacao({
      menus: [
        { id: PRINCIPAL, nome: 'Principal', tipo: 'principal' },
        { id: EXTRA, nome: 'Extra' },
      ],
      origem: 'menu',
      menuIdAtual: PRINCIPAL,
      principalId: PRINCIPAL,
    })
    expect(outros.map(m => m.id)).toEqual([EXTRA])

    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: false, menuIds: [] },
        origem: 'menu',
        menuIdAtual: PRINCIPAL,
        principalId: PRINCIPAL,
      })
    ).toEqual({ aplicarNoCadastroBase: true, menuIds: [] })
  })

  it('editar menu secundário só espelha cadastro+principal se o usuário marcar', () => {
    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: false, menuIds: [] },
        origem: 'menu',
        menuIdAtual: DELIVERY,
        principalId: PRINCIPAL,
      })
    ).toEqual({ aplicarNoCadastroBase: false, menuIds: [] })

    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: true, menuIds: [] },
        origem: 'menu',
        menuIdAtual: DELIVERY,
        principalId: PRINCIPAL,
      })
    ).toEqual({ aplicarNoCadastroBase: true, menuIds: [PRINCIPAL] })

    expect(labelCadastroNaPropagacao({
      origem: 'menu',
      menuIdAtual: DELIVERY,
      principalId: PRINCIPAL,
    })).toBe('Cadastro e menu principal')
  })

  it('imagem no cadastro/principal some da lista de pergunta e ainda vai ao principal', () => {
    expect(
      menusParaPerguntarReplicacao({
        menus: [
          { id: PRINCIPAL, nome: 'Principal', tipo: 'principal' },
          { id: DELIVERY, nome: 'Delivery' },
        ],
        origem: 'cadastroBase',
        principalId: PRINCIPAL,
        variante: 'imagem',
      }).map(m => m.id)
    ).toEqual([DELIVERY])

    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: false, menuIds: [DELIVERY] },
        origem: 'cadastroBase',
        principalId: PRINCIPAL,
        variante: 'imagem',
      })
    ).toEqual({ aplicarNoCadastroBase: false, menuIds: [PRINCIPAL] })

    expect(
      completarDestinosSyncCadastroPrincipal({
        destinos: { aplicarNoCadastroBase: true, menuIds: [EXTRA] },
        origem: 'cadastroBase',
        principalId: PRINCIPAL,
        variante: 'vinculoMenus',
      })
    ).toEqual({ aplicarNoCadastroBase: false, menuIds: [EXTRA] })
  })

  it('textos da criação mudam com a ponte', () => {
    expect(descricaoVinculoMenusCriacao(false)).toContain('não pode ser desmarcado')
    expect(descricaoVinculoMenusCriacao(false, false)).toContain('desmarcá-lo')
    expect(ehMenuPrincipal(PRINCIPAL, PRINCIPAL)).toBe(true)
  })
})
