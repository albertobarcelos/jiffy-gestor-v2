import { AplicarReordenacaoPizzaUseCase } from '@/src/application/use-cases/pizza/AplicarReordenacaoPizzaUseCase'
import { CarregarEdicaoCategoriaPizzaUseCase } from '@/src/application/use-cases/pizza/CarregarEdicaoCategoriaPizzaUseCase'
import { SalvarEdicaoCategoriaPizzaUseCase } from '@/src/application/use-cases/pizza/SalvarEdicaoCategoriaPizzaUseCase'
import { VincularPizzaCategoriaMenusUseCase } from '@/src/application/use-cases/pizza/VincularPizzaCategoriaMenusUseCase'
import {
  AtualizarPizzaCategoriaViaBffUseCase,
  AtualizarPizzaSaborViaBffUseCase,
  BuscarPizzaCategoriaViaBffUseCase,
  BuscarPizzaSaborViaBffUseCase,
  CriarPizzaCategoriaCompletoViaBffUseCase,
  CriarPizzaComplementoViaBffUseCase,
  CriarPizzaSaborViaBffUseCase,
  DesvincularPizzaComplementoViaBffUseCase,
  ListarPizzaCategoriasViaBffUseCase,
  ListarPizzaComplementosViaBffUseCase,
  ListarPizzaSaboresViaBffUseCase,
  ListarPizzaTamanhosViaBffUseCase,
  ReordenarPizzaCategoriaViaBffUseCase,
  ReordenarPizzaSaborViaBffUseCase,
  SubstituirPrecosPizzaComplementoViaBffUseCase,
} from '@/src/application/use-cases/pizza/pizzaBffUseCases'
import { menuBffRepository } from '@/src/infrastructure/api/repositories/MenuBffRepository'
import { pizzaBffRepository } from '@/src/infrastructure/api/repositories/PizzaBffRepository'

const pizzaGateway = pizzaBffRepository
const menuVinculoGateway = menuBffRepository

export const listarPizzaCategoriasViaBffUseCase = new ListarPizzaCategoriasViaBffUseCase(
  pizzaGateway
)
export const buscarPizzaCategoriaViaBffUseCase = new BuscarPizzaCategoriaViaBffUseCase(pizzaGateway)
export const atualizarPizzaCategoriaViaBffUseCase = new AtualizarPizzaCategoriaViaBffUseCase(
  pizzaGateway
)
export const criarPizzaCategoriaCompletoViaBffUseCase =
  new CriarPizzaCategoriaCompletoViaBffUseCase(pizzaGateway)
export const reordenarPizzaCategoriaViaBffUseCase = new ReordenarPizzaCategoriaViaBffUseCase(
  pizzaGateway
)
export const listarPizzaSaboresViaBffUseCase = new ListarPizzaSaboresViaBffUseCase(pizzaGateway)
export const buscarPizzaSaborViaBffUseCase = new BuscarPizzaSaborViaBffUseCase(pizzaGateway)
export const criarPizzaSaborViaBffUseCase = new CriarPizzaSaborViaBffUseCase(pizzaGateway)
export const atualizarPizzaSaborViaBffUseCase = new AtualizarPizzaSaborViaBffUseCase(pizzaGateway)
export const reordenarPizzaSaborViaBffUseCase = new ReordenarPizzaSaborViaBffUseCase(pizzaGateway)
export const listarPizzaTamanhosViaBffUseCase = new ListarPizzaTamanhosViaBffUseCase(pizzaGateway)
export const listarPizzaComplementosViaBffUseCase = new ListarPizzaComplementosViaBffUseCase(
  pizzaGateway
)
export const criarPizzaComplementoViaBffUseCase = new CriarPizzaComplementoViaBffUseCase(
  pizzaGateway
)
export const substituirPrecosPizzaComplementoViaBffUseCase =
  new SubstituirPrecosPizzaComplementoViaBffUseCase(pizzaGateway)
export const desvincularPizzaComplementoViaBffUseCase =
  new DesvincularPizzaComplementoViaBffUseCase(pizzaGateway)

export const aplicarReordenacaoPizzaUseCase = new AplicarReordenacaoPizzaUseCase(
  reordenarPizzaCategoriaViaBffUseCase,
  reordenarPizzaSaborViaBffUseCase
)
export const carregarEdicaoCategoriaPizzaUseCase = new CarregarEdicaoCategoriaPizzaUseCase(
  pizzaGateway
)
export const salvarEdicaoCategoriaPizzaUseCase = new SalvarEdicaoCategoriaPizzaUseCase(pizzaGateway)
export const vincularPizzaCategoriaMenusUseCase = new VincularPizzaCategoriaMenusUseCase(
  pizzaGateway,
  menuVinculoGateway
)
