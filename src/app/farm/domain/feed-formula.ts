import { FarmStatus } from './status';

/**
 * Fórmula de ração, como o backend a devolve (`FeedFormula`, feature 004): o preço por quilo, o consumo
 * esperado por ave ao dia e o custo por ave ao dia, derivado deles.
 */
export interface FeedFormula {
  readonly id: string;
  readonly name: string;
  /** Ausente quando a fórmula não tem descrição. */
  readonly description?: string;
  /** Preço por quilo, em reais. */
  readonly pricePerKg: number;
  /** Gramas de ração por ave ao dia. */
  readonly expectedIntake: number;
  /** Preço × consumo esperado ÷ 1.000, em reais, com três casas: vem pronto do backend (R-007). */
  readonly costPerBirdDay: number;
  readonly status: FarmStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Cadastro ou edição de fórmula, como o formulário o envia: tudo como foi digitado, o preço com a
 * vírgula. Quem valida, e devolve todas as falhas de uma vez, é o backend (FR-020 da 004).
 */
export interface FeedFormulaInput {
  readonly name: string;
  readonly pricePerKg: string;
  readonly expectedIntake: string;
  readonly description: string;
}
